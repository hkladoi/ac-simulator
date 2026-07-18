import { describe, expect, it } from "vitest";
import { createSampleDraft } from "./defaults";
import { validateDraft } from "./validation";

describe("setup validation", () => {
  it("accepts the two-room golden sample", () =>
    expect(
      validateDraft(createSampleDraft()).filter((x) => x.severity === "error"),
    ).toEqual([]));
  it("rejects overlapping rooms", () => {
    const draft = createSampleDraft();
    draft.rooms[1].origin.x = 3;
    expect(validateDraft(draft).some((x) => x.code === "room.overlap")).toBe(
      true,
    );
  });
  it("rejects furniture outside its room", () => {
    const draft = createSampleDraft();
    draft.furniture[0].position.x = 20;
    expect(
      validateDraft(draft).some((x) => x.code === "furniture.bounds"),
    ).toBe(true);
  });
  it("requires at least one AC", () => {
    const draft = createSampleDraft();
    draft.acUnits = [];
    expect(validateDraft(draft).some((x) => x.code === "ac.required")).toBe(
      true,
    );
  });
});
