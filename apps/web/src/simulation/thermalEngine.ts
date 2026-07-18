import { SIMULATION_CONSTANTS as C } from "../config/constants";
import type {
  AcUnit,
  Room,
  SimulationSnapshot,
  ThermalFrame,
  Wall,
} from "../domain/types";
import { createRoomGrid, index3, type RoomGrid } from "./grid";

type Runtime = {
  snapshot: SimulationSnapshot;
  elapsedMinutes: number;
  grids: Map<string, RoomGrid>;
};

const acOrigin = (room: Room, ac: AcUnit) => {
  const p = ac.position01;
  if (ac.wall === "north") return { x: p * room.lengthM, y: 0 };
  if (ac.wall === "south") return { x: p * room.lengthM, y: room.widthM };
  if (ac.wall === "west") return { x: 0, y: p * room.widthM };
  return { x: room.lengthM, y: p * room.widthM };
};
const wallAxis = (wall: Wall) =>
  wall === "north"
    ? { x: 0, y: 1 }
    : wall === "south"
      ? { x: 0, y: -1 }
      : wall === "west"
        ? { x: 1, y: 0 }
        : { x: -1, y: 0 };

export class ThermalEngine {
  private runtime: Runtime;
  constructor(snapshot: SimulationSnapshot) {
    this.runtime = {
      snapshot,
      elapsedMinutes: 0,
      grids: new Map(
        snapshot.config.rooms.map((room) => [
          room.id,
          createRoomGrid(snapshot.config, room),
        ]),
      ),
    };
  }
  reset() {
    this.runtime.elapsedMinutes = 0;
    for (const room of this.runtime.snapshot.config.rooms)
      this.runtime.grids.set(
        room.id,
        createRoomGrid(this.runtime.snapshot.config, room),
      );
    return this.frame();
  }
  step(minutes = 0.25) {
    const substeps = Math.max(1, Math.ceil(minutes / 0.25));
    for (let i = 0; i < substeps; i++) this.tick(minutes / substeps);
    this.runtime.elapsedMinutes = Math.min(
      60,
      this.runtime.elapsedMinutes + minutes,
    );
    return this.frame();
  }
  private tick(dtMinutes: number) {
    const { config } = this.runtime.snapshot;
    for (const room of config.rooms) {
      const grid = this.runtime.grids.get(room.id)!;
      const acs = config.acUnits.filter((ac) => ac.roomId === room.id);
      const deltaOutside = config.environment.outsideTempC;
      for (let z = 0; z < grid.nz; z++)
        for (let y = 0; y < grid.ny; y++)
          for (let x = 0; x < grid.nx; x++) {
            const idx = index3(x, y, z, grid.nx, grid.ny);
            if (grid.solid[idx]) {
              grid.next[idx] = grid.values[idx];
              continue;
            }
            const current = grid.values[idx];
            let neighborSum = 0;
            let count = 0;
            for (const [dx, dy, dz] of [
              [1, 0, 0],
              [-1, 0, 0],
              [0, 1, 0],
              [0, -1, 0],
              [0, 0, 1],
              [0, 0, -1],
            ]) {
              const xx = x + dx,
                yy = y + dy,
                zz = z + dz;
              if (
                xx >= 0 &&
                xx < grid.nx &&
                yy >= 0 &&
                yy < grid.ny &&
                zz >= 0 &&
                zz < grid.nz
              ) {
                const ni = index3(xx, yy, zz, grid.nx, grid.ny);
                if (!grid.solid[ni]) {
                  neighborSum += grid.values[ni];
                  count++;
                }
              }
            }
            let value =
              current +
              (count ? (neighborSum / count - current) * C.diffusion : 0) *
                dtMinutes;
            const boundary =
              x === 0 ||
              x === grid.nx - 1 ||
              y === 0 ||
              y === grid.ny - 1 ||
              z === grid.nz - 1;
            if (boundary)
              value +=
                (deltaOutside - current) * C.boundaryGain * dtMinutes * 10;
            value +=
              (((room.occupants * 120 + room.equipmentGainW) * C.internalGain) /
                (grid.nx * grid.ny * grid.nz)) *
              dtMinutes;
            const px = ((x + 0.5) / grid.nx) * room.lengthM,
              py = ((y + 0.5) / grid.ny) * room.widthM,
              pz = ((z + 0.5) / grid.nz) * room.heightM;
            for (const ac of acs) {
              const origin = acOrigin(room, ac),
                axis = wallAxis(ac.wall);
              const dx = px - origin.x,
                dy = py - origin.y,
                distance = Math.hypot(dx, dy, Math.max(0, ac.heightM - pz));
              const alignment = distance
                ? Math.max(
                    0,
                    (dx * axis.x + dy * axis.y) / Math.hypot(dx, dy || 0.001),
                  )
                : 1;
              const fan = C.fan[ac.fanSpeed];
              const influence =
                Math.exp(-distance / (3.2 * fan)) *
                (0.25 + 0.75 * alignment) *
                (grid.solid[idx] ? C.obstacleAttenuation : 1);
              if (value > ac.setpointC)
                value -=
                  ac.coolingCapacityKw *
                  C.coolingGain *
                  fan *
                  influence *
                  dtMinutes *
                  10;
            }
            grid.next[idx] = Math.max(C.minTempC, Math.min(C.maxTempC, value));
          }
      [grid.values, grid.next] = [grid.next, grid.values];
    }
    this.exchangeRooms(dtMinutes);
  }
  private exchangeRooms(dt: number) {
    const { config } = this.runtime.snapshot;
    for (const opening of config.openings) {
      const a = this.runtime.grids.get(opening.roomId);
      if (!a) continue;
      if (opening.opensToOutside) {
        if (opening.state !== "open") continue;
        const factor = C.openOutsideExchange * dt;
        for (
          let i = 0;
          i < a.values.length;
          i += Math.max(1, Math.floor(a.values.length / 200))
        )
          a.values[i] +=
            (config.environment.outsideTempC - a.values[i]) * factor;
      } else if (opening.connectsToRoomId) {
        const b = this.runtime.grids.get(opening.connectsToRoomId);
        if (!b) continue;
        const avgA = average(a.values),
          avgB = average(b.values);
        const factor =
          (opening.state === "open"
            ? C.openInternalExchange
            : C.closedInternalExchange) * dt;
        for (let i = 0; i < a.values.length; i++)
          a.values[i] += (avgB - avgA) * factor;
        for (let i = 0; i < b.values.length; i++)
          b.values[i] += (avgA - avgB) * factor;
      }
    }
  }
  frame(): ThermalFrame {
    return {
      elapsedMinutes: this.runtime.elapsedMinutes,
      rooms: [...this.runtime.grids.values()].map((grid) => {
        const temperatures = grid.values.slice();
        let minC = Infinity,
          maxC = -Infinity,
          sum = 0,
          count = 0;
        for (let i = 0; i < temperatures.length; i++)
          if (!grid.solid[i]) {
            minC = Math.min(minC, temperatures[i]);
            maxC = Math.max(maxC, temperatures[i]);
            sum += temperatures[i];
            count++;
          }
        return {
          roomId: grid.roomId,
          dimensions: { nx: grid.nx, ny: grid.ny, nz: grid.nz },
          temperatures,
          minC,
          maxC,
          averageC: count ? sum / count : 0,
        };
      }),
    };
  }
}

const average = (values: Float32Array) => {
  let sum = 0;
  for (const value of values) sum += value;
  return sum / values.length;
};
