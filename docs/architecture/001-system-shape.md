# ADR 001: System shape and lifecycle

## Context

The product requires a local-first mobile editor, deterministic client-side simulation, and authenticated cross-device persistence without coupling render frames to the server.

## Decision

- `apps/web` is a strict TypeScript React/Vite PWA. Zustand owns editor/application state. Three.js is lazy-loaded only for preview and simulation routes.
- `apps/api` is an ASP.NET Core 8 modular monolith. Modules share one EF Core database transaction boundary while API DTOs remain separate from persistence entities.
- SETUP owns a mutable, schema-versioned draft. Confirming review performs validation and `structuredClone`, recursively freezes the clone, increments `sourceRevision`, resets time to zero, then creates a dedicated Web Worker.
- Leaving SIMULATION terminates the worker and releases Three.js resources. Reconfirming never reuses the old thermal field.
- The server stores project configuration, versions, scenario summaries, hashed share tokens and report artifacts; it never receives tick-by-tick grids.

## Consequences

Offline guest projects remain useful. Authenticated sync is conflict-safe. Simulation output is reproducible for a recorded engine version. The visual model is explicitly unsuitable for certified HVAC design.
