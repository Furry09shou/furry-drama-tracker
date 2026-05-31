import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import axios from 'axios';
import { useI18n } from '../contexts/I18nContext';

const Badge = ({ count }) => {
  if (!count) return null;
  return (
    <span style={{
      position: 'absolute', top: '10px', right: '10px',
      background: '#ef4444', color: '#fff', fontSize: '11px',
      fontWeight: 700, minWidth: '18px', height: '18px',
      borderRadius: '9px', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '0 5px',
      lineHeight: '18px', boxShadow: '0 1px 3px rgba(239,68,68,0.4)'
    }}>{count}</span>
  );
};

const AdminDashboard = () => {
  const { admin } = useOutletContext();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [statusMsg, setStatusMsg] = useState('');
  const [pendingCounts, setPendingCounts] = useState({ episodes: 0, reports: 0, feedbacks: 0, friendLinks: 0 });
  const statusTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (statusTimerRef.current) {
        clearTimeout(statusTimerRef.current);
      }
    };
  }, []);

  const clearStatusMsg = useCallback(() => {
    if (statusTimerRef.current) {
      clearTimeout(statusTimerRef.current);
    }
    statusTimerRef.current = setTimeout(() => setStatusMsg(''), 3000);
  }, []);

  useEffect(() => {
    if (!admin) return;
    const token = localStorage.getItem('adminToken');
    if (!token) return;
    axios.get('/api/admin/pending-counts', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setPendingCounts(res.data))
      .catch(() => {});
  }, [admin]);

  if (!admin) return null;

  return (
    <>
      <div style={{marginBottom: '30px'}}>
        <h2>{t('adminDashboard.welcome', { name: admin.username })}</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
          {t('adminDashboard.roleLabel')}{admin.role === 'superadmin' ? t('adminDashboard.roleSuperadmin') : admin.role === 'admin' ? t('adminDashboard.roleAdmin') : t('adminDashboard.roleCreator')}
        </p>
      </div>

      <div className="dashboard-cards">
        <Link to="/admin/episodes" className="dashboard-card" style={{ position: 'relative' }}>
          <div className="card-icon">🎬</div>
          <h3>{t('adminDashboard.episodeManagement')}</h3>
          <p>{admin.role === 'creator' ? t('adminDashboard.episodeManagementDescCreator') : t('adminDashboard.episodeManagementDesc')}</p>
          <Badge count={pendingCounts.episodes} />
        </Link>

        {admin.role === 'creator' && (
          <Link to="/admin/creator-profile" className="dashboard-card">
            <div className="card-icon">👤</div>
            <h3>{t('adminDashboard.creatorProfile')}</h3>
            <p>{t('adminDashboard.creatorProfileDesc')}</p>
          </Link>
        )}

        {admin.role !== 'creator' && (
          <>
            <Link to="/admin/categories" className="dashboard-card">
              <div className="card-icon">🏷️</div>
              <h3>{t('adminDashboard.categoryManagement')}</h3>
              <p>{t('adminDashboard.categoryManagementDesc')}</p>
            </Link>

            <Link to="/admin/banners" className="dashboard-card">
              <div className="card-icon">🖼️</div>
              <h3>{t('adminDashboard.bannerManagement')}</h3>
              <p>{t('adminDashboard.bannerManagementDesc')}</p>
            </Link>
          </>
        )}

        {admin.role === 'superadmin' && (
          <Link to="/admin/users" className="dashboard-card">
            <div className="card-icon">👥</div>
            <h3>{t('adminDashboard.userManagement')}</h3>
            <p>{t('adminDashboard.userManagementDesc')}</p>
          </Link>
        )}

        {admin.role === 'superadmin' && (
          <Link to="/admin/site-content" className="dashboard-card">
            <div className="card-icon">📝</div>
            <h3>{t('adminDashboard.siteContentManagement')}</h3>
            <p>{t('adminDashboard.siteContentManagementDesc')}</p>
          </Link>
        )}

        {admin.role === 'superadmin' && (
          <Link to="/admin/email-settings" className="dashboard-card">
            <div className="card-icon">📧</div>
            <h3>{t('adminDashboard.emailSettings')}</h3>
            <p>{t('adminDashboard.emailSettingsDesc')}</p>
          </Link>
        )}

        {admin.role === 'superadmin' && (
          <Link to="/admin/audit-logs" className="dashboard-card">
            <div className="card-icon">📋</div>
            <h3>{t('adminDashboard.auditLogs')}</h3>
            <p>{t('adminDashboard.auditLogsDesc')}</p>
          </Link>
        )}

        {admin.role === 'superadmin' && (
          <Link to="/admin/backup" className="dashboard-card">
            <div className="card-icon">💾</div>
            <h3>{t('adminDashboard.backup')}</h3>
            <p>{t('adminDashboard.backupDesc')}</p>
          </Link>
        )}

        {admin.role === 'superadmin' && (
          <Link to="/admin/friend-links" className="dashboard-card" style={{ position: 'relative' }}>
            <div className="card-icon">🔗</div>
            <h3>{t('adminDashboard.friendLinks')}</h3>
            <p>{t('adminDashboard.friendLinksDesc')}</p>
            <Badge count={pendingCounts.friendLinks} />
          </Link>
        )}

        {admin.role === 'superadmin' && (
          <Link to="/admin/sessions" className="dashboard-card">
            <div className="card-icon">📱</div>
            <h3>{t('adminDashboard.deviceManagement')}</h3>
            <p>{t('adminDashboard.deviceManagementDesc')}</p>
          </Link>
        )}

        {admin.role === 'superadmin' && (
          <Link to="/admin/api-usage" className="dashboard-card">
            <div className="card-icon">📊</div>
            <h3>{t('adminDashboard.apiUsage')}</h3>
            <p>{t('adminDashboard.apiUsageDesc')}</p>
          </Link>
        )}

        {(admin.role === 'admin' || admin.role === 'superadmin') && (
          <Link to="/admin/analytics" className="dashboard-card">
            <div className="card-icon">📈</div>
            <h3>{t('adminDashboard.analytics')}</h3>
            <p>{t('adminDashboard.analyticsDesc')}</p>
          </Link>
        )}

        {(admin.role === 'admin' || admin.role === 'superadmin') && (
          <Link to="/admin/feedback" className="dashboard-card" style={{ position: 'relative' }}>
            <div className="card-icon">💬</div>
            <h3>{t('adminDashboard.feedback')}</h3>
            <p>{t('adminDashboard.feedbackDesc')}</p>
            <Badge count={pendingCounts.feedbacks} />
          </Link>
        )}

        {(admin.role === 'admin' || admin.role === 'superadmin') && (
          <Link to="/admin/review" className="dashboard-card" style={{ position: 'relative' }}>
            <div className="card-icon">✅</div>
            <h3>{t('adminDashboard.reviewManagement')}</h3>
            <p>{t('adminDashboard.reviewManagementDesc')}</p>
            <Badge count={pendingCounts.episodes} />
          </Link>
        )}

        {(admin.role === 'admin' || admin.role === 'superadmin') && (
          <Link to="/admin/reports" className="dashboard-card" style={{ position: 'relative' }}>
            <div className="card-icon">🚨</div>
            <h3>{t('adminDashboard.reportManagement')}</h3>
            <p>{t('adminDashboard.reportManagementDesc')}</p>
            <Badge count={pendingCounts.reports} />
          </Link>
        )}

        <Link to="/admin/change-password" className="dashboard-card">
          <div className="card-icon">🔐</div>
          <h3>{t('adminDashboard.changePassword')}</h3>
          <p>{t('adminDashboard.changePasswordDesc')}</p>
        </Link>
      </div>

      {admin.role === 'superadmin' && (
        <div style={{ marginTop: '24px', background: 'var(--card)', borderRadius: '12px', padding: '20px', border: '1px solid var(--border)' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', color: 'var(--foreground)' }}>{t('adminDashboard.autoStatusFlow')}</h3>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={async () => {
              try {
                const token = localStorage.getItem('adminToken');
                const res = await axios.post('/api/auto-status/auto-complete', {}, { headers: { Authorization: `Bearer ${token}` } });
                setStatusMsg(res.data.message);
              } catch (e) { setStatusMsg(t('adminDashboard.operationFailed')); }
              clearStatusMsg();
            }}>{t('adminDashboard.autoMarkCompleted')}</button>
            <button className="btn btn-secondary" onClick={async () => {
              try {
                const token = localStorage.getItem('adminToken');
                const res = await axios.post('/api/auto-status/check-premieres', {}, { headers: { Authorization: `Bearer ${token}` } });
                setStatusMsg(res.data.message);
              } catch (e) { setStatusMsg(t('adminDashboard.operationFailed')); }
              clearStatusMsg();
            }}>{t('adminDashboard.publishDuePremieres')}</button>
          </div>
          {statusMsg && <p style={{ marginTop: '8px', fontSize: '13px', color: 'var(--success-text)' }}>{statusMsg}</p>}
        </div>
      )}
    </>
  );
};

export default AdminDashboard;
