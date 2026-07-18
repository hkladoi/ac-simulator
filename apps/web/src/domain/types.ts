export type Vec2 = { x: number; y: number };
export type Wall = "north" | "south" | "east" | "west";
export type ProjectMode = "setup" | "simulation";
export type SetupStep = "layout" | "openings" | "furniture" | "ac" | "review";
export type InsulationLevel = "low" | "medium" | "high";
export type OpeningState = "open" | "closed";
export type FanSpeed = "low" | "medium" | "high";
export type FurnitureType =
  | "bed"
  | "wardrobe"
  | "table"
  | "chair"
  | "sofa"
  | "shelf";

export type Room = {
  id: string;
  name: string;
  origin: Vec2;
  lengthM: number;
  widthM: number;
  heightM: number;
  wallThicknessMm: 50 | 75 | 100 | 125 | 150 | 200;
  insulationLevel: InsulationLevel;
  initialTempC: number;
  occupants: number;
  equipmentGainW: number;
};

export type Opening = {
  id: string;
  roomId: string;
  type: "door" | "window";
  wall: Wall;
  position01: number;
  widthM: number;
  heightM: number;
  sillHeightM: number;
  state: OpeningState;
  connectsToRoomId?: string;
  opensToOutside: boolean;
};

export type FurnitureItem = {
  id: string;
  roomId: string;
  type: FurnitureType;
  position: Vec2;
  rotationDeg: number;
  widthM: number;
  depthM: number;
  heightM: number;
};

export type AcUnit = {
  id: string;
  roomId: string;
  coolingCapacityKw: number;
  setpointC: number;
  fanSpeed: FanSpeed;
  horizontalAngleDeg: number;
  verticalAngleDeg: number;
  wall: Wall;
  position01: number;
  heightM: number;
};

export type EnvironmentConfig = { outsideTempC: number; targetTempC: number };
export type SetupDraft = {
  schemaVersion: number;
  rooms: Room[];
  openings: Opening[];
  furniture: FurnitureItem[];
  acUnits: AcUnit[];
  environment: EnvironmentConfig;
};

export type SimulationSnapshot = Readonly<{
  sourceRevision: number;
  createdAt: string;
  engineVersion: string;
  config: SetupDraft;
}>;

export type SimulationConfig = {
  elapsedMinutes: number;
  isPlaying: boolean;
  speedMultiplier: 1 | 5 | 15 | 60;
  heatmapVisible: boolean;
  heatmapOpacity: number;
  sliceHeight01: number;
};

export type ValidationIssue = {
  code: string;
  severity: "error" | "warning";
  messageKey: string;
  objectId?: string;
};

export type SyncMeta = {
  localRevision: number;
  serverRevision: number | null;
  lastSyncedAt: string | null;
  status: "local" | "saving" | "synced" | "offline" | "conflict" | "error";
};

export type RoomThermalResult = {
  roomId: string;
  dimensions: { nx: number; ny: number; nz: number };
  temperatures: Float32Array;
  minC: number;
  maxC: number;
  averageC: number;
};

export type ThermalFrame = {
  elapsedMinutes: number;
  rooms: RoomThermalResult[];
};

export type ScenarioSummary = {
  id: string;
  name: string;
  createdAt: string;
  snapshot: SimulationSnapshot;
  metrics: {
    heatLoadKw: number;
    averageAt60C: number;
    targetMinutes: number | null;
    comfortPercent: number;
  };
};
