import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      try {
        const parsed = JSON.parse(userData);
        setUser(parsed);
        // 验证token有效性
        axios.get('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
          .then(res => {
            const freshUser = { ...parsed, ...res.data, token };
            setUser(freshUser);
            localStorage.setItem('user', JSON.stringify(freshUser));
            // 创建会话
            axios.post('/api/user-sessions/create', {
              screenWidth: window.screen.width,
              screenHeight: window.screen.height,
              language: navigator.language
            }, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
          })
          .catch(() => {
            // token无效，清除
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setUser(null);
          });
      } catch (e) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setInitializing(false);
  }, []);

  // 心跳保活
  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    const heartbeat = () => {
      axios.post('/api/user-sessions/heartbeat', {}, {
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => {});
    };
    const interval = setInterval(heartbeat, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user]);

  const login = useCallback((userData) => {
    setUser(userData);
    localStorage.setItem('token', userData.token);
    localStorage.setItem('user', JSON.stringify(userData));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, initializing }}>
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
