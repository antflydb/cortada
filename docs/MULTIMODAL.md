# Multimodal evidence

Cortada treats images and PDFs as evidence, not decorations. This feature is additive to the versioned 100-point AEO audit: changing a multimodal model or index never changes a historical AEO score.

## What works in every deployment

Every page audit discovers at most 50 images and 20 PDF links, resolves and deduplicates their URLs, and writes them to Antfly as `asset` documents. Cortada records alt text, captions or nearby context, link labels, dimensions when declared, source identity, and whether the asset host is approved for indexing.

The deterministic multimodal readiness report measures useful image alt-text coverage, caption or nearby-context coverage, descriptive PDF link coverage, and media-host approval gaps. It has its own score and findings and never modifies the core AEO audit.

## Antfly visual retrieval

The checked-in [`antfly.visual-index.json`](../config/antfly.visual-index.json) uses `antflydb/clipclap`, `remoteMedia`, partial coverage, and cosine distance. ClipClap places text and images in one vector space, so a query such as “diagram showing private deployment” can retrieve a matching image without an external model API.

Enable it only after the target runtime can serve the model and the index exists:

```text
ANTFLY_ENABLE_MULTIMODAL=true
ANTFLY_VISUAL_INDEX=aeo_visual_v1
```

The audited page's own hostname is approved automatically. Add external CDN hosts only when trusted:

```text
CORTADA_MEDIA_HOST_ALLOWLIST=cdn.example.com,images.example.com
```

This application-level allowlist limits which discovered assets enter the visual index. Also configure Antfly's `remote_content` policy with the narrowest matching host allowlist. An omitted Antfly allowlist is not equivalent to deny-all.

## Durable PDF evidence

The checked-in [`antfly.pdf-text-index.json`](../config/antfly.pdf-text-index.json) defines a `document_extraction` asset producer and a chunk stream. Antfly downloads a PDF from the `pdfUrl` field, persists page units and chunks, extracts born-digital text, and can OCR pages without native text when the runtime has its document reader available. Failed extraction remains visible as repair debt instead of silently disappearing.

Enable it only after the runtime accepts the artifact-backed index:

```text
ANTFLY_ENABLE_PDF_EXTRACTION=true
ANTFLY_PDF_TEXT_INDEX=aeo_pdf_text_v1
```

## Provision and verify

Use a temporary provisioning credential, never the deployed application key:

```bash
ANTFLY_SETUP_API_KEY=temporary-provisioning-key npm run setup:antfly -- --create
```

The setup command creates only missing configured indexes. It never drops tables or indexes. It fails with a capability/model error when the selected Lite or Cloud Lite runtime cannot execute a requested pipeline; leave that feature flag off in that case.

After enabling a feature, rebuild or redeploy, audit a controlled page containing a useful image and PDF, and search the multimodal panel by meaning. `/api/health` reports whether visual and PDF retrieval are enabled without exposing endpoint or credential details.

PDF artifact retrieval uses the namespaced parent asset key as `filter_prefix`. Derived page and chunk artifacts inherit that prefix even though they do not duplicate arbitrary parent fields such as `workspaceId`; a field-only namespace filter would exclude the artifacts it is intended to protect.
