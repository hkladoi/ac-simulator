import { describe, expect, it } from "vitest";
const luminance = (hex: string) => {
  const rgb = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
};
const ratio = (a: string, b: string) => {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
};
describe("WCAG color tokens", () => {
  it.each([
    ["#4f6d72", "#f9fcfa"],
    ["#4e6f74", "#f4f8f6"],
    ["#506a70", "#ffffff"],
    ["#a9452c", "#ffffff"],
  ])("keeps %s readable on %s", (fg, bg) =>
    expect(ratio(fg, bg)).toBeGreaterThanOrEqual(4.5),
  );
});
