import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, type ServerProject, type ServerScenario } from "../../api/client";
import { estimateHeatLoads } from "../../calculations/heatLoad";
import { AppHeader } from "../../components/AppHeader";
import type { WorkerResponse } from "../../simulation/protocol";
import { BuildingScene } from "../../scene/BuildingScene";
import { useSimulatorStore } from "../../state/simulatorStore";
import { useI18n } from "../../i18n/I18n";
import {
  celsiusToFahrenheit,
  kwToBtuh,
} from "../../calculations/unitConversion";
import type { ScenarioSummary } from "../../domain/types";

export default function SimulationPage({
  readOnly = false,
}: {
  readOnly?: boolean;
}) {
  const { t, units, tr } = useI18n();
  const navigate = useNavigate();
  const { id = "local", token } = useParams();
  const workerRef = useRef<Worker | null>(null);
  const [workerError, setWorkerError] = useState<string | null>(null);
  const [sharedReady, setSharedReady] = useState(!readOnly);
  const [scenarioStatus, setScenarioStatus] = useState("");
  const {
    snapshot,
    simulation,
    thermalFrame,
    setSimulation,
    setThermalFrame,
    editSetup,
    addScenario,
    openReadOnlySnapshot,
    clearSnapshot,
  } = useSimulatorStore();
  useEffect(() => {
    document.title = `${t("simulation")} · ${t("appName")}`;
  }, [t]);
  useEffect(() => {
    if (!readOnly || !token) return;
    let cancelled = false;
    clearSnapshot();
    setSharedReady(false);
    api<{
      project: { id: string; name: string; configJson: string };
      permission: "read";
      expiresAt: string | null;
    }>(`/api/shared/${encodeURIComponent(token)}`)
      .then((shared) => {
        if (cancelled) return;
        openReadOnlySnapshot(JSON.parse(shared.project.configJson));
        setSharedReady(true);
      })
      .catch((error) => {
        if (!cancelled) {
          setWorkerError(
            error instanceof Error
              ? error.message
              : tr(
                  "Liên kết chia sẻ không hợp lệ hoặc đã hết hạn.",
                  "The share link is invalid or expired.",
                ),
          );
          setSharedReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [readOnly, token, openReadOnlySnapshot, clearSnapshot]);
  useEffect(() => {
    if (!snapshot || !sharedReady) return;
    const worker = new Worker(
      new URL("../../simulation/thermal.worker.ts", import.meta.url),
      { type: "module" },
    );
    workerRef.current = worker;
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      if (event.data.type === "error") setWorkerError(event.data.message);
      else {
        setThermalFrame(event.data.frame);
        setSimulation({ elapsedMinutes: event.data.frame.elapsedMinutes });
      }
    };
    worker.onerror = () =>
      setWorkerError(
        tr(
          "Web Worker không thể khởi tạo trên trình duyệt này.",
          "The Web Worker could not start in this browser.",
        ),
      );
    worker.postMessage({ type: "init", snapshot });
    return () => {
      worker.postMessage({ type: "dispose" });
      worker.terminate();
      workerRef.current = null;
      setThermalFrame(null);
    };
  }, [snapshot, sharedReady, setSimulation, setThermalFrame]);
  useEffect(() => {
    if (!simulation.isPlaying || simulation.elapsedMinutes >= 60) return;
    const timer = setInterval(
      () =>
        workerRef.current?.postMessage({
          type: "step",
          minutes: 0.25 * simulation.speedMultiplier,
        }),
      250,
    );
    return () => clearInterval(timer);
  }, [
    simulation.isPlaying,
    simulation.speedMultiplier,
    simulation.elapsedMinutes,
  ]);
  if (!sharedReady)
    return (
      <>
        <AppHeader />
        <main className="state-page" aria-live="polite">
          <div className="spinner" />
          <p>{tr("Đang mở liên kết chỉ đọc…", "Opening read-only link…")}</p>
        </main>
      </>
    );
  if (!snapshot)
    return (
      <>
        <AppHeader />
        <main className="state-page">
          <div className="empty-icon">◫</div>
          <h1>
            {workerError
              ? tr("Không thể mở mô phỏng", "Unable to open simulation")
              : tr("Chưa có snapshot mô phỏng", "No simulation snapshot")}
          </h1>
          <p>
            {workerError ??
              tr(
                "Vì lý do an toàn dữ liệu, mô phỏng chỉ chạy sau khi cấu hình được kiểm tra và xác nhận.",
                "For data safety, simulation only runs after the setup is reviewed and confirmed.",
              )}
          </p>
          {!readOnly && (
            <button onClick={() => navigate(`/projects/${id}/setup`)}>
              {tr("Về SETUP", "Back to SETUP")}
            </button>
          )}
        </main>
      </>
    );
  const loads = estimateHeatLoads(snapshot.config);
  const imperial = units === "imperial";
  const tempUnit = imperial ? "°F" : "°C";
  const showTemp = (c: number) =>
    (imperial ? celsiusToFahrenheit(c) : c).toFixed(1);
  const showLoad = (kw: number) =>
    imperial
      ? `${Math.round(kwToBtuh(kw)).toLocaleString()} BTU/h`
      : `${kw.toFixed(2)} kW`;
  const jump = (minute: number) => {
    setSimulation({ isPlaying: false });
    workerRef.current?.postMessage({ type: "reset" });
    if (minute)
      workerRef.current?.postMessage({ type: "step", minutes: minute });
  };
  const exit = () => {
    if (
      simulation.elapsedMinutes > 0 &&
      !confirm(
        tr(
          "Kết quả mô phỏng hiện tại sẽ bị hủy và lần chạy sau bắt đầu từ phút 0. Tiếp tục?",
          "The current result will be discarded and the next run will start at minute 0. Continue?",
        ),
      )
    )
      return;
    workerRef.current?.postMessage({ type: "dispose" });
    editSetup();
    navigate(`/projects/${id}/setup`);
  };
  const saveScenario = async () => {
    const average =
      thermalFrame?.rooms.reduce((s, r) => s + r.averageC, 0)! /
      (thermalFrame?.rooms.length || 1);
    const scenario: ScenarioSummary = {
      id: crypto.randomUUID(),
      name: `${tr("Kịch bản", "Scenario")} ${new Date().toLocaleTimeString()}`,
      createdAt: new Date().toISOString(),
      snapshot,
      metrics: {
        heatLoadKw: loads.totalKw,
        averageAt60C:
          average ||
          snapshot.config.rooms.reduce((s, r) => s + r.initialTempC, 0) /
            snapshot.config.rooms.length,
        targetMinutes:
          average <= snapshot.config.environment.targetTempC + 1
            ? simulation.elapsedMinutes
            : null,
        comfortPercent: thermalFrame
          ? thermalFrame.rooms.reduce(
              (s, r) =>
                s +
                ([...r.temperatures].filter((v) => v >= 22 && v <= 26).length /
                  r.temperatures.length) *
                  100,
              0,
            ) / thermalFrame.rooms.length
          : 0,
      },
    };
    setScenarioStatus(tr("Đang lưu…", "Saving…"));
    try {
      if (id !== "local") {
        const project = await api<ServerProject>(`/api/projects/${id}`);
        if (!project.currentVersionId)
          throw new Error(
            tr("Dự án chưa có phiên bản gốc", "Project has no base version"),
          );
        const saved = await api<ServerScenario>(
          `/api/projects/${id}/scenarios`,
          {
            method: "POST",
            body: JSON.stringify({
              name: scenario.name,
              baseVersionId: project.currentVersionId,
              simulationConfigJson: JSON.stringify({ snapshot }),
              resultSummaryJson: JSON.stringify(scenario.metrics),
            }),
          },
        );
        scenario.id = saved.id;
        scenario.createdAt = saved.createdAt;
      }
      addScenario(scenario);
      setScenarioStatus(tr("Đã lưu kịch bản", "Scenario saved"));
    } catch (error) {
      setScenarioStatus(
        error instanceof Error
          ? error.message
          : tr("Không thể lưu kịch bản", "Unable to save scenario"),
      );
    }
  };
  const exportThermal = () => {
    const canvas = document.querySelector<HTMLCanvasElement>(
      ".simulation-canvas canvas",
    );
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `thermal-${simulation.elapsedMinutes.toFixed(0)}min.png`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, "image/png");
  };
  const min = thermalFrame
    ? Math.min(...thermalFrame.rooms.map((r) => r.minC))
    : snapshot.config.environment.targetTempC;
  const max = thermalFrame
    ? Math.max(...thermalFrame.rooms.map((r) => r.maxC))
    : snapshot.config.environment.outsideTempC;
  const inspectedFrame = thermalFrame?.rooms[0];
  const inspectedC = inspectedFrame
    ? inspectedFrame.temperatures[
        Math.floor(inspectedFrame.dimensions.nx / 2) +
          Math.floor(inspectedFrame.dimensions.ny / 2) *
            inspectedFrame.dimensions.nx +
          Math.min(
            inspectedFrame.dimensions.nz - 1,
            Math.floor(simulation.sliceHeight01 * inspectedFrame.dimensions.nz),
          ) *
            inspectedFrame.dimensions.nx *
            inspectedFrame.dimensions.ny
      ]
    : undefined;
  return (
    <div className="simulation-page">
      <AppHeader />
      <header className="simulation-header">
        <div>
          <span className="eyebrow">
            {readOnly ? "READ-ONLY SHARE" : "IMMUTABLE SNAPSHOT"} · REV{" "}
            {snapshot.sourceRevision}
          </span>
          <h1>{t("simulation")}</h1>
        </div>
        <div className="sim-head-metrics">
          <div>
            <span>
              {t("heatLoad").toUpperCase()} · {t("estimated")}
            </span>
            <strong>{showLoad(loads.totalKw)}</strong>
          </div>
          <div>
            <span>TIME</span>
            <strong>{simulation.elapsedMinutes.toFixed(1)} min</strong>
          </div>
          {!readOnly && (
            <button className="secondary" onClick={exit}>
              {t("editSetup")}
            </button>
          )}
        </div>
      </header>
      {workerError && (
        <div className="error-banner" role="alert">
          {workerError}
        </div>
      )}
      <div className="simulation-layout">
        <aside className="room-sidebar">
          <span className="eyebrow">ROOMS</span>
          {snapshot.config.rooms.map((room) => {
            const frame = thermalFrame?.rooms.find((r) => r.roomId === room.id);
            const load = loads.rooms.find((r) => r.roomId === room.id)!;
            return (
              <article key={room.id} className="room-stat">
                <div>
                  <strong>{room.name}</strong>
                  <span className="status-dot cooling" />
                </div>
                <div className="temperature">
                  {showTemp(frame?.averageC ?? room.initialTempC)}
                  <sup>{tempUnit}</sup>
                </div>
                <small>
                  {showLoad(load.totalKw)} · {t("estimated")}
                </small>
                <div className="temp-bar">
                  <span
                    style={{
                      width: `${Math.max(5, Math.min(100, (((frame?.averageC ?? room.initialTempC) - 16) / 24) * 100))}%`,
                    }}
                  />
                </div>
              </article>
            );
          })}
          {!readOnly && (
            <button
              className="secondary full"
              onClick={() => navigate(`/projects/${id}/compare`)}
            >
              {tr("So sánh kịch bản", "Compare scenarios")}
            </button>
          )}
        </aside>
        <main className="simulation-canvas">
          <BuildingScene
            draft={snapshot.config}
            thermal={thermalFrame}
            active={simulation.isPlaying}
            sliceHeight={simulation.sliceHeight01}
            opacity={simulation.heatmapOpacity}
            overlay={simulation.heatmapVisible}
          />
          <div
            className="canvas-overlay"
            title={
              inspectedC === undefined
                ? undefined
                : `${t("inspectValue")}: ${showTemp(inspectedC)}${tempUnit}`
            }
          >
            <span>THERMAL SLICE</span>
            <strong>
              {thermalFrame
                ? `${showTemp(min)}–${showTemp(max)} ${tempUnit}`
                : tr("Đang khởi tạo…", "Initializing…")}
            </strong>
            {inspectedC !== undefined && (
              <small>
                {t("inspectValue")}: {showTemp(inspectedC)}
                {tempUnit}
              </small>
            )}
          </div>
        </main>
        <aside className="thermal-controls">
          <span className="eyebrow">THERMAL CONTROLS</span>
          <label className="switch-row">
            <span>{t("thermalOverlay")}</span>
            <input
              type="checkbox"
              checked={simulation.heatmapVisible}
              onChange={(e) =>
                setSimulation({ heatmapVisible: e.target.checked })
              }
            />
          </label>
          <label>
            {t("sliceHeight")}{" "}
            <output>{Math.round(simulation.sliceHeight01 * 100)}%</output>
            <input
              type="range"
              min="0"
              max="1"
              step=".02"
              value={simulation.sliceHeight01}
              onChange={(e) =>
                setSimulation({ sliceHeight01: Number(e.target.value) })
              }
            />
          </label>
          <label>
            {t("opacity")}{" "}
            <output>{Math.round(simulation.heatmapOpacity * 100)}%</output>
            <input
              type="range"
              min=".1"
              max="1"
              step=".05"
              value={simulation.heatmapOpacity}
              onChange={(e) =>
                setSimulation({ heatmapOpacity: Number(e.target.value) })
              }
            />
          </label>
          <div className="thermal-legend">
            <div className="legend-gradient" />
            <div>
              <span>
                {showTemp(min)}
                {tempUnit} {tr("Lạnh", "Cool")}
              </span>
              <span>
                {showTemp(max)}
                {tempUnit} {tr("Nóng", "Hot")}
              </span>
            </div>
          </div>
          <label>
            {tr("Tốc độ mô phỏng", "Simulation speed")}
            <select
              value={simulation.speedMultiplier}
              onChange={(e) =>
                setSimulation({
                  speedMultiplier: Number(e.target.value) as 1 | 5 | 15 | 60,
                })
              }
            >
              <option value="1">1×</option>
              <option value="5">5×</option>
              <option value="15">15×</option>
              <option value="60">60×</option>
            </select>
          </label>
          <button className="secondary full" onClick={exportThermal}>
            ↓ PNG thermal
          </button>
          {!readOnly && (
            <button
              className="secondary full"
              onClick={() => void saveScenario()}
            >
              ＋ {tr("Lưu kịch bản", "Save scenario")}
            </button>
          )}
          {scenarioStatus && <small role="status">{scenarioStatus}</small>}
          <p className="disclaimer">{t("disclaimer")}</p>
        </aside>
      </div>
      <footer className="timeline">
        <div className="transport">
          <button
            onClick={() => setSimulation({ isPlaying: !simulation.isPlaying })}
            disabled={simulation.elapsedMinutes >= 60}
          >
            {simulation.isPlaying ? "Ⅱ" : "▶"}{" "}
            {simulation.isPlaying ? t("pause") : t("play")}
          </button>
          <button className="secondary" onClick={() => jump(0)}>
            ↺ {t("reset")}
          </button>
        </div>
        <div
          className="timeline-track"
          aria-label={tr("Mốc thời gian", "Timeline milestones")}
        >
          {[0, 5, 15, 30, 60].map((x) => (
            <button
              key={x}
              className={
                Math.abs(simulation.elapsedMinutes - x) < 0.5 ? "active" : ""
              }
              onClick={() => jump(x)}
            >
              <span />
              {x} min
            </button>
          ))}
        </div>
      </footer>
    </div>
  );
}
