import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { laravelApi, getTokenExpiry } from '../api/axiosConfig';

const AuthContext = createContext(null);

const REFRESH_BEFORE_EXPIRY_MS = 5 * 60 * 1000; // refresh 5 min before expiry

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const refreshTimerRef = useRef(null);

  // Schedule a proactive token refresh before the JWT expires
  const scheduleRefresh = useCallback((currentToken) => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    const expiry = getTokenExpiry(currentToken);
    if (!expiry) return;
    const delay = expiry - Date.now() - REFRESH_BEFORE_EXPIRY_MS;
    if (delay <= 0) return; // already close to/past expiry — let the 401 handler deal with it
    refreshTimerRef.current = setTimeout(async () => {
      try {
        const { data } = await laravelApi.post('/auth/refresh');
        const newToken = data.data.token;
        localStorage.setItem('token', newToken);
        setToken(newToken);
        scheduleRefresh(newToken);
      } catch {
        // Token refresh failed — axiosConfig 401 handler will redirect to /login
      }
    }, delay);
  }, []);

  // Restore session on mount
  useEffect(() => {
    if (token) {
      fetchProfile();
      scheduleRefresh(token);
    } else {
      setLoading(false);
    }
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync token state when the axios interceptor silently refreshes it
  useEffect(() => {
    function onTokenRefreshed(e) {
      setToken(e.detail);
      scheduleRefresh(e.detail);
    }
    window.addEventListener('token:refreshed', onTokenRefreshed);
    return () => window.removeEventListener('token:refreshed', onTokenRefreshed);
  }, [scheduleRefresh]);

  async function fetchProfile() {
    try {
      const { data } = await laravelApi.get('/auth/me');
      setUser(data.data);
    } catch {
      logout();
    } finally {
      setLoading(false);
    }
  }

  const login = useCallback(async (email, password) => {
    const { data } = await laravelApi.post('/auth/login', { email, password });
    const { token: newToken, user: userData } = data.data;
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(userData);
    scheduleRefresh(newToken);
    return userData;
  }, [scheduleRefresh]);

  const logout = useCallback(async () => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    try {
      if (token) await laravelApi.post('/auth/logout');
    } catch {
      // ignore
    } finally {
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
    }
  }, [token]);

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    isAdmin: user?.role === 'admin',
    isManager: user?.role === 'manager',
    isMember: user?.role === 'member',
    hasRole: (...roles) => roles.includes(user?.role),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
