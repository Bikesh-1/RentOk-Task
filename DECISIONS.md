# Architecture Decisions

## Overview
RentOk is a non-streaming HTTP LLM gateway. Clients use gateway-issued `gw_` keys; provider credentials remain server-side.

## Request lifecycle
1. Validate request shape and authenticate the Bearer virtual key.
2. Hash the supplied key with SHA-256 and look up the stored hash.
3. Estimate cost and reserve budget with a single conditional PostgreSQL UPDATE.
4. Call OpenAI as primary. If it fails and `GEMINI_API_KEY` is configured, try Gemini fallback.
5. Calculate cost from provider-reported token counts and configured USD-per-million rates.
6. Atomically release the reservation, add actual spend, and insert a successful usage log.
7. On provider failure, release the reservation and write a failed usage log.

## Key storage
Keys are generated from 32 cryptographically random bytes. Only SHA-256 hashes are stored; plaintext is returned once. These high-entropy keys are not human passwords.

## Budget and concurrency
The reservation SQL condition is `totalSpent + reservedAmount + requestedReservation <= budgetLimit`. PostgreSQL serializes concurrent updates to the same row and evaluates the predicate against the current row version, preventing the usual application-side read/check/write race.

Settlement uses a Prisma transaction to release reserved funds, add actual spend, and create a usage log. Provider failure releases the reservation. A process crash after reservation and before settlement can strand reserved funds; production should use individual reservation rows with expiry and reconciliation.

## Providers and fallback
OpenAI is primary. Gemini is optional fallback when configured. The fallback adapter supports basic text chat only; it does not guarantee parity for multimodal content, tools, streaming, or provider-specific options. If Gemini is not configured, OpenAI errors are returned as gateway errors.

## Pricing
Rates are configurable through environment variables in USD per one million tokens. Defaults are illustrative, not a guarantee of current provider pricing. Set them to the applicable model/account prices. The pre-call estimate uses a conservative character heuristic and a configurable multiplier; actual spend uses provider-reported token counts.

## Endpoints
- `POST /v1/chat/completions`: non-streaming OpenAI-style chat completion.
- `POST /api/keys`, `GET /api/keys`: admin-protected virtual-key management.
- `GET /api/usage`, `GET /api/usage/:keyId`: admin-protected usage reports.
- `GET /health`: health check.

## Limitations / weakest decisions
- One shared admin secret, not a full admin identity system.
- Gemini fallback is text-only.
- Pricing values must be maintained by the operator.
- Character-based token estimation is approximate.
- Counter-based reservations can be stranded by process crashes.
- No streaming, distributed rate limiter, or provider circuit breaker.

## Next improvements
1. Persist reservation rows with expiry and recovery.
2. Use provider tokenizers/preflight estimates.
3. Add per-key rate limiting, key revocation, and admin identity.
4. Add provider circuit breakers, tracing, and metrics.
5. Add automated integration and concurrent-budget tests.
6. Add streaming and tool-call support if required.
