import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { useI18n } from '../contexts/I18nContext';

const ReportModal = ({ show, onClose, targetType, targetId, targetName }) => {
  const { t } = useI18n();
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const reasons = [
    { value: 'inappropriate', label: t('report.inappropriate') },
    { value: 'copyright', label: t('report.copyright') },
    { value: 'spam', label: t('report.spam') },
    { value: 'misleading', label: t('report.misleading') },
    { value: 'other', label: t('report.other') }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason) {
      setError(t('report.selectReason'));
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await axios.post('/api/reports', {
        targetType, targetId, reason, description
      }, { headers });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setReason('');
        setDescription('');
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || t('report.submitFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!show) return null;

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, background: 'var(--overlay-bg-subtle)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 10000, backdropFilter: 'blur(4px)'
    }} onClick={onClose}>
      <div style={{
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: '16px', padding: '28px', width: 'min(440px, calc(100vw - 40px))',
        maxHeight: '80vh', overflow: 'auto'
      }} onClick={e => e.stopPropagation()}>
        {success ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
            <p style={{ color: 'var(--secondary)', fontSize: '16px', fontWeight: 600 }}>{t('report.submitted')}</p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '8px' }}>{t('report.willProcess')}</p>
          </div>
        ) : (
          <>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '18px' }}>{t('report.title').replace('{targetName}', targetName)}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>{t('report.reasonLabel')}</label>
                <select value={reason} onChange={e => setReason(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: '8px',
                    background: 'var(--hover-bg-strong)', border: '1px solid var(--border)',
                    color: 'var(--foreground)', fontSize: '14px'
                  }}>
                  <option value="">{t('report.selectReasonPlaceholder')}</option>
                  {reasons.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>{t('report.descriptionLabel')}</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)}
                  rows={3} placeholder={t('report.descriptionPlaceholder')}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: '8px',
                    background: 'var(--hover-bg-strong)', border: '1px solid var(--border)',
                    color: 'var(--foreground)', fontSize: '14px', resize: 'vertical'
                  }} />
              </div>
              {error && <p style={{ color: 'var(--destructive-text)', fontSize: '14px', marginBottom: '12px' }}>{error}</p>}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={onClose} className="btn btn-secondary">{t('common.cancel')}</button>
                <button type="submit" disabled={submitting} className="btn" style={{
                  background: 'var(--destructive)', opacity: submitting ? 0.7 : 1
                }}>{submitting ? t('common.processing') : t('report.submit')}</button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>,
    document.body
  );
};

export default ReportModal;
