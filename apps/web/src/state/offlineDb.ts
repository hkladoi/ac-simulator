import { openDB } from "idb";
import type { SetupDraft } from "../domain/types";
const dbPromise = openDB("ac-thermal-local", 2, {
  upgrade(db, oldVersion) {
    if (oldVersion < 1) {
      db.createObjectStore("projects", { keyPath: "id" });
      db.createObjectStore("mutations", { keyPath: "id" });
    }
    if (oldVersion < 2) db.createObjectStore("scenarios", { keyPath: "id" });
  },
});
export type LocalProject = {
  id: string;
  draft: SetupDraft;
  localRevision: number;
  serverRevision: number | null;
  updatedAt: string;
};
export type PendingMutation = {
  id: string;
  projectId: string;
  kind: "save" | "delete";
  payload: unknown;
  attempts: number;
  nextAttemptAt: number;
};
export const offlineDb = {
  putProject: async (project: LocalProject) =>
    (await dbPromise).put("projects", project),
  getProject: async (id: string) =>
    (await dbPromise).get("projects", id) as Promise<LocalProject | undefined>,
  queue: async (mutation: PendingMutation) =>
    (await dbPromise).put("mutations", mutation),
  mutations: async () =>
    (await dbPromise).getAll("mutations") as Promise<PendingMutation[]>,
  removeMutation: async (id: string) =>
    (await dbPromise).delete("mutations", id),
};
