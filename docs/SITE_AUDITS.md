# Site audits and reports

Cortada v1 turns a company URL into a bounded, repeatable evidence workflow rather than an open-ended web crawler.

## Workflow

1. Fetch and validate the submitted public root page.
2. Read same-host sitemap locations from `robots.txt`, falling back to `/sitemap.xml`.
3. Add safe same-host links discovered on the root page.
4. Remove fragments, query variants, non-HTML assets, sign-out routes and robots-disallowed paths.
5. Audit at most the requested 5, 10 or 25 pages in small concurrent batches.
6. Save every successful source, deterministic analysis, asset and multimodal analysis in Antfly.
7. Save an immutable crawl run with failures, page counts and the average score.

The crawl is intentionally same-host and bounded. Redirects are revalidated against Cortada's SSRF policy, and a page that redirects to another host is recorded as a safe partial failure. A missing sitemap or `robots.txt` does not prevent the root page and discovered same-host links from being audited.

## Antfly document model

- `project`: stable company/site identity
- `crawl_run`: immutable run status, timing, counts, failures and average score
- `source`: latest retrievable page evidence
- `analysis`: immutable, versioned page score and recommendations for a run
- `asset`: latest image/PDF metadata linked to a source page
- `multimodal_analysis`: immutable asset-readiness analysis for a run

The latest two crawl runs are compared without changing historical results. Cortada groups recommendation IDs across the latest run to show how many pages share each problem.

Each audited hostname is a project workspace. The project selector writes the active project to `?project=<project-id>`, making a site dashboard bookmarkable and shareable. Overview data, assets, answerability retrieval, multimodal retrieval, visibility evidence and exports are scoped to that project on the server; changing the selector cannot combine evidence from two sites.

## Answerability

The answerability panel sends a customer question to Antfly full-text and optional semantic retrieval. It returns supporting pages and reports whether evidence was found. This is a retrievability test, not an LLM-generated answer or subjective model grade.

## Reports

`/api/report?projectId=<project-id>` renders a branded HTML report with a print/save-PDF action. Add `format=markdown` or `format=json` for portable exports. The application adds the current project automatically. Reports are generated from Antfly evidence at request time and inherit the deployment's white-label product name and primary color.

## Operational limits

Site audits run in a server request with a five-minute maximum duration and a maximum of 25 pages. Larger scheduled crawls should use an external job runner that calls the same ingestion and Antfly repository layer. Before enabling the public demo, use a distributed edge limit for `/api/site-audit` in addition to Cortada's built-in per-instance limit.
