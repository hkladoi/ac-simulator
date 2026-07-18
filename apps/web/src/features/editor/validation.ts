import { LIMITS } from "../../config/constants";
import type {
  FurnitureItem,
  Opening,
  Room,
  SetupDraft,
  ValidationIssue,
} from "../../domain/types";

const overlaps = (a: Room, b: Room) =>
  a.origin.x < b.origin.x + b.lengthM &&
  a.origin.x + a.lengthM > b.origin.x &&
  a.origin.y < b.origin.y + b.widthM &&
  a.origin.y + a.widthM > b.origin.y;

const wallLength = (room: Room, opening: Opening) =>
  opening.wall === "north" || opening.wall === "south"
    ? room.lengthM
    : room.widthM;

export const furnitureInsideRoom = (item: FurnitureItem, room: Room) => {
  const rotated =
    Math.abs(item.rotationDeg % 180) > 45 &&
    Math.abs(item.rotationDeg % 180) < 135;
  const width = rotated ? item.depthM : item.widthM;
  const depth = rotated ? item.widthM : item.depthM;
  return (
    item.position.x >= 0 &&
    item.position.y >= 0 &&
    item.position.x + width <= room.lengthM &&
    item.position.y + depth <= room.widthM
  );
};

const blocksOpening = (item: FurnitureItem, opening: Opening, room: Room) => {
  if (item.roomId !== room.id) return false;
  const clearance = 0.65;
  const center = opening.position01 * wallLength(room, opening);
  const start = center - opening.widthM / 2;
  const end = center + opening.widthM / 2;
  if (opening.wall === "north")
    return (
      item.position.y < clearance &&
      item.position.x + item.widthM > start &&
      item.position.x < end
    );
  if (opening.wall === "south")
    return (
      item.position.y + item.depthM > room.widthM - clearance &&
      item.position.x + item.widthM > start &&
      item.position.x < end
    );
  if (opening.wall === "west")
    return (
      item.position.x < clearance &&
      item.position.y + item.depthM > start &&
      item.position.y < end
    );
  return (
    item.position.x + item.widthM > room.lengthM - clearance &&
    item.position.y + item.depthM > start &&
    item.position.y < end
  );
};

export const validateDraft = (draft: SetupDraft): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  if (draft.rooms.length < LIMITS.rooms.min)
    issues.push({
      code: "room.required",
      severity: "error",
      messageKey: "validation.roomRequired",
    });
  if (draft.rooms.length > LIMITS.rooms.max)
    issues.push({
      code: "room.max",
      severity: "error",
      messageKey: "validation.roomMax",
    });
  const ids = new Set<string>();
  const register = (id: string) => {
    if (ids.has(id))
      issues.push({
        code: "id.duplicate",
        severity: "error",
        messageKey: "validation.duplicateId",
        objectId: id,
      });
    ids.add(id);
  };
  for (const room of draft.rooms) register(room.id);
  for (let i = 0; i < draft.rooms.length; i += 1) {
    const room = draft.rooms[i];
    if (
      room.lengthM < 2 ||
      room.lengthM > 20 ||
      room.widthM < 2 ||
      room.widthM > 20 ||
      room.heightM < 2 ||
      room.heightM > 6
    )
      issues.push({
        code: "room.dimensions",
        severity: "error",
        messageKey: "validation.roomDimensions",
        objectId: room.id,
      });
    for (let j = i + 1; j < draft.rooms.length; j += 1)
      if (overlaps(room, draft.rooms[j]))
        issues.push({
          code: "room.overlap",
          severity: "error",
          messageKey: "validation.roomOverlap",
          objectId: room.id,
        });
  }
  const rooms = new Map(draft.rooms.map((room) => [room.id, room]));
  for (const opening of draft.openings) {
    register(opening.id);
    const room = rooms.get(opening.roomId);
    if (!room) {
      issues.push({
        code: "opening.room",
        severity: "error",
        messageKey: "validation.invalidRelation",
        objectId: opening.id,
      });
      continue;
    }
    if (
      opening.position01 < 0 ||
      opening.position01 > 1 ||
      opening.widthM > wallLength(room, opening) ||
      opening.heightM + opening.sillHeightM > room.heightM
    )
      issues.push({
        code: "opening.bounds",
        severity: "error",
        messageKey: "validation.openingBounds",
        objectId: opening.id,
      });
    if (
      !opening.opensToOutside &&
      (!opening.connectsToRoomId || !rooms.has(opening.connectsToRoomId))
    )
      issues.push({
        code: "opening.connection",
        severity: "error",
        messageKey: "validation.invalidRelation",
        objectId: opening.id,
      });
  }
  for (const item of draft.furniture) {
    register(item.id);
    const room = rooms.get(item.roomId);
    if (!room || !furnitureInsideRoom(item, room))
      issues.push({
        code: "furniture.bounds",
        severity: "error",
        messageKey: "validation.furnitureBounds",
        objectId: item.id,
      });
    else if (
      draft.openings.some((opening) => blocksOpening(item, opening, room))
    )
      issues.push({
        code: "furniture.opening",
        severity: "error",
        messageKey: "validation.furnitureOpening",
        objectId: item.id,
      });
  }
  for (const ac of draft.acUnits) {
    register(ac.id);
    const room = rooms.get(ac.roomId);
    if (
      !room ||
      ac.heightM > room.heightM ||
      ac.coolingCapacityKw < 0.5 ||
      ac.coolingCapacityKw > 20 ||
      ac.setpointC < 16 ||
      ac.setpointC > 30
    )
      issues.push({
        code: "ac.invalid",
        severity: "error",
        messageKey: "validation.acInvalid",
        objectId: ac.id,
      });
  }
  for (const room of draft.rooms)
    if (!draft.acUnits.some((ac) => ac.roomId === room.id))
      issues.push({
        code: "ac.missing",
        severity: "warning",
        messageKey: "validation.acMissing",
        objectId: room.id,
      });
  if (!draft.acUnits.length)
    issues.push({
      code: "ac.required",
      severity: "error",
      messageKey: "validation.acRequired",
    });
  return issues;
};
