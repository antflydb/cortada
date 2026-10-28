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
CORTADA_AUDIT_PROFILE=standard-v1
```

Set the `NEXT_PUBLIC_APP_*` and `NEXT_PUBLIC_BRAND_*` variables from [the white-label guide](WHITE_LABEL.md) before the deployment build when publishing a differently branded product.

Optional Antfly-native embeddings:

```text
ANTFLY_ENABLE_EMBEDDINGS=true
ANTFLY_EMBEDDING_INDEX=your_embedding_index
```

Confirm that the selected Cloud Lite runtime supports the model before enabling it. A compatible
Antfly-managed index can be created from the Antfarm **Indexes** screen in Raw JSON mode:

```json
{
  "name": "aeo_evidence_v1",
  "type": "embeddings",
  "dimension": 384,
  "coverage_policy": "partial",
  "template": "{{#if (eq type \"source\")}}Brand: {{brandName}} | Title: {{title}} | URL: {{url}} | Description: {{description}} | Content: {{text}}{{/if}} {{#if (eq type \"visibility_prompt\")}}Persona: {{personaId}} | Topics: {{#each topicIds}}{{this}} {{/each}} | Buyer question: {{text}}{{/if}} {{#if (eq type \"visibility_observation\")}}Persona: {{personaId}} | Topics: {{#each topicIds}}{{this}} {{/each}} | Provider: {{providerId}} | Model: {{modelId}} | Answer: {{answer}} | Mentions: {{#each mentions}}{{brandName}} rank {{rank}}; {{/each}}{{/if}} {{#if (eq type \"visibility_citation\")}}Citation: {{title}} | Domain: {{hostname}} | URL: {{url}} | Source type: {{sourceType}}{{/if}}",
  "embedder": {
    "provider": "antfly",
    "model": "BAAI/bge-small-en-v1.5"
  },
  "chunker": {
    "provider": "antfly",
    "model": "fixed",
    "max_chunks": 32,
    "text": {
      "target_tokens": 200,
      "overlap_tokens": 25
    }
  }
}
```

The canonical checked-in definition is [`config/antfly.embedding-index.json`](../config/antfly.embedding-index.json). A provisioning administrator can also create a missing configured index with `npm run setup:antfly -- --create`; use `ANTFLY_SETUP_API_KEY` temporarily and do not give that permission to the deployed application.

Optional Antfly-native multimodal retrieval is configured separately:

```text
ANTFLY_ENABLE_ASSET_SEARCH=true
ANTFLY_ASSET_INDEX=aeo_asset_metadata_v1
ANTFLY_ENABLE_MULTIMODAL=true
ANTFLY_VISUAL_INDEX=aeo_visual_v1
ANTFLY_ENABLE_PDF_EXTRACTION=true
ANTFLY_PDF_TEXT_INDEX=aeo_pdf_text_v1
CORTADA_MEDIA_HOST_ALLOWLIST=trusted-cdn.example.com
```

Enable the asset metadata index on runtimes with the standard BGE model. Do not enable the visual or PDF variables until the target Cloud Lite instance both accepts the checked-in definition and produces a successful vector or artifact manifest. The application always discovers and audits asset metadata; these flags control model-backed retrieval and durable extraction. See [Multimodal evidence](MULTIMODAL.md).

`coverage_policy: "partial"` is intentional: Cortada keeps audit documents in the same table, but
the evidence index only embeds source and visibility records. In hybrid requests, Cortada passes
only the vector index in `indexes`; Antfly automatically uses the table's active full-text index
for the BM25 side of RRF.

## 4. Isolate previews

Use a different namespace for trusted preview deployments, such as `cortada_preview`. A namespace is an application-level partition, not a security boundary. Never point untrusted pull-request previews at production tables or production credentials.

## 5. Verify

After deployment:

1. Confirm the site requests Basic authentication.
2. Open `/api/health` and verify Antfly is ready.
3. Audit a controlled public site with a five-page limit.
4. Test a customer question and confirm Antfly returns supporting pages.
5. Open `/api/report` and verify the site-wide findings and print view.
6. Confirm the namespaced project, crawl-run, source, analysis, asset, and multimodal-analysis documents appear in Antfly.

The health endpoint exposes status, mode, embedding configuration, and latency. It never returns credentials or the Antfly endpoint.

## 6. Open a public demo deliberately

Keep Basic Auth enabled while validating a new deployment. Before setting
`CORTADA_PUBLIC_DEMO=true`:

1. Add a distributed rate limit for `/api/site-audit` and `/api/ingest` at the Vercel firewall or another trusted edge.
2. Add a separate, higher limit for `/api/search`.
3. Configure spend alerts and review the Antfly key's least-privilege grant.
4. Keep the built-in per-instance limits enabled as defense in depth.
5. Redeploy, verify unauthenticated access, and exercise both 429 paths.

`CORTADA_PUBLIC_DEMO` is intentionally opt-in. Removing the Basic Auth variables without enabling it leaves hosted traffic fail-closed with HTTP 503.
