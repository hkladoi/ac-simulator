# API contract notes

All authenticated resources enforce owner scope on the server and use separate DTOs. Identity uses secure HTTP-only cookies in the web deployment. Mutations validate input and return RFC Problem Details. `PUT /draft` requires `expectedRevision`; stale writers receive `409` plus `serverRevision`.

Key groups:

- `/api/auth/*` — ASP.NET Core Identity register/login/logout/manage.
- `/api/projects` — paged search/sort, create, rename, duplicate, soft-delete/restore and draft sync.
- `/api/projects/{id}/versions` — checkpoint/list/transactional restore.
- `/api/projects/{id}/scenarios` — scenario CRUD.
- `/api/projects/{id}/shares` and `/api/shared/{token}` — hash-only read links with expiry/revoke.
- `/api/projects/{id}/reports` — queued report creation/status; successful files are downloaded through owner-authorized `/{reportId}/file` and are never served as public static assets.
- `/api/account/export` and `/api/account` — portable account export and permanent account/project/report deletion.
- `/health/live`, `/health/ready`, `/metrics` — operations endpoints.

Development exposes generated Swagger/OpenAPI at `/swagger`. Production disables Swagger UI by default. Import/config payloads are limited by Kestrel and configuration validation, with JSON depth 32, schema version 2 and six rooms.
