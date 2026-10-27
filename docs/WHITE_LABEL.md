# White-label Cortada

Cortada is an opinionated AEO/GEO product, not a generic application framework. A downstream deployment can replace the public identity and tune the audit profile without modifying application code while retaining Antfly as the evidence and retrieval layer.

## Public identity

Set these variables before a Vercel or Docker build:

```text
NEXT_PUBLIC_APP_NAME=Your Product
NEXT_PUBLIC_APP_MARK=Y
NEXT_PUBLIC_APP_EYEBROW=Answer engine intelligence
NEXT_PUBLIC_APP_HEADLINE=Your AEO headline.
NEXT_PUBLIC_APP_DESCRIPTION=Your product description.
NEXT_PUBLIC_APP_TITLE=Your Product — AEO intelligence
NEXT_PUBLIC_APP_META_DESCRIPTION=Your search and social description.
NEXT_PUBLIC_REPOSITORY_URL=https://github.com/your-org/your-product
NEXT_PUBLIC_LICENSE_NAME=Apache-2.0
NEXT_PUBLIC_BRAND_PRIMARY="#176b4d"
NEXT_PUBLIC_BRAND_ACCENT="#e66b2e"
```

The two colors must be six-digit hex values. Rebuild after changing public variables because Next.js includes them in the browser bundle.

Set `CORTADA_FETCH_USER_AGENT` to identify the deployed product to every site it audits, or leave it blank to derive an identity from the configured name and repository. Do not leave another product's name in this value.

## One image per brand

`NEXT_PUBLIC_*` values are compiled into the browser bundle. The Docker and Compose paths therefore produce one image per brand: `docker run -e NEXT_PUBLIC_APP_NAME=...` cannot rebrand an image that has already been built. Compose passes these values as build arguments and loads server-only settings from `.env.local` at runtime.

This is intentional for a forkable product template and keeps the homepage statically prerendered. If a future distribution needs one immutable image that customers rebrand at deployment time, move the public product configuration behind server-only variables and render it dynamically. That is a deployment-model change, not a backward-compatible environment tweak.

## Audit profiles

`CORTADA_AUDIT_PROFILE` selects a named profile from [`config/audit-profiles.json`](../config/audit-profiles.json):

- `standard-v1` preserves Cortada's published baseline.
- `authority-v1` gives more weight to structured data, verifiable facts and citations.

Each profile is versioned, must define every signal, and must total 100 points. The selected profile ID, name and version are stored with every new audit so results remain explainable after configuration changes. Add a new profile rather than changing the meaning of a version that has already produced customer results.

## Stable internal contract

The existing `CORTADA_*` server variables remain intentionally stable for backward compatibility. They are implementation settings and are never shown to end users. A future shared package should introduce a neutral contract only after a second product proves the reusable boundary.

## Licensing and names

Apache-2.0 permits modification, redistribution and private downstream forks subject to its terms. It does not grant trademark rights. Replace Cortada and third-party names, marks and logos in a differently branded distribution unless you have permission to use them. Preserve required copyright and license notices.

## Security remains part of the product

White-labeling does not change the deployment boundary:

- Antfly credentials stay server-side and must never use `NEXT_PUBLIC_`.
- Use a dedicated, least-privilege Antfly token for the running application.
- Use a temporary provisioning credential only for index setup.
- Keep Basic Auth enabled until distributed public traffic limits and spend alerts are configured.
- Treat namespaces as application organization, not as a security boundary.
