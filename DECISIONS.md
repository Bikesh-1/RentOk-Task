# Architecture Decisions

## 1. What I built

RentOk task is a small, non-streaming HTTP gateway that accepts OpenAI-style chat completion requests and forwards them to an LLM provider. Callers authenticate with gateway-issued virtual API keys instead of receiving provider credentials. The gateway applies a per-key USD budget reservation, records usage and estimated spend in PostgreSQL, and can fall back from OpenAI to Gemini when the Gemini key is configured. The service is built with Node.js, Express, Prisma, and PostgreSQL.

## 2. Moving parts and request lifecycle

### Main components

- **Express app**: exposes the health, key-management, usage, and chat-completion routes.
- **Virtual-key middleware**: reads the Bearer key, hashes it with SHA-256, and looks up the hash in PostgreSQL.
- **Budget service**: reserves estimated cost atomically, then settles the reservation and records usage.
- **Provider service**: calls OpenAI first and optionally tries Gemini if OpenAI fails.
- **Prisma/PostgreSQL**: stores virtual keys, budget counters, and per-request usage logs.
- **Admin middleware/controllers**: protect key management and usage-report endpoints with the configured admin secret.

### One request, end to end

```text
Client
  |
  | POST /v1/chat/completions + Authorization: Bearer gw_...
  v
Express route and request validation
  |
  v
Virtual-key authentication
  |-- SHA-256 hash of supplied key
  |-- lookup active key in PostgreSQL
  v
Estimate request cost
  |
  v
Atomic budget reservation
  |-- reject with HTTP 402 if reservation is not possible
  v
OpenAI provider call
  |-- if it fails and GEMINI_API_KEY exists, try Gemini
  v
Calculate cost from provider-reported token usage
  |
  v
Database transaction
  |-- release reservation
  |-- add actual cost to totalSpent
  |-- insert successful usage log
  v
OpenAI-style JSON response to client
```

If the provider call fails, the controller attempts to release the reservation, writes a failed usage log, and passes the error to the Express error handler.

## 3. Important decisions and trade-offs

### Decision A: Node.js + Express

- **Options considered:** Node.js/Express, a Python API framework, or a larger gateway framework.
- **Picked:** Node.js with Express.
- **Why:** It is lightweight, quick to implement, and makes the HTTP lifecycle and middleware responsibilities easy to follow.
- **Trade-off:** More production features (rate limiting, tracing, schema validation, circuit breaking) need to be added explicitly.

### Decision B: PostgreSQL + Prisma for persistent state

- **Options considered:** in-memory counters, a document database, or a relational database.
- **Picked:** PostgreSQL with Prisma.
- **Why:** Budgets and usage records must survive restarts. A relational database also supports atomic conditional updates and transactions.
- **Trade-off:** The service depends on database availability and needs migrations and connection management.

### Decision C: Hash virtual API keys instead of storing plaintext

- **Options considered:** store raw keys, encrypt them, or store one-way hashes.
- **Picked:** generate keys from cryptographically secure random bytes, return the plaintext once, and store only its SHA-256 hash.
- **Why:** High-entropy random keys do not need password-style slow hashing; a one-way hash means a database read does not reveal usable client keys.
- **Trade-off:** A lost key cannot be retrieved; an operator must issue a replacement.

### Decision D: Reserve budget before contacting a provider

- **Options considered:** check the budget in application memory, check then update in separate database operations, or reserve funds with one conditional database update.
- **Picked:** use a conditional PostgreSQL UPDATE that checks `totalSpent + reservedAmount + requestedReservation <= budgetLimit` while increasing `reservedAmount`.
- **Why:** Two simultaneous requests must not both pass based on the same stale balance. PostgreSQL serializes updates to the same row and evaluates the condition against the current row state.
- **Trade-off / limitation:** The reservation is based on an estimate. The current settlement adds provider-reported actual cost after releasing the reservation; if the estimate is too low, actual spend can exceed the configured cap. Therefore this implementation protects concurrent reservations, but it is not a mathematically strict final-spend ceiling. A stricter implementation must account for actual cost at settlement and define what to do if actual cost exceeds the remaining budget.

### Decision E: Non-streaming OpenAI-compatible response with optional Gemini fallback

- **Options considered:** streaming or non-streaming; OpenAI only, fail-fast, or a second provider.
- **Picked:** non-streaming chat completions, OpenAI as primary, and Gemini as an optional fallback.
- **Why:** Non-streaming keeps it possible to know provider-reported token usage and settle/log a request before returning the response. A second provider gives a simple resilience path without building a complex router.
- **Trade-off:** The caller waits for the full response. Gemini support is a basic text-chat adapter and does not promise parity for multimodal input, tool calls, streaming, or every OpenAI-specific option.

