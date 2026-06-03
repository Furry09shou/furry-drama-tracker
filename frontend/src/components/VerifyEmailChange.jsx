import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import axios from 'axios';

const VerifyEmailChange = () => {
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('');
  const [newEmail, setNewEmail] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMessage('缺少验证令牌');
      return;
    }

    axios.post('/api/auth/verify-email-change', { token })
      .then(res => {
        setStatus('success');
        setMessage(res.data.message);
        setNewEmail(res.data.email || '');
      })
      .catch(err => {
        setStatus('error');
        setMessage(err.response?.data?.message || '验证失败');
      });
  }, [searchParams]);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '60vh', padding: '24px'
    }}>
      {status === 'verifying' && (
        <>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
          <h2 style={{ color: 'var(--foreground)' }}>正在验证邮箱变更...</h2>
        </>
      )}
      {status === 'success' && (
        <>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
          <h2 style={{ color: 'var(--success-text)' }}>邮箱修改成功</h2>
          {newEmail && <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
            新邮箱：{newEmail}
          </p>}
          <button
            onClick={() => navigate('/profile', { replace: true })}
            style={{
              marginTop: '24px', padding: '10px 32px', borderRadius: '8px',
              background: 'var(--btn-gradient)', color: 'var(--btn-text)',
              border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 500
            }}
          >
            返回个人资料
          </button>
        </>
      )}
      {status === 'error' && (
        <>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
          <h2 style={{ color: 'var(--destructive-text)' }}>验证失败</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>{message}</p>
          <button
            onClick={() => navigate('/profile', { replace: true })}
            style={{
              marginTop: '24px', padding: '10px 32px', borderRadius: '8px',
              background: 'var(--btn-gradient)', color: 'var(--btn-text)',
              border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 500
            }}
          >
            返回个人资料
          </button>
        </>
      )}
    </div>
  );
};

export default VerifyEmailChange;
