import React, { useState, useCallback, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Trash2, KeyRound, UserCheck, UserX, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { createPageUrl } from "@/utils";

function invalidateSessionIfMatch(userId) {
  const session = localStorage.getItem("adminSession");
  if (!session) return;
  const parsed = JSON.parse(session);
  if (parsed.userId === userId) {
    localStorage.removeItem("adminSession");
    localStorage.removeItem("adminLastActivity");
    window.location.href = createPageUrl("AdminLogin");
  }
}

/**
 * Logins management panel — assumes the parent has already authenticated
 * via master password and passes the verified session through `invoke`.
 */
export default function AdminLoginsPanel({ invoke }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [creating, setCreating] = useState(false);

  const [changingPwFor, setChangingPwFor] = useState(null);
  const [changedPw, setChangedPw] = useState("");

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await invoke("list");
      setUsers(data.users);
    } catch (err) {
      toast.error(err.message);
    }
    setLoading(false);
  }, [invoke]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  useEffect(() => {
    const unsub = base44.entities.AdminUser.subscribe(() => loadUsers());
    return () => unsub();
  }, [loadUsers]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newUsername || !newPassword) return;
    setCreating(true);
    try {
      await invoke("create", { username: newUsername, password: newPassword });
      toast.success(`Admin '${newUsername}' created`);
      setNewUsername("");
      setNewPassword("");
    } catch (err) {
      toast.error(err.message);
    }
    setCreating(false);
  };

  const handleChangePassword = async (userId) => {
    if (!changedPw) return;
    try {
      await invoke("changePassword", { userId, password: changedPw });
      toast.success("Password changed");
      setChangingPwFor(null);
      setChangedPw("");
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleToggle = async (userId) => {
    try {
      const data = await invoke("toggleActive", { userId });
      toast.success(data.is_active ? "User activated" : "User deactivated");
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (userId, username) => {
    if (!confirm(`Delete admin '${username}'?`)) return;
    try {
      await invoke("delete", { userId });
      setUsers(prev => prev.filter(u => u.id !== userId));
      toast.success(`'${username}' deleted`);
      invalidateSessionIfMatch(userId);
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div>
      <div className="bg-[#111827] rounded-xl border border-white/5 p-5 mb-6">
        <h3 className="text-sm font-semibold text-white mb-4">Create New Admin</h3>
        <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Label className="text-gray-400 text-xs uppercase tracking-wider mb-1.5 block">Username</Label>
            <Input
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="e.g. admin2"
              className="bg-white/5 border-white/10 text-white placeholder:text-gray-600"
            />
          </div>
          <div className="flex-1">
            <Label className="text-gray-400 text-xs uppercase tracking-wider mb-1.5 block">Password</Label>
            <Input
              type="text"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Password"
              className="bg-white/5 border-white/10 text-white placeholder:text-gray-600"
            />
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={!newUsername || !newPassword || creating} className="bg-gradient-to-r from-amber-500 to-orange-600 text-white">
              {creating ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
              Create
            </Button>
          </div>
        </form>
      </div>

      <div className="bg-[#111827] rounded-xl border border-white/5 overflow-hidden">
        <div className="p-4 border-b border-white/5">
          <h3 className="text-sm font-semibold text-white">Existing Admins ({users.length})</h3>
        </div>
        {loading ? (
          <div className="p-8 text-center"><Loader2 className="w-5 h-5 text-gray-500 animate-spin mx-auto" /></div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">No admin users found</div>
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
                        Created: {new Date(u.created_date).toLocaleDateString("en-US")}
                        {!u.is_active && <span className="ml-2 text-red-400">• Disabled</span>}
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
                      <KeyRound className="w-3 h-3 mr-1" /> Password
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggle(u.id)}
                      className={`border-white/10 text-xs hover:bg-white/5 ${u.is_active ? "text-amber-400" : "text-emerald-400"}`}
                    >
                      {u.is_active ? <><UserX className="w-3 h-3 mr-1" /> Disable</> : <><UserCheck className="w-3 h-3 mr-1" /> Enable</>}
                    </Button>
                    <button
                      onClick={() => handleDelete(u.id, u.username)}
                      className="p-1.5 text-gray-600 hover:text-red-400 transition-colors rounded hover:bg-red-500/10"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {changingPwFor === u.id && (
                  <div className="mt-3 flex items-center gap-2 pl-11">
                    <Input
                      type="text"
                      value={changedPw}
                      onChange={(e) => setChangedPw(e.target.value)}
                      placeholder="New password"
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 text-sm w-60"
                      autoFocus
                    />
                    <Button
                      size="sm"
                      onClick={() => handleChangePassword(u.id)}
                      disabled={!changedPw}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setChangingPwFor(null); setChangedPw(""); }}
                      className="border-white/10 text-gray-400 text-xs"
                    >
                      Cancel
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