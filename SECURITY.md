# Security policy

Please report vulnerabilities privately to the Antfly maintainers rather than opening a public issue.

## Deployment responsibilities

- Use a dedicated Antfly instance token with the narrowest available permissions.
- Configure Cortada access control on every hosted deployment.
- Keep Antfly and future provider credentials server-side.
- Use separate tables and credentials for pull-request previews.
- Review outbound ingestion limits before increasing them.

The ingestion endpoint rejects local/private network targets, nonstandard ports, embedded URL credentials, oversized responses, and unsafe redirects.
