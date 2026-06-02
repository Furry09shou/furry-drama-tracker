import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import QRCode from 'qrcode';
import { useI18n } from '../contexts/I18nContext';
import { useAuth } from '../contexts/AuthContext';

const TwoFactorAuth = ({ user, setUser, onClose }) => {
  const { t } = useI18n();
  const { getAuthHeaders } = useAuth();
  const [step, setStep] = useState(user.twoFactorEnabled ? 'enabled' : 'disabled');
  const [secret, setSecret] = useState('');
  const [otpauthUrl, setOtpauthUrl] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showBackupCodes, setShowBackupCodes] = useState(false);

  useEffect(() => {
    if (otpauthUrl) {
      QRCode.toDataURL(otpauthUrl, { width: 200, margin: 2 })
        .then(url => setQrDataUrl(url))
        .catch(() => setQrDataUrl(''));
    }
  }, [otpauthUrl]);

  const handleEnable = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.post('/api/2fa/enable', {}, {
        headers: getAuthHeaders()
      });
      setSecret(res.data.secret);
      setOtpauthUrl(res.data.otpauthUrl);
      setBackupCodes(res.data.backupCodes);
      setStep('setup');
    } catch (err) {
      setError(err.response?.data?.message || t('twoFactor.invalidCode'));
    }
    setLoading(false);
  };

  const handleVerifyEnable = async () => {
    if (!token || token.length !== 6) {
      setError(t('twoFactor.enterCode'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      await axios.post('/api/2fa/verify-enable', { token }, {
        headers: getAuthHeaders()
      });
      if (setUser && user) {
        setUser({ ...user, twoFactorEnabled: true });
      }
      setStep('enabled');
      setToken('');
    } catch (err) {
      setError(err.response?.data?.message || t('twoFactor.invalidCode'));
    }
    setLoading(false);
  };

  const handleDisable = async () => {
    if (!token || token.length !== 6) {
      setError(t('twoFactor.enterCode'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      await axios.post('/api/2fa/disable', { token }, {
        headers: getAuthHeaders()
      });
      if (setUser && user) {
        setUser({ ...user, twoFactorEnabled: false });
      }
      setStep('disabled');
      setToken('');
    } catch (err) {
      setError(err.response?.data?.message || t('twoFactor.invalidCode'));
    }
    setLoading(false);
  };

  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: '6px',
    background: 'var(--input)', border: '1px solid var(--border)',
    color: 'var(--foreground)', fontSize: '14px',
    letterSpacing: '0.3em', textAlign: 'center'
  };

  const btnStyle = {
    padding: '8px 16px', borderRadius: '8px',
    cursor: 'pointer', fontSize: '14px', fontWeight: 500,
    transition: 'all 0.2s'
  };

  return (
    <div style={{
      padding: '20px', borderRadius: '12px',
      background: 'var(--hover-bg)', border: '1px solid var(--border)',
      marginTop: '12px', width: '100%'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '16px' }}>{t('twoFactor.title')}</h3>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-secondary)', fontSize: '18px', padding: '4px 8px'
        }}>✕</button>
      </div>

      {error && (
        <div style={{
          padding: '10px', marginBottom: '12px', borderRadius: '6px',
          background: 'var(--destructive-bg)', border: '1px solid var(--destructive-border)',
          color: 'var(--destructive-text)', fontSize: '13px'
        }}>{error}</div>
      )}

      {step === 'disabled' && (
        <div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '16px', lineHeight: 1.7 }}>
            {t('twoFactor.enableDesc')}
          </p>
          <button onClick={handleEnable} disabled={loading} style={{
            ...btnStyle,
            background: 'var(--btn-gradient)', color: 'var(--btn-text)', border: 'none'
          }}>
            {loading ? t('common.processing') : t('twoFactor.enable')}
          </button>
        </div>
      )}

      {step === 'setup' && (
        <div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '12px', lineHeight: 1.7 }}>
            {t('twoFactor.setupStep1')}
          </p>
          <div style={{
            textAlign: 'center', marginBottom: '16px',
            padding: '16px', background: 'var(--card)', borderRadius: '8px'
          }}>
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="2FA QR Code" style={{ width: '200px', height: '200px' }} />
            ) : (
              <div style={{ width: '200px', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', color: 'var(--text-secondary)' }}>Loading...</div>
            )}
          </div>
          <div style={{
            padding: '12px', background: 'var(--card)', borderRadius: '6px',
            marginBottom: '16px', wordBreak: 'break-all'
          }}>
            <p style={{ color: 'var(--text-tertiary)', fontSize: '12px', margin: '0 0 4px 0' }}>{t('twoFactor.manualKey')}</p>
            <code style={{ color: 'var(--foreground)', fontSize: '13px' }}>{secret}</code>
          </div>

          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px', lineHeight: 1.7 }}>
            {t('twoFactor.setupStep2')}
          </p>
          <div style={{
            padding: '12px', background: 'var(--card)', borderRadius: '6px',
            marginBottom: '16px'
          }}>
            {showBackupCodes ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {backupCodes.map((code, i) => (
                  <code key={i} style={{
                    padding: '4px 10px', background: 'var(--hover-bg)', borderRadius: '4px',
                    fontSize: '13px', color: 'var(--foreground)'
                  }}>{code}</code>
                ))}
              </div>
            ) : (
              <button onClick={() => setShowBackupCodes(true)} style={{
                ...btnStyle, background: 'var(--hover-bg-strong)', border: '1px solid var(--border)',
                color: 'var(--foreground)', fontSize: '13px'
              }}>{t('twoFactor.showBackupCodes')}</button>
            )}
          </div>

          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px', lineHeight: 1.7 }}>
            {t('twoFactor.setupStep3')}
          </p>
          <input
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            maxLength={6}
            style={inputStyle}
          />
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <button onClick={() => { setStep('disabled'); setToken(''); setError(''); }} style={{
              ...btnStyle, background: 'var(--hover-bg-strong)', border: '1px solid var(--border)',
              color: 'var(--foreground)'
            }}>{t('common.cancel')}</button>
            <button onClick={handleVerifyEnable} disabled={loading || token.length !== 6} style={{
              ...btnStyle, background: 'var(--btn-gradient)', color: 'var(--btn-text)', border: 'none'
            }}>
              {loading ? t('twoFactor.verifying') : t('twoFactor.confirmEnable')}
            </button>
          </div>
        </div>
      )}

      {step === 'enabled' && (
        <div>
          <div style={{
            padding: '12px', background: 'var(--success-bg)', border: '1px solid var(--success-border)',
            borderRadius: '6px', marginBottom: '16px',
            color: 'var(--success-text)', fontSize: '14px'
          }}>
            {t('twoFactor.enabled')}
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '16px', lineHeight: 1.7 }}>
            {t('twoFactor.disableDesc')}
          </p>
          <input
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            maxLength={6}
            style={inputStyle}
          />
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <button onClick={onClose} style={{
              ...btnStyle, background: 'var(--hover-bg-strong)', border: '1px solid var(--border)',
              color: 'var(--foreground)'
            }}>{t('common.back')}</button>
            <button onClick={handleDisable} disabled={loading || token.length !== 6} style={{
              ...btnStyle, background: 'var(--destructive-bg)', border: '1px solid var(--destructive-border)',
              color: 'var(--destructive-text)'
            }}>
              {loading ? t('twoFactor.verifying') : t('twoFactor.disable')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TwoFactorAuth;
