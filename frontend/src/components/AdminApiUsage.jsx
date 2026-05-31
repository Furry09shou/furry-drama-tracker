import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useI18n } from '../contexts/I18nContext';

const AdminApiUsage = () => {
  const { t } = useI18n();
  const [admin, setAdmin] = useState(null);
  const [data, setData] = useState({ dailyTotals: {}, topEndpoints: [] });
  const [days, setDays] = useState(7);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    const adminData = localStorage.getItem('adminData');
    if (token && adminData) {
      const parsed = JSON.parse(adminData);
      setAdmin(parsed);
      if (parsed.role !== 'superadmin') navigate('/admin/dashboard', { replace: true });
    } else {
      navigate('/admin', { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    if (!admin) return;
    const token = localStorage.getItem('adminToken');
    axios.get(`/api/rss/api-usage?days=${days}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setData(res.data))
      .catch(() => {});
  }, [admin, days]);

  if (!admin) return null;

  const dailyEntries = Object.entries(data.dailyTotals || {}).sort((a, b) => a[0].localeCompare(b[0]));
  const maxDaily = Math.max(...dailyEntries.map(e => e[1]), 1);

  return (
    <div className="admin-panel">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <h2>{t('adminApiUsage.title')}</h2>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {[7, 14, 30].map(d => (
          <button key={d} onClick={() => setDays(d)} style={{
            padding: '6px 14px', borderRadius: '16px', fontSize: '13px', cursor: 'pointer',
            border: days === d ? '1px solid var(--primary)' : '1px solid var(--border)',
            background: days === d ? 'var(--primary-bg)' : 'var(--hover-bg)',
            color: days === d ? 'var(--primary)' : 'var(--foreground)'
          }}>{t('adminApiUsage.recentDays', { d })}</button>
        ))}
      </div>

      <div style={{ background: 'var(--card)', borderRadius: '12px', padding: '20px', border: '1px solid var(--border)', marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', color: 'var(--foreground)' }}>{t('adminApiUsage.dailyRequests')}</h3>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '120px' }}>
          {dailyEntries.map(([date, count]) => (
            <div key={date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '100%', background: 'var(--btn-gradient)', borderRadius: '4px 4px 0 0', height: `${(count / maxDaily) * 100}px`, minHeight: '2px', transition: 'height 0.3s' }} title={t('adminApiUsage.requestCount', { count })} />
              <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', writingMode: dailyEntries.length > 14 ? 'vertical-rl' : 'horizontal-tb' }}>{date.slice(5)}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: 'var(--card)', borderRadius: '12px', padding: '20px', border: '1px solid var(--border)' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', color: 'var(--foreground)' }}>{t('adminApiUsage.topEndpoints')}</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {(data.topEndpoints || []).map(([endpoint, count], i) => (
            <div key={endpoint} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', width: '24px', textAlign: 'right' }}>{i + 1}</span>
              <span style={{ fontSize: '13px', color: 'var(--foreground)', flex: 1, fontFamily: 'monospace' }}>{endpoint}</span>
              <span style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: 600 }}>{count.toLocaleString()}</span>
            </div>
          ))}
          {(data.topEndpoints || []).length === 0 && <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>{t('adminApiUsage.noData')}</p>}
        </div>
      </div>
    </div>
  );
};

export default AdminApiUsage;
