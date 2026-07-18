# Release checklist and evidence

Date: 2026-07-18. Candidate artifacts: `ac-simulator-web:rc` and `ac-simulator-api:rc` built locally. No production environment credentials were supplied.

## Automated gates

- [x] Frontend strict typecheck
- [x] Frontend unit/invariant/worker/persistence/component tests — 28/28
- [x] Frontend production build
- [x] Bundle budget — 598,146 bytes gzip / 650 KiB
- [x] Dependency audit — 0 vulnerabilities
- [x] Desktop and 360 px mobile vertical-slice E2E, English/imperial persistence, and horizontal-overflow assertion
- [x] Real authenticated API/browser E2E — auth, server project, offline reconnect, two simulations/scenarios, version, read-only share
- [x] Automated accessibility — axe serious = 0 on desktop/mobile test routes
- [x] Backend Release integration tests — 4/4, including unauthorized and cross-user IDOR, revision conflict, share revoke, account export/delete
- [x] EF SQLite migration apply and SQL Server idempotent script generation
- [x] Web/API Docker image builds
- [x] Nginx syntax and Docker Compose validation

## Mandatory gates still open

- [ ] Documented manual keyboard and screen-reader core-flow pass
- [ ] Chrome/Edge/Firefox/Safari two-current-version compatibility pass
- [ ] Android Chrome and iOS Safari physical-device pass
- [ ] Target-device 3D FPS/main-thread/memory profile, including 20 edit/simulate lifecycles
- [ ] Staging deployed from the recorded image digests
- [ ] Production-shaped SQL Server staging UAT and load/security smoke
- [ ] Monitoring receives frontend/API/database/report signals and alert tests
- [ ] Backup restore drill recorded
- [ ] Rollback drill recorded
- [ ] Production deployment and smoke

The environment gates require registry and deployment credentials, DNS/TLS, SQL Server, a monitoring destination, and a backup store. Local Docker success cannot substitute for those checks.

## Decision

**NO-GO for production promotion.** The locally verifiable engineering gates pass, but the open localization/manual compatibility gates and external staging/operations gates are mandatory under the supplied plan.
