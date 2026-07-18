import { HEAT_LOAD_CONSTANTS as C } from "../config/constants";
import type { Opening, Room, SetupDraft } from "../domain/types";

export type HeatLoadBreakdown = {
  roomId: string;
  envelopeW: number;
  occupantsW: number;
  equipmentW: number;
  infiltrationW: number;
  totalKw: number;
};

const adjacentWallArea = (room: Room, rooms: Room[]) =>
  rooms.reduce((area, other) => {
    if (other.id === room.id) return area;
    const xOverlap = Math.max(
      0,
      Math.min(room.origin.x + room.lengthM, other.origin.x + other.lengthM) -
        Math.max(room.origin.x, other.origin.x),
    );
    const yOverlap = Math.max(
      0,
      Math.min(room.origin.y + room.widthM, other.origin.y + other.widthM) -
        Math.max(room.origin.y, other.origin.y),
    );
    const touchesX =
      Math.abs(room.origin.x + room.lengthM - other.origin.x) < 0.001 ||
      Math.abs(other.origin.x + other.lengthM - room.origin.x) < 0.001;
    const touchesY =
      Math.abs(room.origin.y + room.widthM - other.origin.y) < 0.001 ||
      Math.abs(other.origin.y + other.widthM - room.origin.y) < 0.001;
    return (
      area +
      (touchesX ? yOverlap * Math.min(room.heightM, other.heightM) : 0) +
      (touchesY ? xOverlap * Math.min(room.heightM, other.heightM) : 0)
    );
  }, 0);

const openingLoad = (opening: Opening, deltaT: number, volumeM3: number) => {
  const area = opening.widthM * opening.heightM;
  if (opening.opensToOutside && opening.state === "open")
    return {
      envelope: 0,
      infiltration:
        C.openInfiltrationWPerM3K * volumeM3 * deltaT * Math.min(1, area / 2),
    };
  const u = opening.type === "window" ? C.closedWindowU : C.closedDoorU;
  return {
    envelope: opening.opensToOutside ? u * area * deltaT : 0,
    infiltration: opening.opensToOutside
      ? C.closedInfiltrationWPerM3K * volumeM3 * deltaT * 0.25
      : 0,
  };
};

export const estimateRoomHeatLoad = (
  draft: SetupDraft,
  room: Room,
): HeatLoadBreakdown => {
  const deltaT = Math.max(
    0,
    draft.environment.outsideTempC - draft.environment.targetTempC,
  );
  const volume = room.lengthM * room.widthM * room.heightM;
  const wallArea = 2 * (room.lengthM + room.widthM) * room.heightM;
  const openings = draft.openings.filter(
    (opening) => opening.roomId === room.id,
  );
  const externalOpeningArea = openings
    .filter((o) => o.opensToOutside)
    .reduce((sum, o) => sum + o.widthM * o.heightM, 0);
  const externalWallArea = Math.max(
    0,
    wallArea - adjacentWallArea(room, draft.rooms) - externalOpeningArea,
  );
  const wallU = C.wallU[room.insulationLevel][room.wallThicknessMm];
  let envelopeW =
    (wallU * externalWallArea +
      C.ceilingU * room.lengthM * room.widthM +
      C.floorU * room.lengthM * room.widthM) *
    deltaT;
  let infiltrationW = C.closedInfiltrationWPerM3K * volume * deltaT;
  for (const opening of openings) {
    const load = openingLoad(opening, deltaT, volume);
    envelopeW += load.envelope;
    infiltrationW += load.infiltration;
  }
  const occupantsW = room.occupants * C.personGainW;
  const totalW = envelopeW + infiltrationW + occupantsW + room.equipmentGainW;
  return {
    roomId: room.id,
    envelopeW,
    occupantsW,
    equipmentW: room.equipmentGainW,
    infiltrationW,
    totalKw: totalW / 1000,
  };
};

export const estimateHeatLoads = (draft: SetupDraft) => {
  const rooms = draft.rooms.map((room) => estimateRoomHeatLoad(draft, room));
  return { rooms, totalKw: rooms.reduce((sum, item) => sum + item.totalKw, 0) };
};
