import { beforeEach, describe, expect, it } from "vitest";
import { createSampleDraft } from "../features/editor/defaults";
import { useSimulatorStore } from "./simulatorStore";

describe("SETUP to SIMULATION lifecycle", () => {
  beforeEach(() =>
    useSimulatorStore.getState().replaceDraft(createSampleDraft()),
  );
  it("creates a distinct frozen snapshot only after validation", () => {
    const store = useSimulatorStore.getState();
    expect(store.mode).toBe("setup");
    expect(store.startSimulation()).toBe(true);
    const next = useSimulatorStore.getState();
    expect(next.mode).toBe("simulation");
    expect(next.snapshot?.config).not.toBe(next.draft);
    expect(Object.isFrozen(next.snapshot?.config)).toBe(true);
  });
  it("blocks invalid setup", () => {
    useSimulatorStore.getState().mutateDraft((draft) => {
      draft.acUnits = [];
    });
    expect(useSimulatorStore.getState().startSimulation()).toBe(false);
    expect(useSimulatorStore.getState().mode).toBe("setup");
  });
  it("editing setup clears the old frame and resets time", () => {
    useSimulatorStore.getState().startSimulation();
    useSimulatorStore
      .getState()
      .setSimulation({ elapsedMinutes: 15, isPlaying: true });
    useSimulatorStore.getState().editSetup();
    const current = useSimulatorStore.getState();
    expect(current.mode).toBe("setup");
    expect(current.simulation.elapsedMinutes).toBe(0);
    expect(current.simulation.isPlaying).toBe(false);
  });
});
