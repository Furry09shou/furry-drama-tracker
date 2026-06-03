import { useState, useEffect } from 'react';
import { getAdminToken, getAdminData } from '../utils/adminApi';

export const useAuth = () => {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      const token = getAdminToken();
      const adminData = getAdminData();
      if (token && adminData) {
        setAdmin(adminData);
      } else {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminData');
        setAdmin(null);
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const isAuthenticated = () => {
    return !!getAdminToken();
  };

  const logout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminData');
    setAdmin(null);
  };

  return {
    admin,
    loading,
    isAuthenticated,
    logout
  };
};
