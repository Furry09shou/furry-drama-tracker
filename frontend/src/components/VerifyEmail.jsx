import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMsg, setResendMsg] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMessage('无效的验证链接，缺少验证令牌');
      return;
    }
    const verifyEmail = async () => {
      try {
        const res = await axios.post('/api/auth/verify-email', { token });
        setStatus('success');
        setMessage(res.data.message);
      } catch (err) {
        setStatus('error');
        setMessage(err.response?.data?.message || '验证失败');
      }
    };
    verifyEmail();
  }, [searchParams]);

  const handleResend = async () => {
    setResendLoading(true);
    setResendMsg('');
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const res = await axios.post('/api/auth/resend-verification', {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setResendMsg(res.data.message);
      } else {
        setResendMsg('请登录后在个人中心重新发送验证邮件，或在登录页面尝试登录时自动重发');
      }
    } catch (err) {
      setResendMsg(err.response?.data?.message || '发送失败');
    }
    setResendLoading(false);
  };

  return (
    <div className="auth-form" style={{ textAlign: 'center' }}>
      {status === 'verifying' && (
        <>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
          <h2>邮箱验证中</h2>
          <p style={{ color: 'var(--text-secondary)' }}>正在验证您的邮箱地址，请稍候...</p>
        </>
      )}
      {status === 'success' && (
        <>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
          <h2 style={{ color: 'var(--success-text)' }}>验证成功</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>{message}</p>
          <button className="btn" onClick={() => navigate('/login')} style={{ marginRight: '8px' }}>
            前往登录
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/')}>
            返回首页
          </button>
        </>
      )}
      {status === 'error' && (
        <>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
          <h2 style={{ color: 'var(--destructive-text)' }}>验证失败</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>{message}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
            <button
              className="btn"
              onClick={handleResend}
              disabled={resendLoading}
            >
              {resendLoading ? '发送中...' : '重新发送验证邮件'}
            </button>
            {resendMsg && (
              <p style={{
                fontSize: '13px',
                color: resendMsg.includes('已发送') ? 'var(--success-text)' : 'var(--destructive-text)',
                margin: 0
              }}>{resendMsg}</p>
            )}
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <Link to="/login" className="btn btn-secondary">前往登录</Link>
              <Link to="/" className="btn btn-secondary">返回首页</Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default VerifyEmail;
