import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { fetchCsrfToken } from '../utils/axiosConfig';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    const initAuth = async (storedToken, storedUser) => {
      await fetchCsrfToken();
      const headers = storedToken ? { Authorization: `Bearer ${storedToken}` } : {};
      try {
        const res = await axios.get('/api/auth/me', { headers, skipRedirect: true, params: { _t: Date.now() } });
        const freshUser = res.data;
        setUser(freshUser);
        localStorage.setItem('user', JSON.stringify(freshUser));
        if (storedToken) {
          try {
            await axios.post('/api/user-sessions/create', {
              screenWidth: window.screen.width,
              screenHeight: window.screen.height,
              language: navigator.language
            }, { headers, skipRedirect: true });
          } catch (sessionErr) {
            console.error('Session creation failed, retrying...', sessionErr?.response?.data || sessionErr?.message);
            try {
              await new Promise(r => setTimeout(r, 1000));
              await axios.post('/api/user-sessions/create', {
                screenWidth: window.screen.width,
                screenHeight: window.screen.height,
                language: navigator.language
              }, { headers, skipRedirect: true });
            } catch (retryErr) {
              console.error('Session creation retry failed:', retryErr?.response?.data || retryErr?.message);
            }
          }
        }
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
      } finally {
        setInitializing(false);
      }
    };

    if (token && userData) {
      try {
        const parsed = JSON.parse(userData);
        initAuth(token, parsed);
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setInitializing(false);
      }
    } else {
      initAuth(null, null);
    }
  }, []);

  useEffect(() => {
    const handleSessionExpired = (e) => {
      if (e.detail?.type === 'user') {
        setUser(null);
      }
    };
    window.addEventListener('auth:session-expired', handleSessionExpired);
    return () => window.removeEventListener('auth:session-expired', handleSessionExpired);
  }, []);

  useEffect(() => {
    if (!user) return;
    const heartbeat = () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      const headers = { Authorization: `Bearer ${token}` };
      axios.post('/api/user-sessions/heartbeat', {}, { headers, skipRedirect: true }).catch(() => {});
    };
    const interval = setInterval(heartbeat, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      const token = localStorage.getItem('token');
      if (!token) return;
      const headers = { Authorization: `Bearer ${token}` };
      axios.get('/api/auth/me', { headers, skipRedirect: true, params: { _t: Date.now() } }).catch(() => {});
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user]);

  const login = useCallback((userData) => {
    setUser(userData);
    if (userData.token) {
      localStorage.setItem('token', userData.token);
      const { token, ...userDataWithoutToken } = userData;
      localStorage.setItem('user', JSON.stringify(userDataWithoutToken));
    } else {
      localStorage.setItem('user', JSON.stringify(userData));
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await axios.post('/api/auth/logout', {}, { headers });
    } catch {}
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }, []);

  const updateUser = useCallback((updatedData) => {
    setUser(prev => {
      const newUser = typeof updatedData === 'function' ? updatedData(prev) : updatedData;
      if (newUser) {
        localStorage.setItem('user', JSON.stringify(newUser));
      }
      return newUser;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, initializing, getAuthHeaders, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth 必须在 AuthProvider 内使用');
  }
  return context;
};
