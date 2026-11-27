# Deployment (Render + Neon)

This repository includes a Render Blueprint in `render.yaml`. The Express server serves both the API and the static files in `public/`, so a separate frontend host is not required. The deployed base URL is the gateway API URL as well as the static console URL.

## 1. Create a free PostgreSQL database

1. Create a PostgreSQL project in Neon.
2. Copy its connection string (use the pooled connection string if you choose Neon pooling).
3. Keep the connection string private; it is the value for `DATABASE_URL`.

## 2. Configure the Render Blueprint

1. Push the latest repository changes to GitHub.
2. Open the Render dashboard and choose **New → Blueprint**.
3. Connect the GitHub repository `Bikesh-1/RentOk-Task` and select the `main` branch.
4. Render reads the committed `render.yaml`. Confirm that the service plan is the free plan before applying it.
5. Provide the secret values requested by the Blueprint:
   - `DATABASE_URL`: Neon PostgreSQL connection string.
   - `ADMIN_API_KEY`: a new, long, random admin secret.
   - `OPENAI_API_KEY`: provider API key.
   - `GEMINI_API_KEY`: optional; required only if Gemini fallback is wanted.
6. Review the pricing environment variables in `render.yaml` and set them to the current rates for the provider/model configuration.
7. Apply the Blueprint and wait for the build and deploy to finish.

The Blueprint build command is:

```bash
npm ci && npx prisma generate && npx prisma migrate deploy
```

The start command is `npm start`. Render supplies the `PORT` environment variable. Do not hardcode a production port.

## 3. Verify the deployment

After Render gives the service a public URL, set it as `BASE_URL`:

```bash
BASE_URL=https://rentok-llm-gateway-u6fe.onrender.com/
```

Health check:

```bash
curl "$BASE_URL/health"
```

Expected response:

```json
{
  "success": true,
  "message": "RentOk LLM Gateway is running"
}
```

## 4. End-to-end smoke test

Create a key:

```bash
curl -X POST "$BASE_URL/api/keys" \
  -H "Content-Type: application/json" \
  -H "x-admin-key: $ADMIN_API_KEY" \
  -d '{"name":"Submission smoke test","budget":1}'
```

Copy the returned `apiKey` into `VIRTUAL_API_KEY` securely. Then call the gateway:

```bash
curl -X POST "$BASE_URL/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $VIRTUAL_API_KEY" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role":"user","content":"Reply with the word hello"}],
    "max_tokens": 32
  }'
```

Finally, check usage:

```bash
curl "$BASE_URL/api/usage" \
  -H "x-admin-key: $ADMIN_API_KEY"
```

Do not put secrets in source files, GitHub commits, screenshots, or the submission text. Configure them in Render's environment settings.

## 5. Deployment notes

- A free Render web service may spin down after inactivity and take time to respond to the first request after sleeping. Confirm the current free-plan limits in Render before relying on it for a live demo.
- The PostgreSQL database in this deployment plan is hosted separately by Neon.
- The live URL is intentionally not filled in here. Add the actual Render URL only after the service has deployed and the health and chat smoke tests have passed.
- If deployment fails, inspect the Render build/runtime logs. Common causes include an incorrect database URL, missing provider/admin secrets, or a failed Prisma migration.
