import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { getDeviceInfo } from '../utils/deviceInfo';
import { useI18n } from '../contexts/I18nContext';
import PasswordToggle from './PasswordToggle';

const Register = () => {
  const { t } = useI18n();
  const [formData, setFormData] = useState({
    accountId: '',
    username: '',
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [registered, setRegistered] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  // 邮箱验证码输入相关
  const [verifyCode, setVerifyCode] = useState('');
  const [verifyCodeSubmitting, setVerifyCodeSubmitting] = useState(false);
  const [verifyCodeError, setVerifyCodeError] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [codeResendLoading, setCodeResendLoading] = useState(false);
  const [codeResendMsg, setCodeResendMsg] = useState('');
  const [codeResendSuccess, setCodeResendSuccess] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [altchaPayload, setAltchaPayload] = useState(null);
  const altchaRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const el = altchaRef.current;
    if (!el) return;
    const handler = (ev) => {
      if (ev.detail?.payload) setAltchaPayload(ev.detail.payload);
    };
    el.addEventListener('statechange', handler);
    return () => el.removeEventListener('statechange', handler);
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleBlur = (field, value) => {
    const errors = { ...fieldErrors };
    if (field === 'accountId' && value && !/^[A-Za-z0-9_]+$/.test(value)) {
      errors.accountId = t('auth.accountIdHint');
    } else {
      delete errors.accountId;
    }
    if (field === 'username' && !value) {
      errors.username = t('auth.nicknamePlaceholder');
    } else {
      delete errors.username;
    }
    if (field === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      errors.email = t('auth.invalidEmail');
    } else {
      delete errors.email;
    }
    if (field === 'password' && value && value.length < 8) {
      errors.password = t('auth.passwordHint');
    } else {
      delete errors.password;
    }
    setFieldErrors(errors);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (!altchaPayload) return;
    if (formData.password.length < 8) {
      setError(t('auth.passwordHint'));
      return;
    }
    if (!/[A-Za-z]/.test(formData.password) || !/[0-9]/.test(formData.password)) {
      setError(t('auth.passwordMustContainLetterAndNumber'));
      return;
    }
    if (!agreedToTerms) {
      setError(t('auth.agreeTermsFirst'));
      return;
    }
    setSubmitting(true);
    try {
      await axios.post('/api/auth/register', {
        ...formData,
        altcha: altchaPayload,
        deviceInfo: getDeviceInfo()
      });
      setRegisteredEmail(formData.email);
      setRegistered(true);
    } catch (error) {
      setError(error.response?.data?.message || t('auth.registerFailed'));
    }
    setSubmitting(false);
  };

  // 验证邮箱验证码
  const handleVerifyEmailCode = async (e) => {
    e.preventDefault();
    if (verifyCodeSubmitting) return;
    setVerifyCodeError('');
    setVerifyCodeSubmitting(true);
    try {
      await axios.post('/api/auth/verify-email', { code: verifyCode.trim(), email: registeredEmail });
      setEmailVerified(true);
    } catch (err) {
      setVerifyCodeError(err.response?.data?.message || t('auth.emailVerifyCodeInvalid'));
    }
    setVerifyCodeSubmitting(false);
  };

  if (registered) {
    return (
      <div className="auth-form" style={{ textAlign: 'center' }}>
        {emailVerified ? (
          <>
            <div style={{ fontSize: '48px', marginBottom: '16px' }} aria-hidden="true">✅</div>
            <h2>{t('auth.emailVerifyCodeVerified')}</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: 1.7 }}>
              {t('auth.emailVerifyCodeVerifySuccessDesc')}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button className="btn" onClick={() => navigate('/login')}>{t('auth.goToLogin')}</button>
              <Link to="/" className="btn btn-secondary">{t('common.backToHome')}</Link>
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: '48px', marginBottom: '16px' }} aria-hidden="true">📧</div>
            <h2>{t('auth.emailVerifyCodeTitle')}</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: 1.7 }}>
              {t('auth.verifySent')} <strong style={{ color: 'var(--foreground)' }}>{registeredEmail}</strong>
            </p>
            <div style={{
              background: 'var(--primary-bg)', border: '1px solid var(--primary-border)',
              borderRadius: '10px', padding: '16px', margin: '20px 0',
            }}>
              <p style={{color: 'var(--text-secondary)', fontSize: '13px', margin: '0 0 12px', lineHeight: 1.6}}>
                {t('auth.enterEmailVerifyCode')}
              </p>
              <form onSubmit={handleVerifyEmailCode} style={{display: 'flex', gap: '8px', flexDirection: 'column'}}>
                <input
                  type="text"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder={t('auth.emailVerifyCodePlaceholder')}
                  inputMode="numeric"
                  maxLength="6"
                  autoFocus
                  style={{
                    width: '100%', padding: '10px 12px', fontSize: '20px',
                    textAlign: 'center', letterSpacing: '6px', fontFamily: 'monospace',
                    borderRadius: '8px', border: '1px solid var(--border)',
                    background: 'var(--input)', color: 'var(--foreground)',
                    outline: 'none', boxSizing: 'border-box',
                  }}
                />
                {verifyCodeError && (
                  <div className="error-message" style={{margin: 0, fontSize: '13px'}}>{verifyCodeError}</div>
                )}
                <button
                  type="submit"
                  disabled={verifyCode.length !== 6 || verifyCodeSubmitting}
                  style={{
                    padding: '10px', borderRadius: '8px', fontSize: '14px', fontWeight: 600,
                    background: 'var(--btn-gradient)', color: 'var(--btn-text)',
                    border: 'none', cursor: verifyCodeSubmitting ? 'wait' : 'pointer',
                    opacity: (verifyCode.length !== 6 || verifyCodeSubmitting) ? 0.6 : 1,
                  }}
                >
                  {verifyCodeSubmitting ? t('common.pleaseWait') : t('auth.verifyEmailCode')}
                </button>
              </form>
            </div>
            <p style={{color: 'var(--text-secondary)', fontSize: '13px', marginTop: '8px'}}>
              {t('auth.verifyCodeExpiry')}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '16px' }}>
              <button className="btn btn-secondary" onClick={() => navigate('/login')}>{t('auth.goToLogin')}</button>
              <Link to="/" className="btn btn-secondary">{t('common.backToHome')}</Link>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="auth-form">
      <h2>{t('auth.registerTitle')}</h2>
      <div style={{
        padding: '10px 14px', marginBottom: '16px', borderRadius: '8px',
        background: 'var(--primary-bg-subtle)', border: '1px solid var(--primary-border-subtle)',
        color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.6
      }}>
        {t('auth.registerEmailHint')}
      </div>
      {error && <div className="error-message">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="accountId">{t('auth.accountId')}</label>
          <input
            type="text"
            id="accountId"
            name="accountId"
            value={formData.accountId}
            onChange={handleChange}
            onBlur={(e) => handleBlur('accountId', e.target.value)}
            required
            minLength={3}
            maxLength={20}
            pattern="[A-Za-z0-9_]+"
            placeholder={t('auth.accountIdPlaceholder')}
          />
          {fieldErrors.accountId && <p style={{color: 'var(--destructive-text)', fontSize: '12px', margin: '2px 0 0 0'}}>{fieldErrors.accountId}</p>}
          <span style={{fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', display: 'block'}}>{t('auth.accountIdHint')}</span>
        </div>
        <div className="form-group">
          <label htmlFor="username">{t('auth.nickname')}</label>
          <input
            type="text"
            id="username"
            name="username"
            value={formData.username}
            onChange={handleChange}
            onBlur={(e) => handleBlur('username', e.target.value)}
            required
            maxLength={20}
            placeholder={t('auth.nicknamePlaceholder')}
          />
          {fieldErrors.username && <p style={{color: 'var(--destructive-text)', fontSize: '12px', margin: '2px 0 0 0'}}>{fieldErrors.username}</p>}
        </div>
        <div className="form-group">
          <label htmlFor="email">{t('auth.email')}</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            onBlur={(e) => handleBlur('email', e.target.value)}
            required
          />
          {fieldErrors.email && <p style={{color: 'var(--destructive-text)', fontSize: '12px', margin: '2px 0 0 0'}}>{fieldErrors.email}</p>}
        </div>
        <div className="form-group">
          <label htmlFor="password">{t('auth.password')}</label>
          <PasswordToggle
            id="password"
            value={formData.password}
            onChange={handleChange}
            onBlur={(e) => handleBlur('password', e.target.value)}
            show={showPassword}
            onToggle={() => setShowPassword(!showPassword)}
            name="password"
            required
            minLength={8}
          />
          {fieldErrors.password && <p style={{color: 'var(--destructive-text)', fontSize: '12px', margin: '2px 0 0 0'}}>{fieldErrors.password}</p>}
          <span style={{fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', display: 'block'}}>{t('auth.passwordHint')}</span>
        </div>
        <altcha-widget
          ref={altchaRef}
          challenge="/api/auth/captcha"
          auto="onload"
          hidefooter="true"
          hidelogo="true"
        ></altcha-widget>
        <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
          <input
            type="checkbox"
            id="terms"
            checked={agreedToTerms}
            onChange={(e) => setAgreedToTerms(e.target.checked)}
            style={{ accentColor: 'var(--primary)', cursor: 'pointer', width: '16px', height: '16px' }}
          />
          <label htmlFor="terms" style={{ fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer', margin: 0, fontWeight: 400 }}>
            {t('auth.iHaveReadAndAgree')}
            <Link to="/terms" style={{ color: 'var(--primary)', textDecoration: 'none', marginLeft: '2px', marginRight: '2px' }}
              onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
              onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
            >{t('auth.terms')}</Link>
            {t('common.and')}
            <Link to="/privacy" style={{ color: 'var(--primary)', textDecoration: 'none', marginLeft: '2px' }}
              onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
              onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
            >{t('auth.privacy')}</Link>
          </label>
        </div>
        <div className="form-group">
          <button type="submit" disabled={submitting || !agreedToTerms} style={{ opacity: agreedToTerms ? 1 : 0.5, cursor: agreedToTerms ? 'pointer' : 'not-allowed' }}>{t('auth.registerButton')}</button>
        </div>
      </form>
    </div>
  );
};

export default Register;
