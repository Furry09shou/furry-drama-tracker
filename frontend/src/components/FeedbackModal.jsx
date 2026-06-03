import React, { useState } from 'react';
import axios from 'axios';
import { useI18n } from '../contexts/I18nContext';

const FeedbackModal = ({ show, onClose, user }) => {
  const { t } = useI18n();
  const [type, setType] = useState('suggestion');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgIsSuccess, setMsgIsSuccess] = useState(false);

  if (!show) return null;

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      const res = await axios.post('/api/feedback', { type, content });
      setMsg(res.data.message);
      setMsgIsSuccess(true);
      setContent('');
      setTimeout(() => { setMsg(''); onClose(); }, 1500);
    } catch (e) {
      setMsg(e.response?.data?.message || t('feedback.submitFailed'));
      setMsgIsSuccess(false);
    }
    setSubmitting(false);
  };

  const types = [
    { value: 'suggestion', label: t('feedback.suggestion'), desc: t('feedback.suggestionDesc') },
    { value: 'bug', label: t('feedback.bug'), desc: t('feedback.bugDesc') },
    { value: 'question', label: t('feedback.question'), desc: t('feedback.questionDesc') },
    { value: 'other', label: t('feedback.other'), desc: t('feedback.otherDesc') }
  ];

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'var(--overlay-bg)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={onClose}>
      <div style={{ background: 'var(--card)', borderRadius: '16px', maxWidth: '480px', width: '100%', border: '1px solid var(--border)', boxShadow: '0 25px 50px var(--shadow-strong)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ margin: 0, color: 'var(--foreground)' }}>{t('feedback.title')}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--foreground)', fontSize: '20px', cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
            {types.map(t => (
              <button key={t.value} onClick={() => setType(t.value)} style={{
                padding: '8px 14px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer',
                border: type === t.value ? '1px solid var(--primary)' : '1px solid var(--border)',
                background: type === t.value ? 'var(--primary-bg)' : 'var(--hover-bg)',
                color: type === t.value ? 'var(--primary)' : 'var(--foreground)'
              }} title={t.desc}>{t.label}</button>
            ))}
          </div>
          <textarea value={content} onChange={e => setContent(e.target.value)} placeholder={t('feedback.placeholder')} rows={5} style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'var(--input)', color: 'var(--foreground)', border: '1px solid var(--border)', fontSize: '14px', lineHeight: 1.6, resize: 'vertical', boxSizing: 'border-box' }} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
            <button className="btn btn-secondary" onClick={onClose}>{t('common.cancel')}</button>
            <button className="btn" onClick={handleSubmit} disabled={!content.trim() || submitting}>{submitting ? t('common.processing') : t('feedback.submit')}</button>
          </div>
          {msg && <p style={{ marginTop: '8px', fontSize: '13px', color: msgIsSuccess ? 'var(--success-text)' : 'var(--destructive-text)', textAlign: 'center' }}>{msg}</p>}
        </div>
      </div>
    </div>
  );
};

export default FeedbackModal;
