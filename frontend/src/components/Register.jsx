import React, { useState, useEffect } from 'react';
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
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [captchaData, setCaptchaData] = useState({ captchaId: '', svg: '' });
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchCaptcha();
  }, []);

  const fetchCaptcha = async () => {
    try {
      const res = await axios.get('/api/auth/captcha');
      setCaptchaData({ captchaId: res.data.captchaId, svg: res.data.svg });
    } catch (e) {}
  };

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
    if (!captchaAnswer.trim()) {
      setError(t('auth.enterCaptcha'));
      return;
    }
    try {
      await axios.post('/api/auth/register', {
        ...formData,
        captchaId: captchaData.captchaId,
        captchaAnswer: captchaAnswer.trim(),
        deviceInfo: getDeviceInfo()
      });
      setRegisteredEmail(formData.email);
      setRegistered(true);
    } catch (error) {
      setError(error.response?.data?.message || t('auth.registerFailed'));
      fetchCaptcha();
      setCaptchaAnswer('');
    }
  };
  
  if (registered) {
    return (
      <div className="auth-form" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📧</div>
        <h2>{t('auth.needVerify')}</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: 1.7 }}>
          {t('auth.verifySent')} <strong style={{ color: 'var(--foreground)' }}>{registeredEmail}</strong>
        </p>
        <div style={{
          padding: '14px', marginBottom: '20px', borderRadius: '8px',
          background: 'var(--warning-bg)', border: '1px solid var(--warning-border)',
          color: 'var(--warning-text)', fontSize: '13px', lineHeight: 1.7, textAlign: 'left'
        }}>
          <p style={{margin: '0 0 6px 0', fontWeight: 600}}>{t('auth.mustVerifyEmailToLogin')}</p>
          <ul style={{margin: 0, paddingLeft: '16px'}}>
            <li>{t('auth.checkEmailForVerificationLink')}</li>
            <li>{t('auth.loginAfterVerification')}</li>
            <li>{t('auth.checkSpamIfNotReceived')}</li>
          </ul>
        </div>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button className="btn" onClick={() => navigate('/login')}>{t('auth.goToLogin')}</button>
          <Link to="/" className="btn btn-secondary">{t('common.backToHome')}</Link>
        </div>
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
        <div className="form-group">
          <label htmlFor="captcha">{t('auth.captcha')}</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="text"
              id="captcha"
              value={captchaAnswer}
              onChange={(e) => setCaptchaAnswer(e.target.value)}
              required
              placeholder={t('auth.enterCaptcha')}
              style={{ flex: 1, minWidth: 0 }}
            />
            {captchaData.svg && (
              <img
                src={`data:image/svg+xml;utf8,${encodeURIComponent(captchaData.svg)}`}
                alt={t('auth.captcha')}
                onClick={fetchCaptcha}
                style={{ height: '40px', cursor: 'pointer', borderRadius: '4px', flexShrink: 0 }}
                title={t('common.clickToRefresh')}
              />
            )}
          </div>
        </div>
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
          <button type="submit" disabled={!agreedToTerms} style={{ opacity: agreedToTerms ? 1 : 0.5, cursor: agreedToTerms ? 'pointer' : 'not-allowed' }}>{t('auth.registerButton')}</button>
        </div>
      </form>
    </div>
  );
};

export default Register;
