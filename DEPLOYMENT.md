# Deployment (Render)

This repository includes a Render Blueprint in `render.yaml`.

## Before deploying

1. Push the repository to GitHub.
2. Create/confirm a reachable PostgreSQL database (Neon is supported).
3. In Render, create a new Blueprint and select this repository.
4. Set the secret environment variables in the Render dashboard:
   - `DATABASE_URL`
   - `ADMIN_API_KEY` (generate a new long random secret)
   - `OPENAI_API_KEY`
   - Optional `GEMINI_API_KEY`
5. Review the pricing environment variables and set the current USD-per-million-token rates for the models/accounts you use.
6. Deploy. The build command generates Prisma Client and applies committed migrations.
7. Verify `https://<your-render-service>/health`.

## Smoke tests after deployment

Create a virtual key using `POST /api/keys` with `x-admin-key`. Then call `POST /v1/chat/completions` with `Authorization: Bearer <returned-gw-key>`. Check usage through `GET /api/usage` with the admin header.

Do not put secrets in GitHub variables committed to the repository. Configure them only in Render's secret environment settings.

A live deployment URL is not included in this repository until an authorized Render service is created and deployed.
