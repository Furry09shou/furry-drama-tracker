import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate, Outlet } from 'react-router-dom';
import axios from 'axios';
import { useI18n } from '../contexts/I18nContext';

const AdminLayout = () => {
  const { t } = useI18n();
  const [admin, setAdmin] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    const adminData = localStorage.getItem('adminData');
    if (token && adminData) {
      try {
        setAdmin(JSON.parse(adminData));
      } catch (e) {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminData');
        navigate('/admin', { replace: true });
      }
    } else {
      navigate('/admin', { replace: true });
    }
    const heartbeat = setInterval(() => {
      const adminToken = localStorage.getItem('adminToken');
      if (adminToken) {
        axios.post('/api/admin-sessions/heartbeat', {}, {
          headers: { Authorization: `Bearer ${adminToken}` }
        }).catch(() => {});
      }
    }, 5 * 60 * 1000);
    return () => clearInterval(heartbeat);
  }, [navigate]);

  const handleLogout = async () => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      try {
        await axios.post('/api/admin/logout', {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (e) {}
    }
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminData');
    navigate('/admin', { replace: true });
  };

  if (!admin) return null;

  return (
    <div style={{ minHeight: '100vh' }}>
      <div style={{
        height: '48px',
        background: 'var(--card)',
        borderBottom: '1px solid var(--border)',
        padding: '0 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => navigate('/admin/dashboard')} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--primary)', fontSize: '14px',
            display: 'flex', alignItems: 'center', gap: '4px',
            padding: '4px 8px', borderRadius: '6px',
            transition: 'background 0.2s'
          }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
             onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            {t('adminLayout.consoleHome')}
          </button>
          <button onClick={() => navigate(-1)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--foreground)', fontSize: '14px',
            display: 'flex', alignItems: 'center', gap: '4px',
            padding: '4px 8px', borderRadius: '6px',
            transition: 'background 0.2s'
          }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
             onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            {t('adminLayout.back')}
          </button>
        </div>
        <span style={{ fontWeight: 600, fontSize: '15px', color: 'var(--foreground)' }}>{t('adminLayout.adminBackend')}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <a href="/" style={{
            color: 'var(--primary)', fontSize: '14px', textDecoration: 'none',
            padding: '4px 8px', borderRadius: '6px', transition: 'background 0.2s'
          }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
             onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >{t('adminLayout.websiteHome')}</a>
          <button onClick={handleLogout} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--destructive-text)', fontSize: '14px',
            padding: '4px 8px', borderRadius: '6px',
            transition: 'background 0.2s'
          }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--destructive-bg-subtle)'}
             onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            {t('adminLayout.logout')}
          </button>
        </div>
      </div>
      <div style={{ padding: '24px' }} className="admin-main-content">
        <Outlet context={{ admin }} />
      </div>
    </div>
  );
};

export default AdminLayout;