## 4. Why enforce budgets at the gateway?

A caller should not be trusted to enforce its own spending limit. The caller controls its application and can accidentally send too many requests, retry aggressively, or be modified by someone else. The gateway is the shared point through which provider calls pass, so it can authenticate the key, reserve budget, and record usage before/after the provider call. It also keeps the real provider credentials on the server rather than exposing them to every client.

## 5. Concurrency: two requests on a nearly exhausted key

The reservation uses one conditional SQL UPDATE on the virtual-key row. If two requests arrive together, PostgreSQL serializes the row updates; after the first reservation changes the row, the second update evaluates the budget predicate against the updated values. If there is not enough remaining budget for the second reservation, it updates zero rows and the gateway rejects that request with HTTP 402.

This handles the check-then-update race for reservations. It does **not** completely eliminate overspend caused by a cost estimate that is lower than the provider's eventual actual cost. That is a known limitation, not something I claim is fully solved.

## 6. Logging choice: synchronous persistence

Successful usage is written in the same database transaction that settles the budget, before the response is returned. This keeps the budget update and successful usage record consistent: if the transaction fails, neither part should be committed.

The trade-off is additional request latency and dependence on PostgreSQL during completion. Failed requests are also logged, but a failure in the logging path is reported to the server log rather than replacing the original provider error.

## 7. Fallback policy

OpenAI is the primary provider. If the OpenAI call fails and `GEMINI_API_KEY` is configured, the gateway attempts a Gemini text-generation request. If Gemini is not configured, the primary error is returned through the gateway error handler. If both providers fail, the returned error includes both failure messages.

This is intentionally a simple sequential fallback. It is easier to reason about for a small assignment, but it adds latency when the primary provider is unhealthy and is not a substitute for a circuit breaker or sophisticated provider routing.

## 8. What I deliberately did not build

- **Streaming:** omitted to keep usage accounting and settlement straightforward.
- **Full admin identity and multi-tenant permissions:** a single shared admin secret is sufficient for this assignment's scope, but not for a production admin console.
- **Distributed rate limiting:** budget reservation is implemented; request-rate throttling is a separate concern.
- **Provider circuit breaker and advanced routing:** the gateway has one primary and one optional fallback rather than a routing policy engine.
- **Multimodal/tool-call parity:** the Gemini fallback is limited to basic text chat.
- **Semantic caching:** not needed to demonstrate the core gateway lifecycle.
- **A production-grade reservation recovery worker:** a process crash after reservation and before settlement can leave reserved funds behind.

## 9. Least-confident decision

The least-confident decision is the character-based pre-call token/cost estimate with a configurable multiplier.

**Why it is reasonable:** It is inexpensive, fast, provider-independent, and allows the gateway to reserve a conservative amount before spending money on a provider call.

**Why it is risky:** Character counts are not token counts. Different languages, message formats, and model tokenizers can make the estimate inaccurate. If the estimate is too high, valid requests may be rejected early; if it is too low, settlement can take total spend above the budget. I would not present this as a hard spending guarantee.

## 10. Where it breaks and what I would do with one more week

Known failure modes and limitations:

1. An underestimated request can cause actual spend to exceed the budget at settlement.
2. A process crash after reservation but before settlement can leave `reservedAmount` stranded.
3. Character-based token estimation is approximate and pricing configuration must be maintained by the operator.
4. Gemini fallback is basic text chat and does not preserve all OpenAI request semantics.
5. Provider failures may be logged with zero token usage when no reliable usage data is returned.
6. The service has no distributed rate limiter, circuit breaker, or production-grade admin identity system.
7. Integration and concurrent-load coverage is smaller than I would want for production.

With one more week I would: add durable reservation records with expiry and reconciliation; make settlement enforce an explicit policy when actual cost exceeds the reserved/remaining budget; use model-specific tokenizers or provider preflight estimates; add integration tests for provider success/failure, fallback, budget exhaustion, and concurrent requests; add rate limiting and a circuit breaker; and improve structured logs/metrics.

## 11. Deployment status

The repository includes a Render Blueprint and deployment instructions. A real public gateway URL should be added to the submission only after the service has been deployed and its health endpoint and example chat request have been tested. Do not treat a placeholder URL as a live deployment.
