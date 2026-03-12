import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Trophy, Gavel, ScrollText, History, Shield, Zap, BookOpen,
  Settings, Menu, X, ChevronLeft, Settings2, BarChart3,
} from "lucide-react";
import AdminGuard from "@/components/AdminGuard";

const publicNav = [
  { name: "Leaderboard", page: "Leaderboard", icon: Trophy },
  { name: "Auction", page: "Auction", icon: Gavel },
  { name: "Results", page: "Results", icon: ScrollText },
  { name: "Transactions", page: "Transactions", icon: History },
  { name: "Punishments", page: "Punishments", icon: Shield },
  { name: "Charts", page: "Charts", icon: BarChart3 },
  { name: "Rules", page: "Rules", icon: BookOpen },
];

const adminNav = [
  { name: "Dashboard", page: "AdminDashboard", icon: Zap },
  { name: "Auctions", page: "AdminAuctions", icon: Gavel },
  { name: "Players", page: "AdminPlayers", icon: Trophy },
  { name: "DKP", page: "AdminDKP", icon: History },
  { name: "Penalties", page: "AdminPenalties", icon: Shield },
  { name: "Event Config", page: "AdminEventConfig", icon: Settings2 },
  { name: "Settings", page: "AdminSettings", icon: Settings },
  { name: "Logins", page: "AdminUserManagement", icon: Shield },
];

const sharedStyle = `
  :root { --dkp-gold: #f59e0b; --dkp-positive: #10b981; --dkp-negative: #ef4444; }
  body { background: #0a0e1a; }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: #1e293b; }
  ::-webkit-scrollbar-thumb { background: #475569; border-radius: 3px; }
`;

export default function Layout({ children, currentPageName }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const navigate = useNavigate();
  const isAdmin = currentPageName?.startsWith("Admin");
  const isAdminLogin = currentPageName === "AdminLogin";

  // Check session for admin pages (but not AdminLogin)
  useEffect(() => {
    if (isAdmin && !isAdminLogin) {
      const session = localStorage.getItem("adminSession");
      if (!session) {
        navigate(createPageUrl("AdminLogin"));
        setSessionChecked(true);
        return;
      }
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

  // AdminLogin doesn't need the layout
  if (isAdminLogin) {
    return children;
  }

  // Don't render admin layout until session is checked
  if (isAdmin && !sessionChecked) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0e1a]">
        <style>{`
          :root { --dkp-gold: #f59e0b; --dkp-positive: #10b981; --dkp-negative: #ef4444; }
          body { background: #0a0e1a; }
        `}</style>
      </div>
    );
  }

  // ── Admin layout: dark sidebar ──────────────────────────────────────────
  if (isAdmin) {
    return (
      <div className="flex min-h-screen bg-[#0a0e1a] text-gray-100">
        <style>{sharedStyle}</style>

        {/* Desktop Sidebar */}
        <aside className="w-56 fixed left-0 top-0 h-full bg-[#070b14] border-r border-white/5 flex-col z-40 hidden md:flex">
          <div className="p-4 border-b border-white/5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shrink-0">
                <Trophy className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="text-sm font-bold text-white leading-tight">DKP System</div>
                <div className="text-xs text-amber-400 font-medium">Admin Panel</div>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
            {adminNav.map((item) => {
              const Icon = item.icon;
              const isActive = currentPageName === item.page;
              return (
                <Link
                  key={item.page}
                  to={createPageUrl(item.page)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-amber-500/15 text-amber-400"
                      : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="p-3 border-t border-white/5 space-y-2">
            <button
              onClick={() => {
                localStorage.removeItem('adminSession');
                navigate(createPageUrl('Leaderboard'));
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-white bg-red-600/20 hover:bg-red-600/30 border border-red-600/30 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Logout
            </button>
            <Link
              to={createPageUrl("Leaderboard")}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Public Site
            </Link>
          </div>
        </aside>

        {/* Mobile Top Bar */}
        <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-[#070b14] border-b border-white/5 h-14 flex items-center px-4 justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <Trophy className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-bold text-white">DKP Admin</span>
          </div>
          <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 text-gray-400 hover:text-white">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Nav Overlay */}
        {mobileOpen && (
          <div className="md:hidden fixed inset-0 z-40 bg-[#070b14] pt-14">
            <nav className="p-4 space-y-1">
              {adminNav.map((item) => {
                const Icon = item.icon;
                const isActive = currentPageName === item.page;
                return (
                  <Link
                    key={item.page}
                    to={createPageUrl(item.page)}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium ${
                      isActive ? "bg-amber-500/15 text-amber-400" : "text-gray-400 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <Icon className="w-4 h-4" /> {item.name}
                  </Link>
                );
              })}
              <div className="border-t border-white/5 pt-2 mt-2 space-y-2">
                <button
                  onClick={() => {
                    localStorage.removeItem('adminSession');
                    setMobileOpen(false);
                    navigate(createPageUrl('Leaderboard'));
                  }}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 text-sm font-medium text-white bg-red-600/20 hover:bg-red-600/30 border border-red-600/30 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" /> Logout
                </button>
                <Link
                  to={createPageUrl("Leaderboard")}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center gap-3 px-4 py-3 text-sm text-gray-500 hover:text-gray-300 hover:bg-white/5 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" /> Public Site
                </Link>
              </div>
            </nav>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 min-h-screen p-4 md:p-6 mt-14 md:mt-0 md:ml-56">
          <AdminGuard>
            {children}
          </AdminGuard>
        </main>
      </div>
    );
  }

  // ── Public layout: top navigation ──────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a0e1a] text-gray-100">
      <style>{sharedStyle}</style>

      <header className="sticky top-0 z-50 bg-[#0f1628]/95 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <Link to={createPageUrl("Leaderboard")} className="flex items-center gap-2.5 shrink-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                <Trophy className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-lg tracking-tight hidden sm:block">DKP System</span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {publicNav.map((item) => {
                const Icon = item.icon;
                const isActive = currentPageName === item.page;
                return (
                  <Link
                    key={item.page}
                    to={createPageUrl(item.page)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-amber-500/15 text-amber-400"
                        : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            <Link
              to={createPageUrl("AdminDashboard")}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-gray-600 hover:text-amber-400 hover:bg-white/5 transition-colors border border-white/5"
            >
              <Settings className="w-3.5 h-3.5" />
              Admin
            </Link>

            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 text-gray-400 hover:text-white"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden border-t border-white/5 bg-[#0f1628]">
            <div className="px-4 py-3 space-y-1">
              {publicNav.map((item) => {
                const Icon = item.icon;
                const isActive = currentPageName === item.page;
                return (
                  <Link
                    key={item.page}
                    to={createPageUrl(item.page)}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-amber-500/15 text-amber-400"
                        : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.name}
                  </Link>
                );
              })}
              <div className="border-t border-white/5 pt-2 mt-1">
                <Link
                  to={createPageUrl("AdminDashboard")}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:text-amber-400 hover:bg-white/5 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  Admin
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>
    </div>
  );
}