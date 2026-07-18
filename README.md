# AC Thermal Studio

Production-oriented, local-first 3D AC thermal simulator. Users design one to six rectangular rooms in **SETUP**, validate doors/windows, furniture and AC units, then explicitly confirm an immutable snapshot before the Web Worker and SIMULATION controls exist.

> Results are deterministic visual estimates. This is not CFD, a sensor reading, or certified HVAC design software.

## Repository

- `apps/web` — React 19, strict TypeScript, Vite, Zustand, React Three Fiber, worker simulation, IndexedDB/PWA.
- `apps/api` — ASP.NET Core 8 modular monolith, Identity, EF Core, SQL Server production provider and SQLite development provider.
- `infra` — hardened Nginx and production-shaped Docker Compose.
- `docs` — architecture, model assumptions, API, operations and release evidence.

## Local development

Requirements: Node 20.19+ and .NET SDK 8. Docker can be used when .NET is not installed on the host.

```text
npm ci
npm run dev
dotnet run --project apps/api/src/Api/Api.csproj
```

Web: `http://localhost:5173`; API: `http://localhost:5080` when `ASPNETCORE_URLS` is set accordingly. The Vite proxy forwards `/api` and `/health`.

Backend with Docker SDK:

```text
docker run --rm -p 5080:8080 -v <repo>:/src -w /src/apps/api/src/Api mcr.microsoft.com/dotnet/sdk:8.0 dotnet run
```

For a production-shaped stack, copy `.env.example` to a secret-managed environment and run the compose file in `infra`. Never commit real connection strings, share peppers or SQL passwords.

## Verification

```text
npm run typecheck
npm run test
npm run build
npm run performance:budget
npm run test:e2e
npm run security:audit
dotnet test apps/api/tests/IntegrationTests/IntegrationTests.csproj -c Release
dotnet ef database update --project apps/api/src/Api --startup-project apps/api/src/Api
```

See [release evidence](docs/RELEASE_CHECKLIST.md), [user guide](docs/USER_GUIDE.md), and [operations runbook](docs/operations/RUNBOOK.md).

## Troubleshooting

- Blank 3D: WebGL2 may be disabled. The app preserves 2D editing and calculations and shows a fallback message.
- Draft recovery: corrupt local payloads are moved to `ac-simulator:recovered-corrupt` before the editor starts clean.
- Sync conflict: choose local, server, or save local as a separate copy; no automatic overwrite occurs.
- API unavailable: guest SETUP/SIMULATION continue locally and pending mutations remain in IndexedDB.
