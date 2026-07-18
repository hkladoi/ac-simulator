import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useI18n } from "../i18n/I18n";
import { useSimulatorStore } from "../state/simulatorStore";

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};
export const AppHeader = () => {
  const { t, locale, setLocale } = useI18n();
  const sync = useSimulatorStore((s) => s.sync);
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(
    null,
  );
  useEffect(() => {
    const capture = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPrompt);
    };
    window.addEventListener("beforeinstallprompt", capture);
    return () => window.removeEventListener("beforeinstallprompt", capture);
  }, []);
  const install = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };
  return (
    <header className="app-header">
      <Link to="/projects" className="brand">
        <span className="brand-mark">AC</span>
        <span>{t("appName")}</span>
      </Link>
      <nav
        aria-label={locale === "vi" ? "Điều hướng chính" : "Main navigation"}
      >
        <NavLink to="/projects">{t("projects")}</NavLink>
        <NavLink to="/account">
          {locale === "vi" ? "Tài khoản" : "Account"}
        </NavLink>
      </nav>
      <div className="header-actions">
        <span className={`sync-pill ${sync.status}`}>
          {t(`sync.${sync.status}`)}
        </span>
        {installPrompt && (
          <button className="ghost compact" onClick={() => void install()}>
            {locale === "vi" ? "Cài app" : "Install"}
          </button>
        )}
        <button
          className="ghost compact"
          onClick={() => setLocale(locale === "vi" ? "en" : "vi")}
          aria-label="Change language"
        >
          {locale.toUpperCase()}
        </button>
      </div>
    </header>
  );
};
