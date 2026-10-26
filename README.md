# Cortada Community

Cortada is an open-source Answer Engine Optimization starter powered by Antfly. It ingests public website pages, stores the source evidence in Antfly, produces a deterministic and inspectable AEO audit, and searches the indexed evidence without requiring an external model provider.

The same application works with local Antfly Lite and Antfly Cloud Lite. The browser never receives Antfly credentials.

## V1 capabilities

- Public-page ingestion with redirect-aware SSRF protection and a 2 MB response limit
- Deterministic 100-point AEO audit
- Antfly-native visibility campaigns with immutable prompts, observations, citations and evidence retrieval
- Namespaced source and analysis documents in an Antfly table
- Full-text retrieval, with optional Antfly-native embeddings and hybrid RRF search
- Vercel-ready Next.js application
- Fail-closed Basic access control for hosted deployments
- Opt-in public-demo mode with bounded request bodies and per-client throttles
- No OpenAI, Anthropic, or Perplexity dependency

Visibility imports are optional and provider-neutral. Local or protected deployments can import normalized answer-engine observations; public-demo deployments expose the evidence dashboard read-only. See [Visibility campaigns](docs/VISIBILITY_CAMPAIGNS.md).

## Architecture

```text
Browser
  ↓
Next.js on Vercel
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

4. Start Cortada:

   ```bash
   npm run dev
   ```

5. Open `http://localhost:3000` and analyze a public website page.

The starter uses the `default` table created by Antfly Lite. Set `ANTFLY_ENABLE_EMBEDDINGS=true` only after configuring a compatible embedding index on the target runtime.

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
| `CORTADA_BASIC_AUTH_USER` | Vercel | Deployment access username |
| `CORTADA_BASIC_AUTH_PASSWORD` | Vercel | Deployment access password |
| `CORTADA_PUBLIC_DEMO` | No | Set to `true` only after configuring public traffic controls |
| `CORTADA_INGEST_RATE_LIMIT` | No | Per-instance ingestion budget; defaults to 5 per 10 minutes |
| `CORTADA_SEARCH_RATE_LIMIT` | No | Per-instance search budget; defaults to 30 per minute |

Never use `NEXT_PUBLIC_` for Antfly credentials.

## Vercel

Import the GitHub repository into Vercel and configure the variables above for production. Use a distinct `CORTADA_NAMESPACE` for trusted preview deployments. Never give untrusted pull-request previews a production Antfly credential. Cortada refuses hosted traffic when Basic access control is missing unless `CORTADA_PUBLIC_DEMO=true` is explicitly set.

The built-in request limiter is defense in depth for a single application instance. Before enabling a public demo, add a distributed rate limit at Vercel's firewall or another trusted edge and keep spend alerts enabled.

This is a Vercel deployment reference, not yet a Vercel Marketplace integration. See [Vercel deployment](docs/VERCEL.md).

## Roadmap

V1 deliberately proves the Antfly data and retrieval architecture before adding answer-engine providers. The visibility document model and evidence dashboard are available now; live collectors remain optional adapters. See [Visibility campaigns](docs/VISIBILITY_CAMPAIGNS.md) and [Post-V1 providers](docs/POST_V1_PROVIDERS.md).

## Development checks

```bash
npm run check
```

## License

Apache-2.0
