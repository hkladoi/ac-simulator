import { describe, expect, it } from "vitest";
import { createSampleDraft } from "../features/editor/defaults";
import { capacityStatus } from "./capacity";
import { estimateHeatLoads } from "./heatLoad";
import {
  btuhToKw,
  celsiusToFahrenheit,
  fahrenheitToCelsius,
  feetToMeters,
  kwToBtuh,
  metersToFeet,
} from "./unitConversion";

describe("calculation layer", () => {
  it("round-trips cooling capacity units", () =>
    expect(btuhToKw(kwToBtuh(3.5))).toBeCloseTo(3.5, 8));
  it("round-trips presentation units without changing canonical data", () => {
    expect(feetToMeters(metersToFeet(4.2))).toBeCloseTo(4.2);
    expect(fahrenheitToCelsius(celsiusToFahrenheit(24))).toBeCloseTo(24);
  });
  it("classifies exact capacity boundaries", () => {
    expect(capacityStatus(0.849, 1).status).toBe("undersized");
    expect(capacityStatus(0.85, 1).status).toBe("suitable");
    expect(capacityStatus(1.15, 1).status).toBe("suitable");
    expect(capacityStatus(1.151, 1).status).toBe("oversized");
  });
  it("increases heat load when a hot outside window opens", () => {
    const closed = createSampleDraft();
    const open = structuredClone(closed);
    open.openings.find((item) => item.id === "window_living")!.state = "open";
    expect(estimateHeatLoads(open).totalKw).toBeGreaterThan(
      estimateHeatLoads(closed).totalKw,
    );
  });
  it("does not reduce load when room size grows", () => {
    const base = createSampleDraft();
    const larger = structuredClone(base);
    larger.rooms[0].widthM += 2;
    expect(estimateHeatLoads(larger).rooms[0].totalKw).toBeGreaterThan(
      estimateHeatLoads(base).rooms[0].totalKw,
    );
  });
  it("improved insulation reduces envelope load", () => {
    const low = createSampleDraft();
    low.rooms[0].insulationLevel = "low";
    const high = structuredClone(low);
    high.rooms[0].insulationLevel = "high";
    expect(estimateHeatLoads(high).rooms[0].envelopeW).toBeLessThan(
      estimateHeatLoads(low).rooms[0].envelopeW,
    );
  });
});
