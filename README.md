# RentOk LLM Gateway

A backend HTTP gateway that provides virtual API keys, budget enforcement, usage accounting, and a unified chat-completions endpoint.

## Stack
Node.js, Express, PostgreSQL, Prisma 6, OpenAI SDK. Optional Gemini fallback uses the provider REST API.

## Features
- Secure `gw_` virtual key generation; only SHA-256 hashes are stored.
- Admin-protected key creation and listing.
- Bearer authentication for gateway keys.
- Atomic budget reservation to avoid concurrent overspending.
- OpenAI chat-completions proxy with optional Gemini fallback.
- Token/cost accounting and persisted usage logs.
- Admin-protected usage reports.

## Setup
1. Install Node.js and create a PostgreSQL database (Neon is supported).
2. Install packages: `npm install`.
3. Copy `.env.example` to `.env` (PowerShell: `Copy-Item .env.example .env`).
4. Set `DATABASE_URL`, `ADMIN_API_KEY`, and `OPENAI_API_KEY`. Optionally set `GEMINI_API_KEY`.
5. Apply migrations and generate Prisma Client:
   ```bash
   npx prisma migrate deploy
   npx prisma generate
   ```
   For a new development database, use `npx prisma migrate dev`.
6. Start: `npm run dev`.

## Environment
See `.env.example`. Pricing variables are USD per 1M tokens and must be configured to match current provider/model prices. Defaults are illustrative.

## API

### Health
`GET /health`

### Create key (admin)
`POST /api/keys`
Header: `x-admin-key: <ADMIN_API_KEY>`
Body:
```json
{ "name": "My app", "budgetLimit": 5 }
```
Save the returned `apiKey`; it is only shown once.

### List keys (admin)
`GET /api/keys`
Header: `x-admin-key: <ADMIN_API_KEY>`

### Chat completion
`POST /v1/chat/completions`
Header: `Authorization: Bearer <VIRTUAL_API_KEY>`
Body:
```json
{
  "model": "gpt-4o-mini",
  "messages": [{ "role": "user", "content": "Hello!" }],
  "max_tokens": 256,
  "temperature": 0.7
}
```
The response follows the common non-streaming chat-completion shape and adds `gateway.provider` and `gateway.cost_usd`.

### Usage reports (admin)
- `GET /api/usage` (optional `?keyId=<id>`)
- `GET /api/usage/:keyId`

## Budget behavior
Before a provider call, the gateway estimates a conservative maximum request cost and atomically reserves it. On success it releases the reservation, records provider-reported token usage, and adds actual cost. On failure it releases the reservation and records a failed usage log. If the reservation would exceed the key budget, the gateway returns HTTP 402.

## Security notes
Never commit `.env` or real credentials. Rotate credentials exposed in chat/screenshots. The admin secret is a simple shared-secret mechanism intended for this assignment, not a full identity system.

## Known limitations
Non-streaming text chat only; basic Gemini fallback; approximate pre-call token estimation; operator-maintained pricing; no distributed rate limiter; reservation counters need crash-recovery reconciliation. See [DECISIONS.md](./DECISIONS.md) and [AI-LOG.md](./AI-LOG.md).
