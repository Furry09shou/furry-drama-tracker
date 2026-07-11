import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import PasswordToggle from './PasswordToggle';
import API from '../utils/apiEndpoints';

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
      await axios.put(API.AUTH.CHANGE_PASSWORD, {
        currentPassword,
        newPassword
      });

      setSuccess(t('auth.passwordChangeSuccess'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      setTimeout(() => {
        navigate('/account-security');
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || t('auth.passwordChangeFailed'));
    }
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
        <h2 style={{margin: 0}}>{t('auth.changePassword')}</h2>
      </div>
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message" style={{padding: '10px', background: 'var(--success-bg-strong)', border: '1px solid var(--success-border)', borderRadius: '6px', color: 'var(--success-text)'}}>{success}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="current-password">{t('auth.currentPassword')}</label>
          <PasswordToggle
            id="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            show={showCurrentPassword}
            onToggle={() => setShowCurrentPassword(!showCurrentPassword)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="new-password">{t('auth.newPassword')}</label>
          <PasswordToggle
            id="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            show={showNewPassword}
            onToggle={() => setShowNewPassword(!showNewPassword)}
            required
            minLength={8}
          />
          <span style={{fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', display: 'block'}}>{t('auth.passwordHint')}</span>
        </div>
        <div className="form-group">
          <label htmlFor="confirm-password">{t('auth.confirmNewPassword')}</label>
          <PasswordToggle
            id="confirm-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            show={showConfirmPassword}
            onToggle={() => setShowConfirmPassword(!showConfirmPassword)}
            required
            minLength={8}
          />
        </div>
        <div className="form-group" style={{display: 'flex', gap: '10px'}}>
          <button type="submit">{t('auth.confirmChange')}</button>
        </div>
      </form>
    </div>
  );
};

export default ChangePassword;
