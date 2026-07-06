import React, { useState, useEffect } from 'react';
import adminApi from '../utils/adminApi';
import { useOutletContext } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';

const AdminReports = () => {
  const { locale, t } = useI18n();
  const { admin } = useOutletContext();
  const [reports, setReports] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [resolveNote, setResolveNote] = useState('');

  useEffect(() => {
    fetchReports();
  }, [statusFilter, page]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await adminApi.get('/api/reports/list', {
        params: { status: statusFilter, page, limit: 10 }
      });
      setReports(res.data.reports);
      setTotal(res.data.total);
    } catch (err) {
      console.error('Fetch reports error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (id, status) => {
    try {
      await adminApi.put(`/api/reports/resolve/${id}`, {
        status, resolveNote
      });
      setResolveNote('');
      fetchReports();
    } catch (err) {
      console.error('Resolve report error:', err);
    }
  };

  const reasonLabels = {
    inappropriate: t('adminReports.reasonInappropriate'),
    copyright: t('adminReports.reasonCopyright'),
    spam: t('adminReports.reasonSpam'),
    misleading: t('adminReports.reasonMisleading'),
    other: t('adminReports.reasonOther')
  };
  const statusLabels = {
    pending: { text: t('adminReports.statusPending'), color: 'var(--warning-text)' },
    resolved: { text: t('adminReports.statusResolved'), color: 'var(--secondary)' },
    dismissed: { text: t('adminReports.statusDismissed'), color: 'var(--text-tertiary)' }
  };

  const totalPages = Math.ceil(total / 10);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <h2 style={{ margin: 0 }}>{t('adminReports.title')}</h2>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {['pending', 'resolved', 'dismissed', ''].map(s => (
          <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
            className={statusFilter === s ? 'btn' : 'btn btn-secondary'}
            style={{ fontSize: '14px' }}>
            {s === '' ? t('adminReports.all') : statusLabels[s].text}
            {s === 'pending' && ` (${total})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>{t('adminReports.loading')}</div>
      ) : reports.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>{t('adminReports.noReports')}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {reports.map(r => (
            <div key={r._id} style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: '12px', padding: '20px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: '6px', fontSize: '12px',
                      background: `${statusLabels[r.status].color}20`, color: statusLabels[r.status].color,
                      fontWeight: 600
                    }}>{statusLabels[r.status].text}</span>
                    <span style={{
                      padding: '2px 8px', borderRadius: '6px', fontSize: '12px',
                      background: 'var(--primary-bg)', color: 'var(--primary)', fontWeight: 600
                    }}>{reasonLabels[r.reason]}</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                      {r.targetType === 'episode' ? t('adminReports.episode') : t('adminReports.creator')}
                    </span>
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                    {t('adminReports.reporter')}{r.reporterId?.username || t('adminReports.unknown')}
                    {r.reporterId?.email && ` (${r.reporterId.email})`}
                  </div>
                  {r.description && (
                    <div style={{ fontSize: '14px', color: 'var(--foreground)', marginTop: '8px' }}>
                      {r.description}
                    </div>
                  )}
                  <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '8px' }}>
                    {new Date(r.createdAt).toLocaleString(locale)}
                  </div>
                </div>
                {r.status === 'pending' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                    <input value={resolveNote} onChange={e => setResolveNote(e.target.value)}
                      placeholder={t('adminReports.resolveNotePlaceholder')} style={{
                        padding: '8px 12px', borderRadius: '6px', fontSize: '13px',
                        background: 'var(--hover-bg-strong)', border: '1px solid var(--border)',
                        color: 'var(--foreground)', width: '100%'
                      }} />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => handleResolve(r._id, 'resolved')}
                        className="btn" style={{ fontSize: '13px', padding: '6px 12px', background: 'var(--secondary)' }}>
                        {t('adminReports.resolve')}
                      </button>
                      <button onClick={() => handleResolve(r._id, 'dismissed')}
                        className="btn btn-secondary" style={{ fontSize: '13px', padding: '6px 12px' }}>
                        {t('adminReports.dismiss')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '20px' }}>
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
            className="btn btn-secondary" style={{ fontSize: '13px' }}>{t('adminReports.prevPage')}</button>
          <span style={{ color: 'var(--text-secondary)', lineHeight: '36px', fontSize: '14px' }}>
            {page} / {totalPages}
          </span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
            className="btn btn-secondary" style={{ fontSize: '13px' }}>{t('adminReports.nextPage')}</button>
        </div>
      )}
    </div>
  );
};

export default AdminReports;
