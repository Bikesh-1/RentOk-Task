# RentOk LLM Gateway

A minimal HTTP gateway that sits between clients and LLM providers. It issues gateway-owned virtual API keys, reserves per-key USD budgets, proxies non-streaming chat completions, and stores usage records in PostgreSQL.

## Stack

- Node.js (ES modules) and Express
- PostgreSQL with Prisma 6
- OpenAI SDK as the primary provider
- Optional Gemini text-generation fallback
- Render Blueprint for deployment

## Features

- Cryptographically random `gw_` virtual keys; only SHA-256 hashes are stored.
- Admin-protected key creation and listing.
- Bearer authentication for gateway-issued keys.
- Atomic conditional budget reservation in PostgreSQL.
- OpenAI chat-completion proxy with optional Gemini fallback.
- Persisted token, provider, model, cost, status, and timestamp usage logs.
- Admin-protected usage reports.
- Health endpoint at `GET /health`.

## Local setup

Requirements: Node.js, npm, and a reachable PostgreSQL database.

1. Install dependencies:
   ```bash
   npm ci
   ```
2. Copy the environment template:
   ```bash
   # macOS/Linux
   cp .env.example .env

   # Windows PowerShell
   Copy-Item .env.example .env
   ```
3. Set at least `DATABASE_URL`, `ADMIN_API_KEY`, and `OPENAI_API_KEY` in `.env`. Set `GEMINI_API_KEY` if fallback is desired.
4. Generate Prisma Client and apply migrations:
   ```bash
   npx prisma generate
   npx prisma migrate deploy
   ```
   For a new development database where you are creating migrations, use `npx prisma migrate dev`.
5. Start the server:
   ```bash
   npm run dev
   ```

The server defaults to port 5000 and serves the static console from `public/`.

## Environment variables

See [`.env.example`](./.env.example) and [`render.yaml`](./render.yaml).

| Variable | Purpose |
|---|---|
| `PORT` | HTTP port (Render supplies this automatically) |
| `DATABASE_URL` | PostgreSQL connection string |
| `ADMIN_API_KEY` | Shared secret for admin routes |
| `OPENAI_API_KEY` | Server-side OpenAI credential |
| `OPENAI_DEFAULT_MODEL` | Default OpenAI model |
| `GEMINI_API_KEY` | Optional fallback credential |
| `GEMINI_FALLBACK_MODEL` | Gemini fallback model |
| `OPENAI_INPUT_USD_PER_1M` / `OPENAI_OUTPUT_USD_PER_1M` | OpenAI price configuration |
| `GEMINI_INPUT_USD_PER_1M` / `GEMINI_OUTPUT_USD_PER_1M` | Gemini price configuration |
| `BUDGET_ESTIMATE_MULTIPLIER` | Multiplier used by the pre-call cost estimate |
| `MAX_OUTPUT_TOKENS` | Maximum accepted `max_tokens` |

Pricing defaults are illustrative. Set rates to the current prices applicable to the configured provider/model. Never commit real credentials or virtual API keys.

## API

Set `BASE_URL` to your local or deployed gateway URL.

### Health

```bash
curl "$BASE_URL/health"
```

### Create a virtual key (admin)

```bash
curl -X POST "$BASE_URL/api/keys" \
  -H "Content-Type: application/json" \
  -H "x-admin-key: $ADMIN_API_KEY" \
  -d '{"name":"Demo application","budget":5}'
```

The response contains the virtual key. Save it securely: the plaintext key is shown only once.

### Chat completion

```bash
curl -X POST "$BASE_URL/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $VIRTUAL_API_KEY" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role":"user","content":"Hello from RentOk"}],
    "max_tokens": 128,
    "temperature": 0.7
  }'
```

The response follows a non-streaming chat-completion shape and includes gateway provider/cost metadata.

### Usage reports (admin)

```bash
curl "$BASE_URL/api/usage" \
  -H "x-admin-key: $ADMIN_API_KEY"
```

Filter by a virtual key ID with `GET /api/usage?keyId=<keyId>`. A per-key endpoint is also available at `GET /api/usage/:keyId`.

### Key listing (admin)

```bash
curl "$BASE_URL/api/keys" \
  -H "x-admin-key: $ADMIN_API_KEY"
```

## Budget behavior and limitations

Before contacting a provider, the gateway estimates a maximum request cost and atomically reserves that amount. If the reservation cannot fit within the configured budget, the request is rejected with HTTP 402. On success, provider-reported token usage is used to calculate actual cost and settle the reservation while writing the usage log.

The pre-call estimate is character-based and approximate. If actual cost exceeds the reservation, the current settlement can take total spend above the configured limit; this is a known limitation and is documented in [DECISIONS.md](./DECISIONS.md). Reservation counters can also be stranded if the process crashes before settlement. Gemini fallback supports basic text chat only. The service does not currently provide streaming, distributed rate limiting, a circuit breaker, or full admin identity management.

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md). The repository contains a Render Blueprint; add the live URL to the submission after deployment and smoke testing.

## Design and AI-use notes

- [DECISIONS.md](./DECISIONS.md)
- [AI-LOG.md](./AI-LOG.md)
