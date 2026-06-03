import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import adminApi, { getAdminToken, getAdminData } from '../utils/adminApi';
import { useI18n } from '../contexts/I18nContext';

const AdminFeedback = () => {
  const { locale, t } = useI18n();
  const [admin, setAdmin] = useState(null);
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [replyText, setReplyText] = useState('');
  const [replyingId, setReplyingId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = getAdminToken();
    const adminData = getAdminData();
    if (token && adminData) {
      setAdmin(adminData);
    } else {
      navigate('/admin', { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    if (!admin) return;
    const params = new URLSearchParams({ page, limit: 20 });
    if (statusFilter) params.set('status', statusFilter);
    adminApi.get(`/api/feedback?${params}`)
      .then(res => { setList(res.data.list); setTotal(res.data.total); })
      .catch(() => {});
  }, [admin, page, statusFilter]);

  if (!admin) return null;

  const handleReply = async (id) => {
    await adminApi.put(`/api/feedback/${id}`, { status: 'replied', reply: replyText });
    setReplyingId(null);
    setReplyText('');
    setPage(page);
    const params = new URLSearchParams({ page, limit: 20 });
    if (statusFilter) params.set('status', statusFilter);
    const res = await adminApi.get(`/api/feedback?${params}`);
    setList(res.data.list);
  };

  const typeLabels = { suggestion: t('adminFeedback.typeSuggestion'), bug: t('adminFeedback.typeBug'), question: t('adminFeedback.typeQuestion'), other: t('adminFeedback.typeOther') };
  const statusLabels = { pending: t('adminFeedback.statusPending'), read: t('adminFeedback.statusRead'), replied: t('adminFeedback.statusReplied') };
  const statusColors = { pending: 'var(--warning-text)', read: 'var(--info-text)', replied: 'var(--success-text)' };
  const statusBgs = { pending: 'var(--warning-bg)', read: 'var(--info-bg)', replied: 'var(--success-bg)' };

  return (
    <div className="admin-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h2>{t('adminFeedback.title')}</h2>
        </div>
        <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{t('adminFeedback.totalCount', { total })}</span>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {['', 'pending', 'read', 'replied'].map(s => (
          <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }} style={{
            padding: '6px 14px', borderRadius: '16px', fontSize: '13px', cursor: 'pointer',
            border: statusFilter === s ? '1px solid var(--primary)' : '1px solid var(--border)',
            background: statusFilter === s ? 'var(--primary-bg)' : 'var(--hover-bg)',
            color: statusFilter === s ? 'var(--primary)' : 'var(--foreground)'
          }}>{s ? statusLabels[s] : t('adminFeedback.all')}</button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {list.map(fb => (
          <div key={fb._id} style={{ background: 'var(--card)', borderRadius: '10px', padding: '16px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--foreground)' }}>{fb.username}</span>
                <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'var(--primary-bg)', color: 'var(--primary-light)' }}>{typeLabels[fb.type]}</span>
                <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: statusBgs[fb.status], color: statusColors[fb.status] }}>{statusLabels[fb.status]}</span>
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{new Date(fb.createdAt).toLocaleString(locale)}</span>
            </div>
            <p style={{ margin: '0 0 8px 0', color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.6 }}>{fb.content}</p>
            {fb.reply && (
              <div style={{ background: 'var(--hover-bg)', borderRadius: '6px', padding: '10px', marginTop: '8px', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '12px', color: 'var(--primary)' }}>{t('adminFeedback.adminReply')}</span>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{fb.reply}</span>
              </div>
            )}
            {replyingId === fb._id ? (
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <input value={replyText} onChange={e => setReplyText(e.target.value)} placeholder={t('adminFeedback.replyPlaceholder')} style={{ flex: 1, padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--input)', color: 'var(--foreground)', fontSize: '13px' }} />
                <button className="btn" style={{ fontSize: '13px', padding: '6px 14px' }} onClick={() => handleReply(fb._id)}>{t('adminFeedback.send')}</button>
                <button className="btn btn-secondary" style={{ fontSize: '13px', padding: '6px 14px' }} onClick={() => setReplyingId(null)}>{t('adminFeedback.cancel')}</button>
              </div>
            ) : (
              <button className="btn btn-secondary" style={{ fontSize: '12px', padding: '4px 12px', marginTop: '4px' }} onClick={() => { setReplyingId(fb._id); setReplyText(''); }}>{t('adminFeedback.reply')}</button>
            )}
          </div>
        ))}
        {list.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '40px' }}>{t('adminFeedback.noFeedback')}</p>}
      </div>
    </div>
  );
};

export default AdminFeedback;
