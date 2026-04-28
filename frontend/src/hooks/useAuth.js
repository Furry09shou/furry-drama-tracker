import { useState, useEffect } from 'react';

export const useAuth = () => {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('adminToken');
      const adminData = localStorage.getItem('adminData');
      if (token && adminData) {
        setAdmin(JSON.parse(adminData));
      } else {
        setAdmin(null);
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const isAuthenticated = () => {
    return !!localStorage.getItem('adminToken');
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
