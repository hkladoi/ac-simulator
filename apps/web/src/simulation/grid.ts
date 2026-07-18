import type { Room, SetupDraft } from "../domain/types";
import { SIMULATION_CONSTANTS } from "../config/constants";

export type RoomGrid = {
  roomId: string;
  nx: number;
  ny: number;
  nz: number;
  values: Float32Array;
  next: Float32Array;
  solid: Uint8Array;
};

export const index3 = (
  x: number,
  y: number,
  z: number,
  nx: number,
  ny: number,
) => x + nx * (y + ny * z);

export const createRoomGrid = (draft: SetupDraft, room: Room): RoomGrid => {
  const scale = Math.min(
    1,
    Math.cbrt(
      SIMULATION_CONSTANTS.maxCells /
        Math.max(1, room.lengthM * room.widthM * room.heightM * 64),
    ),
  );
  const nx = Math.max(8, Math.round(room.lengthM * 4 * scale));
  const ny = Math.max(8, Math.round(room.widthM * 4 * scale));
  const nz = Math.max(4, Math.round(room.heightM * 4 * scale));
  const size = nx * ny * nz;
  const values = new Float32Array(size).fill(room.initialTempC);
  const solid = new Uint8Array(size);
  for (const item of draft.furniture.filter((f) => f.roomId === room.id)) {
    const x0 = Math.max(0, Math.floor((item.position.x / room.lengthM) * nx));
    const x1 = Math.min(
      nx,
      Math.ceil(((item.position.x + item.widthM) / room.lengthM) * nx),
    );
    const y0 = Math.max(0, Math.floor((item.position.y / room.widthM) * ny));
    const y1 = Math.min(
      ny,
      Math.ceil(((item.position.y + item.depthM) / room.widthM) * ny),
    );
    const z1 = Math.min(nz, Math.ceil((item.heightM / room.heightM) * nz));
    for (let z = 0; z < z1; z++)
      for (let y = y0; y < y1; y++)
        for (let x = x0; x < x1; x++) solid[index3(x, y, z, nx, ny)] = 1;
  }
  return {
    roomId: room.id,
    nx,
    ny,
    nz,
    values,
    next: new Float32Array(size),
    solid,
  };
};
