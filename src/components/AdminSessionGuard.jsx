import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutes

export default function AdminSessionGuard({ children }) {
  const navigate = useNavigate();

  useEffect(() => {
    const checkSession = () => {
      const session = localStorage.getItem('adminSession');
      
      if (!session) {
        navigate(createPageUrl('AdminLogin'));
        return;
      }

      const parsed = JSON.parse(session);
      if (new Date(parsed.expiresAt) <= new Date()) {
        localStorage.removeItem('adminSession');
        localStorage.removeItem('adminLastActivity');
        navigate(createPageUrl('AdminLogin'));
        return;
      }
    };

    const handleActivity = () => {
      const session = localStorage.getItem('adminSession');
      if (session) {
        const parsed = JSON.parse(session);
        const newExpiry = new Date(Date.now() + 10 * 60 * 1000);
        parsed.expiresAt = newExpiry.toISOString();
        localStorage.setItem('adminSession', JSON.stringify(parsed));
        localStorage.setItem('adminLastActivity', Date.now().toString());
      }
    };

    // Check session on mount
    checkSession();

    // Check session periodically
    const sessionCheckInterval = setInterval(checkSession, 30000); // Every 30 seconds

    // Track activity
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    return () => {
      clearInterval(sessionCheckInterval);
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [navigate]);

  const session = localStorage.getItem('adminSession');
  if (!session) {
    return null;
  }

  return children;
}