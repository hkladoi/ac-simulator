import { CAPACITY_THRESHOLDS } from "../config/constants";

export type CapacityStatus = "undersized" | "suitable" | "oversized";
export const capacityStatus = (
  capacityKw: number,
  heatLoadKw: number,
): { ratio: number; status: CapacityStatus } => {
  const ratio =
    heatLoadKw <= 0 ? Number.POSITIVE_INFINITY : capacityKw / heatLoadKw;
  return {
    ratio,
    status:
      ratio < CAPACITY_THRESHOLDS.undersized
        ? "undersized"
        : ratio <= CAPACITY_THRESHOLDS.oversized
          ? "suitable"
          : "oversized",
  };
};
