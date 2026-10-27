# Cortada Community

Cortada is a deployable, open-source Answer Engine Optimization and Generative Engine Optimization product powered by Antfly. It ingests public website pages, stores the source evidence in Antfly, produces a deterministic and inspectable audit, and searches the indexed evidence without requiring a separate model API key or inference integration.

Run it as Cortada or rebrand it for your own company. The same application works with local Antfly Lite and Antfly Cloud Lite, on Vercel or in Docker. The browser never receives Antfly credentials.

[Live demo](https://cortada.ai) · [Deploy with Vercel](https://vercel.com/new/clone?repository-url=https://github.com/antflydb/cortada) · [White-label guide](docs/WHITE_LABEL.md) · [Self-hosting guide](docs/SELF_HOSTING.md)

## V1 capabilities

- Public-page ingestion with redirect-aware SSRF protection and a 2 MB response limit
- Deterministic, versioned 100-point AEO audit profiles
- Antfly-native visibility campaigns with immutable prompts, observations, citations and evidence retrieval
- Namespaced source and analysis documents in an Antfly table
- Full-text retrieval, with optional Antfly-native embeddings and hybrid RRF search
- Bounded image/PDF discovery, first-class Antfly asset records, and a separate multimodal readiness audit
- Feature-gated Antfly ClipClap visual retrieval and durable PDF page extraction/OCR
- Vercel-ready and container-ready Next.js application
- Fail-closed Basic access control for hosted deployments
- Opt-in public-demo mode with bounded request bodies and per-client throttles
- No separate OpenAI, Anthropic, or Perplexity key required for V1 retrieval

Visibility imports are optional and provider-neutral. Local or protected deployments can import normalized answer-engine observations; public-demo deployments expose the evidence dashboard read-only. See [Visibility campaigns](docs/VISIBILITY_CAMPAIGNS.md).

Multimodal discovery and deterministic readiness checks work without an inference model. Cross-modal image retrieval and durable PDF extraction require compatible Antfly runtime capabilities and are deliberately opt-in. See [Multimodal evidence](docs/MULTIMODAL.md).

## Architecture

```text
Browser
  ↓
Next.js on Vercel or Docker
  ├─ protected server routes
  ├─ deterministic AEO analyzer
  └─ server-only Antfly SDK
          ↓
Antfly Lite locally or Antfly Cloud Lite in production
```

## Quick start

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the example configuration:

   ```bash
   cp .env.example .env.local
   ```

3. Create and serve a local Antfly Lite database in a second terminal:

   ```bash
   mkdir -p .data
   antfly lite init .data/cortada.aflite
   antfly lite serve .data/cortada.aflite --addr 127.0.0.1:8080
   ```

   Run `init` only once. To use Antfly Cloud Lite instead, set `ANTFLY_URL` and `ANTFLY_API_KEY` in `.env.local` and skip these commands.

4. Validate the Antfly table and indexes:

   ```bash
   npm run setup:antfly
   ```

5. Start Cortada:

   ```bash
   npm run dev
   ```

6. Open `http://localhost:3000` and analyze a public website page.

The product uses the `default` table created by Antfly Lite. Set `ANTFLY_ENABLE_EMBEDDINGS=true` only after configuring a compatible embedding index on the target runtime. `npm run setup:antfly -- --create` can create the published embedding index when run with a temporary provisioning key.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `ANTFLY_URL` | Yes | Local Lite or Cloud Lite instance URL; `/db/v1` is added when absent |
| `ANTFLY_API_KEY` | Cloud | Instance token, without `Bearer` |
| `ANTFLY_TABLE` | Yes | Antfly table containing Cortada documents; defaults to `default` |
| `CORTADA_NAMESPACE` | Yes | Isolates Cortada documents inside the table |
| `ANTFLY_FULL_TEXT_INDEX` | Yes | Full-text index; defaults to `full_text_index_v0` |
| `ANTFLY_ENABLE_EMBEDDINGS` | No | Enables Antfly embeddings and hybrid RRF search |
| `ANTFLY_EMBEDDING_INDEX` | When enabled | Existing Antfly embedding index name |
| `ANTFLY_ENABLE_MULTIMODAL` | No | Enables Antfly text-to-image retrieval |
| `ANTFLY_VISUAL_INDEX` | When enabled | ClipClap visual index name |
| `ANTFLY_ENABLE_PDF_EXTRACTION` | No | Enables durable PDF page extraction and full-text retrieval |
| `ANTFLY_PDF_TEXT_INDEX` | When enabled | Artifact-backed PDF text index name |
| `CORTADA_MEDIA_HOST_ALLOWLIST` | No | Additional comma-separated image hosts Antfly may fetch |
| `CORTADA_BASIC_AUTH_USER` | Vercel | Deployment access username |
| `CORTADA_BASIC_AUTH_PASSWORD` | Vercel | Deployment access password |
| `CORTADA_PUBLIC_DEMO` | No | Set to `true` only after configuring public traffic controls |
| `CORTADA_INGEST_RATE_LIMIT` | No | Per-instance ingestion budget; defaults to 5 per 10 minutes |
| `CORTADA_SEARCH_RATE_LIMIT` | No | Per-instance search budget; defaults to 30 per minute |
| `CORTADA_AUDIT_PROFILE` | No | Selects `standard-v1` or `authority-v1` |
| `CORTADA_FETCH_USER_AGENT` | No | Identifies your deployment to websites it audits |
| `NEXT_PUBLIC_APP_*` | No | Public white-label name and content settings |
| `NEXT_PUBLIC_BRAND_*` | No | Public six-digit hex theme colors |

Only branding belongs in `NEXT_PUBLIC_` variables. Never use that prefix for Antfly credentials.

## White-label and self-host

Branding, product copy, theme colors, crawler identity and the active audit profile are configuration surfaces. See [White-labeling](docs/WHITE_LABEL.md) for the supported contract and [Self-hosting](docs/SELF_HOSTING.md) for Node and Docker deployment.

## Vercel

Import the GitHub repository into Vercel and configure the variables above for production. Use a distinct `CORTADA_NAMESPACE` for trusted preview deployments. Never give untrusted pull-request previews a production Antfly credential. Cortada refuses hosted traffic when Basic access control is missing unless `CORTADA_PUBLIC_DEMO=true` is explicitly set.

The built-in request limiter is defense in depth for a single application instance. Before enabling a public demo, add a distributed rate limit at Vercel's firewall or another trusted edge and keep spend alerts enabled.

This includes a Vercel deployment reference, not yet a Vercel Marketplace integration. See [Vercel deployment](docs/VERCEL.md).

## Roadmap

V1 deliberately proves the Antfly data and retrieval architecture before adding answer-engine providers. The visibility document model and evidence dashboard are available now; live collectors remain optional adapters. See [Visibility campaigns](docs/VISIBILITY_CAMPAIGNS.md) and [Post-V1 providers](docs/POST_V1_PROVIDERS.md).

## Development checks

```bash
npm run check
```

## License

Apache-2.0. This intentionally permits private downstream forks and commercial white-label deployments, subject to the license terms. The license covers code, not trademark rights in project or company names and logos.
