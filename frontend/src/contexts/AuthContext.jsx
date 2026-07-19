import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { fetchCsrfToken } from '../utils/axiosConfig';
import API from '../utils/apiEndpoints';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  const getAuthHeaders = useCallback(() => {
    // 认证通过 httpOnly cookie 自动发送，无需手动设置 Authorization header
    return {};
  }, []);

  const storeUserToLocalStorage = (user) => {
    if (!user) return;
    localStorage.setItem('user', JSON.stringify({
      _id: user._id,
      accountId: user.accountId,
      username: user.username,
      isEmailVerified: user.isEmailVerified,
      role: user.role || 'user',
      avatar: user.avatar || ''
    }));
  };

  useEffect(() => {
    const userData = localStorage.getItem('user');

    const initAuth = async (storedUser) => {
      await fetchCsrfToken();
      try {
        const res = await axios.get(API.AUTH.ME, { skipRedirect: true, params: { _t: Date.now() } });
        const freshUser = res.data;
        setUser(freshUser);
        storeUserToLocalStorage(freshUser);
        try {
          await axios.post(API.USER_SESSIONS.CREATE, {
            screenWidth: window.screen.width,
            screenHeight: window.screen.height,
            language: navigator.language
          }, { skipRedirect: true });
        } catch (sessionErr) {
          console.error('Session creation failed, retrying...', sessionErr?.response?.data || sessionErr?.message);
          try {
            await new Promise(r => setTimeout(r, 1000));
            await axios.post(API.USER_SESSIONS.CREATE, {
              screenWidth: window.screen.width,
              screenHeight: window.screen.height,
              language: navigator.language
            }, { skipRedirect: true });
          } catch (retryErr) {
            console.error('Session creation retry failed:', retryErr?.response?.data || retryErr?.message);
          }
        }
      } catch {
        localStorage.removeItem('user');
        setUser(null);
      } finally {
        setInitializing(false);
      }
    };

    if (userData) {
      try {
        JSON.parse(userData);
        initAuth(userData);
      } catch {
        localStorage.removeItem('user');
        setInitializing(false);
      }
    } else {
      initAuth(null);
    }
  }, []);

  useEffect(() => {
    const handleSessionExpired = (e) => {
      if (e.detail?.type === 'user') {
        setUser(null);
      }
    };
    const handleForceEmailChange = () => {
      setUser(prev => prev ? { ...prev, forceEmailChange: true } : prev);
    };
    // 双 Token 刷新成功后同步 user 状态（角色/邮箱可能在 refresh 响应中变化）
    const handleTokenRefreshed = (e) => {
      if (e.detail?.user) {
        setUser(prev => prev ? { ...prev, ...e.detail.user } : e.detail.user);
      }
    };
    window.addEventListener('auth:session-expired', handleSessionExpired);
    window.addEventListener('auth:force-email-change', handleForceEmailChange);
    window.addEventListener('auth:token-refreshed', handleTokenRefreshed);
    return () => {
      window.removeEventListener('auth:session-expired', handleSessionExpired);
      window.removeEventListener('auth:force-email-change', handleForceEmailChange);
      window.removeEventListener('auth:token-refreshed', handleTokenRefreshed);
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    const heartbeat = () => {
      if (document.visibilityState === 'hidden') return;
      axios.post(API.USER_SESSIONS.HEARTBEAT, {}, { skipRedirect: true }).catch(() => {});
    };
    const interval = setInterval(heartbeat, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      axios.get(API.AUTH.ME, { skipRedirect: true, params: { _t: Date.now() } }).catch(() => {});
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user]);

  useEffect(() => {
    const handleOnline = async () => {
      const { processOfflineQueue } = await import('../utils/offlineQueue');
      await processOfflineQueue(axios);
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  const login = useCallback((userData) => {
    setUser(userData);
    // token 通过 httpOnly cookie 自动管理，不再存储到 localStorage
    storeUserToLocalStorage(userData);
  }, []);

  const logout = useCallback(async () => {
    try {
      await axios.post(API.AUTH.LOGOUT);
    } catch {}
    setUser(null);
    localStorage.removeItem('user');
  }, []);

  const updateUser = useCallback((updatedData) => {
    setUser(prev => {
      const newUser = typeof updatedData === 'function' ? updatedData(prev) : updatedData;
      if (newUser) {
        storeUserToLocalStorage(newUser);
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
