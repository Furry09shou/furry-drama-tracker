import React, { useState } from 'react';
import axios from 'axios';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import PasswordToggle from './PasswordToggle';

const ResetPassword = () => {
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 8) {
      setError(t('auth.passwordHint'));
      return;
    }
    if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setError(t('auth.passwordMustContainLetterAndNumber'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('auth.passwordMismatch'));
      return;
    }
    setLoading(true);
    try {
      await axios.post('/api/auth/reset-password', { token, newPassword });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || t('auth.resetFailedLinkExpired'));
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h2>{t('auth.invalidLink')}</h2>
          <p style={{color: 'var(--text-secondary)'}}>{t('auth.resetLinkInvalidOrExpired')}</p>
          <Link to="/login" className="btn" style={{display: 'inline-block', marginTop: '16px'}}>{t('auth.backToLogin')}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        {success ? (
          <>
            <h2>{t('auth.passwordResetSuccess')}</h2>
            <p style={{color: 'var(--secondary)'}}>{t('auth.passwordResetRedirecting')}</p>
          </>
        ) : (
          <>
            <h2>{t('auth.resetPassword')}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>{t('auth.newPassword')}</label>
                <PasswordToggle value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  show={showNewPassword} onToggle={() => setShowNewPassword(!showNewPassword)}
                  required minLength={8} placeholder={t('auth.newPasswordPlaceholder')} />
              </div>
              <div className="form-group">
                <label>{t('auth.confirmNewPassword')}</label>
                <PasswordToggle value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  show={showConfirmPassword} onToggle={() => setShowConfirmPassword(!showConfirmPassword)}
                  required minLength={8} />
              </div>
              {error && <p style={{color: 'var(--destructive-text)', fontSize: '14px'}}>{error}</p>}
              <button type="submit" className="btn" disabled={loading} style={{width: '100%'}}>
                {loading ? t('common.processing') : t('auth.resetPassword')}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
