# Implementation progress and verification evidence

Date: 2026-07-18. This checklist maps to the supplied production plan. “Implemented” means the repository contains the feature and its available local verification passed; it does not substitute for the external release gates listed below.

## Phase checklist

- [x] Phase 1 — Repository survey
  - The repository was empty: no Git metadata, application, tests, conventions, or `AGENTS.md`. Node/npm and Docker were available; the host .NET SDK was not.
  - A greenfield npm workspace, React/Vite web client, and modular ASP.NET Core 8 API were established.
- [x] Phase 2 — Workflow, state, and persistence
  - SETUP and SIMULATION are separate routes/states. Confirmation deep-clones and freezes a versioned snapshot; editing destroys the current run and the next worker starts at minute 0.
  - Zustand history, undo/redo, autosave, corrupt-data quarantine, and schema migration tests are present.
- [x] Phase 3 — Floor-plan editor and multiple rooms
  - One-to-six rectangular rooms, adjacency, grid/snap, selection, bounds, overlap validation, 2D editing, and responsive inspector are implemented.
- [x] Phase 4 — Openings, furniture, and AC placement
  - Internal/external doors and windows with open/closed state, furniture library, wall AC placement, clearance/relationship validation, and review are implemented.
- [x] Phase 5 — Calculation engine
  - Deterministic per-room and total heat-load calculation, insulation/opening/internal/infiltration contributions, capacity status, metric/imperial presentation, and golden invariants are tested.
- [x] Phase 6 — 3D preview and simulation scene
  - Lazy Three/R3F scene, walls/openings/furniture/AC, camera controls, 2D fallback, adaptive DPR, and separate setup/simulation scene modes are implemented.
- [x] Phase 7 — AC airflow
  - Directional qualitative airflow and fan/capacity influence run in the worker model; furniture attenuates the field.
- [x] Phase 8 — Multi-room thermal simulation
  - Bounded adaptive `Float32Array` room grids, diffusion, gains, AC sinks, outside exchange, open/closed inter-room exchange, deterministic stepping, pause/jump/reset, and worker disposal are implemented.
- [x] Phase 9 — Thermal overlay
  - Hot/cold slice, legend, opacity/height controls, room summaries, exact slice-center inspect value, and PNG capture are implemented.
- [x] Phase 10 — PWA, offline, and local-first
  - Manifest/service worker/install flow, IndexedDB projects/scenarios/mutations, local-first save, reconnect replay, stale-payload protection, retry, and offline status are implemented.
- [x] Phase 11 — Backend, authentication, and project dashboard
  - Identity cookie auth; owner-scoped project CRUD/search/sort/duplicate/soft-delete/restore; SQL Server production and SQLite local/test providers; validation and Problem Details are implemented.
- [x] Phase 12 — Version history and conflict-safe sync
  - Immutable versions/checkpoints/transactional restore, optimistic revisions, explicit keep-local/use-server/save-copy conflict choices, and focus-managed conflict dialog are implemented.
- [x] Phase 13 — Scenarios, sharing, and exports
  - Scenario CRUD/comparison, real read-only expiring/revocable hash-only share links, JSON/PNG/client PDF export, queued server reports, private owner-only downloads, and account export/delete are implemented.
- [ ] Phase 14 — Production UX, accessibility, and localization
  - Implemented: loading/empty/error/offline/conflict states, destructive confirmations, responsive layouts, reduced motion, focus handling, complete Việt/Anh presentation across product screens, canonical metric storage with metric/imperial presentation, keyboard-selectable room list, and automated English/imperial persistence + horizontal-overflow coverage on desktop/mobile.
  - Open release blocker: a documented human keyboard + screen-reader pass and physical browser/device compatibility pass have not been completed.
- [x] Phase 15 — Performance, security, and observability
  - Route/code splitting, worker isolation, bundle budget, CSP/security headers, origin check, per-user/IP rate limiting after authentication, IDOR tests, private reports, retention worker, structured request IDs, metrics, health checks, and zero high/critical dependency findings are implemented.
- [ ] Phase 16 — CI/CD, staging, and production release
  - Implemented locally: CI and release workflows, immutable image build/push/deploy-hook shape, migration entrypoint/script, non-root images, Compose, health checks, runbook, rollback/backup procedures, and release checklist.
  - External blockers: no registry/deployment credentials, staging/production SQL Server, DNS/TLS, deployment webhook, monitoring destination, or backup store were supplied. Therefore staging UAT, monitoring receipt, restore/rollback drills, production promotion, and production smoke cannot be evidenced.

## Final local verification (2026-07-18)

- Strict TypeScript: pass.
- Frontend unit/invariant/worker/persistence/component tests: 28/28 pass across 8 files.
- ASP.NET integration authorization/concurrency/share/account tests: 4/4 pass.
- Real full-stack Playwright: 7 pass, 1 intentional mobile skip for the desktop-only authenticated scenario; desktop and 360 px vertical slice, English/imperial persistence, and overflow checks pass.
- Automated accessibility: axe serious violations = 0 on desktop and mobile routes under test.
- Production build and gzip budget: pass; 598,146 bytes total gzip under the configured 650 KiB budget. Three.js is a lazy route chunk (311.29 KiB gzip).
- EF migrations: SQLite apply and SQL Server idempotent script generation pass for both migrations.
- Dependency audit: 0 vulnerabilities.
- API/web Docker images, Nginx syntax, and Compose validation: pass.

## Technical decisions

1. Canonical geometry and temperatures remain metric; conversion is presentation-only.
2. Editable drafts and immutable simulation snapshots are separate object graphs; a worker never receives a live draft reference.
3. Thermal behavior is a deterministic tuned visual model, not CFD or certified HVAC design.
4. Auth uses HTTP-only ASP.NET Core Identity cookies; no access token is stored in browser storage.
5. Local data is persisted before sync; revision mismatches never auto-overwrite.

## Release readiness

**NOT READY FOR PRODUCTION PROMOTION.** Phase 14 manual verification and Phase 16 environment gates remain open for the exact reasons above. These are mandatory blockers, not future enhancements.
