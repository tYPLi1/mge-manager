import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';

const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutes

export default function AdminSessionGuard({ children }) {
  const navigate = useNavigate();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuthorization = async () => {
      try {
        // Check AdminUser session from localStorage
        const adminSession = localStorage.getItem('adminSession');
        if (adminSession) {
          const parsed = JSON.parse(adminSession);
          if (new Date(parsed.expiresAt) > new Date()) {
            // Verify the account is still active in the database
            try {
              const res = await base44.functions.invoke('verifyAdminSession', { userId: parsed.userId });
              if (res.data.valid) {
                setIsAuthorized(true);
                setLoading(false);
                return;
              } else {
                // Account was deactivated or deleted — clear session
                localStorage.removeItem('adminSession');
                localStorage.removeItem('adminLastActivity');
              }
            } catch {
              // If verification fails (network error etc.), allow session to continue
              setIsAuthorized(true);
              setLoading(false);
              return;
            }
          } else {
            localStorage.removeItem('adminSession');
            localStorage.removeItem('adminLastActivity');
          }
        }

        // Check if Base44 user is admin
        const isAuthenticated = await base44.auth.isAuthenticated();
        if (isAuthenticated) {
          const user = await base44.auth.me();
          if (user?.role === 'admin') {
            setIsAuthorized(true);
            setLoading(false);
            return;
          }
        }

        // No valid admin session or Base44 admin user
        navigate(createPageUrl('AdminLogin'));
        setLoading(false);
      } catch (error) {
        console.error('Authorization check failed:', error);
        navigate(createPageUrl('AdminLogin'));
        setLoading(false);
      }
    };

    checkAuthorization();
  }, [navigate]);

  useEffect(() => {
    if (!isAuthorized) return;

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

    // Track activity
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    return () => {
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [isAuthorized]);

  if (loading) {
    return null;
  }

  if (!isAuthorized) {
    return null;
  }

  return children;
}