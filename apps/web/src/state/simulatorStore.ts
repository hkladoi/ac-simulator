import { create } from "zustand";
import { ENGINE_VERSION, LIMITS } from "../config/constants";
import type {
  ScenarioSummary,
  SetupDraft,
  SetupStep,
  SimulationConfig,
  SimulationSnapshot,
  SyncMeta,
  ThermalFrame,
  ValidationIssue,
} from "../domain/types";
import {
  createEmptyDraft,
  createSampleDraft,
} from "../features/editor/defaults";
import { validateDraft } from "../features/editor/validation";
import { loadLocalDraft, saveLocalDraft } from "./persistence";

const deepFreeze = <T>(value: T): T => {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value as Record<string, unknown>).forEach(deepFreeze);
  }
  return value;
};

const initialSimulation = (): SimulationConfig => ({
  elapsedMinutes: 0,
  isPlaying: false,
  speedMultiplier: 5,
  heatmapVisible: true,
  heatmapOpacity: 0.78,
  sliceHeight01: 0.45,
});
const local =
  typeof localStorage === "undefined" ||
  typeof localStorage.getItem !== "function"
    ? null
    : loadLocalDraft();
const localScenarios =
  typeof localStorage === "undefined" ||
  typeof localStorage.getItem !== "function"
    ? []
    : (() => {
        try {
          return JSON.parse(
            localStorage.getItem("ac:scenarios") ?? "[]",
          ) as ScenarioSummary[];
        } catch {
          return [];
        }
      })();

type HistoryState = { past: SetupDraft[]; future: SetupDraft[] };
type SimulatorStore = {
  mode: "setup" | "simulation";
  setupStep: SetupStep;
  draft: SetupDraft;
  snapshot: SimulationSnapshot | null;
  simulation: SimulationConfig;
  thermalFrame: ThermalFrame | null;
  validation: ValidationIssue[];
  selectedId: string | null;
  revision: number;
  history: HistoryState;
  sync: SyncMeta;
  scenarios: ScenarioSummary[];
  setStep: (step: SetupStep) => void;
  select: (id: string | null) => void;
  mutateDraft: (mutator: (draft: SetupDraft) => void) => void;
  replaceDraft: (draft: SetupDraft) => void;
  loadSample: () => void;
  undo: () => void;
  redo: () => void;
  startSimulation: () => boolean;
  openReadOnlySnapshot: (draft: SetupDraft) => void;
  clearSnapshot: () => void;
  editSetup: () => void;
  setSimulation: (patch: Partial<SimulationConfig>) => void;
  setThermalFrame: (frame: ThermalFrame | null) => void;
  setSync: (patch: Partial<SyncMeta>) => void;
  addScenario: (scenario: ScenarioSummary) => void;
  setScenarios: (scenarios: ScenarioSummary[]) => void;
  renameScenario: (id: string, name: string) => void;
  removeScenario: (id: string) => void;
};

let saveTimer: ReturnType<typeof setTimeout> | undefined;
const scheduleSave = (draft: SetupDraft, revision: number) => {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveLocalDraft(draft, revision), 300);
};

