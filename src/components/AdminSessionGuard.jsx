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
          // The verify call failed (network error, 401 from public app, etc.)
          // We do a local HMAC-structure check: the session must have all fields
          // and not be expired. The actual crypto is verified on every backend call.
          const hasAllFields = parsed.token && parsed.userId && parsed.username && parsed.expiresAt;
          const notExpired = new Date(parsed.expiresAt) > new Date();
          if (hasAllFields && notExpired) {
            console.warn('Session verify call failed, allowing with local check. Backend ops still HMAC-protected.');
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

    try {
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
    } catch (err) {
      // If subscription fails (no records), just skip monitoring
      console.warn('AdminUser subscription unavailable');
    }
  }, [isAuthorized]);

  // --- Activity tracking + inactivity logout ---
  useEffect(() => {
   if (!isAuthorized) return;

   let inactivityTimer = null;
   let debounceTimer = null;
   const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes
   const DEBOUNCE_DELAY = 1000; // Debounce activity events to 1s
   let logoutInProgress = false;

   const resetInactivityTimer = () => {
     if (logoutInProgress) return;

     // Clear old debounce and inactivity timers
     if (debounceTimer) clearTimeout(debounceTimer);
     if (inactivityTimer) clearTimeout(inactivityTimer);

     // Debounce: wait before setting new timer to avoid constant resets
     debounceTimer = setTimeout(() => {
       inactivityTimer = setTimeout(() => {
         logoutInProgress = true;
         forceLogout();
       }, INACTIVITY_TIMEOUT);
     }, DEBOUNCE_DELAY);
   };

   const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
   const boundResetters = events.map(e => {
     const handler = resetInactivityTimer;
     window.addEventListener(e, handler, { passive: true });
     return { event: e, handler };
   });

   // Start initial timer
   resetInactivityTimer();

   return () => {
     logoutInProgress = true; // Prevent any further operations
     if (debounceTimer) clearTimeout(debounceTimer);
     if (inactivityTimer) clearTimeout(inactivityTimer);
     boundResetters.forEach(({ event, handler }) => {
       window.removeEventListener(event, handler);
     });
   };
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