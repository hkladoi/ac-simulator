import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, type ServerProject } from "../../api/client";
import { AppHeader } from "../../components/AppHeader";
import { ConflictDialog } from "../../components/ConflictDialog";
import { estimateHeatLoads } from "../../calculations/heatLoad";
import {
  celsiusToFahrenheit,
  fahrenheitToCelsius,
} from "../../calculations/unitConversion";
import type {
  AcUnit,
  FurnitureItem,
  Opening,
  Room,
  SetupStep,
} from "../../domain/types";
import { useI18n } from "../../i18n/I18n";
import { BuildingScene } from "../../scene/BuildingScene";
import { useSimulatorStore } from "../../state/simulatorStore";
import { useProjectSync } from "../../state/useProjectSync";
import { uid } from "./defaults";
import { FloorPlan2D } from "./FloorPlan2D";
import { Inspector } from "./Inspector";
import { ReviewPanel } from "./ReviewPanel";

const steps: SetupStep[] = ["layout", "openings", "furniture", "ac", "review"];
const furnitureDefaults: Record<
  FurnitureItem["type"],
  Pick<FurnitureItem, "widthM" | "depthM" | "heightM">
> = {
  bed: { widthM: 2, depthM: 1.6, heightM: 0.55 },
  wardrobe: { widthM: 1.5, depthM: 0.6, heightM: 2 },
  table: { widthM: 1.2, depthM: 0.7, heightM: 0.75 },
  chair: { widthM: 0.55, depthM: 0.55, heightM: 0.9 },
  sofa: { widthM: 2.1, depthM: 0.8, heightM: 0.82 },
  shelf: { widthM: 1.2, depthM: 0.35, heightM: 1.8 },
};

