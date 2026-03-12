import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';

function getSessionUserId() {
  const raw = localStorage.getItem('adminSession');
  if (!raw) return null;
  try { return JSON.parse(raw).userId || null; } catch { return null; }
}

function forceLogout() {
  localStorage.removeItem('adminSession');
  localStorage.removeItem('adminLastActivity');
  window.location.href = createPageUrl('Leaderboard');
}

export default function AdminSessionGuard({ children }) {
  const navigate = useNavigate();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const userIdRef = useRef(null);

  // --- Initial auth check ---
  useEffect(() => {
    const checkAuthorization = async () => {
      const adminSession = localStorage.getItem('adminSession');
      if (adminSession) {
        const parsed = JSON.parse(adminSession);
        if (new Date(parsed.expiresAt) > new Date()) {
          try {
            const res = await base44.functions.invoke('verifyAdminSession', { userId: parsed.userId });
            if (res.data.valid) {
              userIdRef.current = parsed.userId;
              setIsAuthorized(true);
              setLoading(false);
              return;
            } else {
              forceLogout();
              return;
            }
          } catch {
            userIdRef.current = parsed.userId;
            setIsAuthorized(true);
            setLoading(false);
            return;
          }
        } else {
          localStorage.removeItem('adminSession');
          localStorage.removeItem('adminLastActivity');
        }
      }

      try {
        const isAuthenticated = await base44.auth.isAuthenticated();
        if (isAuthenticated) {
          const user = await base44.auth.me();
          if (user?.role === 'admin') {
            setIsAuthorized(true);
            setLoading(false);
            return;
          }
        }
      } catch {}

      navigate(createPageUrl('AdminLogin'));
      setLoading(false);
    };

    checkAuthorization();
  }, [navigate]);

  // --- Real-time subscription: kick user when deactivated/deleted ---
  useEffect(() => {
    if (!isAuthorized) return;

    const unsubscribe = base44.entities.AdminUser.subscribe((event) => {
      const myId = userIdRef.current || getSessionUserId();
      if (!myId) return;

      if (event.type === 'delete' && event.id === myId) {
        forceLogout();
      }
      if (event.type === 'update' && event.id === myId && event.data?.is_active === false) {
        forceLogout();
      }
    });

    return () => unsubscribe();
  }, [isAuthorized]);

  // --- Activity tracking to extend session ---
  useEffect(() => {
    if (!isAuthorized) return;

    const handleActivity = () => {
      const session = localStorage.getItem('adminSession');
      if (session) {
        const parsed = JSON.parse(session);
        parsed.expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
        localStorage.setItem('adminSession', JSON.stringify(parsed));
        localStorage.setItem('adminLastActivity', Date.now().toString());
      }
    };

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(e => window.addEventListener(e, handleActivity));
    return () => events.forEach(e => window.removeEventListener(e, handleActivity));
  }, [isAuthorized]);

  if (loading || !isAuthorized) return null;
  return children;
}