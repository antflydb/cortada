# Antfly-native visibility campaigns

Cortada treats answer engines as observation sources and Antfly as the evidence system. A normalized campaign import writes versioned campaign, run, prompt, observation and citation documents into the configured Antfly table. The dashboard computes its metrics from those stored documents rather than trusting provider summaries.

## Document model

Every document carries `workspaceId` so the same table remains compatible with Antfly filters and Cloud row-level access policies.

| Document type | Purpose |
| --- | --- |
| `visibility_campaign` | Brand, domains, competitors, personas and topics |
| `visibility_run` | A repeatable baseline with expected and successful observation counts |
| `visibility_prompt` | The exact, versionable buyer question and its persona/topic tags |
| `visibility_observation` | Immutable provider/model answer, mentions, rank and failure metadata |
| `visibility_citation` | Canonical URL evidence with hostname and owned-source classification |

Document identifiers are deterministic. Importing the same campaign/run payload again replaces the same logical documents instead of duplicating them.

## Import a sample

Visibility writes are intentionally disabled when `CORTADA_PUBLIC_DEMO=true`. In a local or Basic-Auth-protected deployment, import the fictional sample:

```bash
curl -X POST http://localhost:3000/api/visibility \
  -H 'Content-Type: application/json' \
  --data-binary @examples/visibility-import.json
```

The route accepts at most 256 KB, shares the ingestion rate limit, validates every field and writes through the server-only Antfly client. Provider adapters should emit this same normalized payload.

`POST /api/visibility/search` retrieves imported answer and citation evidence through Antfly full-text search. When `ANTFLY_ENABLE_EMBEDDINGS=true` and `ANTFLY_EMBEDDING_INDEX` is configured, the same endpoint adds semantic search and fuses the ranked lists with reciprocal rank fusion.

## Current metrics

- Brand visibility: successful observations that mention the target brand / successful observations
- First-choice rate: target-brand rank-one observations / observations where the target brand is visible
- Persona coverage: personas with a target-brand mention / campaign personas
- Model coverage: provider/model pairs with a target-brand mention / provider/model pairs observed
- Owned citation share: citations on a configured brand domain / all citations from successful observations

Failed provider requests remain part of the run record but are excluded from visibility and citation denominators. The dashboard shows successful versus expected observations so failures cannot disappear silently.

## Antfly roadmap

1. Add typed mappings for campaign, run, provider, model, persona, topic and timestamps.
2. Configure an artifact-backed embedding index for response and citation evidence.
3. Add graph relationships for prompt-to-observation, observation-to-brand and observation-to-citation.
4. Materialize time-series campaign summaries with an algebraic index.
5. Ground an Antfly retrieval agent in the stored evidence for explainable change analysis.
6. Offer a read-only, table-scoped Antfly Cloud MCP key for external analysis.

External answer-engine calls remain optional collectors. Storage, enrichment, retrieval, relationships, metrics and evidence access remain Antfly responsibilities.

