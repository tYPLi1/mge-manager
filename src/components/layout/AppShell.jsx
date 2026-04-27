import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Trophy, Gavel, ScrollText, History, AlertTriangle, BookOpen, BarChart3,
  Shield, Settings, Menu, X, ArrowLeft, Zap, Settings2, Users,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import AdminSessionGuard from "@/components/AdminSessionGuard";
import LanguageSwitcher from "@/components/layout/LanguageSwitcher";
import LegalFooter from "@/components/layout/LegalFooter";

const publicNavConfig = [
  { name: "leaderboard", page: "Leaderboard", icon: Trophy },
  { name: "auction", page: "Auction", icon: Gavel },
  { name: "results", page: "Results", icon: ScrollText },
  { name: "transactions", page: "Transactions", icon: History },
  { name: "punishments", page: "Punishments", icon: AlertTriangle },
  { name: "charts", page: "Charts", icon: BarChart3 },
  { name: "rules", page: "Rules", icon: BookOpen },
];

const adminNavConfig = [
  { name: "dashboard", page: "AdminDashboard", icon: Zap },
  { name: "auctions", page: "AdminAuctions", icon: Gavel },
  { name: "players", page: "AdminPlayers", icon: Users },
  { name: "dkp", page: "AdminDKP", icon: History },
  { name: "penalties", page: "AdminPenalties", icon: Shield },
  { name: "eventConfig", page: "AdminEventConfig", icon: Settings2 },
  { name: "auctionConfig", page: "AdminAuctionConfig", icon: Gavel },
  { name: "settings", page: "AdminSettings", icon: Settings },
  { name: "appManagement", page: "AdminAppManagement", icon: Shield },
];

