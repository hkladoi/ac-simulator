import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  api,
  type ServerProject,
  type ServerReport,
  type ServerShare,
} from "../../api/client";
import { estimateHeatLoads } from "../../calculations/heatLoad";
import { AppHeader } from "../../components/AppHeader";
import type { SetupDraft } from "../../domain/types";
import { migrateDraft } from "../../state/persistence";
import { useSimulatorStore } from "../../state/simulatorStore";
import { validateDraft } from "../editor/validation";
import { useI18n } from "../../i18n/I18n";

const download = (name: string, blob: Blob) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
const drawPlan = (draft: SetupDraft) => {
  const canvas = document.createElement("canvas");
  canvas.width = 1600;
  canvas.height = 1000;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.fillStyle = "#f7fafc";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const maxX = Math.max(1, ...draft.rooms.map((r) => r.origin.x + r.lengthM));
  const maxY = Math.max(1, ...draft.rooms.map((r) => r.origin.y + r.widthM));
  const scale = Math.min(1300 / maxX, 760 / maxY);
  const ox = 140;
  const oy = 120;
  ctx.lineWidth = 5;
  ctx.font = "28px sans-serif";
  for (const room of draft.rooms) {
    const x = ox + room.origin.x * scale;
    const y = oy + room.origin.y * scale;
    const w = room.lengthM * scale;
    const h = room.widthM * scale;
    ctx.fillStyle = "#e8f6f7";
    ctx.strokeStyle = "#173d46";
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = "#173d46";
    ctx.fillText(room.name, x + 18, y + 38);
  }
  for (const item of draft.furniture) {
    const room = draft.rooms.find((r) => r.id === item.roomId);
    if (!room) continue;
    ctx.fillStyle = "#9cb2b5";
    ctx.fillRect(
      ox + (room.origin.x + item.position.x) * scale,
      oy + (room.origin.y + item.position.y) * scale,
      item.widthM * scale,
      item.depthM * scale,
    );
  }
  ctx.fillStyle = "#173d46";
  ctx.font = "24px sans-serif";
  ctx.fillText(
    "AC Thermal Studio · Floor plan · canonical metric geometry",
    140,
    940,
  );
  return canvas;
};

