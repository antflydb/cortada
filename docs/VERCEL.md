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
