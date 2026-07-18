import { beforeEach, describe, expect, it } from "vitest";
import { createSampleDraft } from "../features/editor/defaults";
import {
  CORRUPT_KEY,
  DRAFT_KEY,
  loadLocalDraft,
  migrateDraft,
  saveLocalDraft,
} from "./persistence";

describe("local schema persistence", () => {
  beforeEach(() => localStorage.clear());
  it("migrates a v1 fixture while preserving semantic room data", () => {
    const old = createSampleDraft() as ReturnType<typeof createSampleDraft> & {
      schemaVersion: number;
    };
    old.schemaVersion = 1;
    const migrated = migrateDraft(old);
    expect(migrated.schemaVersion).toBe(2);
    expect(migrated.rooms[0].id).toBe(old.rooms[0].id);
  });
  it("round-trips a valid draft and revision", () => {
    const draft = createSampleDraft();
    saveLocalDraft(draft, 17);
    expect(loadLocalDraft()).toMatchObject({
      localRevision: 17,
      draft: { schemaVersion: 2 },
    });
  });
  it("quarantines a corrupt payload instead of crashing startup", () => {
    localStorage.setItem(DRAFT_KEY, "{not-json");
    expect(loadLocalDraft()).toBeNull();
    expect(localStorage.getItem(CORRUPT_KEY)).toContain("not-json");
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
  });
});
