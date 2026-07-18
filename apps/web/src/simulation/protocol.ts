import type { SimulationSnapshot, ThermalFrame } from "../domain/types";
export type WorkerRequest =
  | { type: "init"; snapshot: SimulationSnapshot }
  | { type: "step"; minutes: number }
  | { type: "reset" }
  | { type: "dispose" };
export type WorkerResponse =
  | { type: "ready" | "frame"; frame: ThermalFrame }
  | { type: "error"; message: string };
