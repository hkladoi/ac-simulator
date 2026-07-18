# ADR 004 — Deterministic visual thermal model

## Decision

Run a tuned, bounded grid model entirely in a client Web Worker. Each room owns an adaptive `Float32Array` grid. The worker applies diffusion, outside and internal gains, directional AC cooling, door/window exchange, and furniture attenuation. Inputs include the snapshot schema and engine version; identical inputs produce identical frames.

## Rationale

The product needs responsive, explainable hot/cold visualization without claiming CFD accuracy. Worker isolation protects UI responsiveness and keeps guest simulations offline-capable. Bounded grid dimensions and temperature clamps cap CPU/memory and prevent numerical runaway.

## Consequences

- Results are qualitative estimates and every screen/report carries a disclaimer.
- No humidity, condensation, Navier–Stokes pressure solution, sensor ingestion, or equipment certification is implied.
- Model changes require an engine-version bump and golden invariant updates.
- Reset reconstructs grids from the immutable snapshot, guaranteeing minute-zero state.
