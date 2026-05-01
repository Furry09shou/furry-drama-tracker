﻿﻿﻿﻿﻿import React, { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate, useLocation } from 'react-router-dom';

const ChangePassword = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const isAdmin = location.pathname.includes('/admin');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword.length < 8) {
      setError('新密码长度至少8位，需包含字母和数字');
      return;
    }
    if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setError('新密码必须包含至少一个字母和一个数字');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('两次输入的新密码不一致');
      return;
    }

    if (currentPassword === newPassword) {
      setError('新密码不能与当前密码相同');
      return;
    }

    try {
      const tokenKey = isAdmin ? 'adminToken' : 'token';
      const token = localStorage.getItem(tokenKey);
      const endpoint = isAdmin ? '/api/auth/admin/change-password' : '/api/auth/change-password';

      await axios.put(endpoint, {
        currentPassword,
        newPassword
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSuccess('密码修改成功');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      setTimeout(() => {
        if (isAdmin) {
          navigate('/admin/dashboard');
        } else {
          navigate('/profile');
        }
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || '密码修改失败');
    }
  };

  return (
    <div className="auth-form" style={{maxWidth: '480px', margin: '0 auto'}}>
      <h2>修改密码</h2>
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message" style={{padding: '10px', background: 'var(--success-bg-strong)', border: '1px solid var(--success-border)', borderRadius: '6px', color: 'var(--success-text)'}}>{success}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>当前密码</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label>新密码</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={8}
          />
          <span style={{fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', display: 'block'}}>密码长度至少8位，需包含字母和数字</span>
        </div>
        <div className="form-group">
          <label>确认新密码</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
          />
        </div>
        <div className="form-group" style={{display: 'flex', gap: '10px'}}>
          <button type="submit">确认修改</button>
          <Link to={isAdmin ? '/admin/dashboard' : '/profile'}>
            <button type="button" className="btn btn-secondary">取消</button>
          </Link>
        </div>
      </form>
    </div>
  );
};

export default ChangePassword;
