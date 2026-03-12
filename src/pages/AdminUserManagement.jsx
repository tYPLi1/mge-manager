import React, { useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Shield, Plus, Trash2, KeyRound, UserCheck, UserX, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import PageHeader from "@/components/dkp/PageHeader";

export default function AdminUserManagement() {
  const [masterPassword, setMasterPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  // New user form
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [creating, setCreating] = useState(false);

  // Password change
  const [changingPwFor, setChangingPwFor] = useState(null);
  const [changedPw, setChangedPw] = useState("");

  const invoke = useCallback(async (action, extra = {}) => {
    const res = await base44.functions.invoke("manageAdminUsers", {
      action,
      masterPassword,
      ...extra,
    });
    if (!res.data.success) throw new Error(res.data.error || "Failed");
    return res.data;
  }, [masterPassword]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    const data = await invoke("list");
    setUsers(data.users);
    setLoading(false);
  }, [invoke]);

  const handleUnlock = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const data = await invoke("list");
      setUsers(data.users);
      setAuthenticated(true);
    } catch {
      toast.error("Falsches Passwort");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newUsername || !newPassword) return;
    setCreating(true);
    try {
      await invoke("create", { username: newUsername, password: newPassword });
      toast.success(`Admin '${newUsername}' erstellt`);
      setNewUsername("");
      setNewPassword("");
      await loadUsers();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleChangePassword = async (userId) => {
    if (!changedPw) return;
    try {
      await invoke("changePassword", { userId, password: changedPw });
      toast.success("Passwort geändert");
      setChangingPwFor(null);
      setChangedPw("");
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleToggle = async (userId) => {
    try {
      await invoke("toggleActive", { userId });
      await loadUsers();
      toast.success("Status geändert");
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (userId, username) => {
    if (!confirm(`Admin '${username}' wirklich löschen?`)) return;
    try {
      await invoke("delete", { userId });
      await loadUsers();
      toast.success(`'${username}' gelöscht`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Locked state
  if (!authenticated) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-[#111827] rounded-2xl border border-white/5 p-8 w-full max-w-sm">
          <div className="flex justify-center mb-6">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center">
              <Lock className="w-7 h-7 text-white" />
            </div>
          </div>
          <h2 className="text-lg font-bold text-white text-center mb-2">Admin-Verwaltung</h2>
          <p className="text-xs text-gray-500 text-center mb-6">Master-Passwort eingeben um fortzufahren</p>
          <form onSubmit={handleUnlock} className="space-y-4">
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={masterPassword}
                onChange={(e) => setMasterPassword(e.target.value)}
                placeholder="Master-Passwort"
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
              Entsperren
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Admin-Benutzer verwalten" icon={Shield} />

      {/* Create New */}
      <div className="bg-[#111827] rounded-xl border border-white/5 p-5 mb-6">
        <h3 className="text-sm font-semibold text-white mb-4">Neuen Admin erstellen</h3>
        <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Label className="text-gray-400 text-xs uppercase tracking-wider mb-1.5 block">Benutzername</Label>
            <Input
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="z.B. admin2"
              className="bg-white/5 border-white/10 text-white placeholder:text-gray-600"
            />
          </div>
          <div className="flex-1">
            <Label className="text-gray-400 text-xs uppercase tracking-wider mb-1.5 block">Passwort</Label>
            <Input
              type="text"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Passwort"
              className="bg-white/5 border-white/10 text-white placeholder:text-gray-600"
            />
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={!newUsername || !newPassword || creating} className="bg-gradient-to-r from-amber-500 to-orange-600 text-white">
              {creating ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
              Erstellen
            </Button>
          </div>
        </form>
      </div>

      {/* User List */}
      <div className="bg-[#111827] rounded-xl border border-white/5 overflow-hidden">
        <div className="p-4 border-b border-white/5">
          <h3 className="text-sm font-semibold text-white">Bestehende Admins ({users.length})</h3>
        </div>
        {loading ? (
          <div className="p-8 text-center"><Loader2 className="w-5 h-5 text-gray-500 animate-spin mx-auto" /></div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">Keine Admin-Benutzer vorhanden</div>
        ) : (
          <div className="divide-y divide-white/5">
            {users.map((u) => (
              <div key={u.id} className="p-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      u.is_active ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"
                    }`}>
                      {u.is_active ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{u.username}</p>
                      <p className="text-xs text-gray-500">
                        Erstellt: {new Date(u.created_date).toLocaleDateString("de-CH")}
                        {!u.is_active && <span className="ml-2 text-red-400">• Deaktiviert</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setChangingPwFor(changingPwFor === u.id ? null : u.id); setChangedPw(""); }}
                      className="border-white/10 text-gray-300 text-xs hover:bg-white/5"
                    >
                      <KeyRound className="w-3 h-3 mr-1" /> Passwort
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggle(u.id)}
                      className={`border-white/10 text-xs hover:bg-white/5 ${u.is_active ? "text-amber-400" : "text-emerald-400"}`}
                    >
                      {u.is_active ? <><UserX className="w-3 h-3 mr-1" /> Deaktivieren</> : <><UserCheck className="w-3 h-3 mr-1" /> Aktivieren</>}
                    </Button>
                    <button
                      onClick={() => handleDelete(u.id, u.username)}
                      className="p-1.5 text-gray-600 hover:text-red-400 transition-colors rounded hover:bg-red-500/10"
                      title="Löschen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Password change inline */}
                {changingPwFor === u.id && (
                  <div className="mt-3 flex items-center gap-2 pl-11">
                    <Input
                      type="text"
                      value={changedPw}
                      onChange={(e) => setChangedPw(e.target.value)}
                      placeholder="Neues Passwort"
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 text-sm w-60"
                      autoFocus
                    />
                    <Button
                      size="sm"
                      onClick={() => handleChangePassword(u.id)}
                      disabled={!changedPw}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                    >
                      Speichern
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setChangingPwFor(null); setChangedPw(""); }}
                      className="border-white/10 text-gray-400 text-xs"
                    >
                      Abbrechen
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}