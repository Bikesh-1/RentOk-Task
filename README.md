# RentOk LLM Gateway

A minimal backend gateway between client applications and LLM providers, built incrementally for the RentOk Backend Intern take-home assignment.

## Current implementation

- Express server and health endpoint
- PostgreSQL integration with Prisma 6
- Virtual API key generation using Node.js cryptographic randomness
- SHA-256 hashing; only the key hash is persisted
- Admin-secret protection for virtual key creation
- Bearer-token authentication for gateway-issued keys
- Temporary authentication verification endpoint

## Tech stack

- Node.js (ES Modules)
- Express
- PostgreSQL
- Prisma 6
- OpenAI SDK (provider integration is planned)

## Requirements

- Node.js
- PostgreSQL database (Neon is supported)
- OpenAI API key for the provider integration stage

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the environment template:

   PowerShell:
   ```powershell
   Copy-Item .env.example .env
   ```

3. Set `DATABASE_URL`, `ADMIN_API_KEY`, and (when implementing provider calls) `OPENAI_API_KEY` in `.env`.

4. Apply the Prisma migration and generate the client:

   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

5. Start the development server:

   ```bash
   npm run dev
   ```

6. Check `GET http://localhost:5000/health`.

## Available endpoints

### Health check

`GET /health`

### Create a virtual API key

`POST /api/keys`

Required header:

```http
x-admin-key: <ADMIN_API_KEY>
```

JSON body:

```json
{
  "name": "Development key",
  "budgetLimit": 10
}
```

The original key is returned once at creation. The database stores only its SHA-256 hash.

### Temporary authentication test

`GET /api/test-auth`

Required header:

```http
Authorization: Bearer <VIRTUAL_API_KEY>
```

This endpoint is for development verification and should be removed or disabled before production.

## Security

- Never commit `.env`, provider credentials, database passwords, admin secrets, or generated virtual API keys.
- Commit only `.env.example` with blank placeholders.
- Rotate any credential that has been exposed.
- The current admin-secret mechanism is a minimal take-home implementation, not a full admin identity system.

## Remaining assignment work

Budget reservation and settlement, LLM proxying, usage/spend logging, resilience/fallback, deployment, and the required `DECISIONS.md` and `AI-LOG.md` still need to be implemented and tested. This README describes the current checkpoint, not a completed gateway.
