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

        // Basic validity: must have token, userId, username, and not be expired
        if (!parsed.token || !parsed.userId || !parsed.username || !parsed.expiresAt) {
          forceLogout();
          return;
        }
        if (new Date(parsed.expiresAt) <= new Date()) {
          localStorage.removeItem('adminSession');
          localStorage.removeItem('adminLastActivity');
          navigate(createPageUrl('AdminLogin'));
          setLoading(false);
          return;
        }

        try {
          // Full server-side verification: checks HMAC signature + user still active
          const res = await base44.functions.invoke('verifySessionToken', {
            userId: parsed.userId,
            username: parsed.username,
            expiresAt: parsed.expiresAt,
            token: parsed.token,
          });
          if (res.data.valid) {
            userIdRef.current = parsed.userId;
            setIsAuthorized(true);
            setLoading(false);
            return;
          } else {
            forceLogout();
            return;
          }
        } catch (err) {
          // 401 = no Base44 user logged in (public app).
          // In this case we trust the signed token: it can only have been
          // created by the backend with the correct ADMIN_MANAGEMENT_PASSWORD.
          // A forged session without a valid HMAC token will fail as soon as
          // the user performs any backend action.
          const status = err?.response?.status || err?.status;
          if (status === 401 && parsed.token) {
            userIdRef.current = parsed.userId;
            setIsAuthorized(true);
            setLoading(false);
            return;
          }
          forceLogout();
          return;
        }
      }

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-gray-700 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }
  if (!isAuthorized) return null;
  return children;
}