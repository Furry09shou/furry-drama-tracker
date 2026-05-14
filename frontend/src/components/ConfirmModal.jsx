import React, { useState } from 'react';
import axios from 'axios';

const typeStyles = {
  danger: {
    icon: '⚠️',
    titleColor: 'var(--destructive-text)',
    confirmBg: 'var(--destructive-bg)',
    confirmBorder: 'var(--destructive-border)',
    confirmColor: 'var(--destructive-text)',
  },
  warning: {
    icon: '⚡',
    titleColor: 'var(--warning-text)',
    confirmBg: 'var(--warning-bg)',
    confirmBorder: 'var(--warning-border)',
    confirmColor: 'var(--warning-text)',
  },
  info: {
    icon: 'ℹ️',
    titleColor: 'var(--primary)',
    confirmBg: 'var(--primary-bg)',
    confirmBorder: 'var(--primary-border)',
    confirmColor: 'var(--primary)',
  },
};

const ConfirmModal = ({ show, onClose, onConfirm, title, message, confirmText, cancelText, type, requirePassword }) => {
  const [password, setPassword] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');

  if (!show) return null;

  const style = typeStyles[type] || typeStyles.danger;

  const handleConfirm = async () => {
    if (requirePassword) {
      setVerifying(true);
      setError('');
      try {
        const token = localStorage.getItem('adminToken');
        await axios.post('/api/admin/verify-password', { password }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        onConfirm();
        setPassword('');
        onClose();
      } catch (e) {
        setError(e.response?.data?.message || '验证失败');
      }
      setVerifying(false);
    } else {
      onConfirm();
      onClose();
    }
  };

  const handleClose = () => {
    setPassword('');
    setError('');
    onClose();
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'var(--overlay-bg)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: 'var(--card)', borderRadius: '16px', maxWidth: '400px', width: '100%', border: '1px solid var(--border)', boxShadow: '0 25px 50px var(--shadow-strong)' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ margin: 0, color: style.titleColor }}>{title || `${style.icon} 确认操作`}</h3>
        </div>
        <div style={{ padding: '20px 24px' }}>
          <p style={{ margin: '0 0 16px 0', color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.6 }}>{message || '此操作不可撤销，确定要继续吗？'}</p>
          {requirePassword && (
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="请输入管理员密码" style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--input)', color: 'var(--foreground)', fontSize: '14px', boxSizing: 'border-box' }} onKeyDown={e => { if (e.key === 'Enter') handleConfirm(); }} />
          )}
          {error && <p style={{ margin: '8px 0 0', color: 'var(--destructive-text)', fontSize: '13px' }}>{error}</p>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
            <button className="btn btn-secondary" onClick={handleClose}>{cancelText || '取消'}</button>
            <button className="btn" style={{ background: style.confirmBg, borderColor: style.confirmBorder, color: style.confirmColor }} onClick={handleConfirm} disabled={requirePassword && (!password || verifying)}>{verifying ? '验证中...' : (confirmText || '确认')}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
