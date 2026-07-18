import { describe, expect, it } from "vitest";
import { ENGINE_VERSION } from "../config/constants";
import { createSampleDraft } from "../features/editor/defaults";
import type { SimulationSnapshot } from "../domain/types";
import { ThermalEngine } from "./thermalEngine";

const snapshot = (): SimulationSnapshot => ({
  sourceRevision: 1,
  createdAt: "2026-07-18T00:00:00Z",
  engineVersion: ENGINE_VERSION,
  config: createSampleDraft(),
});
describe("thermal engine", () => {
  it("is deterministic for an identical snapshot", () => {
    const a = new ThermalEngine(snapshot()).step(5);
    const b = new ThermalEngine(snapshot()).step(5);
    expect([...a.rooms[0].temperatures]).toEqual([...b.rooms[0].temperatures]);
  });
  it("cools the AC room without leaving safe bounds", () => {
    const engine = new ThermalEngine(snapshot());
    const initial = engine.frame().rooms[0].averageC;
    const result = engine.step(30).rooms[0];
    expect(result.averageC).toBeLessThan(initial);
    expect(result.minC).toBeGreaterThanOrEqual(8);
    expect(result.maxC).toBeLessThanOrEqual(55);
  });
  it("returns to initial temperature after reset", () => {
    const engine = new ThermalEngine(snapshot());
    engine.step(15);
    expect(engine.reset().rooms[0].averageC).toBeCloseTo(31, 4);
  });
  it("higher capacity cannot produce a warmer outcome", () => {
    const low = snapshot();
    low.config.acUnits[0].coolingCapacityKw = 1;
    const high = structuredClone(low);
    high.config.acUnits[0].coolingCapacityKw = 8;
    expect(
      new ThermalEngine(high).step(30).rooms[0].averageC,
    ).toBeLessThanOrEqual(new ThermalEngine(low).step(30).rooms[0].averageC);
  });
  it("an open internal door exchanges more heat than a closed door", () => {
    const open = snapshot();
    open.config.rooms[0].initialTempC = 20;
    open.config.rooms[1].initialTempC = 40;
    open.config.acUnits = [];
    const closed = structuredClone(open);
    closed.config.openings.find((item) => item.id === "door_between")!.state =
      "closed";
    const openFrame = new ThermalEngine(open).step(15);
    const closedFrame = new ThermalEngine(closed).step(15);
    const openGap = Math.abs(
      openFrame.rooms[0].averageC - openFrame.rooms[1].averageC,
    );
    const closedGap = Math.abs(
      closedFrame.rooms[0].averageC - closedFrame.rooms[1].averageC,
    );
    expect(openGap).toBeLessThan(closedGap);
  });
  it("furniture attenuation cannot make the cooled room warmer disappear", () => {
    const obstructed = snapshot();
    const clear = structuredClone(obstructed);
    clear.config.furniture = [];
    expect(
      new ThermalEngine(clear).step(30).rooms[0].averageC,
    ).toBeLessThanOrEqual(
      new ThermalEngine(obstructed).step(30).rooms[0].averageC,
    );
  });
});
