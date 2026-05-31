import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';

const VerifyEmail = () => {
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMsg, setResendMsg] = useState('');
  const [resendSuccess, setResendSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMessage(t('auth.invalidVerifyLinkMissingToken'));
      return;
    }
    const verifyEmail = async () => {
      try {
        const res = await axios.post('/api/auth/verify-email', { token });
        setStatus('success');
        setMessage(res.data.message);
      } catch (err) {
        setStatus('error');
        setMessage(err.response?.data?.message || t('auth.verifyFailed'));
      }
    };
    verifyEmail();
  }, [searchParams]);

  const handleResend = async () => {
    setResendLoading(true);
    setResendMsg('');
    setResendSuccess(false);
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const res = await axios.post('/api/auth/resend-verification', {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setResendMsg(res.data.message);
        setResendSuccess(true);
      } else {
        setResendMsg(t('auth.resendVerificationHint'));
        setResendSuccess(true);
      }
    } catch (err) {
      setResendMsg(err.response?.data?.message || t('common.sendFailed'));
      setResendSuccess(false);
    }
    setResendLoading(false);
  };

  return (
    <div className="auth-form" style={{ textAlign: 'center' }}>
      {status === 'verifying' && (
        <>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
          <h2>{t('auth.emailVerifying')}</h2>
          <p style={{ color: 'var(--text-secondary)' }}>{t('auth.verifyingEmailPleaseWait')}</p>
        </>
      )}
      {status === 'success' && (
        <>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
          <h2 style={{ color: 'var(--success-text)' }}>{t('auth.verifySuccess')}</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>{message}</p>
          <button className="btn" onClick={() => navigate('/login')} style={{ marginRight: '8px' }}>
            {t('auth.goToLogin')}
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/')}>
            {t('common.backToHome')}
          </button>
        </>
      )}
      {status === 'error' && (
        <>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
          <h2 style={{ color: 'var(--destructive-text)' }}>{t('auth.verifyFailed')}</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>{message}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
            <button
              className="btn"
              onClick={handleResend}
              disabled={resendLoading}
            >
              {resendLoading ? t('auth.sending') : t('auth.resendVerification')}
            </button>
            {resendMsg && (
              <p style={{
                fontSize: '13px',
                color: resendSuccess ? 'var(--success-text)' : 'var(--destructive-text)',
                margin: 0
              }}>{resendMsg}</p>
            )}
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <Link to="/login" className="btn btn-secondary">{t('auth.goToLogin')}</Link>
              <Link to="/" className="btn btn-secondary">{t('common.backToHome')}</Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default VerifyEmail;
