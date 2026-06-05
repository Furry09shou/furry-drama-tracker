import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import ConfirmModal from './ConfirmModal';
import { useI18n } from '../contexts/I18nContext';
import { useAuth } from '../contexts/AuthContext';

const UserDevices = ({ user }) => {
  const { t, locale } = useI18n();
  const { getAuthHeaders } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [msgIsError, setMsgIsError] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ show: false, title: '', message: '', onConfirm: null, type: 'danger' });
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    fetchSessions();
  }, [navigate, user]);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/user-sessions/my', {
        headers: getAuthHeaders()
      });
      setSessions(res.data);
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    }
    setLoading(false);
  };

  const handleLogoutSession = async (id) => {
    setConfirmModal({
      show: true,
      title: t('devices.logoutDevice'),
      message: t('devices.confirmLogoutDevice'),
      type: 'danger',
      onConfirm: async () => {
        try {
          await axios.delete(`/api/user-sessions/${id}`, {
            headers: getAuthHeaders()
          });
          setMsg(t('devices.deviceLoggedOut'));
          setMsgIsError(false);
          fetchSessions();
          setTimeout(() => setMsg(''), 3000);
        } catch (err) {
          setMsg(err.response?.data?.message || t('common.operationFailed'));
          setMsgIsError(true);
          setTimeout(() => setMsg(''), 3000);
        }
      }
    });
  };

  const handleLogoutAllSessions = async () => {
    setConfirmModal({
      show: true,
      title: t('devices.logoutOtherDevices'),
      message: t('devices.confirmLogoutOtherDevices'),
      type: 'warning',
      onConfirm: async () => {
        try {
          const res = await axios.delete('/api/user-sessions/my/all', {
            headers: getAuthHeaders()
          });
          setMsg(res.data.message);
          setMsgIsError(false);
          setTimeout(() => setMsg(''), 3000);
        } catch (err) {
          setMsg(err.response?.data?.message || t('common.operationFailed'));
          setMsgIsError(true);
          setTimeout(() => setMsg(''), 3000);
        }
      }
    });
  };

  const handleSaveName = async (id) => {
    try {
      await axios.put(`/api/user-sessions/${id}/name`, { deviceName: editName }, {
        headers: getAuthHeaders()
      });
      setEditingId(null);
      setEditName('');
      fetchSessions();
      setMsg(t('devices.aliasUpdated'));
      setTimeout(() => setMsg(''), 3000);
    } catch (err) {
      setMsg(err.response?.data?.message || t('common.updateFailed'));
      setMsgIsError(true);
      setTimeout(() => setMsg(''), 3000);
    }
  };

  const startEdit = (session) => {
    setEditingId(session._id);
    setEditName(session.deviceInfo?.deviceName || '');
  };

  const getDeviceIcon = (type) => {
    if (type === 'mobile') return '📱';
    if (type === 'tablet') return '📲';
    return '💻';
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleString(locale, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  const activeCount = sessions.filter(s => s.isActive).length;

  return (
    <div className="user-profile">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link to="/account-security" className="btn btn-secondary">{t('common.back')}</Link>
          <h2 style={{ margin: 0 }}>{t('devices.manageDevices')}</h2>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary" style={{ fontSize: '13px', padding: '6px 14px' }} onClick={fetchSessions}>{t('common.refresh')}</button>
          {activeCount > 1 && (
            <button style={{
              padding: '6px 14px', borderRadius: '8px', fontSize: '13px',
              background: 'var(--destructive-bg)', color: 'var(--destructive-text)',
              border: '1px solid var(--destructive-border)', cursor: 'pointer',
              transition: 'all 0.2s'
            }} onClick={handleLogoutAllSessions}>{t('devices.logoutOtherDevices')}</button>
          )}
        </div>
      </div>

      <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px' }}>
        {t('devices.manageDevicesDesc')} <strong style={{ color: 'var(--success-text)' }}>{activeCount}</strong> {t('devices.manageDevicesDescSuffix')}
      </p>

      {msg && (
        <div style={{
          padding: '10px', marginBottom: '16px', borderRadius: '6px',
          background: msgIsError ? 'var(--destructive-bg)' : 'var(--success-bg-strong)',
          border: `1px solid ${msgIsError ? 'var(--destructive-border)' : 'var(--success-border)'}`,
          color: msgIsError ? 'var(--destructive-text)' : 'var(--success-text)'
        }}>{msg}</div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>{t('common.loading')}</div>
      ) : sessions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>{t('devices.noLoginRecords')}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {sessions.map(session => (
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
                  {editingId === session._id ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder={t('devices.enterDeviceAlias')}
                        style={{
                          padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border)',
                          background: 'var(--input)', color: 'var(--foreground)', fontSize: '13px', width: '140px'
                        }}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName(session._id); if (e.key === 'Escape') setEditingId(null); }}
                      />
                      <button onClick={() => handleSaveName(session._id)} style={{
                        padding: '4px 10px', borderRadius: '6px', fontSize: '12px',
                        background: 'var(--primary)', color: '#fff', border: 'none', cursor: 'pointer'
                      }}>{t('common.save')}</button>
                      <button onClick={() => setEditingId(null)} style={{
                        padding: '4px 10px', borderRadius: '6px', fontSize: '12px',
                        background: 'var(--hover-bg)', color: 'var(--foreground)', border: '1px solid var(--border)', cursor: 'pointer'
                      }}>{t('common.cancel')}</button>
                    </div>
                  ) : (
                    <>
                      <span style={{ fontWeight: 600, fontSize: '15px', color: 'var(--foreground)' }}>
                        {session.deviceInfo?.deviceName || session.deviceInfo?.browser || t('devices.unknownBrowser')} {session.deviceInfo?.browserVersion}
                      </span>
                      <button onClick={() => startEdit(session)} style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--text-secondary)', fontSize: '14px', padding: '2px 4px'
                      }} title={t('devices.editAlias')}>✏️</button>
                    </>
                  )}
                  {session.isActive ? (
                    <span style={{
                      fontSize: '11px', padding: '2px 8px', borderRadius: '10px',
                      background: 'var(--success-bg-subtle)', color: 'var(--success-text)',
                      border: '1px solid var(--success-border)'
                    }}>{t('devices.online')}</span>
                  ) : (
                    <span style={{
                      fontSize: '11px', padding: '2px 8px', borderRadius: '10px',
                      background: 'var(--hover-bg)', color: 'var(--text-secondary)',
                      border: '1px solid var(--border)'
                    }}>{t('devices.offline')}</span>
                  )}
                  {session.isCurrent && (
                    <span style={{
                      fontSize: '11px', padding: '2px 8px', borderRadius: '10px',
                      background: 'var(--primary-bg)', color: 'var(--primary)',
                      border: '1px solid var(--primary-border)', fontWeight: 600
                    }}>{t('devices.currentDevice')}</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  <span>{session.deviceInfo?.os} {session.deviceInfo?.osVersion}</span>
                  {session.deviceInfo?.screenWidth > 0 && (
                    <span>{session.deviceInfo.screenWidth}x{session.deviceInfo.screenHeight}</span>
                  )}
                  {session.ip && <span>IP: {session.ip}</span>}
                </div>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  <span>{t('devices.loginAt')}{formatTime(session.loginAt)}</span>
                  {session.isActive && <span>{t('devices.lastActive')}{formatTime(session.lastActiveAt)}</span>}
                  {!session.isActive && session.logoutAt && <span>{t('devices.offlineAt')}{formatTime(session.logoutAt)}</span>}
                </div>
              </div>
              <div style={{ flexShrink: 0 }}>
                {session.isActive && !session.isCurrent && (
                  <button onClick={() => handleLogoutSession(session._id)} style={{
                    padding: '6px 14px', borderRadius: '8px', fontSize: '13px',
                    background: 'var(--destructive-bg)', color: 'var(--destructive-text)',
                    border: '1px solid var(--destructive-border)', cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}>{t('devices.logout')}</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        show={confirmModal.show}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        onConfirm={confirmModal.onConfirm}
        onClose={() => setConfirmModal({ ...confirmModal, show: false })}
      />
    </div>
  );
};

export default UserDevices;
