import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { ErrorBoundary } from "./ErrorBoundary";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import { AccountPage } from "../features/account/AccountPage";
import { useI18n } from "../i18n/I18n";
const EditorPage = lazy(() => import("../features/editor/EditorPage"));
const SimulationPage = lazy(
  () => import("../features/simulation/SimulationPage"),
);
const ComparePage = lazy(() => import("../features/scenarios/ComparePage"));
const ReportsPage = lazy(() => import("../features/reports/ReportsPage"));
const VersionsPage = lazy(() => import("../features/versions/VersionsPage"));

const Loading = () => {
  const { tr } = useI18n();
  return (
    <main className="state-page" aria-live="polite">
      <div className="spinner" />
      <p>{tr("Đang tải công cụ…", "Loading tools…")}</p>
    </main>
  );
};
export const App = () => {
  const { tr } = useI18n();
  return (
    <ErrorBoundary>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<Navigate to="/projects" replace />} />
          <Route path="/projects" element={<DashboardPage />} />
          <Route path="/projects/new" element={<EditorPage />} />
          <Route path="/projects/:id/setup" element={<EditorPage />} />
          <Route path="/projects/:id/simulate" element={<SimulationPage />} />
          <Route path="/projects/:id/compare" element={<ComparePage />} />
          <Route path="/projects/:id/versions" element={<VersionsPage />} />
          <Route path="/projects/:id/reports" element={<ReportsPage />} />
          <Route path="/shared/:token" element={<SimulationPage readOnly />} />
          <Route path="/account" element={<AccountPage />} />
          <Route
            path="*"
            element={
              <main className="state-page">
                <h1>404</h1>
                <p>
                  {tr("Trang này không tồn tại.", "This page does not exist.")}
                </p>
                <a href="/projects">{tr("Về dự án", "Back to projects")}</a>
              </main>
            }
          />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
};
