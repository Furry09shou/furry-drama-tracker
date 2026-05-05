import React, { useState } from 'react';
import axios from 'axios';

const FeedbackModal = ({ show, onClose, user }) => {
  const [type, setType] = useState('suggestion');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');

  if (!show) return null;

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/feedback', { type, content }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMsg(res.data.message);
      setContent('');
      setTimeout(() => { setMsg(''); onClose(); }, 1500);
    } catch (e) {
      setMsg(e.response?.data?.message || '提交失败');
    }
    setSubmitting(false);
  };

  const types = [
    { value: 'suggestion', label: '💡 建议', desc: '功能建议或改进意见' },
    { value: 'bug', label: '🐛 Bug', desc: '报告问题或错误' },
    { value: 'question', label: '❓ 问题', desc: '使用疑问或咨询' },
    { value: 'other', label: '📝 其他', desc: '其他反馈' }
  ];

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'var(--overlay-bg)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={onClose}>
      <div style={{ background: 'var(--card)', borderRadius: '16px', maxWidth: '480px', width: '100%', border: '1px solid var(--border)', boxShadow: '0 25px 50px var(--shadow-strong)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ margin: 0, color: 'var(--foreground)' }}>💬 用户反馈</h3>
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
          <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="请输入您的反馈内容..." rows={5} style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'var(--input)', color: 'var(--foreground)', border: '1px solid var(--border)', fontSize: '14px', lineHeight: 1.6, resize: 'vertical', boxSizing: 'border-box' }} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
            <button className="btn btn-secondary" onClick={onClose}>取消</button>
            <button className="btn" onClick={handleSubmit} disabled={!content.trim() || submitting}>{submitting ? '提交中...' : '提交反馈'}</button>
          </div>
          {msg && <p style={{ marginTop: '8px', fontSize: '13px', color: msg.includes('感谢') ? 'var(--success-text)' : 'var(--destructive-text)', textAlign: 'center' }}>{msg}</p>}
        </div>
      </div>
    </div>
  );
};

export default FeedbackModal;
