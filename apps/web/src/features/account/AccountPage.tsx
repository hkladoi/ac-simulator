import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError, type ServerProject } from "../../api/client";
import { AppHeader } from "../../components/AppHeader";
import { useI18n } from "../../i18n/I18n";
import { useSimulatorStore } from "../../state/simulatorStore";

type Profile = { email: string };
export const AccountPage = () => {
  const { locale, units, setLocale, setUnits, tr } = useI18n();
  const draft = useSimulatorStore((s) => s.draft);
  const setSync = useSimulatorStore((s) => s.setSync);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api<Profile>("/api/auth/manage/info")
      .then(setProfile)
      .catch(() => {});
  }, []);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      if (mode === "register")
        await api("/api/auth/register", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });
      await api(`/api/auth/login?useCookies=true`, {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setProfile({ email });
      setMessage(
        mode === "register"
          ? tr(
              "Tài khoản đã được tạo và đăng nhập.",
              "Account created and signed in.",
            )
          : tr("Đăng nhập thành công.", "Signed in successfully."),
      );
    } catch (error) {
      setMessage(
        error instanceof ApiError
          ? error.message
          : tr(
              "Không thể kết nối máy chủ.",
              "Unable to connect to the server.",
            ),
      );
    } finally {
      setBusy(false);
    }
  };
  const importLocal = async () => {
    setBusy(true);
    try {
      const project = await api<ServerProject>("/api/projects", {
        method: "POST",
        body: JSON.stringify({
          name: tr("Dự án cục bộ đã nhập", "Imported local project"),
          configJson: JSON.stringify(draft),
        }),
      });
      localStorage.setItem("ac:serverProjectId", project.id);
      setSync({
        serverRevision: project.revision,
        status: "synced",
        lastSyncedAt: new Date().toISOString(),
      });
      setMessage(
        tr(
          "Dự án cục bộ đã được nhập vào tài khoản.",
          "The local project was imported into your account.",
        ),
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Import failed");
    } finally {
      setBusy(false);
    }
  };
  const logout = async () => {
    await api("/api/auth/logout", { method: "POST", body: "{}" });
    setProfile(null);
    localStorage.removeItem("ac:serverProjectId");
  };
  const exportAccount = async () => {
    setBusy(true);
    try {
      const response = await fetch("/api/account/export", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Account export failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "ac-account-export.json";
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Export failed");
    } finally {
      setBusy(false);
    }
  };
  const deleteAccount = async () => {
    const phrase = prompt(
      tr(
        "Nhập DELETE để xóa vĩnh viễn tài khoản và toàn bộ dự án trên máy chủ.",
        "Type DELETE to permanently remove the account and all server projects.",
      ),
    );
    if (phrase !== "DELETE") return;
    setBusy(true);
    try {
      await api("/api/account", { method: "DELETE" });
      setProfile(null);
      localStorage.removeItem("ac:serverProjectId");
      setMessage(
        tr(
          "Đã xóa tài khoản và dữ liệu máy chủ.",
          "Account and server data deleted.",
        ),
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Deletion failed");
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <AppHeader />
      <main className="narrow-page">
        <span className="eyebrow">ACCOUNT & PREFERENCES</span>
        <h1>{tr("Tài khoản & hiển thị", "Account & display")}</h1>
        {profile ? (
          <section className="settings-card account-card">
            <div>
              <span className="eyebrow">SIGNED IN</span>
              <h2>{profile.email}</h2>
              <p>
                {tr(
                  "Dự án được đồng bộ bằng revision; xung đột luôn yêu cầu bạn chọn cách xử lý.",
                  "Projects sync with revisions; conflicts always require an explicit choice.",
                )}
              </p>
            </div>
            <div className="account-actions">
              <button onClick={importLocal} disabled={busy}>
                {tr(
                  "Nhập dự án cục bộ vào tài khoản",
                  "Import local project into account",
                )}
              </button>
              <button
                className="secondary"
                onClick={() => void exportAccount()}
                disabled={busy}
              >
                {tr("Xuất dữ liệu tài khoản", "Export account data")}
              </button>
              <button className="secondary" onClick={logout}>
                {tr("Đăng xuất", "Sign out")}
              </button>
              <button
                className="secondary danger"
                onClick={() => void deleteAccount()}
                disabled={busy}
              >
                {tr("Xóa tài khoản & dữ liệu", "Delete account & data")}
              </button>
            </div>
          </section>
        ) : (
          <section className="auth-card">
            <div className="view-toggle">
              <button
                className={mode === "login" ? "active" : ""}
                onClick={() => setMode("login")}
              >
                {tr("Đăng nhập", "Sign in")}
              </button>
              <button
                className={mode === "register" ? "active" : ""}
                onClick={() => setMode("register")}
              >
                {tr("Đăng ký", "Register")}
              </button>
            </div>
            <form onSubmit={submit}>
              <label>
                Email
                <input
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <label>
                {tr("Mật khẩu", "Password")}
                <input
                  type="password"
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  minLength={10}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              <button disabled={busy}>
                {busy
                  ? tr("Đang xử lý…", "Working…")
                  : mode === "login"
                    ? tr("Đăng nhập", "Sign in")
                    : tr("Tạo tài khoản", "Create account")}
              </button>
            </form>
          </section>
        )}
        {message && (
          <div className="info-card" role="status">
            {message}
          </div>
        )}
        <section className="settings-card preference-card">
          <label>
            {tr("Ngôn ngữ", "Language")}
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value as "vi" | "en")}
            >
              <option value="vi">Tiếng Việt</option>
              <option value="en">English</option>
            </select>
          </label>
          <label>
            {tr("Đơn vị", "Units")}
            <select
              value={units}
              onChange={(e) =>
                setUnits(e.target.value as "metric" | "imperial")
              }
            >
              <option value="metric">Metric (m, °C)</option>
              <option value="imperial">Imperial (ft, °F)</option>
            </select>
          </label>
        </section>
      </main>
    </>
  );
};
