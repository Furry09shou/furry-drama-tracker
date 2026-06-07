import { useState, useEffect } from 'react';
import adminApi from '../utils/adminApi';

export const useAuth = () => {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await adminApi.get('/api/admin/verify');
        setAdmin(res.data.admin);
      } catch {
        setAdmin(null);
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const isAuthenticated = () => {
    return !!admin;
  };

  const logout = async () => {
    try {
      await adminApi.post('/api/auth/admin/logout');
    } catch {
      // ignore
    }
    setAdmin(null);
  };

  return {
    admin,
    loading,
    isAuthenticated,
    logout
  };
};
