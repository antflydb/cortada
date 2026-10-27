# Self-host Cortada

Cortada can run as a standard Node.js service or as a Docker container. The included Compose file runs the application; Antfly remains a separate local Lite process or an Antfly Cloud Lite instance.

## Configure Antfly

Copy the example and provide either a local Lite URL or Cloud Lite credentials:

```bash
cp .env.example .env.local
```

For Antfly Cloud, set `ANTFLY_URL` and a dedicated `ANTFLY_API_KEY`. For a local Antfly process used from Docker, set:

```text
ANTFLY_URL=http://host.docker.internal:8080
```

The Compose file maps `host.docker.internal` on Linux as well as Docker Desktop.

## Validate or provision indexes

Install dependencies and validate the configured table and indexes before starting the application:

```bash
npm ci
npm run setup:antfly
```

When embeddings or multimodal pipelines are enabled and a named index is missing, a provisioning administrator can create the published Antfly indexes:

```bash
ANTFLY_SETUP_API_KEY=temporary-provisioning-key npm run setup:antfly -- --create
```

Do not put the provisioning key in `.env.local`, the container image or the running service. The setup command never creates or deletes tables and never drops an existing index.

Visual retrieval requires an Antfly runtime that can serve `antflydb/clipclap`. Durable PDF extraction requires artifact-backed indexes and an available document extraction/OCR runtime. Keep both flags off until `setup:antfly` succeeds. See [Multimodal evidence](MULTIMODAL.md).

## Run with Node.js

Node.js 20.19 or newer is recommended:

```bash
npm ci
npm run build
npm start
```

The service listens on port 3000 by default.

## Run with Docker Compose

Pass `.env.local` to Compose so the same public branding values are available while the browser bundle is built:

```bash
docker compose --env-file .env.local up --build
```

Open `http://localhost:3000`. Rebuild the image after changing any `NEXT_PUBLIC_*` variable.

## Production checklist

1. Put an HTTPS reverse proxy or managed ingress in front of port 3000.
2. Set `CORTADA_BASIC_AUTH_USER` and `CORTADA_BASIC_AUTH_PASSWORD`, or deliberately configure public-demo protections.
3. Keep the runtime Antfly token limited to the selected Cortada table.
4. Add a distributed limit for `/api/ingest`, `/api/search`, and `/api/multimodal/search` before enabling `CORTADA_PUBLIC_DEMO=true`.
5. Configure spend and traffic alerts.
6. Verify `/api/health`, ingest one controlled page, and run one search.

The in-process limiter is defense in depth and is not a distributed serverless or multi-container rate limiter.
