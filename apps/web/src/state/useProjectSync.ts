import { useEffect, useRef, useState } from "react";
import { ApiError, api, type ServerProject } from "../api/client";
import type { SetupDraft } from "../domain/types";
import { offlineDb, type PendingMutation } from "./offlineDb";
import { useSimulatorStore } from "./simulatorStore";

export type SyncConflict = { server: ServerProject; local: SetupDraft };
type SavePayload = { draft: SetupDraft; expectedRevision: number | null };

export const useProjectSync = (
  projectId: string | null = localStorage.getItem("ac:serverProjectId"),
) => {
  const draft = useSimulatorStore((s) => s.draft);
  const revision = useSimulatorStore((s) => s.revision);
  const sync = useSimulatorStore((s) => s.sync);
  const setSync = useSimulatorStore((s) => s.setSync);
  const replaceDraft = useSimulatorStore((s) => s.replaceDraft);
  const [conflict, setConflict] = useState<SyncConflict | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const retryAttempt = useRef(0);

  useEffect(() => {
    if (!projectId || !["local", "offline", "error"].includes(sync.status))
      return;
    const persist = async () => {
      await offlineDb.putProject({
        id: projectId,
        draft,
        localRevision: revision,
        serverRevision: sync.serverRevision,
        updatedAt: new Date().toISOString(),
      });
      if (!navigator.onLine || sync.status === "offline") {
        await offlineDb.queue({
          id: `save:${projectId}`,
          projectId,
          kind: "save",
          payload: {
            draft,
            expectedRevision: sync.serverRevision,
          } satisfies SavePayload,
          attempts: 0,
          nextAttemptAt: Date.now(),
        });
        setSync({ status: "offline" });
        return;
      }
      setSync({ status: "saving" });
      try {
        const server = await api<ServerProject>(
          `/api/projects/${projectId}/draft`,
          {
            method: "PUT",
            body: JSON.stringify({
              configJson: JSON.stringify(draft),
              expectedRevision: sync.serverRevision ?? 1,
              reason: "autosave",
            }),
          },
        );
        await offlineDb.removeMutation(`save:${projectId}`);
        retryAttempt.current = 0;
        setSync({
          status: "synced",
          serverRevision: server.revision,
          lastSyncedAt: new Date().toISOString(),
        });
      } catch (error) {
        if (error instanceof ApiError && error.status === 409) {
          const server = await api<ServerProject>(`/api/projects/${projectId}`);
          setConflict({ server, local: draft });
          setSync({ status: "conflict", serverRevision: server.revision });
        } else {
          retryAttempt.current += 1;
          setSync({ status: "error" });
        }
      }
    };
    clearTimeout(timer.current);
    const delay =
      sync.status === "error"
        ? Math.min(60_000, 1000 * 2 ** retryAttempt.current)
        : 900;
    timer.current = setTimeout(() => void persist(), delay);
    return () => clearTimeout(timer.current);
  }, [draft, projectId, revision, setSync, sync.serverRevision, sync.status]);

  useEffect(() => {
    const flush = async () => {
      if (!projectId) return;
      setSync({ status: "saving" });
      const mutations = (await offlineDb.mutations())
        .filter((item) => item.projectId === projectId)
        .sort((a, b) => a.nextAttemptAt - b.nextAttemptAt);
      for (const mutation of mutations) {
        if (mutation.nextAttemptAt > Date.now() || mutation.kind !== "save")
          continue;
        const payload = mutation.payload as SavePayload;
        try {
          const server = await api<ServerProject>(
            `/api/projects/${projectId}/draft`,
            {
              method: "PUT",
              body: JSON.stringify({
                configJson: JSON.stringify(payload.draft),
                expectedRevision: payload.expectedRevision ?? 1,
                reason: "offline-sync",
              }),
            },
          );
          await offlineDb.removeMutation(mutation.id);
          setSync({
            status: "synced",
            serverRevision: server.revision,
            lastSyncedAt: new Date().toISOString(),
          });
        } catch (error) {
          if (error instanceof ApiError && error.status === 409) {
            const server = await api<ServerProject>(
              `/api/projects/${projectId}`,
            );
            setConflict({ server, local: payload.draft });
            setSync({ status: "conflict", serverRevision: server.revision });
            return;
          }
          const retry: PendingMutation = {
            ...mutation,
            attempts: mutation.attempts + 1,
            nextAttemptAt:
              Date.now() + Math.min(60_000, 1000 * 2 ** mutation.attempts),
          };
          await offlineDb.queue(retry);
          setSync({ status: "error" });
        }
      }
    };
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    const onOnline = () => {
      // Re-enter the normal debounced save path with the latest in-memory draft.
      // This also avoids replaying a stale queued payload after rapid offline edits.
      setSync({ status: "local" });
      reconnectTimer = setTimeout(() => void flush(), 5_000);
    };
    window.addEventListener("online", onOnline);
    return () => {
      clearTimeout(reconnectTimer);
      window.removeEventListener("online", onOnline);
    };
  }, [projectId, setSync]);

  const resolve = async (choice: "local" | "server" | "copy") => {
    if (!conflict || !projectId) return;
    if (choice === "server") {
      replaceDraft(JSON.parse(conflict.server.configJson) as SetupDraft);
      setSync({ status: "synced", serverRevision: conflict.server.revision });
      setConflict(null);
      return;
    }
    if (choice === "copy") {
      const copy = await api<ServerProject>("/api/projects", {
        method: "POST",
        body: JSON.stringify({
          name: `${conflict.server.name} — local copy`,
          configJson: JSON.stringify(conflict.local),
        }),
      });
      localStorage.setItem("ac:serverProjectId", copy.id);
      setConflict(null);
      window.location.assign(`/projects/${copy.id}/setup`);
      return;
    }
    const server = await api<ServerProject>(
      `/api/projects/${projectId}/draft`,
      {
        method: "PUT",
        body: JSON.stringify({
          configJson: JSON.stringify(conflict.local),
          expectedRevision: conflict.server.revision,
          reason: "conflict-keep-local",
        }),
      },
    );
    setSync({ status: "synced", serverRevision: server.revision });
    setConflict(null);
  };
  return { conflict, resolve };
};
