import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import adminApi, { getAdminToken, getAdminData } from '../utils/adminApi';
import { useI18n } from '../contexts/I18nContext';

const AdminSessions = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filterAdmin, setFilterAdmin] = useState('');
  const navigate = useNavigate();
  const { t, lang, locale } = useI18n();

  useEffect(() => {
    const token = getAdminToken();
    const adminData = getAdminData();
    if (!token || !adminData) {
      navigate('/admin', { replace: true });
      return;
    }
    if (adminData.role !== 'superadmin') {
      navigate('/admin/dashboard', { replace: true });
      return;
    }
    fetchSessions();
  }, [navigate]);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const res = await adminApi.get('/api/admin-sessions/all');
      setSessions(res.data);
    } catch (err) {
      setError(t('adminSessions.loadFailed'));
    }
    setLoading(false);
  };

  const handleLogoutSession = async (id) => {
    if (!window.confirm(t('adminSessions.confirmLogoutDevice'))) return;
    try {
      await adminApi.delete(`/api/admin-sessions/${id}`);
      setSuccess(t('adminSessions.deviceLoggedOut'));
      fetchSessions();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(t('adminSessions.operationFailed'));
    }
  };

  const handleLogoutAllAdmin = async (adminId, username) => {
    if (!window.confirm(t('adminSessions.confirmLogoutAll', { username }))) return;
    try {
      await adminApi.delete(`/api/admin-sessions/admin/${adminId}/all`);
      setSuccess(t('adminSessions.allDevicesLoggedOut', { username }));
      fetchSessions();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(t('adminSessions.operationFailed'));
    }
  };

  const getDeviceIcon = (type) => {
    if (type === 'mobile') return '📱';
    if (type === 'tablet') return '📲';
    return '💻';
  };

  const getBrowserIcon = (browser) => {
    if (browser === 'Chrome') return '🌐';
    if (browser === 'Edge') return '🔷';
    if (browser === 'Firefox') return '🦊';
    if (browser === 'Safari') return '🧭';
    return '🌍';
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleString(locale, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  const getRoleLabel = (role) => {
    const map = { superadmin: t('adminUsers.superAdmin'), admin: t('adminUsers.admin'), creator: t('adminUsers.creator') };
    return map[role] || role;
  };

  const getRoleColor = (role) => {
    const map = { superadmin: 'var(--primary)', admin: 'var(--success-text)', creator: 'var(--warning-text)' };
    return map[role] || 'var(--text-secondary)';
  };

  const uniqueAdmins = [...new Map(sessions.map(s => [s.adminId, { id: s.adminId, username: s.adminUsername, role: s.adminRole }])).values()];
  const filteredSessions = filterAdmin ? sessions.filter(s => s.adminId === filterAdmin) : sessions;

  return (
    <div className="admin-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h2 style={{ margin: 0 }}>{t('adminSessions.deviceManagement')}</h2>
        </div>
        <button className="btn btn-secondary" onClick={fetchSessions}>{t('adminSessions.refresh')}</button>
      </div>

      {error && <div className="error-message" style={{ marginBottom: '16px' }}>{error}</div>}
      {success && <div style={{ padding: '10px', background: 'var(--success-bg-strong)', border: '1px solid var(--success-border)', borderRadius: '6px', color: 'var(--success-text)', marginBottom: '16px' }}>{success}</div>}

      <div style={{ marginBottom: '20px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{t('adminSessions.filterByAccount')}</span>
        <button onClick={() => setFilterAdmin('')} style={{
          padding: '6px 14px', borderRadius: '20px', fontSize: '13px', cursor: 'pointer',
          border: '1px solid', transition: 'all 0.2s',
          background: !filterAdmin ? 'var(--primary-bg)' : 'var(--hover-bg)',
          color: !filterAdmin ? 'var(--primary)' : 'var(--text-secondary)',
          borderColor: !filterAdmin ? 'var(--primary)' : 'var(--border)'
        }}>{t('adminSessions.all')}</button>
        {uniqueAdmins.map(a => (
          <button key={a.id} onClick={() => setFilterAdmin(a.id)} style={{
            padding: '6px 14px', borderRadius: '20px', fontSize: '13px', cursor: 'pointer',
            border: '1px solid', transition: 'all 0.2s',
            background: filterAdmin === a.id ? 'var(--primary-bg)' : 'var(--hover-bg)',
            color: filterAdmin === a.id ? 'var(--primary)' : 'var(--text-secondary)',
            borderColor: filterAdmin === a.id ? 'var(--primary)' : 'var(--border)'
          }}>{a.username} ({getRoleLabel(a.role)})</button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>{t('adminSessions.loading')}</div>
      ) : filteredSessions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>{t('adminSessions.noLoginRecords')}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredSessions.map(session => (
            <div key={session._id} style={{
              background: 'var(--card)', borderRadius: '12px', border: '1px solid var(--border)',
              padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px',
              opacity: session.isActive ? 1 : 0.6, transition: 'opacity 0.2s'
            }}>
              <div style={{ fontSize: '28px', flexShrink: 0 }}>
                {getDeviceIcon(session.deviceInfo?.deviceType)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 600, fontSize: '15px', color: 'var(--foreground)' }}>{session.adminUsername}</span>
                  <span style={{
                    fontSize: '11px', padding: '2px 8px', borderRadius: '10px',
                    background: 'var(--hover-bg)', color: getRoleColor(session.adminRole),
                    border: '1px solid var(--border)'
                  }}>{getRoleLabel(session.adminRole)}</span>
                  {session.isActive ? (
                    <span style={{
                      fontSize: '11px', padding: '2px 8px', borderRadius: '10px',
                      background: 'var(--success-bg-subtle)', color: 'var(--success-text)',
                      border: '1px solid var(--success-border)'
                    }}>{t('adminSessions.online')}</span>
                  ) : (
                    <span style={{
                      fontSize: '11px', padding: '2px 8px', borderRadius: '10px',
                      background: 'var(--hover-bg)', color: 'var(--text-secondary)',
                      border: '1px solid var(--border)'
                    }}>{t('adminSessions.offline')}</span>
                  )}
                  {session.isCurrent && (
                    <span style={{
                      fontSize: '11px', padding: '2px 8px', borderRadius: '10px',
                      background: 'var(--primary-bg)', color: 'var(--primary)',
                      border: '1px solid var(--primary-border)', fontWeight: 600
                    }}>{t('adminSessions.currentDevice')}</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  <span>{getBrowserIcon(session.deviceInfo?.browser)} {session.deviceInfo?.browser} {session.deviceInfo?.browserVersion}</span>
                  <span>{session.deviceInfo?.os} {session.deviceInfo?.osVersion}</span>
                  {session.deviceInfo?.screenWidth > 0 && (
                    <span>{session.deviceInfo.screenWidth}x{session.deviceInfo.screenHeight}</span>
                  )}
                  {session.ip && <span>IP: {session.ip}</span>}
                </div>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  <span>{t('adminSessions.loginAt')}: {formatTime(session.loginAt)}</span>
                  {session.isActive && <span>{t('adminSessions.lastActive')}: {formatTime(session.lastActiveAt)}</span>}
                  {!session.isActive && session.logoutAt && <span>{t('adminSessions.offlineAt')}: {formatTime(session.logoutAt)}</span>}
                </div>
              </div>
              <div style={{ flexShrink: 0, display: 'flex', gap: '8px' }}>
                {session.isActive && !session.isCurrent && (
                  <button onClick={() => handleLogoutSession(session._id)} style={{
                    padding: '6px 14px', borderRadius: '8px', fontSize: '13px',
                    background: 'var(--destructive-bg)', color: 'var(--destructive-text)',
                    border: '1px solid var(--destructive-border)', cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}>{t('adminSessions.logout')}</button>
                )}
                {session.isActive && !session.isCurrent && (
                  <button onClick={() => handleLogoutAllAdmin(session.adminId, session.adminUsername)} style={{
                    padding: '6px 14px', borderRadius: '8px', fontSize: '13px',
                    background: 'var(--hover-bg)', color: 'var(--text-secondary)',
                    border: '1px solid var(--border)', cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}>{t('adminSessions.logoutAll')}</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminSessions;
