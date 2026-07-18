import { describe, expect, it } from "vitest";
import { ENGINE_VERSION } from "../config/constants";
import { createSampleDraft } from "../features/editor/defaults";
import { ThermalEngine } from "./thermalEngine";
describe("performance and disposal budget", () => {
  it("computes a 60-minute golden scenario within the CI budget", () => {
    const start = performance.now();
    const snapshot = {
      sourceRevision: 1,
      createdAt: "2026-07-18T00:00:00Z",
      engineVersion: ENGINE_VERSION,
      config: createSampleDraft(),
    };
    for (let i = 0; i < 20; i++) {
      const engine = new ThermalEngine(snapshot);
      engine.step(3);
    }
    expect(performance.now() - start).toBeLessThan(10_000);
  });
});
