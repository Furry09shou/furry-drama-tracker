﻿﻿﻿﻿import React, { useState } from 'react';
import axios from 'axios';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 8) {
      setError('密码长度至少8位，需包含字母和数字');
      return;
    }
    if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setError('密码必须包含至少一个字母和一个数字');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }
    setLoading(true);
    try {
      await axios.post('/api/auth/reset-password', { token, newPassword });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || '重置失败，链接可能已过期');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h2>链接无效</h2>
          <p style={{color: 'var(--text-secondary)'}}>密码重置链接无效或已过期。</p>
          <Link to="/login" className="btn" style={{display: 'inline-block', marginTop: '16px'}}>返回登录</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        {success ? (
          <>
            <h2>✅ 密码重置成功</h2>
            <p style={{color: 'var(--secondary)'}}>密码已重置，正在跳转到登录页面...</p>
          </>
        ) : (
          <>
            <h2>重置密码</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>新密码</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  required minLength={8} placeholder="至少8位，含字母和数字" />
              </div>
              <div className="form-group">
                <label>确认新密码</label>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  required minLength={8} />
              </div>
              {error && <p style={{color: 'var(--destructive-text)', fontSize: '14px'}}>{error}</p>}
              <button type="submit" className="btn" disabled={loading} style={{width: '100%'}}>
                {loading ? '提交中...' : '重置密码'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
