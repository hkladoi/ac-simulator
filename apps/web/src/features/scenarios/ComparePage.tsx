import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, type ServerScenario } from "../../api/client";
import { AppHeader } from "../../components/AppHeader";
import type { ScenarioSummary } from "../../domain/types";
import { useI18n } from "../../i18n/I18n";
import { useSimulatorStore } from "../../state/simulatorStore";

type PagedScenarios = { items: ServerScenario[]; total: number };
export default function ComparePage() {
  const navigate = useNavigate();
  const { id = "local" } = useParams();
  const { locale } = useI18n();
  const scenarios = useSimulatorStore((s) => s.scenarios);
  const setScenarios = useSimulatorStore((s) => s.setScenarios);
  const renameLocal = useSimulatorStore((s) => s.renameScenario);
  const removeLocal = useSimulatorStore((s) => s.removeScenario);
  const replaceDraft = useSimulatorStore((s) => s.replaceDraft);
  const [error, setError] = useState("");
  const isServer = id !== "local";
  const vi = locale === "vi";

  useEffect(() => {
    if (!isServer) return;
    api<PagedScenarios>(`/api/projects/${id}/scenarios?pageSize=50`)
      .then((page) => {
        const parsed = page.items.flatMap((item): ScenarioSummary[] => {
          try {
            const simulation = JSON.parse(item.simulationConfigJson) as Pick<
              ScenarioSummary,
              "snapshot"
            >;
            return [
              {
                id: item.id,
                name: item.name,
                createdAt: item.createdAt,
                snapshot: simulation.snapshot,
                metrics: JSON.parse(
                  item.resultSummaryJson,
                ) as ScenarioSummary["metrics"],
              },
            ];
          } catch {
            return [];
          }
        });
        setScenarios(parsed);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Load failed"));
  }, [id, isServer, setScenarios]);

  const run = (scenario: ScenarioSummary) => {
    replaceDraft(scenario.snapshot.config);
    useSimulatorStore.getState().startSimulation();
    navigate(`/projects/${id}/simulate`);
  };
  const rename = async (scenario: ScenarioSummary) => {
    const name = prompt(
      vi ? "Tên kịch bản" : "Scenario name",
      scenario.name,
    )?.trim();
    if (!name) return;
    try {
      if (isServer)
        await api(`/api/projects/${id}/scenarios/${scenario.id}`, {
          method: "PATCH",
          body: JSON.stringify({ name }),
        });
      renameLocal(scenario.id, name);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Rename failed");
    }
  };
  const remove = async (scenario: ScenarioSummary) => {
    if (!confirm(vi ? `Xóa “${scenario.name}”?` : `Delete “${scenario.name}”?`))
      return;
    try {
      if (isServer)
        await api(`/api/projects/${id}/scenarios/${scenario.id}`, {
          method: "DELETE",
        });
      removeLocal(scenario.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  };

  return (
    <>
      <AppHeader />
      <main className="narrow-page wide">
        <div className="page-heading">
          <div>
            <span className="eyebrow">NORMALIZED · 60 MIN · 16–40 °C</span>
            <h1>{vi ? "So sánh kịch bản" : "Scenario comparison"}</h1>
          </div>
          <button
            className="secondary"
            onClick={() => navigate(`/projects/${id}/simulate`)}
          >
            ← {vi ? "Mô phỏng" : "Simulation"}
          </button>
        </div>
        {error && (
          <div className="error-banner" role="alert">
            {error}
          </div>
        )}
        {scenarios.length < 2 && (
          <div className="info-card">
            <h2>
              {vi
                ? "Cần ít nhất hai kịch bản"
                : "At least two scenarios are required"}
            </h2>
            <p>
              {vi
                ? "Lưu các lần chạy từ màn mô phỏng. Mọi thẻ dùng cùng mốc 60 phút và cùng thang nhiệt để so sánh công bằng."
                : "Save runs from the simulation screen. Every card uses the same 60-minute point and temperature scale for a fair comparison."}
            </p>
          </div>
        )}
        <div className="comparison-grid">
          {scenarios.map((scenario) => (
            <article className="comparison-card" key={scenario.id}>
              <span className="eyebrow">
                {new Date(scenario.createdAt).toLocaleString(locale)}
              </span>
              <h2>{scenario.name}</h2>
              <dl>
                <div>
                  <dt>{vi ? "Tải lạnh" : "Heat load"}</dt>
                  <dd>{scenario.metrics.heatLoadKw.toFixed(2)} kW</dd>
                </div>
                <div>
                  <dt>{vi ? "Nhiệt độ TB" : "Average temp"}</dt>
                  <dd>{scenario.metrics.averageAt60C.toFixed(1)} °C</dd>
                </div>
                <div>
                  <dt>{vi ? "Đạt mục tiêu" : "Target time"}</dt>
                  <dd>
                    {scenario.metrics.targetMinutes === null
                      ? "> 60 min"
                      : `${scenario.metrics.targetMinutes.toFixed(1)} min`}
                  </dd>
                </div>
                <div>
                  <dt>{vi ? "Vùng thoải mái" : "Comfort area"}</dt>
                  <dd>{scenario.metrics.comfortPercent.toFixed(0)}%</dd>
                </div>
              </dl>
              <div
                className="mini-thermal"
                style={
                  {
                    "--comfort": `${scenario.metrics.comfortPercent}%`,
                  } as React.CSSProperties
                }
              />
              <div className="project-menu">
                <button
                  className="secondary compact"
                  onClick={() => run(scenario)}
                >
                  {vi ? "Chạy lại" : "Run again"}
                </button>
                <button
                  className="ghost compact"
                  onClick={() => void rename(scenario)}
                >
                  {vi ? "Đổi tên" : "Rename"}
                </button>
                <button
                  className="ghost compact danger"
                  onClick={() => void remove(scenario)}
                >
                  {vi ? "Xóa" : "Delete"}
                </button>
              </div>
            </article>
          ))}
        </div>
      </main>
    </>
  );
}
