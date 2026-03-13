import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Trophy, AlertCircle, Loader2, ChevronLeft } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Check if already logged in
  useEffect(() => {
    const checkAuth = async () => {
      // Check AdminUser session
      const session = localStorage.getItem('adminSession');
      if (session) {
        const parsed = JSON.parse(session);
        if (new Date(parsed.expiresAt) > new Date()) {
          navigate(createPageUrl('AdminDashboard'));
          return;
        } else {
          localStorage.removeItem('adminSession');
        }
      }

      // Check if Base44 user is admin
      try {
        const isAuthenticated = await base44.auth.isAuthenticated();
        if (isAuthenticated) {
          const user = await base44.auth.me();
          if (user?.role === 'admin') {
            navigate(createPageUrl('AdminDashboard'));
          }
        }
      } catch (error) {
        // Not authenticated, stay on login page
      }
    };

    checkAuth();
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await base44.functions.invoke('adminLogin', { username, password });

      if (!response.data.success) {
        setError(response.data.error || 'Login failed');
        setLoading(false);
        return;
      }

      // Store session
      const session = response.data.session;
      localStorage.setItem('adminSession', JSON.stringify(session));
      localStorage.setItem('adminLastActivity', Date.now().toString());

      navigate(createPageUrl('AdminDashboard'));
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-gray-100 flex items-center justify-center p-4">
      <style>{`:root { --dkp-gold: #f59e0b; } body { background: #0a0e1a; }`}</style>

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <Trophy className="w-6 h-6 text-white" />
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">DKP Admin</h1>
          <p className="text-gray-400">Sign in to access the admin panel</p>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert className="mb-6 bg-red-500/10 border-red-500/20">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-400">{error}</AlertDescription>
          </Alert>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Username</label>
            <Input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              disabled={loading}
              className="bg-white/5 border-white/10 text-white placeholder:text-gray-600"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              disabled={loading}
              className="bg-white/5 border-white/10 text-white placeholder:text-gray-600"
            />
          </div>

          <Button
            type="submit"
            disabled={loading || !username || !password}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold py-2 rounded-lg transition-all"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </Button>
        </form>

        {/* Back to Public Site Button */}
        <Link
          to={createPageUrl("Leaderboard")}
          className="mt-4 flex items-center justify-center gap-2 w-full px-4 py-2 rounded-lg text-sm font-medium text-gray-900 bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Public Site
        </Link>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-white/10 text-center text-xs text-gray-500">
          <p>Session expires after 10 minutes of inactivity</p>
        </div>
      </div>
    </div>
  );
}