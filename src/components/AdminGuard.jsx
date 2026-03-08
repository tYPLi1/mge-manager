import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Shield, Loader2 } from "lucide-react";

export default function AdminGuard({ children }) {
  const [state, setState] = useState("loading");

  useEffect(() => {
    async function check() {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) {
        base44.auth.redirectToLogin(window.location.href);
        return;
      }
      const user = await base44.auth.me();
      if (user?.role === "admin") {
        setState("ok");
      } else {
        setState("unauthorized");
      }
    }
    check();
  }, []);

  if (state === "loading") {
    return (
      <div className="flex items-center justify-center h-48 gap-3">
        <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
        <span className="text-gray-500 text-sm">Checking access...</span>
      </div>
    );
  }

  if (state === "unauthorized") {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-4">
        <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center">
          <Shield className="w-7 h-7 text-red-400" />
        </div>
        <div className="text-center">
          <p className="text-red-400 font-semibold mb-1">Admin Access Required</p>
          <p className="text-gray-500 text-sm">Your account does not have admin privileges.</p>
        </div>
      </div>
    );
  }

  return children;
}