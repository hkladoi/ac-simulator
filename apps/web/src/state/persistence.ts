import { SCHEMA_VERSION } from "../config/constants";
import type { SetupDraft } from "../domain/types";
import { createEmptyDraft } from "../features/editor/defaults";

export const DRAFT_KEY = "ac-simulator:draft:v2";
export const CORRUPT_KEY = "ac-simulator:recovered-corrupt";

type PersistedDraft = {
  savedAt: string;
  localRevision: number;
  draft: SetupDraft;
};
const storage = () =>
  typeof localStorage !== "undefined" &&
  typeof localStorage.getItem === "function"
    ? localStorage
    : null;

export const migrateDraft = (input: unknown): SetupDraft => {
  if (!input || typeof input !== "object")
    throw new Error("Invalid local draft");
  const candidate = input as Partial<SetupDraft> & { schemaVersion?: number };
  if (candidate.schemaVersion === 1) {
    return {
      ...createEmptyDraft(),
      ...candidate,
      schemaVersion: SCHEMA_VERSION,
      environment: candidate.environment ?? {
        outsideTempC: 34,
        targetTempC: 24,
      },
    } as SetupDraft;
  }
  if (
    candidate.schemaVersion !== SCHEMA_VERSION ||
    !Array.isArray(candidate.rooms)
  )
    throw new Error("Unsupported local schema");
  return candidate as SetupDraft;
};

export const loadLocalDraft = (): PersistedDraft | null => {
  const target = storage();
  if (!target) return null;
  try {
    const raw = target.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedDraft;
    return { ...parsed, draft: migrateDraft(parsed.draft) };
  } catch (error) {
    const raw = target.getItem(DRAFT_KEY);
    if (raw) target.setItem(CORRUPT_KEY, raw.slice(0, 100_000));
    target.removeItem(DRAFT_KEY);
    return null;
  }
};

export const saveLocalDraft = (draft: SetupDraft, localRevision: number) => {
  const target = storage();
  if (!target) return;
  const payload: PersistedDraft = {
    savedAt: new Date().toISOString(),
    localRevision,
    draft,
  };
  target.setItem(DRAFT_KEY, JSON.stringify(payload));
};
