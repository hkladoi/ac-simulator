export const SCHEMA_VERSION = 2;
export const ENGINE_VERSION = "visual-thermal-2.0.0";
export const LIMITS = {
  rooms: { min: 1, max: 6 },
  roomLengthM: { min: 2, max: 20 },
  roomWidthM: { min: 2, max: 20 },
  roomHeightM: { min: 2, max: 6 },
  temperatureC: { min: 10, max: 50 },
  setpointC: { min: 16, max: 30 },
  coolingCapacityKw: { min: 0.5, max: 20 },
  history: 50,
  projectImportBytes: 2_000_000,
} as const;

export const CAPACITY_THRESHOLDS = {
  undersized: 0.85,
  oversized: 1.15,
} as const;
export const HEAT_LOAD_CONSTANTS = {
  personGainW: 120,
  ceilingU: 0.75,
  floorU: 0.35,
  closedDoorU: 2.2,
  closedWindowU: 2.8,
  openInfiltrationWPerM3K: 2.6,
  closedInfiltrationWPerM3K: 0.18,
  wallU: {
    low: { 50: 2.4, 75: 2.15, 100: 1.9, 125: 1.7, 150: 1.5, 200: 1.25 },
    medium: { 50: 1.65, 75: 1.4, 100: 1.18, 125: 1.02, 150: 0.9, 200: 0.72 },
    high: { 50: 0.95, 75: 0.78, 100: 0.64, 125: 0.54, 150: 0.47, 200: 0.38 },
  },
} as const;

// Tuned for a stable, visually plausible educational model; these are not CFD coefficients.
export const SIMULATION_CONSTANTS = {
  maxCells: 30_000,
  diffusion: 0.085,
  boundaryGain: 0.0006,
  internalGain: 0.000018,
  coolingGain: 0.0036,
  openInternalExchange: 0.12,
  closedInternalExchange: 0.003,
  openOutsideExchange: 0.055,
  obstacleAttenuation: 0.22,
  minTempC: 8,
  maxTempC: 55,
  fan: { low: 0.7, medium: 1, high: 1.35 },
} as const;
