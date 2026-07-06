import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import { useAuth } from '../contexts/AuthContext';
import API from '../utils/apiEndpoints';

const maskEmail = (email) => {
  if (!email) return '';
  const [local, domain] = email.split('@');
  if (!domain) return email;
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local[0]}${'*'.repeat(Math.min(local.length - 2, 5))}${local[local.length - 1]}@${domain}`;
};

const AccountSecurity = ({ user }) => {
  const { t, lang } = useI18n();
  const { getAuthHeaders } = useAuth();
  const navigate = useNavigate();

  const [exportLoading, setExportLoading] = useState(false);
  const [showFullEmail, setShowFullEmail] = useState(false);

  const handleExportData = async () => {
    setExportLoading(true);
    try {
      const res = await fetch(API.USERS.EXPORT, {
        headers: getAuthHeaders(),
        credentials: 'include'
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `my_data_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {}
    setExportLoading(false);
  };

  const sectionStyle = {
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '16px',
  };

  const rowStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 0',
    flexWrap: 'wrap',
    gap: '8px',
  };

  const labelStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flex: 1,
  };

  const iconStyle = {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    flexShrink: 0,
  };

  return (
    <div style={{maxWidth: '680px', margin: '0 auto'}}>
      <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px'}}>
        <button
          onClick={() => navigate('/profile')}
          style={{
            background: 'var(--hover-bg)', border: '1px solid var(--border)',
            borderRadius: '8px', padding: '6px 10px', cursor: 'pointer',
            color: 'var(--foreground)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '4px'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
          {t('common.back')}
        </button>
        <h2 style={{margin: 0}}>{t('profile.accountSecurity')}</h2>
      </div>

      {/* 邮箱 */}
      <div style={sectionStyle}>
        <div style={rowStyle}>
          <div style={labelStyle}>
            <div style={{...iconStyle, background: 'var(--primary-bg)', color: 'var(--primary)'}}>📧</div>
            <div>
              <div style={{fontWeight: 500, fontSize: '15px'}}>{t('auth.email')}</div>
              <div style={{fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px'}}>
                {showFullEmail ? user?.email : maskEmail(user?.email)}
                <button
                  onClick={() => setShowFullEmail(!showFullEmail)}
                  style={{
                    marginLeft: '6px', background: 'none', border: 'none',
                    color: 'var(--primary)', cursor: 'pointer', fontSize: '12px',
                    textDecoration: 'underline', padding: '0'
                  }}
                >
                  {showFullEmail ? t('common.hide') : t('common.show')}
                </button>
                {user?.isEmailVerified ? (
                  <span style={{marginLeft: '8px', fontSize: '12px', color: 'var(--success-text)', background: 'var(--success-bg)', padding: '1px 8px', borderRadius: '10px', border: '1px solid var(--success-border)'}}>{t('auth.emailVerified')}</span>
                ) : (
                  <span style={{marginLeft: '8px', fontSize: '12px', color: 'var(--warning-text)', background: 'var(--warning-bg)', padding: '1px 8px', borderRadius: '10px', border: '1px solid var(--warning-border)'}}>{t('auth.emailNotVerified')}</span>
                )}
              </div>
            </div>
          </div>
          <Link to="/change-email">
            <button className="btn btn-secondary" style={{fontSize: '13px', padding: '6px 14px'}}>{t('auth.changeEmail')}</button>
          </Link>
        </div>
      </div>

      {/* 密码 */}
      <div style={sectionStyle}>
        <div style={rowStyle}>
          <div style={labelStyle}>
            <div style={{...iconStyle, background: 'var(--warning-bg)', color: 'var(--warning-text)'}}>🔑</div>
            <div>
              <div style={{fontWeight: 500, fontSize: '15px'}}>{t('auth.password')}</div>
              <div style={{fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px'}}>{t('profile.changePassword')}</div>
            </div>
          </div>
          <Link to="/change-password">
            <button className="btn btn-secondary" style={{fontSize: '13px', padding: '6px 14px'}}>{t('profile.changePassword')}</button>
          </Link>
        </div>
      </div>

      {/* 管理设备 */}
      <div style={sectionStyle}>
        <div style={rowStyle}>
          <div style={labelStyle}>
            <div style={{...iconStyle, background: 'rgba(99,102,241,0.1)', color: '#6366f1'}}>📱</div>
            <div>
              <div style={{fontWeight: 500, fontSize: '15px'}}>{t('profile.manageDevices')}</div>
              <div style={{fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px'}}>{t('profile.manageDevicesDesc')}</div>
            </div>
          </div>
          <Link to="/devices">
            <button className="btn btn-secondary" style={{fontSize: '13px', padding: '6px 14px'}}>{t('profile.manageDevices')}</button>
          </Link>
        </div>
      </div>

      {/* 两步验证 */}
      <div style={sectionStyle}>
        <div style={rowStyle}>
          <div style={labelStyle}>
            <div style={{...iconStyle, background: 'var(--success-bg)', color: 'var(--success-text)'}}>🛡️</div>
            <div>
              <div style={{fontWeight: 500, fontSize: '15px'}}>{t('twoFactor.title')}</div>
              <div style={{fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px'}}>
                {user?.twoFactorEnabled ? t('twoFactor.enabled') : t('twoFactor.disabled')}
              </div>
            </div>
          </div>
          <Link to="/two-factor">
            <button className="btn btn-secondary" style={{fontSize: '13px', padding: '6px 14px'}}>
              {user?.twoFactorEnabled ? t('common.manage') : t('common.enable')}
            </button>
          </Link>
        </div>
      </div>

      {/* 导出数据 */}
      <div style={sectionStyle}>
        <div style={rowStyle}>
          <div style={labelStyle}>
            <div style={{...iconStyle, background: 'rgba(14,165,233,0.1)', color: '#0ea5e9'}}>📦</div>
            <div>
              <div style={{fontWeight: 500, fontSize: '15px'}}>{t('profile.exportData')}</div>
              <div style={{fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px'}}>{t('profile.exportDataDesc')}</div>
            </div>
          </div>
          <button
            className="btn btn-secondary"
            style={{fontSize: '13px', padding: '6px 14px'}}
            onClick={handleExportData}
            disabled={exportLoading}
          >
            {exportLoading ? t('common.processing') : t('profile.exportData')}
          </button>
        </div>
      </div>

      {/* 注销账号 */}
      <div style={{
        ...sectionStyle,
        background: 'var(--destructive-bg-subtle)',
        borderColor: 'var(--destructive-border-subtle)',
      }}>
        <div style={rowStyle}>
          <div style={labelStyle}>
            <div style={{...iconStyle, background: 'var(--destructive-bg)', color: 'var(--destructive-text)'}}>⚠️</div>
            <div>
              <div style={{fontWeight: 500, fontSize: '15px', color: 'var(--destructive-text)'}}>{t('profile.deleteAccountSection')}</div>
              <div style={{fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px'}}>{t('profile.deleteAccountWarning')}</div>
            </div>
          </div>
          <Link to="/delete-account">
            <button
              style={{
                fontSize: '13px', padding: '6px 14px', borderRadius: '8px',
                background: 'var(--destructive-bg)', border: '1px solid var(--destructive-border)',
                color: 'var(--destructive-text)', cursor: 'pointer'
              }}
            >
              {t('profile.requestDeletion')}
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AccountSecurity;
