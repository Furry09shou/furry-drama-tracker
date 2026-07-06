import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate, Outlet } from 'react-router-dom';
import adminApi from '../utils/adminApi';
import { useI18n } from '../contexts/I18nContext';

const AdminLayout = () => {
  const { t } = useI18n();
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const validateAdmin = async () => {
      try {
        const res = await adminApi.get('/api/admin/verify');
        setAdmin(res.data.admin || res.data);
      } catch (error) {
        setAdmin(null);
        navigate('/admin', { replace: true });
      }
      setLoading(false);
    };
    validateAdmin();

    const heartbeat = setInterval(() => {
      adminApi.post('/api/user-sessions/heartbeat', {}).catch(() => {});
    }, 5 * 60 * 1000);
    return () => clearInterval(heartbeat);
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await adminApi.post('/api/admin/logout', {});
    } catch (e) {}
    setAdmin(null);
    navigate('/admin', { replace: true });
  };

  if (loading) return null;
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
