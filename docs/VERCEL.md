# Deploy Cortada to Vercel

## 1. Prepare Antfly Cloud Lite

Create or select a Cloud Lite database and obtain its instance URL and a dedicated instance token. `ANTFLY_URL` may be either the instance root or its full `/db/v1` database API URL; Cortada normalizes both forms. Do not reuse an administrator or personal development token.

## 2. Import the repository

Push your fork to GitHub and import it as a Next.js project in Vercel.

## 3. Configure production variables

Set:

```text
ANTFLY_URL
ANTFLY_API_KEY
ANTFLY_TABLE=default
CORTADA_NAMESPACE=cortada_production
ANTFLY_FULL_TEXT_INDEX=full_text_index_v0
CORTADA_BASIC_AUTH_USER
CORTADA_BASIC_AUTH_PASSWORD
CORTADA_PUBLIC_DEMO=false
```

Optional Antfly-native embeddings:

```text
ANTFLY_ENABLE_EMBEDDINGS=true
ANTFLY_EMBEDDING_INDEX=your_embedding_index
```

Confirm that the selected Cloud Lite runtime supports the model before enabling it.

## 4. Isolate previews

Use a different namespace for trusted preview deployments, such as `cortada_preview`. A namespace is an application-level partition, not a security boundary. Never point untrusted pull-request previews at production tables or production credentials.

## 5. Verify

After deployment:

1. Confirm the site requests Basic authentication.
2. Open `/api/health` and verify Antfly is ready.
3. Ingest a controlled public page.
4. Search for a phrase from that page.
5. Confirm the namespaced source and analysis documents appear in Antfly.

The health endpoint exposes status, mode, embedding configuration, and latency. It never returns credentials or the Antfly endpoint.

## 6. Open a public demo deliberately

Keep Basic Auth enabled while validating a new deployment. Before setting
`CORTADA_PUBLIC_DEMO=true`:

1. Add a distributed rate limit for `/api/ingest` at the Vercel firewall or another trusted edge.
2. Add a separate, higher limit for `/api/search`.
3. Configure spend alerts and review the Antfly key's least-privilege grant.
4. Keep the built-in per-instance limits enabled as defense in depth.
5. Redeploy, verify unauthenticated access, and exercise both 429 paths.

`CORTADA_PUBLIC_DEMO` is intentionally opt-in. Removing the Basic Auth variables without enabling it leaves hosted traffic fail-closed with HTTP 503.
