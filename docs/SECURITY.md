# Security model

- ASP.NET Core Identity handles password hashing and session lifecycle; production cookies are `HttpOnly`, `Secure`, strict SameSite and named with the `__Host-` prefix. Local HTTP development uses a separate non-secure cookie name.
- Every project/version/scenario/share/report query verifies the authenticated owner. Tests cover unauthenticated access and cross-user IDOR.
- Project JSON has byte/depth/schema limits. Names use data APIs, not HTML injection. Share tokens use 256 random bits; only a peppered SHA-256 hash is stored.
- Sensitive/auth/share/report routes are rate limited after authentication so signed-in requests are partitioned per user and anonymous requests per IP. Errors use Problem Details without stack traces. Logs contain resource IDs, not tokens, passwords or config payloads.
- Nginx/API set CSP, no-sniff, frame/object/base restrictions, referrer and permissions policy. API responses are never cached by the service worker.
- Data Protection keys and report artifacts require persistent, access-controlled volumes in production. Soft-deleted projects and their private report artifacts are purged after the configured retention window.
- Production secrets belong in the platform secret manager. `.env.example` contains placeholders only.

Report vulnerabilities privately to the deployment owner. Rotate the share-token pepper only with a plan to invalidate all existing shares. Dependency audit and authorization tests are release gates.
