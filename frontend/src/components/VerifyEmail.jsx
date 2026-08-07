import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';

// 邮箱验证码输入页面（取代旧的链接验证页面）
// 通过 /verify-email?email=xxx 访问，用户输入邮件中收到的 6 位验证码完成验证
const VerifyEmail = () => {
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMsg, setResendMsg] = useState('');
  const [resendSuccess, setResendSuccess] = useState(false);
  const [altchaPayload, setAltchaPayload] = useState(null);
  const cleanupRef = useRef(null);

  const altchaRef = useCallback((el) => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
    setAltchaPayload(null);
    if (!el) return;
    const handler = (ev) => {
      if (ev.detail?.payload) setAltchaPayload(ev.detail.payload);
    };
    el.addEventListener('statechange', handler);
    cleanupRef.current = () => el.removeEventListener('statechange', handler);
  }, []);

  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setError('');
    setSubmitting(true);
    try {
      await axios.post('/api/auth/verify-email', { code: verifyCode.trim(), email });
      setSuccess(true);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || t('auth.emailVerifyCodeInvalid'));
    }
    setSubmitting(false);
  };

  const handleResend = async () => {
    if (!altchaPayload || resendLoading) return;
    setResendLoading(true);
    setResendMsg('');
    setResendSuccess(false);
    try {
      const res = await axios.post('/api/auth/resend-verification-by-email', { email, altcha: altchaPayload });
      setResendMsg(res.data.message);
      setResendSuccess(true);
      setAltchaPayload(null);
    } catch (err) {
      setResendMsg(err.response?.data?.message || t('common.sendFailed'));
      setResendSuccess(false);
    }
    setResendLoading(false);
  };

  // 缺少 email 参数：提示无效链接
  if (!email) {
    return (
      <div className="auth-form" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }} aria-hidden="true">❌</div>
        <h2>{t('auth.verifyFailed')}</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>{t('auth.invalidVerifyLinkMissingToken')}</p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <Link to="/login" className="btn">{t('auth.goToLogin')}</Link>
          <Link to="/" className="btn btn-secondary">{t('common.backToHome')}</Link>
        </div>
      </div>
    );
  }

  // 验证成功
  if (success) {
    return (
      <div className="auth-form" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }} aria-hidden="true">✅</div>
        <h2 style={{ color: 'var(--success-text)' }}>{t('auth.emailVerifyCodeVerified')}</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: 1.7 }}>{t('auth.emailVerifyCodeVerifySuccessDesc')}</p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button className="btn" onClick={() => navigate('/login')}>{t('auth.goToLogin')}</button>
          <Link to="/" className="btn btn-secondary">{t('common.backToHome')}</Link>
        </div>
      </div>
    );
  }

  // 验证码输入界面
  return (
    <div className="auth-form" style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }} aria-hidden="true">📧</div>
      <h2>{t('auth.emailVerifyCodeTitle')}</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: 1.7 }}>
        {t('auth.verifySent')} <strong style={{ color: 'var(--foreground)' }}>{email}</strong>
      </p>
      {error && <div className="error-message" style={{ marginBottom: '16px' }}>{error}</div>}
      <div style={{
        background: 'var(--primary-bg)', border: '1px solid var(--primary-border)',
        borderRadius: '10px', padding: '16px', margin: '20px 0',
      }}>
        <p style={{color: 'var(--text-secondary)', fontSize: '13px', margin: '0 0 12px', lineHeight: 1.6}}>
          {t('auth.enterEmailVerifyCode')}
        </p>
        <form onSubmit={handleVerify} style={{display: 'flex', gap: '8px', flexDirection: 'column'}}>
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
          <button
            type="submit"
            disabled={verifyCode.length !== 6 || submitting}
            style={{
              padding: '10px', borderRadius: '8px', fontSize: '14px', fontWeight: 600,
              background: 'var(--btn-gradient)', color: 'var(--btn-text)',
              border: 'none', cursor: submitting ? 'wait' : 'pointer',
              opacity: (verifyCode.length !== 6 || submitting) ? 0.6 : 1,
            }}
          >
            {submitting ? t('common.pleaseWait') : t('auth.verifyEmailCode')}
          </button>
        </form>
      </div>
      <p style={{color: 'var(--text-secondary)', fontSize: '13px', marginTop: '8px'}}>
        {t('auth.verifyCodeExpiry')}
      </p>

      {/* 重新发送验证码（需 altcha PoW 防滥用） */}
      <div style={{ marginTop: '24px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
        <p style={{color: 'var(--text-secondary)', fontSize: '13px', margin: '0 0 12px'}}>
          {t('auth.resendVerification')}
        </p>
        <altcha-widget
          ref={altchaRef}
          challenge="/api/auth/captcha"
          auto="onload"
          hidefooter="true"
          hidelogo="true"
        ></altcha-widget>
        <button
          onClick={handleResend}
          disabled={!altchaPayload || resendLoading}
          style={{
            padding: '8px 20px', borderRadius: '8px', fontSize: '13px',
            background: 'var(--btn-gradient)', color: 'var(--btn-text)',
            border: 'none', cursor: resendLoading ? 'wait' : 'pointer',
            opacity: (!altchaPayload || resendLoading) ? 0.6 : 1, fontWeight: 500,
          }}
        >
          {resendLoading ? t('auth.sending') : t('auth.resendVerifyCodeBtn')}
        </button>
        {resendMsg && (
          <p style={{margin: '8px 0 0 0', fontSize: '13px',
            color: resendSuccess ? 'var(--success-text)' : 'var(--destructive-text)'
          }}>{resendMsg}</p>
        )}
      </div>

      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '20px' }}>
        <Link to="/login" className="btn btn-secondary">{t('auth.goToLogin')}</Link>
        <Link to="/" className="btn btn-secondary">{t('common.backToHome')}</Link>
      </div>
    </div>
  );
};

export default VerifyEmail;
