# AI Usage Log

This file records how AI assistance was used during development. It should be read as a description of the actual workflow, not as a claim that AI-generated code was accepted without review.

## 1. Tools and models used

- **ChatGPT (OpenAI):** used as a coding and reasoning assistant to discuss the gateway architecture, explain Express middleware and Prisma/PostgreSQL behavior, review JavaScript/SQL snippets, troubleshoot setup and authentication errors, and help draft technical documentation.
- **GitHub repository inspection:** source files and configuration were reviewed directly to check whether suggestions matched the implementation.
- **Render and Neon documentation/UI:** used for deployment setup and database configuration. The deployment still needs to be verified against the actual live service before submission.

## 2. One place AI was wrong or misleading

During deployment discussion, the initial suggestion was to host the backend on Render and the frontend separately on Vercel. That was unnecessary for this repository: inspecting `src/app.js` showed that Express already serves the `public/` directory with `express.static("public")`, and the browser code calls same-origin paths such as `/api/keys` and `/v1/chat/completions`. I corrected the deployment plan to use one Render service for the gateway. This is a concrete example of checking advice against the repository instead of accepting it blindly.

## 3. One suggestion I overrode

I chose not to split the frontend and backend across separate hosting providers. The assignment's important deliverable is a deployed gateway URL, and the existing Express app can serve the static console and API from one origin. Keeping one service reduces configuration and CORS work. The frontend is not a scored requirement, so a separate frontend deployment would add work without improving the core submission.

## 4. How I stayed in control of generated or AI-assisted code

- I reviewed the relevant source files rather than treating generated code as authoritative.
- For virtual keys, I checked that the server generates random keys, stores only their SHA-256 hashes, and returns the plaintext only at creation time.
- For authentication, I checked the Bearer-header parsing and database lookup.
- For budget enforcement, I inspected the conditional SQL reservation and the settlement transaction. This review exposed an important limitation: settlement adds actual provider cost after releasing the reservation, so an underestimated request can exceed the configured budget. The documentation calls this out rather than claiming a strict hard cap.
- For provider calls, I checked that OpenAI and Gemini credentials are read server-side from environment variables and that the browser sends only a gateway-issued virtual key.
- I used local endpoint/database checks during development as recorded in the project history. Before submission, I still need to complete the production smoke tests listed in DEPLOYMENT.md.

## 5. Something learned during the work

The work required understanding how a conditional SQL UPDATE can be used as an atomic budget reservation, rather than doing a separate read/check/write in application code. I also worked through Prisma/PostgreSQL connection and migration setup and the difference between an admin secret header and a caller's Bearer virtual key. I used the database schema, service code, error responses, and local requests to build that understanding.

## 6. Verification status

Previously confirmed during development: database connectivity, health response, virtual-key creation, and virtual-key authentication with a Bearer token.

Not claimed as complete until tested against the deployed service:
- production database migration;
- over-budget rejection and simultaneous requests;
- budget settlement and reservation release, including underestimated-cost behavior;
- OpenAI success and provider failure;
- Gemini fallback and missing Gemini configuration;
- per-key usage totals;
- live Render health and chat-completion smoke tests.

## 7. Honesty note

AI assistance contributed to implementation and documentation. The final author is responsible for understanding the code and should be prepared to explain the key-generation, authentication, reservation, settlement, provider fallback, and persistence paths in a follow-up discussion. Any personal details in this log should be edited if they do not accurately describe the work actually performed.
