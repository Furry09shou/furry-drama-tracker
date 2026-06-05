import React, { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import { useAuth } from '../contexts/AuthContext';
import PasswordToggle from './PasswordToggle';
import API from '../utils/apiEndpoints';

const ChangeEmail = ({ user }) => {
  const { t } = useI18n();
  const { getAuthHeaders } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!password || !newEmail) {
      setError(t('common.requiredFields') || '请填写所有必填项');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      setError(t('auth.invalidEmail') || '邮箱格式不正确');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(API.AUTH.REQUEST_EMAIL_CHANGE, {
        password,
        newEmail
      }, { headers: getAuthHeaders() });
      setSuccess(res.data.message);
    } catch (err) {
      setError(err.response?.data?.message || t('common.operationFailed') || '请求失败');
    }
    setLoading(false);
  };

  return (
    <div className="auth-form" style={{maxWidth: '480px', margin: '0 auto'}}>
      <h2>{t('auth.changeEmail') || '修改邮箱'}</h2>
      {user?.email && (
        <p style={{color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '16px'}}>
          {t('profile.currentEmail') || '当前邮箱'}：{user.email}
        </p>
      )}
      {error && <div className="error-message">{error}</div>}
      {success ? (
        <div className="success-message" style={{padding: '10px', background: 'var(--success-bg-strong)', border: '1px solid var(--success-border)', borderRadius: '6px', color: 'var(--success-text)'}}>
          <div style={{textAlign: 'center', padding: '8px 0'}}>
            <div style={{fontSize: '32px', marginBottom: '8px'}}>📧</div>
            <p>{success}</p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{t('auth.currentPassword') || '当前密码'}</label>
            <PasswordToggle
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              show={showPassword}
              onToggle={() => setShowPassword(!showPassword)}
              placeholder={t('auth.enterCurrentPassword') || '请输入当前密码'}
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>{t('auth.newEmail') || '新邮箱'}</label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder={t('auth.enterNewEmail') || '请输入新邮箱地址'}
              required
            />
          </div>
          <div className="form-group" style={{display: 'flex', gap: '10px'}}>
            <button type="submit" disabled={loading || !password || !newEmail}>
              {loading ? (t('common.sending') || '发送中...') : (t('auth.sendVerificationEmail') || '发送验证邮件')}
            </button>
            <Link to="/profile">
              <button type="button" className="btn btn-secondary">{t('common.cancel') || '取消'}</button>
            </Link>
          </div>
        </form>
      )}
    </div>
  );
};

export default ChangeEmail;