export default function ReportsPage() {
  const { id = "local" } = useParams();
  const isServer = id !== "local";
  const { locale } = useI18n();
  const vi = locale === "vi";
  const draft = useSimulatorStore((s) => s.draft);
  const replaceDraft = useSimulatorStore((s) => s.replaceDraft);
  const setSync = useSimulatorStore((s) => s.setSync);
  const scenarios = useSimulatorStore((s) => s.scenarios);
  const [shares, setShares] = useState<ServerShare[]>([]);
  const [reports, setReports] = useState<ServerReport[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    if (!isServer) return;
    try {
      const [nextShares, nextReports, project] = await Promise.all([
        api<ServerShare[]>(`/api/projects/${id}/shares`),
        api<ServerReport[]>(`/api/projects/${id}/reports`),
        api<ServerProject>(`/api/projects/${id}`),
      ]);
      setShares(nextShares);
      setReports(nextReports);
      replaceDraft(JSON.parse(project.configJson));
      localStorage.setItem("ac:serverProjectId", project.id);
      setSync({
        status: "synced",
        serverRevision: project.revision,
        lastSyncedAt: new Date().toISOString(),
      });
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Load failed");
    }
  }, [id, isServer, replaceDraft, setSync]);
  useEffect(() => {
    void refresh();
  }, [refresh]);

  const exportJson = () =>
    download(
      "ac-project-v2.json",
      new Blob(
        [
          JSON.stringify(
            {
              schemaVersion: 2,
              exportedAt: new Date().toISOString(),
              engineVersion: "thermal-visual-2.0",
              config: draft,
            },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      ),
    );
  const importJson = async (file: File) => {
    if (file.size > 2_000_000) throw new Error("File exceeds the 2 MB limit");
    const data = JSON.parse(await file.text()) as {
      schemaVersion?: number;
      config?: unknown;
    };
    const migrated = migrateDraft(data.config);
    const errors = validateDraft(migrated).filter(
      (issue) => issue.severity === "error",
    );
    if (errors.length)
      throw new Error(`Project contains ${errors.length} validation error(s)`);
    replaceDraft(migrated);
    setMessage(vi ? "Đã nhập project hợp lệ." : "Valid project imported.");
  };
  const pdf = async () => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    const loads = estimateHeatLoads(draft);
    doc.setFontSize(20);
    doc.text("AC Thermal Studio - Simulation report", 18, 22);
    doc.setFontSize(10);
    doc.text(
      `Generated: ${new Date().toISOString()}  |  Engine: thermal-visual-2.0`,
      18,
      31,
    );
    doc.text(
      `Rooms: ${draft.rooms.length}  |  AC units: ${draft.acUnits.length}  |  Outside/target: ${draft.environment.outsideTempC}/${draft.environment.targetTempC} C`,
      18,
      39,
    );
    doc.text(`Estimated heat load: ${loads.totalKw.toFixed(2)} kW`, 18, 47);
    let y = 58;
    for (const room of loads.rooms) {
      const model = draft.rooms.find((r) => r.id === room.roomId);
      doc.text(
        `${model?.name ?? room.roomId}: ${room.totalKw.toFixed(2)} kW | ${model?.lengthM} x ${model?.widthM} x ${model?.heightM} m`,
        22,
        y,
      );
      y += 7;
    }
    for (const ac of draft.acUnits) {
      doc.text(
        `AC ${ac.id.slice(0, 8)}: ${ac.coolingCapacityKw.toFixed(2)} kW | ${ac.setpointC} C | ${ac.fanSpeed}`,
        22,
        y,
      );
      y += 7;
    }
    if (scenarios[0]) {
      y += 4;
      doc.text(
        `Latest scenario: ${scenarios[0].name} | avg ${scenarios[0].metrics.averageAt60C.toFixed(1)} C | comfort ${scenarios[0].metrics.comfortPercent.toFixed(0)}%`,
        18,
        y,
      );
    }
    doc.setFontSize(9);
    doc.text(
      "Approximate visual model. Not a real measurement or certified HVAC design result.",
      18,
      280,
    );
    doc.save("ac-thermal-report.pdf");
  };
  const png = () =>
    drawPlan(draft).toBlob(
      (blob) => blob && download("ac-floor-plan.png", blob),
      "image/png",
    );
  const createShare = async () => {
    if (!isServer) {
      setMessage(
        vi
          ? "Đăng nhập và nhập project cục bộ trước khi chia sẻ."
          : "Sign in and import the local project before sharing.",
      );
      return;
    }
    setBusy(true);
    try {
      const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString();
      const result = await api<{ url: string; token: string }>(
        `/api/projects/${id}/shares`,
        { method: "POST", body: JSON.stringify({ expiresAt }) },
      );
      const absolute = new URL(result.url, location.origin).toString();
      let copied = false;
      try {
        await navigator.clipboard.writeText(absolute);
        copied = true;
      } catch {}
      setMessage(
        copied
          ? vi
            ? "Đã tạo link read-only 7 ngày và sao chép vào clipboard."
            : "A seven-day read-only link was created and copied."
          : `${vi ? "Link đã tạo" : "Link created"}: ${absolute}`,
      );
      await refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Share failed");
    } finally {
      setBusy(false);
    }
  };
  const revoke = async (shareId: string) => {
    if (!confirm(vi ? "Thu hồi link này?" : "Revoke this link?")) return;
    await api(`/api/projects/${id}/shares/${shareId}`, { method: "DELETE" });
    await refresh();
  };
  const queueReport = async () => {
    setBusy(true);
    try {
      await api(`/api/projects/${id}/reports`, {
        method: "POST",
        body: JSON.stringify({ scenarioId: scenarios[0]?.id ?? null }),
      });
      setMessage(vi ? "Report đã vào hàng đợi." : "Report queued.");
      await refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Report failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <AppHeader />
      <main className="narrow-page wide">
        <span className="eyebrow">EXPORT & SHARING CENTER</span>
        <h1>{vi ? "Báo cáo, chia sẻ & dữ liệu" : "Reports, sharing & data"}</h1>
        {message && (
          <div className="info-card" role="status">
            {message}
          </div>
        )}
        <div className="export-grid">
          <article>
            <h2>Project JSON</h2>
            <p>
              {vi
                ? "Schema version rõ ràng, migration v1 và dữ liệu metric canonical."
                : "Explicit schema version, v1 migration and canonical metric data."}
            </p>
            <button onClick={exportJson}>
              {vi ? "Xuất JSON" : "Export JSON"}
            </button>
            <label className="file-button">
              {vi ? "Nhập JSON" : "Import JSON"}
              <input
                type="file"
                accept="application/json"
                onChange={(e) =>
                  e.target.files?.[0] &&
                  importJson(e.target.files[0]).catch((err) =>
                    setMessage(err.message),
                  )
                }
              />
            </label>
          </article>
          <article>
            <h2>PDF report</h2>
            <p>
              {vi
                ? "Cấu hình, AC, tải lạnh, scenario gần nhất, engine version và disclaimer."
                : "Configuration, AC, heat load, latest scenario, engine version and disclaimer."}
            </p>
            <button onClick={() => void pdf()}>
              {vi ? "Tạo PDF phía client" : "Create client PDF"}
            </button>
            {isServer && (
              <button
                className="secondary"
                disabled={busy}
                onClick={() => void queueReport()}
              >
                {vi ? "Xếp hàng report server" : "Queue server report"}
              </button>
            )}
          </article>
          <article>
            <h2>PNG</h2>
            <p>
              {vi
                ? "Xuất mặt bằng độ phân giải 1600×1000. Thermal PNG có ngay trên màn mô phỏng."
                : "Export a 1600×1000 floor plan. Thermal PNG is available on the simulation screen."}
            </p>
            <button onClick={png}>
              {vi ? "Xuất PNG mặt bằng" : "Export floor-plan PNG"}
            </button>
          </article>
          <article>
            <h2>{vi ? "Link read-only" : "Read-only link"}</h2>
            <p>
              {vi
                ? "Token chỉ hiện một lần, server chỉ lưu hash; link mặc định hết hạn sau 7 ngày."
                : "The token is shown once, only its hash is stored; links expire after seven days by default."}
            </p>
            <button disabled={busy} onClick={() => void createShare()}>
              {vi ? "Tạo & sao chép link" : "Create & copy link"}
            </button>
          </article>
        </div>
        {isServer && (
          <section>
            <h2>{vi ? "Link đang quản lý" : "Managed links"}</h2>
            {shares.length === 0 ? (
              <p className="muted">Empty</p>
            ) : (
              <div className="version-list">
                {shares.map((share) => (
                  <article key={share.id}>
                    <div>
                      <strong>{share.permission.toUpperCase()}</strong>
                      <small>
                        {share.revokedAt
                          ? "revoked"
                          : share.expiresAt
                            ? `expires ${new Date(share.expiresAt).toLocaleString(locale)}`
                            : "no expiry"}
                      </small>
                    </div>
                    {!share.revokedAt && (
                      <button
                        className="secondary danger"
                        onClick={() => void revoke(share.id)}
                      >
                        {vi ? "Thu hồi" : "Revoke"}
                      </button>
                    )}
                  </article>
                ))}
              </div>
            )}
            <h2>Background reports</h2>
            <div className="version-list">
              {reports.map((report) => (
                <article key={report.id}>
                  <div>
                    <strong>{report.status}</strong>
                    <small>
                      {new Date(report.createdAt).toLocaleString(locale)}
                      {report.error ? ` · ${report.error}` : ""}
                    </small>
                  </div>
                  {report.fileUrl && (
                    <a
                      className="button secondary"
                      href={report.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      PDF
                    </a>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
