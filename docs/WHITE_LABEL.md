# White-label Cortada

Cortada is a complete AEO/GEO product with a brand-neutral application shell. A downstream deployment can replace its identity, visual system, product promotion and audit profile without modifying application code while retaining Antfly as the evidence and retrieval layer.

## Public identity

Set these variables before a Vercel or Docker build:

```text
NEXT_PUBLIC_APP_NAME=Your Product
NEXT_PUBLIC_APP_MARK=Y
NEXT_PUBLIC_APP_LOGO_URL=/your-logo.svg
NEXT_PUBLIC_APP_EYEBROW=Answer engine intelligence
NEXT_PUBLIC_APP_HEADLINE=Your AEO headline.
NEXT_PUBLIC_APP_DESCRIPTION=Your product description.
NEXT_PUBLIC_APP_DEPLOY_NOTE=Your deployment note.
NEXT_PUBLIC_APP_FOOTER=Your Company
NEXT_PUBLIC_APP_TITLE=Your Product — AEO intelligence
NEXT_PUBLIC_APP_META_DESCRIPTION=Your search and social description.
NEXT_PUBLIC_REPOSITORY_URL=https://github.com/your-org/your-product
NEXT_PUBLIC_LICENSE_NAME=Apache-2.0
NEXT_PUBLIC_BRAND_PRIMARY="#176b4d"
NEXT_PUBLIC_BRAND_ACCENT="#d97732"
NEXT_PUBLIC_BRAND_BACKGROUND="#f6f8f7"
NEXT_PUBLIC_BRAND_SURFACE="#ffffff"
NEXT_PUBLIC_BRAND_TEXT="#17211e"
NEXT_PUBLIC_BRAND_MUTED="#64706c"
NEXT_PUBLIC_BRAND_BORDER="#dce2df"
NEXT_PUBLIC_THEME_FONT=sans
NEXT_PUBLIC_THEME_CORNERS=soft
NEXT_PUBLIC_SHOW_PROJECT_LINKS=false
NEXT_PUBLIC_SHOW_ARCHITECTURE=false
NEXT_PUBLIC_SHOW_ANTFLY_ATTRIBUTION=true
```

Colors must be six-digit hex values. `NEXT_PUBLIC_THEME_FONT` accepts `sans` or `editorial`; `NEXT_PUBLIC_THEME_CORNERS` accepts `square`, `soft` or `rounded`. A logo may be a root-relative asset in `public/` or an HTTPS URL. When no logo is set, the configured mark is shown.

The three visibility switches separate the reusable product experience from template promotion:

- `NEXT_PUBLIC_SHOW_PROJECT_LINKS` controls GitHub, Vercel, self-hosting and open-source copy.
- `NEXT_PUBLIC_SHOW_ARCHITECTURE` controls the reference-architecture section.
- `NEXT_PUBLIC_SHOW_ANTFLY_ATTRIBUTION` controls the visible Antfly attribution in the app and exported reports. Cortada keeps this on because it is an Antfly showcase; a downstream deployment can choose its own presentation subject to its agreements and branding requirements.

The default `sans` and `soft` theme is deliberately neutral. Use `editorial`, a stronger palette or rounded corners to create a more distinctive branded deployment. The same settings theme the application shell and HTML/print reports; downloaded report filenames derive from the configured product name.

Rebuild after changing public variables because Next.js includes them in the browser bundle.

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