export const useSimulatorStore = create<SimulatorStore>((set, get) => ({
  mode: "setup",
  setupStep: "layout",
  draft: local?.draft ?? createEmptyDraft(),
  snapshot: null,
  simulation: initialSimulation(),
  thermalFrame: null,
  validation: validateDraft(local?.draft ?? createEmptyDraft()),
  selectedId: null,
  revision: local?.localRevision ?? 0,
  history: { past: [], future: [] },
  sync: {
    localRevision: local?.localRevision ?? 0,
    serverRevision: null,
    lastSyncedAt: null,
    status: navigator.onLine ? "local" : "offline",
  },
  scenarios: localScenarios,
  setStep: (setupStep) => set({ setupStep }),
  select: (selectedId) => set({ selectedId }),
  mutateDraft: (mutator) => {
    const before = get().draft;
    const next = structuredClone(before);
    mutator(next);
    const revision = get().revision + 1;
    const history = {
      past: [...get().history.past, before].slice(-LIMITS.history),
      future: [],
    };
    scheduleSave(next, revision);
    set({
      draft: next,
      revision,
      history,
      validation: validateDraft(next),
      sync: {
        ...get().sync,
        localRevision: revision,
        status: navigator.onLine ? "local" : "offline",
      },
    });
  },
  replaceDraft: (next) => {
    const revision = get().revision + 1;
    scheduleSave(next, revision);
    set({
      mode: "setup",
      setupStep: "layout",
      draft: structuredClone(next),
      snapshot: null,
      simulation: initialSimulation(),
      thermalFrame: null,
      revision,
      validation: validateDraft(next),
      history: { past: [], future: [] },
      sync: { ...get().sync, localRevision: revision, status: "local" },
    });
  },
  loadSample: () => get().replaceDraft(createSampleDraft()),
  undo: () => {
    const { past, future } = get().history;
    const previous = past.at(-1);
    if (!previous) return;
    const revision = get().revision + 1;
    scheduleSave(previous, revision);
    set({
      draft: previous,
      revision,
      validation: validateDraft(previous),
      history: {
        past: past.slice(0, -1),
        future: [get().draft, ...future].slice(0, LIMITS.history),
      },
    });
  },
  redo: () => {
    const { past, future } = get().history;
    const next = future[0];
    if (!next) return;
    const revision = get().revision + 1;
    scheduleSave(next, revision);
    set({
      draft: next,
      revision,
      validation: validateDraft(next),
      history: {
        past: [...past, get().draft].slice(-LIMITS.history),
        future: future.slice(1),
      },
    });
  },
  startSimulation: () => {
    const validation = validateDraft(get().draft);
    if (validation.some((issue) => issue.severity === "error")) {
      set({ validation, setupStep: "review" });
      return false;
    }
    const snapshot = deepFreeze<SimulationSnapshot>({
      sourceRevision: get().revision + 1,
      createdAt: new Date().toISOString(),
      engineVersion: ENGINE_VERSION,
      config: structuredClone(get().draft),
    });
    set({
      mode: "simulation",
      snapshot,
      simulation: initialSimulation(),
      thermalFrame: null,
      validation,
    });
    return true;
  },
  openReadOnlySnapshot: (draft) =>
    set({
      mode: "simulation",
      snapshot: deepFreeze<SimulationSnapshot>({
        sourceRevision: 0,
        createdAt: new Date().toISOString(),
        engineVersion: ENGINE_VERSION,
        config: structuredClone(draft),
      }),
      simulation: initialSimulation(),
      thermalFrame: null,
    }),
  clearSnapshot: () =>
    set({
      snapshot: null,
      simulation: initialSimulation(),
      thermalFrame: null,
    }),
  editSetup: () =>
    set({
      mode: "setup",
      setupStep: "review",
      simulation: initialSimulation(),
      thermalFrame: null,
    }),
  setSimulation: (patch) =>
    set({ simulation: { ...get().simulation, ...patch } }),
  setThermalFrame: (thermalFrame) => set({ thermalFrame }),
  setSync: (patch) => set({ sync: { ...get().sync, ...patch } }),
  addScenario: (scenario) => {
    const scenarios = [scenario, ...get().scenarios];
    localStorage.setItem("ac:scenarios", JSON.stringify(scenarios));
    set({ scenarios });
  },
  setScenarios: (scenarios) => {
    localStorage.setItem("ac:scenarios", JSON.stringify(scenarios));
    set({ scenarios });
  },
  renameScenario: (id, name) => {
    const scenarios = get().scenarios.map((s) =>
      s.id === id ? { ...s, name } : s,
    );
    localStorage.setItem("ac:scenarios", JSON.stringify(scenarios));
    set({ scenarios });
  },
  removeScenario: (id) => {
    const scenarios = get().scenarios.filter((s) => s.id !== id);
    localStorage.setItem("ac:scenarios", JSON.stringify(scenarios));
    set({ scenarios });
  },
}));
