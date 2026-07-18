import { SCHEMA_VERSION } from "../../config/constants";
import type { SetupDraft } from "../../domain/types";

export const uid = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;

export const createEmptyDraft = (): SetupDraft => ({
  schemaVersion: SCHEMA_VERSION,
  rooms: [],
  openings: [],
  furniture: [],
  acUnits: [],
  environment: { outsideTempC: 34, targetTempC: 24 },
});

export const createSampleDraft = (): SetupDraft => {
  const living = "room_living";
  const bedroom = "room_bedroom";
  return {
    schemaVersion: SCHEMA_VERSION,
    environment: { outsideTempC: 35, targetTempC: 24 },
    rooms: [
      {
        id: living,
        name: "Phòng khách",
        origin: { x: 0, y: 0 },
        lengthM: 6,
        widthM: 4,
        heightM: 3,
        wallThicknessMm: 100,
        insulationLevel: "medium",
        initialTempC: 31,
        occupants: 3,
        equipmentGainW: 250,
      },
      {
        id: bedroom,
        name: "Phòng ngủ",
        origin: { x: 6, y: 0 },
        lengthM: 4,
        widthM: 4,
        heightM: 3,
        wallThicknessMm: 100,
        insulationLevel: "high",
        initialTempC: 30,
        occupants: 2,
        equipmentGainW: 120,
      },
    ],
    openings: [
      {
        id: "door_between",
        roomId: living,
        type: "door",
        wall: "east",
        position01: 0.5,
        widthM: 0.9,
        heightM: 2.1,
        sillHeightM: 0,
        state: "open",
        connectsToRoomId: bedroom,
        opensToOutside: false,
      },
      {
        id: "window_living",
        roomId: living,
        type: "window",
        wall: "north",
        position01: 0.45,
        widthM: 1.5,
        heightM: 1.2,
        sillHeightM: 0.9,
        state: "closed",
        opensToOutside: true,
      },
    ],
    furniture: [
      {
        id: "sofa_living",
        roomId: living,
        type: "sofa",
        position: { x: 1, y: 2.8 },
        rotationDeg: 0,
        widthM: 2.2,
        depthM: 0.8,
        heightM: 0.8,
      },
      {
        id: "bed_bedroom",
        roomId: bedroom,
        type: "bed",
        position: { x: 1.2, y: 1.1 },
        rotationDeg: 0,
        widthM: 2,
        depthM: 1.6,
        heightM: 0.55,
      },
    ],
    acUnits: [
      {
        id: "ac_living",
        roomId: living,
        coolingCapacityKw: 4.2,
        setpointC: 24,
        fanSpeed: "high",
        horizontalAngleDeg: 0,
        verticalAngleDeg: -15,
        wall: "south",
        position01: 0.5,
        heightM: 2.4,
      },
      {
        id: "ac_bedroom",
        roomId: bedroom,
        coolingCapacityKw: 2.6,
        setpointC: 24,
        fanSpeed: "medium",
        horizontalAngleDeg: 0,
        verticalAngleDeg: -12,
        wall: "east",
        position01: 0.55,
        heightM: 2.4,
      },
    ],
  };
};