export default function AppShell({ children, currentPageName }) {
  const { t } = useTranslation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [adminNavOpen, setAdminNavOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    const saved = localStorage.getItem("adminNavOpen");
    return saved === null ? true : saved === "true";
  });
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    localStorage.setItem("adminNavOpen", String(adminNavOpen));
  }, [adminNavOpen]);
  const navigate = useNavigate();
  const location = useLocation();

  const isAdmin = currentPageName?.startsWith("Admin");
  const isAdminLogin = currentPageName === "AdminLogin";

  useEffect(() => {
    if (isAdmin && !isAdminLogin) {
      const session = localStorage.getItem("adminSession");
      if (!session) { navigate(createPageUrl("AdminLogin")); setSessionChecked(true); return; }
      const parsed = JSON.parse(session);
      if (new Date(parsed.expiresAt) <= new Date()) {
        localStorage.removeItem("adminSession");
        navigate(createPageUrl("AdminLogin"));
        setSessionChecked(true);
        return;
      }
      setSessionChecked(true);
    } else {
      setSessionChecked(true);
    }
  }, [isAdmin, isAdminLogin, navigate]);

  // Close mobile nav on route change
  useEffect(() => { setMobileNavOpen(false); }, [location.pathname]);

  if (isAdminLogin) return children;

  if (isAdmin && !sessionChecked) {
    return <div style={{ minHeight: "100vh", background: "var(--dp-bg)" }} />;
  }

  const navConfig = isAdmin ? adminNavConfig : publicNavConfig;

  const navButtons = navConfig.map((item) => {
    const Icon = item.icon;
    const active = currentPageName === item.page;
    return (
      <Link
        key={item.page}
        to={createPageUrl(item.page)}
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "7px 10px", borderRadius: 8, fontSize: 12.5, fontWeight: 500,
          background: active ? "var(--dp-accent-soft)" : "transparent",
          color: active ? "var(--dp-accent)" : "var(--dp-text-muted)",
          border: active ? "1px solid var(--dp-accent-border)" : "1px solid transparent",
          textDecoration: "none",
          transition: "all 0.15s ease",
          whiteSpace: "nowrap",
        }}
      >
        <Icon size={14} />
        {t(`navigation.${item.name}`)}
      </Link>
    );
  });

  const headerLogo = (
    <Link to={createPageUrl(isAdmin ? "AdminDashboard" : "Leaderboard")} style={{
      display: "flex", alignItems: "center", gap: 12, minWidth: 0, textDecoration: "none", color: "inherit",
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 10,
        background: "linear-gradient(135deg, #d9b068, #a67c38)",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 1px 0 rgba(255,255,255,0.2) inset, 0 4px 12px rgba(212, 168, 89, 0.25)",
        flexShrink: 0,
      }}>
        <Trophy size={18} style={{ color: "#2a1f10" }} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div className="dp-heading" style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.1 }}>DKP System</div>
        <div style={{ fontSize: 11, color: "var(--dp-text-dim)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
          {isAdmin ? t("admin.panel") : t("common.guildManagement")}
        </div>
      </div>
    </Link>
  );

  const headerSecondary = isAdmin ? (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <button
        onClick={() => { localStorage.removeItem("adminSession"); navigate(createPageUrl("Leaderboard")); }}
        className="dp-btn-ghost"
        style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--dp-danger)", borderColor: "rgba(201, 101, 101, 0.3)" }}
      >
        <ArrowLeft size={13} /> {t("common.logout")}
      </button>
      <Link to={createPageUrl("Leaderboard")} className="dp-btn-ghost" style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none" }}>
        <ArrowLeft size={13} /> {t("common.publicSite")}
      </Link>
    </div>
  ) : (
    <Link to={createPageUrl("AdminDashboard")} className="dp-btn-ghost" style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none" }}>
      <Settings size={13} /> {t("navigation.admin")}
    </Link>
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--dp-bg)", color: "var(--dp-text)", position: "relative", display: "flex", flexDirection: "column" }}>
      <div className="dp-bg-grain" />

      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        borderBottom: "1px solid var(--dp-border)",
        background: "var(--dp-bg-elevated)",
        backdropFilter: "blur(8px)",
      }}>
        {isAdmin ? (
          <>
            <div style={{
              maxWidth: 1400, margin: "0 auto", padding: "10px 16px",
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
              borderBottom: adminNavOpen ? "1px solid var(--dp-border)" : "none",
            }}>
              {headerLogo}

              <div className="hide-mobile-nav" style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <button
                  onClick={() => setAdminNavOpen(v => !v)}
                  className="dp-btn-ghost"
                  style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                  title={adminNavOpen ? t("common.hideMenu") || "Hide menu" : t("common.showMenu") || "Show menu"}
                >
                  {adminNavOpen ? <X size={14} /> : <Menu size={14} />}
                  {t("common.menu") || "Menu"}
                </button>
                <LanguageSwitcher variant="header" />
                {headerSecondary}
              </div>

              <button
                onClick={() => setMobileNavOpen(v => !v)}
                className="show-mobile-nav dp-touch-target"
                aria-label={mobileNavOpen ? t("common.hideMenu") : t("common.showMenu")}
                aria-expanded={mobileNavOpen}
                style={{
                  padding: 8, background: "transparent", border: "1px solid var(--dp-border)",
                  borderRadius: 8, color: "var(--dp-text-muted)", cursor: "pointer", display: "none",
                }}
              >
                {mobileNavOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
              </button>
            </div>

            {adminNavOpen && (
              <nav className="hide-mobile-nav" style={{
                maxWidth: 1400, margin: "0 auto", padding: "10px 16px",
                display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "center",
              }}>
                {navButtons}
              </nav>
            )}
          </>
        ) : (
          <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 16px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64, gap: 12 }}>
            {headerLogo}

            <nav className="hide-mobile-nav" style={{ display: "flex", gap: 4, overflowX: "auto", scrollbarWidth: "none" }}>
              {navButtons}
            </nav>

            <div className="hide-mobile-nav" style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <LanguageSwitcher variant="header" />
              {headerSecondary}
            </div>

            <button
              onClick={() => setMobileNavOpen(v => !v)}
              className="show-mobile-nav dp-touch-target"
              aria-label={mobileNavOpen ? t("common.hideMenu") : t("common.showMenu")}
              aria-expanded={mobileNavOpen}
              style={{
                padding: 8, background: "transparent", border: "1px solid var(--dp-border)",
                borderRadius: 8, color: "var(--dp-text-muted)", cursor: "pointer", display: "none",
              }}
            >
              {mobileNavOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
            </button>
          </div>
        )}

        {mobileNavOpen && (
          <div style={{
            borderTop: "1px solid var(--dp-border)",
            background: "var(--dp-bg-elevated)",
            padding: 12,
            display: "flex", flexDirection: "column", gap: 4,
          }}>
            {navConfig.map((item) => {
              const Icon = item.icon;
              const active = currentPageName === item.page;
              return (
                <Link
                  key={item.page}
                  to={createPageUrl(item.page)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 12px", borderRadius: 8, fontSize: 13,
                    background: active ? "var(--dp-accent-soft)" : "transparent",
                    color: active ? "var(--dp-accent)" : "var(--dp-text-muted)",
                    textDecoration: "none", fontWeight: 500,
                  }}
                >
                  <Icon size={14} /> {t(`navigation.${item.name}`)}
                </Link>
              );
            })}
            <div style={{ height: 1, background: "var(--dp-border)", margin: "6px 0" }} />
            <div style={{ padding: "4px 0" }}>
              <LanguageSwitcher variant="mobile" />
            </div>
            {headerSecondary}
          </div>
        )}

        <style>{`
          @media (max-width: 1100px) {
            .hide-mobile-nav { display: none !important; }
            .show-mobile-nav { display: inline-flex !important; }
          }
        `}</style>
      </header>

      <main style={{ position: "relative", maxWidth: 1400, width: "100%", margin: "0 auto", padding: "28px 24px", zIndex: 1, flex: 1 }}>
        {isAdmin && currentPageName !== "AdminAppManagement" ? (
          <AdminSessionGuard>{children}</AdminSessionGuard>
        ) : children}
      </main>

      {!isAdmin && !isAdminLogin && <LegalFooter />}
    </div>
  );
}