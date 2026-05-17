import React, { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';

const ChangePassword = () => {
  const { t } = useI18n();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
      setError(t('auth.passwordMinLength'));
      return;
    }
    if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setError(t('auth.passwordMustContainLetterAndNumber'));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t('auth.newPasswordMismatch'));
      return;
    }

    if (currentPassword === newPassword) {
      setError(t('auth.newPasswordSameAsCurrent'));
      return;
    }

    try {
      const tokenKey = isAdmin ? 'adminToken' : 'token';
      const token = localStorage.getItem(tokenKey);
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const endpoint = isAdmin ? '/api/auth/admin/change-password' : '/api/auth/change-password';

      await axios.put(endpoint, {
        currentPassword,
        newPassword
      }, {
        headers
      });

      setSuccess(t('auth.passwordChangeSuccess'));
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
      setError(err.response?.data?.message || t('auth.passwordChangeFailed'));
    }
  };

  const PasswordToggle = ({ show, onToggle }) => (
    <button type="button" onClick={onToggle} style={{
      position: 'absolute', right: '10px', top: 0, bottom: 0,
      background: 'none', border: 'none', cursor: 'pointer',
      color: 'var(--text-secondary)', padding: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      width: '24px', height: '24px', margin: 'auto',
    }}>
      {show ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
      )}
    </button>
  );

  return (
    <div className="auth-form" style={{maxWidth: '480px', margin: '0 auto'}}>
      <h2>{t('auth.changePassword')}</h2>
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message" style={{padding: '10px', background: 'var(--success-bg-strong)', border: '1px solid var(--success-border)', borderRadius: '6px', color: 'var(--success-text)'}}>{success}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>{t('auth.currentPassword')}</label>
          <div style={{position: 'relative'}}>
            <input
              type={showCurrentPassword ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              style={{paddingRight: '40px'}}
            />
            <PasswordToggle show={showCurrentPassword} onToggle={() => setShowCurrentPassword(!showCurrentPassword)} />
          </div>
        </div>
        <div className="form-group">
          <label>{t('auth.newPassword')}</label>
          <div style={{position: 'relative'}}>
            <input
              type={showNewPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              style={{paddingRight: '40px'}}
            />
            <PasswordToggle show={showNewPassword} onToggle={() => setShowNewPassword(!showNewPassword)} />
          </div>
          <span style={{fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', display: 'block'}}>{t('auth.passwordHint')}</span>
        </div>
        <div className="form-group">
          <label>{t('auth.confirmNewPassword')}</label>
          <div style={{position: 'relative'}}>
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              style={{paddingRight: '40px'}}
            />
            <PasswordToggle show={showConfirmPassword} onToggle={() => setShowConfirmPassword(!showConfirmPassword)} />
          </div>
        </div>
        <div className="form-group" style={{display: 'flex', gap: '10px'}}>
          <button type="submit">{t('auth.confirmChange')}</button>
          <Link to={isAdmin ? '/admin/dashboard' : '/profile'}>
            <button type="button" className="btn btn-secondary">{t('common.cancel')}</button>
          </Link>
        </div>
      </form>
    </div>
  );
};

export default ChangePassword;
