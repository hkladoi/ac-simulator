import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiError, type ServerProject } from "../../api/client";
import { AppHeader } from "../../components/AppHeader";
import { useI18n } from "../../i18n/I18n";
import { createEmptyDraft } from "../editor/defaults";
import { useSimulatorStore } from "../../state/simulatorStore";
type Paged = { items: ServerProject[]; total: number };
type Archived = {
  id: string;
  name: string;
  revision: number;
  deletedAt: string;
};
export const DashboardPage = () => {
  const navigate = useNavigate();
  const { t, tr } = useI18n();
  const draft = useSimulatorStore((s) => s.draft);
  const replace = useSimulatorStore((s) => s.replaceDraft);
  const loadSample = useSimulatorStore((s) => s.loadSample);
  const setSync = useSimulatorStore((s) => s.setSync);
  const [projects, setProjects] = useState<ServerProject[]>([]);
  const [archived, setArchived] = useState<Archived[]>([]);
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("updated");
  const refresh = async () => {
    setLoading(true);
    try {
      const [page, trash] = await Promise.all([
        api<Paged>(
          `/api/projects?search=${encodeURIComponent(search)}&sort=${sort}`,
        ),
        api<Archived[]>("/api/projects/archived"),
      ]);
      setProjects(page.items);
      setArchived(trash);
      setAuthenticated(true);
      setError("");
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setAuthenticated(false);
        setProjects([]);
        setArchived([]);
      } else
        setError(
          e instanceof Error
            ? e.message
            : tr("Không thể tải dự án", "Unable to load projects"),
        );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    const timer = setTimeout(refresh, 250);
    return () => clearTimeout(timer);
  }, [search, sort]);
  const openLocal = () => navigate("/projects/local/setup");
  const openServer = (project: ServerProject) => {
    replace(JSON.parse(project.configJson));
    localStorage.setItem("ac:serverProjectId", project.id);
    setSync({
      serverRevision: project.revision,
      status: "synced",
      lastSyncedAt: new Date().toISOString(),
    });
    navigate(`/projects/${project.id}/setup`);
  };
  const duplicate = async (project: ServerProject) => {
    await api(`/api/projects/${project.id}/duplicate`, {
      method: "POST",
      body: "{}",
    });
    await refresh();
  };
  const rename = async (project: ServerProject) => {
    const name = prompt(
      tr("Tên dự án mới", "New project name"),
      project.name,
    )?.trim();
    if (!name) return;
    await api(`/api/projects/${project.id}`, {
      method: "PATCH",
      body: JSON.stringify({ name, expectedRevision: project.revision }),
    });
    await refresh();
  };
  const archive = async (project: ServerProject) => {
    if (
      !confirm(
        tr(
          `Lưu trữ “${project.name}”? Có thể khôi phục trong 30 ngày.`,
          `Archive “${project.name}”? It can be restored for 30 days.`,
        ),
      )
    )
      return;
    await api(`/api/projects/${project.id}`, { method: "DELETE" });
    await refresh();
  };
  const restore = async (project: Archived) => {
    await api(`/api/projects/${project.id}/restore`, {
      method: "POST",
      body: "{}",
    });
    await refresh();
  };
  const createProject = async (sample = false) => {
    const next = sample
      ? (loadSample(), useSimulatorStore.getState().draft)
      : createEmptyDraft();
    replace(next);
    if (!authenticated) {
      localStorage.removeItem("ac:serverProjectId");
      openLocal();
      return;
    }
    try {
      const project = await api<ServerProject>("/api/projects", {
        method: "POST",
        body: JSON.stringify({
          name: sample
            ? tr("Dự án mẫu hai phòng", "Sample two-room project")
            : tr("Dự án chưa đặt tên", "Untitled project"),
          configJson: JSON.stringify(next),
        }),
      });
      openServer(project);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : tr("Không thể tạo dự án", "Unable to create project"),
      );
    }
  };
  return (
    <>
      <AppHeader />
      <main className="dashboard">
        <section className="hero">
          <div>
            <span className="eyebrow">THERMAL DESIGN WORKSPACE</span>
            <h1>
              {tr("Thiết kế không gian.", "Design the space.")}
              <br />
              <em>{tr("Nhìn thấy nhiệt.", "See the heat.")}</em>
            </h1>
            <p>
              {tr(
                "Tạo mặt bằng nhiều phòng, ước tính tải lạnh và quan sát nhiệt lan tỏa theo thời gian — ngay trên thiết bị của bạn.",
                "Create multi-room plans, estimate cooling load, and watch heat move over time — directly on your device.",
              )}
            </p>
            <div className="hero-actions">
              <button
                disabled={loading}
                onClick={() => void createProject(false)}
              >
                {t("newProject")}
              </button>
              <button
                disabled={loading}
                className="secondary"
                onClick={() => void createProject(true)}
              >
                {t("sample")}
              </button>
            </div>
          </div>
          <div className="hero-visual" aria-hidden="true">
            <div className="thermal-orb" />
            <div className="wire-room one" />
            <div className="wire-room two" />
            <span className="temp-label cool">23.8°C</span>
            <span className="temp-label hot">31.2°C</span>
          </div>
        </section>
        <section className="project-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">WORKSPACE</span>
              <h2>{t("projects")}</h2>
            </div>
            <div className="dashboard-filters">
              <div className="search">
                <span>⌕</span>
                <input
                  aria-label={tr("Tìm dự án", "Search projects")}
                  placeholder={tr("Tìm theo tên…", "Search by name…")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select
                aria-label={tr("Sắp xếp dự án", "Sort projects")}
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="updated">
                  {tr("Cập nhật gần nhất", "Recently updated")}
                </option>
                <option value="name">{tr("Theo tên", "By name")}</option>
              </select>
            </div>
          </div>
          {error && (
            <div className="error-banner" role="alert">
              {error}
            </div>
          )}
          {authenticated && loading && (
            <div
              className="project-skeleton"
              aria-label={tr("Đang tải dự án", "Loading projects")}
            />
          )}
          {authenticated &&
            projects.map((project) => (
              <article className="server-project-card" key={project.id}>
                <button
                  className="project-open"
                  onClick={() => openServer(project)}
                >
                  <div className="project-thumb">
                    <span>
                      {JSON.parse(project.configJson).rooms?.length ?? 0}{" "}
                      {tr("phòng", "rooms")}
                    </span>
                  </div>
                  <div>
                    <strong>{project.name}</strong>
                    <small>
                      Revision {project.revision} ·{" "}
                      {new Date(project.updatedAt).toLocaleString()}
                    </small>
                  </div>
                </button>
                <div className="project-menu">
                  <button
                    className="ghost compact"
                    onClick={() => rename(project)}
                  >
                    {tr("Đổi tên", "Rename")}
                  </button>
                  <button
                    className="ghost compact"
                    onClick={() => duplicate(project)}
                  >
                    {tr("Nhân bản", "Duplicate")}
                  </button>
                  <button
                    className="ghost compact danger"
                    onClick={() => archive(project)}
                  >
                    {tr("Lưu trữ", "Archive")}
                  </button>
                </div>
              </article>
            ))}
          {draft.rooms.length ? (
            <article className="server-project-card local">
              <button className="project-open" onClick={openLocal}>
                <div className="project-thumb">
                  <span>
                    {draft.rooms.length} {tr("phòng", "rooms")}
                  </span>
                </div>
                <div>
                  <strong>
                    {tr("Dự án cục bộ gần nhất", "Latest local project")}
                  </strong>
                  <small>
                    {tr("Trên thiết bị", "On this device")} ·{" "}
                    {draft.rooms.length} {tr("phòng", "rooms")} ·{" "}
                    {draft.acUnits.length} AC
                  </small>
                </div>
              </button>
            </article>
          ) : (
            !loading &&
            !projects.length && (
              <div className="empty-card">
                <div className="empty-icon">⌂</div>
                <h3>{tr("Chưa có dự án", "No projects yet")}</h3>
                <p>
                  {authenticated
                    ? tr(
                        "Tạo dự án đầu tiên hoặc nhập bản cục bộ từ trang tài khoản.",
                        "Create your first project or import a local copy from Account.",
                      )
                    : tr(
                        "Bắt đầu cục bộ hoặc đăng nhập để đồng bộ nhiều thiết bị.",
                        "Start locally or sign in to sync across devices.",
                      )}
                </p>
              </div>
            )
          )}
          {authenticated && archived.length > 0 && (
            <div className="archived-section">
              <h3>
                {tr(
                  "Đã lưu trữ · khôi phục trong 30 ngày",
                  "Archived · restorable for 30 days",
                )}
              </h3>
              {archived.map((project) => (
                <article className="server-project-card" key={project.id}>
                  <div className="project-open">
                    <div>
                      <strong>{project.name}</strong>
                      <small>
                        {new Date(project.deletedAt).toLocaleString()}
                      </small>
                    </div>
                  </div>
                  <button
                    className="secondary compact"
                    onClick={() => void restore(project)}
                  >
                    {tr("Khôi phục", "Restore")}
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
};
