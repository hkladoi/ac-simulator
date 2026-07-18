import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  api,
  ApiError,
  type ServerProject,
  type ServerVersion,
} from "../../api/client";
import { AppHeader } from "../../components/AppHeader";
import type { SetupDraft } from "../../domain/types";
import { useI18n } from "../../i18n/I18n";
import { useSimulatorStore } from "../../state/simulatorStore";

type LocalCheckpoint = {
  id: string;
  createdAt: string;
  reason: string;
  draft: SetupDraft;
};
type PagedVersions = { items: ServerVersion[]; total: number };

export default function VersionsPage() {
  const { id = "local" } = useParams();
  const isServer = id !== "local";
  const { locale } = useI18n();
  const draft = useSimulatorStore((s) => s.draft);
  const replaceDraft = useSimulatorStore((s) => s.replaceDraft);
  const setSync = useSimulatorStore((s) => s.setSync);
  const [localVersions, setLocalVersions] = useState<LocalCheckpoint[]>(() => {
    try {
      return JSON.parse(
        localStorage.getItem("ac:versions") ?? "[]",
      ) as LocalCheckpoint[];
    } catch {
      return [];
    }
  });
  const [serverVersions, setServerVersions] = useState<ServerVersion[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const copy =
    locale === "vi"
      ? {
          title: "Lịch sử phiên bản",
          checkpoint: "Tạo checkpoint",
          empty: "Chưa có checkpoint",
          emptyBody:
            "Autosave giữ bản nháp; checkpoint đánh dấu cấu hình quan trọng để khôi phục.",
          restore: "Khôi phục",
          confirm:
            "Khôi phục sẽ tạo revision mới và giữ nguyên lịch sử. Tiếp tục?",
        }
      : {
          title: "Version history",
          checkpoint: "Create checkpoint",
          empty: "No checkpoints yet",
          emptyBody:
            "Autosave keeps the draft; checkpoints mark important configurations for restoration.",
          restore: "Restore",
          confirm:
            "Restoring creates a new revision and preserves history. Continue?",
        };

  const refresh = useCallback(async () => {
    if (!isServer) return;
    try {
      const page = await api<PagedVersions>(
        `/api/projects/${id}/versions?pageSize=50`,
      );
      setServerVersions(page.items);
      setError("");
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 401
          ? "Unauthorized"
          : e instanceof Error
            ? e.message
            : "Load failed",
      );
    }
  }, [id, isServer]);
  useEffect(() => {
    void refresh();
  }, [refresh]);

  const checkpoint = async () => {
    setBusy(true);
    try {
      if (isServer) {
        await api(`/api/projects/${id}/versions`, {
          method: "POST",
          body: JSON.stringify({ reason: "manual checkpoint" }),
        });
        await refresh();
      } else {
        const next = [
          {
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
            reason: "manual checkpoint",
            draft: structuredClone(draft),
          },
          ...localVersions,
        ];
        localStorage.setItem("ac:versions", JSON.stringify(next));
        setLocalVersions(next);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkpoint failed");
    } finally {
      setBusy(false);
    }
  };

  const restoreServer = async (versionId: string) => {
    if (!confirm(copy.confirm)) return;
    setBusy(true);
    try {
      const project = await api<ServerProject>(
        `/api/projects/${id}/versions/${versionId}/restore`,
        { method: "POST", body: "{}" },
      );
      replaceDraft(JSON.parse(project.configJson) as SetupDraft);
      setSync({
        status: "synced",
        serverRevision: project.revision,
        lastSyncedAt: new Date().toISOString(),
      });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Restore failed");
    } finally {
      setBusy(false);
    }
  };

  const rows = isServer ? serverVersions : localVersions;
  return (
    <>
      <AppHeader />
      <main className="narrow-page">
        <div className="page-heading">
          <div>
            <span className="eyebrow">IMMUTABLE HISTORY</span>
            <h1>{copy.title}</h1>
          </div>
          <button disabled={busy} onClick={checkpoint}>
            {copy.checkpoint}
          </button>
        </div>
        {error && (
          <div className="error-banner" role="alert">
            {error}
          </div>
        )}
        {rows.length === 0 ? (
          <div className="empty-card">
            <h2>{copy.empty}</h2>
            <p>{copy.emptyBody}</p>
          </div>
        ) : (
          <div className="version-list">
            {rows.map((version, index) => (
              <article key={version.id}>
                <div>
                  <strong>Version {rows.length - index}</strong>
                  <small>
                    {new Date(version.createdAt).toLocaleString(locale)} ·{" "}
                    {version.reason}
                    {"schemaVersion" in version
                      ? ` · schema ${version.schemaVersion}`
                      : ""}
                  </small>
                </div>
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() =>
                    isServer
                      ? void restoreServer(version.id)
                      : confirm(copy.confirm) &&
                        replaceDraft((version as LocalCheckpoint).draft)
                  }
                >
                  {copy.restore}
                </button>
              </article>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