export default function EditorPage() {
  const navigate = useNavigate();
  const { id = "local" } = useParams();
  const isServer = id !== "local";
  const { t, units, tr } = useI18n();
  const imperial = units === "imperial";
  const showTemp = (c: number) =>
    imperial ? Number(celsiusToFahrenheit(c).toFixed(1)) : c;
  const canonicalTemp = (v: number) => (imperial ? fahrenheitToCelsius(v) : v);
  const [view3d, setView3d] = useState(false);
  const [projectReady, setProjectReady] = useState(!isServer);
  const [loadError, setLoadError] = useState("");
  const { conflict, resolve } = useProjectSync(
    isServer && projectReady ? id : null,
  );
  const {
    draft,
    setupStep,
    selectedId,
    validation,
    history,
    mutateDraft,
    setStep,
    select,
    undo,
    redo,
    startSimulation,
    replaceDraft,
    setSync,
  } = useSimulatorStore();
  useEffect(() => {
    if (!isServer) {
      setProjectReady(true);
      return;
    }
    let cancelled = false;
    setProjectReady(false);
    api<ServerProject>(`/api/projects/${id}`)
      .then((project) => {
        if (cancelled) return;
        replaceDraft(JSON.parse(project.configJson));
        localStorage.setItem("ac:serverProjectId", project.id);
        setSync({
          serverRevision: project.revision,
          status: "synced",
          lastSyncedAt: new Date().toISOString(),
        });
        setProjectReady(true);
      })
      .catch((error) => {
        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : tr("Không thể tải dự án", "Unable to load project"),
          );
          setProjectReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id, isServer, replaceDraft, setSync]);
  useEffect(() => {
    document.title = `${t("setup")} · ${t("appName")}`;
  }, [t]);
  if (!projectReady)
    return (
      <>
        <AppHeader />
        <main className="state-page" aria-live="polite">
          <div className="spinner" />
          <p>{tr("Đang tải dự án…", "Loading project…")}</p>
        </main>
      </>
    );
  if (loadError)
    return (
      <>
        <AppHeader />
        <main className="state-page">
          <h1>{tr("Không thể mở dự án", "Unable to open project")}</h1>
          <p>{loadError}</p>
          <button onClick={() => navigate("/projects")}>
            {tr("Về dashboard", "Back to dashboard")}
          </button>
        </main>
      </>
    );
  const currentRoom = () =>
    draft.rooms.find((r) => r.id === selectedId) ?? draft.rooms[0];
  const addRoom = () =>
    mutateDraft((d) => {
      if (d.rooms.length >= 6) return;
      const last = d.rooms.at(-1);
      const room: Room = {
        id: uid("room"),
        name: `${tr("Phòng", "Room")} ${d.rooms.length + 1}`,
        origin: {
          x: last ? last.origin.x + last.lengthM : 0,
          y: last?.origin.y ?? 0,
        },
        lengthM: 4,
        widthM: 3.5,
        heightM: 3,
        wallThicknessMm: 100,
        insulationLevel: "medium",
        initialTempC: 31,
        occupants: 2,
        equipmentGainW: 150,
      };
      d.rooms.push(room);
      setTimeout(() => select(room.id), 0);
    });
  const addOpening = (type: Opening["type"], internal = false) => {
    const room = currentRoom();
    if (!room) return;
    mutateDraft((d) => {
      const target = internal
        ? d.rooms.find((r) => r.id !== room.id)
        : undefined;
      const item: Opening = {
        id: uid(type),
        roomId: room.id,
        type,
        wall: internal ? "east" : "north",
        position01: 0.5,
        widthM: type === "door" ? 0.9 : 1.4,
        heightM: type === "door" ? 2.1 : 1.2,
        sillHeightM: type === "door" ? 0 : 0.9,
        state: "closed",
        connectsToRoomId: target?.id,
        opensToOutside: !internal,
      };
      d.openings.push(item);
      setTimeout(() => select(item.id), 0);
    });
  };
  const addFurniture = (type: FurnitureItem["type"]) => {
    const room = currentRoom();
    if (!room) return;
    mutateDraft((d) => {
      const item: FurnitureItem = {
        id: uid(type),
        roomId: room.id,
        type,
        position: { x: 0.6, y: 0.7 },
        rotationDeg: 0,
        ...furnitureDefaults[type],
      };
      d.furniture.push(item);
      setTimeout(() => select(item.id), 0);
    });
  };
  const addAc = () => {
    const room = currentRoom();
    if (!room) return;
    mutateDraft((d) => {
      const item: AcUnit = {
        id: uid("ac"),
        roomId: room.id,
        coolingCapacityKw: 3.5,
        setpointC: 24,
        fanSpeed: "medium",
        horizontalAngleDeg: 0,
        verticalAngleDeg: -15,
        wall: "south",
        position01: 0.5,
        heightM: Math.min(2.4, room.heightM - 0.2),
      };
      d.acUnits.push(item);
      setTimeout(() => select(item.id), 0);
    });
  };
  const move = (id: string, x: number, y: number) =>
    mutateDraft((d) => {
      const room = d.rooms.find((r) => r.id === id);
      if (room) {
        room.origin = { x, y };
        return;
      }
      const item = d.furniture.find((f) => f.id === id);
      if (item) item.position = { x, y };
    });
  const go = (delta: number) =>
    setStep(
      steps[
        Math.max(
          0,
          Math.min(steps.length - 1, steps.indexOf(setupStep) + delta),
        )
      ],
    );
  const begin = () => {
    if (startSimulation()) navigate(`/projects/${id}/simulate`);
  };
  const loads = estimateHeatLoads(draft);
  return (
    <div className="editor-page">
      <AppHeader />
      {conflict && <ConflictDialog conflict={conflict} onResolve={resolve} />}
      <div className="workspace-title">
        <div>
          <span className="eyebrow">LOCAL PROJECT / SETUP</span>
          <h1>{tr("Dự án cục bộ", "Local project")}</h1>
        </div>
        <div className="workspace-metrics">
          <div>
            <span>{t("heatLoad").toUpperCase()}</span>
            <strong>{loads.totalKw.toFixed(2)} kW</strong>
          </div>
          <button
            className="ghost"
            onClick={undo}
            disabled={!history.past.length}
            aria-label={t("undo")}
          >
            ↶
          </button>
          <button
            className="ghost"
            onClick={redo}
            disabled={!history.future.length}
            aria-label={t("redo")}
          >
            ↷
          </button>
        </div>
      </div>
      <ol
        className="wizard"
        aria-label={tr("Các bước thiết kế", "Setup steps")}
      >
        {steps.map((step, i) => (
          <li
            key={step}
            className={`${step === setupStep ? "active" : ""} ${i < steps.indexOf(setupStep) ? "done" : ""}`}
          >
            <button onClick={() => setStep(step)}>
              <span>{i < steps.indexOf(setupStep) ? "✓" : i + 1}</span>
              {t(step)}
            </button>
          </li>
        ))}
      </ol>
      <div className="editor-layout">
        <aside className="library">
          <span className="eyebrow">OBJECT LIBRARY</span>
          <h2>{t(setupStep)}</h2>
          {setupStep === "layout" && (
            <>
              <p>
                {tr(
                  "Tối đa 6 phòng hình chữ nhật. Phòng mới được đặt kề phòng cuối.",
                  "Up to 6 rectangular rooms. New rooms are placed beside the last room.",
                )}
              </p>
              <button onClick={addRoom} disabled={draft.rooms.length >= 6}>
                ＋ {t("addRoom")}
              </button>
              <div className="library-grid" aria-label={tr("Danh sách phòng", "Room list")}>
                {draft.rooms.map((room) => (
                  <button
                    key={room.id}
                    className={selectedId === room.id ? "active" : ""}
                    onClick={() => select(room.id)}
                  >
                    {room.name}
                  </button>
                ))}
              </div>
            </>
          )}
          {setupStep === "openings" && (
            <div className="library-grid">
              <button onClick={() => addOpening("door")}>
                ▯ {tr("Cửa ngoài", "Exterior door")}
              </button>
              <button onClick={() => addOpening("window")}>
                ▤ {tr("Cửa sổ", "Window")}
              </button>
              <button
                onClick={() => addOpening("door", true)}
                disabled={draft.rooms.length < 2}
              >
                ⇄ {tr("Cửa nối phòng", "Interior door")}
              </button>
            </div>
          )}
          {setupStep === "furniture" && (
            <div className="library-grid">
              {Object.keys(furnitureDefaults).map((x) => (
                <button
                  key={x}
                  onClick={() => addFurniture(x as FurnitureItem["type"])}
                >
                  {x}
                </button>
              ))}
            </div>
          )}
          {setupStep === "ac" && (
            <>
              <button onClick={addAc}>
                ＋ {tr("Thêm điều hòa", "Add AC")}
              </button>
              <div className="environment">
                <label>
                  {t("outside")} ({imperial ? "°F" : "°C"})
                  <input
                    type="number"
                    min={showTemp(10)}
                    max={showTemp(50)}
                    value={showTemp(draft.environment.outsideTempC)}
                    onChange={(e) =>
                      mutateDraft((d) => {
                        d.environment.outsideTempC = canonicalTemp(
                          Number(e.target.value),
                        );
                      })
                    }
                  />
                </label>
                <label>
                  {t("target")} ({imperial ? "°F" : "°C"})
                  <input
                    type="number"
                    min={showTemp(16)}
                    max={showTemp(30)}
                    value={showTemp(draft.environment.targetTempC)}
                    onChange={(e) =>
                      mutateDraft((d) => {
                        d.environment.targetTempC = canonicalTemp(
                          Number(e.target.value),
                        );
                      })
                    }
                  />
                </label>
              </div>
            </>
          )}
          {setupStep === "review" && (
            <p>
              {tr(
                "Kiểm tra lỗi, tải lạnh và mức công suất trước khi tạo snapshot bất biến.",
                "Review errors, heat load, and capacity before creating the immutable snapshot.",
              )}
            </p>
          )}
          <div className="library-help">
            <strong>{tr("Mẹo", "Tip")}</strong>
            <p>
              {tr(
                "Chạm đối tượng trên mặt bằng rồi chỉnh chính xác ở bảng thuộc tính.",
                "Select an object on the plan, then edit precise values in the inspector.",
              )}
            </p>
          </div>
        </aside>
        <main className="canvas-panel">
          <div className="canvas-toolbar">
            <div className="view-toggle">
              <button
                className={!view3d ? "active" : ""}
                onClick={() => setView3d(false)}
              >
                {t("floor2d")}
              </button>
              <button
                className={view3d ? "active" : ""}
                onClick={() => setView3d(true)}
              >
                {t("preview3d")}
              </button>
            </div>
            <span>Grid 0.25 m · Snap on</span>
          </div>
          {setupStep === "review" ? (
            <ReviewPanel draft={draft} issues={validation} />
          ) : view3d ? (
            <BuildingScene draft={draft} />
          ) : (
            <FloorPlan2D
              draft={draft}
              selectedId={selectedId}
              onSelect={select}
              onMove={move}
            />
          )}
        </main>
        {setupStep !== "review" && (
          <Inspector
            draft={draft}
            selectedId={selectedId}
            mutate={mutateDraft}
          />
        )}
      </div>
      <footer className="editor-footer">
        <button
          className="secondary"
          onClick={() => go(-1)}
          disabled={setupStep === "layout"}
        >
          {t("back")}
        </button>
        <span>
          {validation.filter((i) => i.severity === "error").length
            ? `${validation.filter((i) => i.severity === "error").length} ${tr("lỗi cần sửa", "errors to fix")}`
            : t("local")}
        </span>
        {setupStep === "review" ? (
          <button
            onClick={begin}
            disabled={validation.some((i) => i.severity === "error")}
          >
            {t("finish")} →
          </button>
        ) : (
          <button onClick={() => go(1)}>{t("next")} →</button>
        )}
      </footer>
    </div>
  );
}
