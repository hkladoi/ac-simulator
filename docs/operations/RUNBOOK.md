# Operations runbook

## Deploy

1. Build immutable web/API images from the same commit; run all CI gates and generate an idempotent migration script.
2. Back up SQL Server and verify backup metadata. Apply backward-compatible migration before switching traffic.
3. Deploy staging with production configuration shape, run authenticated/guest smoke, report generation, share expiry/revoke and readiness checks.
4. Promote the exact image digests. Verify `/health/live`, `/health/ready`, `/metrics`, a guest simulation and an authenticated read.

The API image supports `--migrate` as a one-shot entrypoint. Persist the configured Data Protection key directory across API restarts; otherwise existing login cookies become invalid. Persist and restrict the report artifact volume to the API identity only.

## Rollback

Shift traffic to the previous image digest. Prefer forward-fix migrations; only run a reviewed down script when it cannot destroy data written by the new release. Keep the database backup until post-release validation ends.

## Backup/restore drill

Nightly full backup plus transaction-log backups per platform RPO. Quarterly: restore to isolated SQL Server, run migrations in validation mode, query project/version/share constraints, then run API smoke. Record duration, backup ID and row counts in release evidence.

## Alerts

- 5xx rate >2% for 5 minutes; readiness failure >2 minutes.
- API p95 >500 ms for CRUD over 10 minutes.
- report `failed` rate >5% or oldest queued report >10 minutes.
- SQL connection/storage thresholds and backup age >26 hours.
- frontend unhandled error rate and long-task rate regression after release.

## Report queue incident

Inspect structured logs by report ID, verify write volume permissions/capacity, and retry only failed rows after fixing the cause. Generation is idempotent by report ID; do not expose local filesystem paths.

## Sync incident

Do not clear client IndexedDB. Verify revision responses and server time. Preserve local copies through the conflict action, repair API availability, then drain pending mutations. Never update revisions directly in SQL.

## Data retention

Projects are soft-deleted and restorable for 30 days. The retention worker permanently removes expired rows and matching report artifacts. Before changing the retention period, confirm legal/product policy and backup expiry; never restore expired data directly into the live database without an audited request.
