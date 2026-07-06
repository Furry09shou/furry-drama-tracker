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
      setError(t('common.requiredFields'));
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      setError(t('auth.invalidEmail'));
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
      setError(err.response?.data?.message || t('common.operationFailed'));
    }
    setLoading(false);
  };

  return (
    <div className="auth-form" style={{maxWidth: '480px', margin: '0 auto'}}>
      <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px'}}>
        <button
          onClick={() => navigate('/account-security')}
          style={{
            background: 'var(--hover-bg)', border: '1px solid var(--border)',
            borderRadius: '8px', padding: '6px 10px', cursor: 'pointer',
            color: 'var(--foreground)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '4px'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
          {t('common.back')}
        </button>
        <h2 style={{margin: 0}}>{t('auth.changeEmail')}</h2>
      </div>
      {user?.email && (
        <p style={{color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '16px'}}>
          {t('profile.currentEmail')}：{user.email}
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
            <label>{t('auth.currentPassword')}</label>
            <PasswordToggle
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              show={showPassword}
              onToggle={() => setShowPassword(!showPassword)}
              placeholder={t('auth.enterCurrentPassword')}
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>{t('auth.newEmail')}</label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder={t('auth.enterNewEmail')}
              required
            />
          </div>
          <div className="form-group" style={{display: 'flex', gap: '10px'}}>
            <button type="submit" disabled={loading || !password || !newEmail}>
              {loading ? t('common.sending') : t('auth.sendVerificationEmail')}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default ChangeEmail;
