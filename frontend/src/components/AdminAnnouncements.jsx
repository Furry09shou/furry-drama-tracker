import React, { useState, useEffect } from 'react';
import adminApi from '../utils/adminApi';
import { useI18n } from '../contexts/I18nContext';

const emptyForm = {
  title: '', titleEn: '', content: '', contentEn: '',
  type: 'info',
  showPopup: false, showBanner: false, sendNotification: false, sendEmail: false,
  dismissible: true, active: true, pinned: false,
  publishAt: '', expireAt: '', link: ''
};

const typeIcon = { info: '📢', warning: '⚠️', maintenance: '🔧', update: '✨' };

const toLocalInput = (dateStr) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return '';
  }
};

const AdminAnnouncements = () => {
  const { t } = useI18n();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null=列表模式, {}=新建, announcement=编辑
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await adminApi.get('/api/announcements');
      setList(res.data || []);
    } catch (e) {
      setMessage(t('adminAnnouncements.loadFailed'));
    }
    setLoading(false);
  };

  useEffect(() => { fetchList(); }, []);

  const startCreate = () => {
    setForm({ ...emptyForm, publishAt: toLocalInput(new Date().toISOString()) });
    setEditing({});
    setMessage('');
  };

  const startEdit = (a) => {
    setForm({
      title: a.title || '', titleEn: a.titleEn || '',
      content: a.content || '', contentEn: a.contentEn || '',
      type: a.type || 'info',
      showPopup: !!a.showPopup, showBanner: !!a.showBanner,
      sendNotification: !!a.sendNotification, sendEmail: !!a.sendEmail,
      dismissible: a.dismissible !== false, active: a.active !== false, pinned: !!a.pinned,
      publishAt: toLocalInput(a.publishAt), expireAt: toLocalInput(a.expireAt), link: a.link || ''
    });
    setEditing(a);
    setMessage('');
  };

  const cancelEdit = () => { setEditing(null); setMessage(''); };

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      setMessage(t('adminAnnouncements.titleContentRequired'));
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      publishAt: form.publishAt ? new Date(form.publishAt).toISOString() : undefined,
      expireAt: form.expireAt ? new Date(form.expireAt).toISOString() : null
    };
    try {
      if (editing && editing._id) {
        await adminApi.put(`/api/announcements/${editing._id}`, payload);
      } else {
        await adminApi.post('/api/announcements', payload);
      }
      setMessage(t('adminAnnouncements.saveSuccess'));
      setEditing(null);
      fetchList();
    } catch (e) {
      setMessage(e.response?.data?.message || t('adminAnnouncements.saveFailed'));
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('adminAnnouncements.confirmDelete'))) return;
    try {
      await adminApi.delete(`/api/announcements/${id}`);
      fetchList();
    } catch (e) {
      setMessage(t('adminAnnouncements.deleteFailed'));
    }
  };

  const handleSendEmail = async (a) => {
    if (!window.confirm(t('adminAnnouncements.confirmSendEmail'))) return;
    try {
      const res = await adminApi.post(`/api/announcements/${a._id}/send-email`, {});
      setMessage(res.data.message || t('adminAnnouncements.sendSuccess'));
      fetchList();
    } catch (e) {
      setMessage(e.response?.data?.message || t('adminAnnouncements.sendFailed'));
    }
  };

  const handleSendNotification = async (a) => {
    if (!window.confirm(t('adminAnnouncements.confirmSendNotification'))) return;
    try {
      const res = await adminApi.post(`/api/announcements/${a._id}/send-notification`, {});
      setMessage(res.data.message || t('adminAnnouncements.sendSuccess'));
      fetchList();
    } catch (e) {
      setMessage(e.response?.data?.message || t('adminAnnouncements.sendFailed'));
    }
  };

  const setField = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  // ===== 编辑/新建表单 =====
  if (editing) {
    return (
      <div className="admin-panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <button onClick={cancelEdit} className="btn btn-secondary" style={{ padding: '6px 14px' }}>{t('adminAnnouncements.back')}</button>
          <h2 style={{ margin: 0 }}>{editing._id ? t('adminAnnouncements.editTitle') : t('adminAnnouncements.createTitle')}</h2>
        </div>

        <div className="form-container" style={{ maxWidth: '760px', margin: 0 }}>
          <div className="form-group">
            <label>{t('adminAnnouncements.title')} <span style={{ color: 'var(--destructive-text)' }}>*</span></label>
            <input type="text" value={form.title} onChange={(e) => setField('title', e.target.value)} placeholder={t('adminAnnouncements.titlePlaceholder')} />
          </div>
          <div className="form-group">
            <label>{t('adminAnnouncements.titleEn')}</label>
            <input type="text" value={form.titleEn} onChange={(e) => setField('titleEn', e.target.value)} placeholder={t('adminAnnouncements.titleEnPlaceholder')} />
          </div>
          <div className="form-group">
            <label>{t('adminAnnouncements.content')} <span style={{ color: 'var(--destructive-text)' }}>*</span></label>
            <textarea value={form.content} onChange={(e) => setField('content', e.target.value)} rows={6}
              placeholder={t('adminAnnouncements.contentPlaceholder')}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'var(--card)', color: 'var(--foreground)', border: '1px solid var(--border)', resize: 'vertical' }} />
          </div>
          <div className="form-group">
            <label>{t('adminAnnouncements.contentEn')}</label>
            <textarea value={form.contentEn} onChange={(e) => setField('contentEn', e.target.value)} rows={6}
              placeholder={t('adminAnnouncements.contentEnPlaceholder')}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'var(--card)', color: 'var(--foreground)', border: '1px solid var(--border)', resize: 'vertical' }} />
          </div>
          <div className="form-group">
            <label>{t('adminAnnouncements.type')}</label>
            <select value={form.type} onChange={(e) => setField('type', e.target.value)} style={{ padding: '8px', borderRadius: '8px', background: 'var(--card)', color: 'var(--foreground)', border: '1px solid var(--border)' }}>
              <option value="info">📢 {t('adminAnnouncements.typeInfo')}</option>
              <option value="warning">⚠️ {t('adminAnnouncements.typeWarning')}</option>
              <option value="maintenance">🔧 {t('adminAnnouncements.typeMaintenance')}</option>
              <option value="update">✨ {t('adminAnnouncements.typeUpdate')}</option>
            </select>
          </div>

          <div className="form-group">
            <label>{t('adminAnnouncements.channels')}</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '10px 12px', background: 'var(--hover-bg)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <input type="checkbox" checked={form.showPopup} onChange={(e) => setField('showPopup', e.target.checked)} />
                <span>🖥️ {t('adminAnnouncements.showPopup')}</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '10px 12px', background: 'var(--hover-bg)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <input type="checkbox" checked={form.showBanner} onChange={(e) => setField('showBanner', e.target.checked)} />
                <span>📊 {t('adminAnnouncements.showBanner')}</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '10px 12px', background: 'var(--hover-bg)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <input type="checkbox" checked={form.sendNotification} onChange={(e) => setField('sendNotification', e.target.checked)} />
                <span>🔔 {t('adminAnnouncements.sendNotification')}</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '10px 12px', background: 'var(--hover-bg)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <input type="checkbox" checked={form.sendEmail} onChange={(e) => setField('sendEmail', e.target.checked)} />
                <span>📧 {t('adminAnnouncements.sendEmail')}</span>
              </label>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: '6px 0 0 0' }}>{t('adminAnnouncements.channelsHint')}</p>
          </div>

          <div className="form-group">
            <label>{t('adminAnnouncements.options')}</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginTop: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.active} onChange={(e) => setField('active', e.target.checked)} />
                <span>{t('adminAnnouncements.active')}</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.pinned} onChange={(e) => setField('pinned', e.target.checked)} />
                <span>{t('adminAnnouncements.pinned')}</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.dismissible} onChange={(e) => setField('dismissible', e.target.checked)} />
                <span>{t('adminAnnouncements.dismissible')}</span>
              </label>
            </div>
          </div>

          <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label>{t('adminAnnouncements.publishAt')}</label>
              <input type="datetime-local" value={form.publishAt} onChange={(e) => setField('publishAt', e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '8px', background: 'var(--card)', color: 'var(--foreground)', border: '1px solid var(--border)' }} />
            </div>
            <div>
              <label>{t('adminAnnouncements.expireAt')}</label>
              <input type="datetime-local" value={form.expireAt} onChange={(e) => setField('expireAt', e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '8px', background: 'var(--card)', color: 'var(--foreground)', border: '1px solid var(--border)' }} />
            </div>
          </div>

          <div className="form-group">
            <label>{t('adminAnnouncements.link')}</label>
            <input type="text" value={form.link} onChange={(e) => setField('link', e.target.value)} placeholder="https://..." />
          </div>

          {message && (
            <div style={{
              padding: '10px 16px', borderRadius: '8px', marginBottom: '16px',
              background: message.includes(t('adminAnnouncements.successKeyword')) ? 'var(--success-bg)' : 'var(--destructive-bg)',
              color: message.includes(t('adminAnnouncements.successKeyword')) ? 'var(--success-text)' : 'var(--destructive-text)',
              border: `1px solid ${message.includes(t('adminAnnouncements.successKeyword')) ? 'var(--success-border)' : 'var(--destructive-border)'}`
            }}>{message}</div>
          )}

          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn" onClick={handleSave} disabled={saving}>
              {saving ? t('adminAnnouncements.saving') : t('adminAnnouncements.save')}
            </button>
            <button className="btn btn-secondary" onClick={cancelEdit}>{t('common.cancel')}</button>
          </div>
        </div>
      </div>
    );
  }

  // ===== 列表 =====
  return (
    <div className="admin-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ margin: 0 }}>{t('adminAnnouncements.title')}</h2>
        <button className="btn" onClick={startCreate}>+ {t('adminAnnouncements.create')}</button>
      </div>

      {message && (
        <div style={{
          padding: '10px 16px', borderRadius: '8px', marginBottom: '16px',
          background: message.includes(t('adminAnnouncements.successKeyword')) ? 'var(--success-bg)' : 'var(--destructive-bg)',
          color: message.includes(t('adminAnnouncements.successKeyword')) ? 'var(--success-text)' : 'var(--destructive-text)',
          border: `1px solid ${message.includes(t('adminAnnouncements.successKeyword')) ? 'var(--success-border)' : 'var(--destructive-border)'}`
        }}>{message}</div>
      )}

      {loading ? (
        <p style={{ color: 'var(--text-secondary)' }}>{t('common.loading')}</p>
      ) : list.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '40px' }}>{t('adminAnnouncements.noAnnouncements')}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {list.map(a => (
            <div key={a._id} style={{
              background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px',
              padding: '16px', opacity: a.active ? 1 : 0.6
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '8px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                    <span aria-hidden="true">{typeIcon[a.type] || '📢'}</span>
                    <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>{a.title}</span>
                    {a.pinned && <span style={{ fontSize: '11px', padding: '1px 6px', borderRadius: '4px', background: 'var(--primary-bg)', color: 'var(--primary-light)', border: '1px solid var(--primary-border)' }}>{t('adminAnnouncements.pinned')}</span>}
                    {!a.active && <span style={{ fontSize: '11px', padding: '1px 6px', borderRadius: '4px', background: 'var(--hover-bg)', color: 'var(--text-tertiary)', border: '1px solid var(--border)' }}>{t('adminAnnouncements.inactive')}</span>}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', fontSize: '11px' }}>
                    {a.showPopup && <span style={{ padding: '2px 8px', borderRadius: '4px', background: 'var(--hover-bg)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>🖥️ {t('adminAnnouncements.showPopup')}</span>}
                    {a.showBanner && <span style={{ padding: '2px 8px', borderRadius: '4px', background: 'var(--hover-bg)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>📊 {t('adminAnnouncements.showBanner')}</span>}
                    {a.sendNotification && <span style={{ padding: '2px 8px', borderRadius: '4px', background: a.notificationSent ? 'var(--success-bg)' : 'var(--hover-bg)', color: a.notificationSent ? 'var(--success-text)' : 'var(--text-secondary)', border: '1px solid var(--border)' }}>🔔 {a.notificationSent ? t('adminAnnouncements.sent') : t('adminAnnouncements.notSent')}</span>}
                    {a.sendEmail && <span style={{ padding: '2px 8px', borderRadius: '4px', background: a.emailSent ? 'var(--success-bg)' : 'var(--hover-bg)', color: a.emailSent ? 'var(--success-text)' : 'var(--text-secondary)', border: '1px solid var(--border)' }}>📧 {a.emailSent ? `${t('adminAnnouncements.sent')}(${a.emailSentCount || 0})` : t('adminAnnouncements.notSent')}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => startEdit(a)}>{t('common.edit')}</button>
                  <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => handleDelete(a._id)}>{t('common.delete')}</button>
                </div>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '8px' }}>
                {t('adminAnnouncements.publishAt')}: {a.publishAt ? new Date(a.publishAt).toLocaleString() : '-'}
                {a.expireAt && ` | ${t('adminAnnouncements.expireAt')}: ${new Date(a.expireAt).toLocaleString()}`}
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                {a.sendEmail && !a.emailSent && (
                  <button className="btn btn-secondary" style={{ padding: '4px 12px', fontSize: '12px' }} onClick={() => handleSendEmail(a)}>📧 {t('adminAnnouncements.sendEmailNow')}</button>
                )}
                {a.sendNotification && !a.notificationSent && (
                  <button className="btn btn-secondary" style={{ padding: '4px 12px', fontSize: '12px' }} onClick={() => handleSendNotification(a)}>🔔 {t('adminAnnouncements.sendNotificationNow')}</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminAnnouncements;
