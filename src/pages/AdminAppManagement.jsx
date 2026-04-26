import React, { useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Shield, Lock, Eye, EyeOff, Loader2, KeyRound, Bug } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/dkp/PageHeader";
import AdminLoginsPanel from "@/components/admin/AdminLoginsPanel";
import AdminReports from "@/pages/AdminReports";

const TABS = [
  { id: "logins", label: "Logins", icon: KeyRound },
  { id: "reports", label: "Reports", icon: Bug },
];

export default function AdminAppManagement() {
  const [masterPassword, setMasterPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("logins");

  const getSession = () => {
    try {
      const raw = localStorage.getItem("adminSession");
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  };

  const invoke = useCallback(async (action, extra = {}) => {
    const session = getSession();
    if (!session) throw new Error("No admin session");
    try {
      const res = await base44.functions.invoke("manageAdminUsers", {
        action,
        session: { userId: session.userId, username: session.username, expiresAt: session.expiresAt, token: session.token },
        ...extra,
      });
      if (!res.data.success) throw new Error(res.data.error || "Failed");
      return res.data;
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || "Request failed";
      throw new Error(msg);
    }
  }, []);

  const handleUnlock = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await invoke("verify", { credential: masterPassword });
      setAuthenticated(true);
    } catch {
      toast.error("Wrong password");
    }
    setLoading(false);
  };

  if (!authenticated) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-[#111827] rounded-2xl border border-white/5 p-8 w-full max-w-sm">
          <div className="flex justify-center mb-6">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center">
              <Lock className="w-7 h-7 text-white" />
            </div>
          </div>
          <h2 className="text-lg font-bold text-white text-center mb-2">App Management</h2>
          <p className="text-xs text-gray-500 text-center mb-6">Enter master password to continue</p>
          <form onSubmit={handleUnlock} className="space-y-4">
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={masterPassword}
                onChange={(e) => setMasterPassword(e.target.value)}
                placeholder="Master password"
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 pr-10"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <Button
              type="submit"
              disabled={!masterPassword || loading}
              className="w-full bg-gradient-to-r from-red-500 to-rose-600 text-white"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
              Unlock
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="App Management" icon={Shield} />

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-white/5">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                active
                  ? "border-amber-500 text-amber-400"
                  : "border-transparent text-gray-500 hover:text-gray-300"
              }`}
            >
              <Icon className="w-4 h-4" /> {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "logins" && <AdminLoginsPanel invoke={invoke} />}
      {activeTab === "reports" && <AdminReports embedded />}
    </div>
  );
}