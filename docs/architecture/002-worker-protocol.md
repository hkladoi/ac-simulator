# ADR 002: Worker protocol and deterministic fields

The worker accepts only `init(snapshot)`, `step(minutes)`, `reset` and `dispose`. It returns ready/frame/error messages and transfers copied temperature buffers, never the engine's live arrays. Ticks are independent of render frames. Each route departure posts dispose and also terminates the worker, preventing stale results or retained grids.

Separate room grids simplify rectangular multi-room mapping and bound memory. Openings exchange aggregate temperatures with strongly different open/closed coefficients; furniture cells are solid. This deliberately favors deterministic, explainable visual behavior over CFD precision.
