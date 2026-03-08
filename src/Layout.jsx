import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Trophy, Gavel, ScrollText, History, Shield, Zap, BookOpen, Settings, Menu, X, ChevronRight } from "lucide-react";

const publicNav = [
  { name: "Leaderboard", page: "Leaderboard", icon: Trophy },
  { name: "Auction", page: "Auction", icon: Gavel },
  { name: "Results", page: "Results", icon: ScrollText },
  { name: "Transactions", page: "Transactions", icon: History },
  { name: "Activity", page: "Activity", icon: Zap },
  { name: "Punishments", page: "Punishments", icon: Shield },
  { name: "Power", page: "Power", icon: Zap },
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
];

export default function Layout({ children, currentPageName }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const isAdmin = currentPageName?.startsWith("Admin");
  const nav = isAdmin ? adminNav : publicNav;

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-gray-100">
      <style>{`
        :root {
          --dkp-gold: #f59e0b;
          --dkp-positive: #10b981;
          --dkp-negative: #ef4444;
        }
        body { background: #0a0e1a; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #1e293b; }
        ::-webkit-scrollbar-thumb { background: #475569; border-radius: 3px; }
      `}</style>
      
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 bg-[#0f1628]/95 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <Link to={createPageUrl("Leaderboard")} className="flex items-center gap-2.5 shrink-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                <Trophy className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-lg tracking-tight hidden sm:block">DKP System</span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1">
              {nav.map((item) => {
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

            {/* Admin / Public toggle */}
            <div className="hidden md:flex items-center gap-2">
              {isAdmin ? (
                <Link
                  to={createPageUrl("Leaderboard")}
                  className="text-xs text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1"
                >
                  Public Site <ChevronRight className="w-3 h-3" />
                </Link>
              ) : (
                <Link
                  to={createPageUrl("AdminDashboard")}
                  className="text-xs text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1"
                >
                  Admin <ChevronRight className="w-3 h-3" />
                </Link>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 text-gray-400 hover:text-white"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileOpen && (
          <div className="md:hidden border-t border-white/5 bg-[#0f1628]">
            <div className="px-4 py-3 space-y-1">
              {nav.map((item) => {
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
              <div className="pt-2 border-t border-white/5">
                {isAdmin ? (
                  <Link
                    to={createPageUrl("Leaderboard")}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 px-3 py-2.5 text-sm text-gray-500 hover:text-gray-300"
                  >
                    Public Site <ChevronRight className="w-3 h-3" />
                  </Link>
                ) : (
                  <Link
                    to={createPageUrl("AdminDashboard")}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 px-3 py-2.5 text-sm text-gray-500 hover:text-gray-300"
                  >
                    Admin <ChevronRight className="w-3 h-3" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>
    </div>
  );
}