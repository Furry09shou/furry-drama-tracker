import React, { useState } from 'react';
import axios from 'axios';
import { useI18n } from '../contexts/I18nContext';
import API from '../utils/apiEndpoints';

const ForceEmailChange = ({ onUpdate, onLogout }) => {
  const { t } = useI18n();
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      setError(t('auth.invalidEmail'));
      return;
    }
    if (!password) {
      setError(t('auth.passwordRequired'));
      return;
    }
    setLoading(true);
    try {
      const res = await axios.put(API.AUTH.CHANGE_EMAIL, { newEmail, password });
      setSuccess(true);
      onUpdate({
        email: res.data.email,
        isEmailVerified: false,
        forceEmailChange: false,
      });
    } catch (err) {
      setError(err.response?.data?.message || t('auth.changeEmailFailed'));
    }
    setLoading(false);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)', zIndex: 10000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
    }}>
      <div style={{
        background: 'var(--card-bg)', borderRadius: '16px', padding: '32px',
        maxWidth: '440px', width: '100%', boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        border: '1px solid var(--border)'
      }}>
        {success ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }} aria-hidden="true">✅</div>
            <h2 style={{ marginBottom: '12px' }}>{t('auth.changeEmailSuccess')}</h2>
            <button onClick={onLogout} style={{
              marginTop: '20px', padding: '10px 28px', borderRadius: '8px',
              background: 'var(--primary)', color: '#fff', border: 'none',
              cursor: 'pointer', fontSize: '14px', fontWeight: 600
            }}>{t('auth.logout')}</button>
          </div>
        ) : (
          <>
            <div style={{ fontSize: '48px', marginBottom: '16px', textAlign: 'center' }} aria-hidden="true">📧</div>
            <h2 style={{ textAlign: 'center', marginBottom: '12px' }}>{t('auth.forceEmailChangeTitle')}</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.7, marginBottom: '24px', textAlign: 'center' }}>
              {t('auth.forceEmailChangeDesc')}
            </p>
            {error && <div className="error-message">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="force-new-email">{t('auth.newEmail')}</label>
                <input
                  id="force-new-email"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                  autoFocus
                  placeholder={t('auth.enterRegisteredEmail')}
                />
              </div>
              <div className="form-group" style={{ position: 'relative' }}>
                <label htmlFor="force-password">{t('auth.currentPassword')}</label>
                <input
                  id="force-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ paddingRight: '40px' }}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? t('common.hidePassword') : t('common.showPassword')} style={{
                  position: 'absolute', right: '10px', bottom: '8px',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-secondary)', padding: 0, width: '24px', height: '24px'
                }}>
                  {showPassword ? '🙈' : '👁'}
                </button>
              </div>
              <div className="form-group">
                <button type="submit" disabled={loading} style={{ width: '100%' }}>
                  {loading ? t('common.pleaseWait') : t('auth.changeEmail')}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default ForceEmailChange;
