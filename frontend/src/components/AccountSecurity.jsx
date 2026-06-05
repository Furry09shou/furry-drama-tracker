import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import PasswordToggle from './PasswordToggle';
import TwoFactorAuth from './TwoFactorAuth';
import API from '../utils/apiEndpoints';

const AccountSecurity = ({ user, setUser }) => {
  const { t } = useI18n();
  const { getAuthHeaders } = useAuth();
  const navigate = useNavigate();

  // 2FA
  const [show2FA, setShow2FA] = useState(false);

  // 导出数据
  const [exportLoading, setExportLoading] = useState(false);

  // 注销账号
  const [deletionStatus, setDeletionStatus] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteStep, setDeleteStep] = useState(0);
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

  // 加载注销状态
  React.useEffect(() => {
    const fetchDeletionStatus = async () => {
      try {
        const res = await axios.get(API.AUTH.DELETION_STATUS, { headers: getAuthHeaders() });
        if (res.data.requested) {
          setDeletionStatus(res.data);
        }
      } catch {}
    };
    fetchDeletionStatus();
  }, []);

  const handleRequestDeletion = async () => {
    setDeleteLoading(true);
    setDeleteError('');
    try {
      const res = await axios.post(API.AUTH.REQUEST_DELETION, {}, { headers: getAuthHeaders() });
      setDeletionStatus({
        requested: true,
        deletionRequestedAt: res.data.deletionRequestedAt,
        deleteAt: res.data.deleteAt
      });
      setShowDeleteConfirm(false);
      setDeleteStep(0);
      setDeletePassword('');
    } catch (err) {
      setDeleteError(err.response?.data?.message || t('profile.deletionRequestFailed'));
    }
    setDeleteLoading(false);
  };

  const handleCancelDeletion = async () => {
    setCancelLoading(true);
    try {
      await axios.post(API.AUTH.CANCEL_DELETION, {}, { headers: getAuthHeaders() });
      setDeletionStatus(null);
    } catch (err) {
      console.error(t('profile.cancelDeletionFailed'), err);
    }
    setCancelLoading(false);
  };

  const formatCountdown = (deleteAt) => {
    const now = new Date();
    const target = new Date(deleteAt);
    const diff = target - now;
    if (diff <= 0) return t('profile.imminent');
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (days > 0) return `${days}${t('common.days')}${hours}${t('common.hours')}`;
    if (hours > 0) return `${hours}${t('common.hours')}${minutes}${t('common.minutes')}`;
    return `${minutes}${t('common.minutes')}`;
  };

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
    borderBottom: '1px solid var(--border)',
  };

  const lastRowStyle = {
    ...rowStyle,
    borderBottom: 'none',
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
          {t('common.back') || '返回'}
        </button>
        <h2 style={{margin: 0}}>{t('profile.accountSecurity') || '账号与安全'}</h2>
      </div>

      {/* 邮箱 */}
      <div style={sectionStyle}>
        <div style={lastRowStyle}>
          <div style={labelStyle}>
            <div style={{...iconStyle, background: 'var(--primary-bg)', color: 'var(--primary)'}}>📧</div>
            <div>
              <div style={{fontWeight: 500, fontSize: '15px'}}>{t('auth.email') || '邮箱'}</div>
              <div style={{fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px'}}>
                {user?.email}
                {user?.isEmailVerified ? (
                  <span style={{marginLeft: '8px', fontSize: '12px', color: 'var(--success-text)', background: 'var(--success-bg)', padding: '1px 8px', borderRadius: '10px', border: '1px solid var(--success-border)'}}>{t('auth.emailVerified')}</span>
                ) : (
                  <span style={{marginLeft: '8px', fontSize: '12px', color: 'var(--warning-text)', background: 'var(--warning-bg)', padding: '1px 8px', borderRadius: '10px', border: '1px solid var(--warning-border)'}}>{t('auth.emailNotVerified')}</span>
                )}
              </div>
            </div>
          </div>
          <Link to="/change-email">
            <button className="btn btn-secondary" style={{fontSize: '13px', padding: '6px 14px'}}>{t('auth.changeEmail') || '修改邮箱'}</button>
          </Link>
        </div>
      </div>

      {/* 密码 */}
      <div style={sectionStyle}>
        <div style={lastRowStyle}>
          <div style={labelStyle}>
            <div style={{...iconStyle, background: 'var(--warning-bg)', color: 'var(--warning-text)'}}>🔑</div>
            <div>
              <div style={{fontWeight: 500, fontSize: '15px'}}>{t('auth.password') || '密码'}</div>
              <div style={{fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px'}}>••••••••</div>
            </div>
          </div>
          <Link to="/change-password">
            <button className="btn btn-secondary" style={{fontSize: '13px', padding: '6px 14px'}}>{t('profile.changePassword') || '修改密码'}</button>
          </Link>
        </div>
      </div>

      {/* 管理设备 */}
      <div style={sectionStyle}>
        <div style={lastRowStyle}>
          <div style={labelStyle}>
            <div style={{...iconStyle, background: 'rgba(99,102,241,0.1)', color: '#6366f1'}}>📱</div>
            <div>
              <div style={{fontWeight: 500, fontSize: '15px'}}>{t('profile.manageDevices') || '管理设备'}</div>
              <div style={{fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px'}}>{t('profile.manageDevicesDesc') || '查看和管理已登录的设备'}</div>
            </div>
          </div>
          <Link to="/devices">
            <button className="btn btn-secondary" style={{fontSize: '13px', padding: '6px 14px'}}>{t('profile.manageDevices') || '管理设备'}</button>
          </Link>
        </div>
      </div>

      {/* 两步验证 */}
      <div style={sectionStyle}>
        <div style={lastRowStyle}>
          <div style={labelStyle}>
            <div style={{...iconStyle, background: 'var(--success-bg)', color: 'var(--success-text)'}}>🛡️</div>
            <div>
              <div style={{fontWeight: 500, fontSize: '15px'}}>{t('twoFactor.title') || '两步验证'}</div>
              <div style={{fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px'}}>
                {user?.twoFactorEnabled
                  ? (t('twoFactor.enabled') || '已开启')
                  : (t('twoFactor.disabled') || '未开启')}
              </div>
            </div>
          </div>
          <button
            className="btn btn-secondary"
            style={{fontSize: '13px', padding: '6px 14px'}}
            onClick={() => setShow2FA(true)}
          >
            {user?.twoFactorEnabled ? (t('common.manage') || '管理') : (t('common.enable') || '开启')}
          </button>
        </div>
      </div>

      {/* 导出数据 */}
      <div style={sectionStyle}>
        <div style={lastRowStyle}>
          <div style={labelStyle}>
            <div style={{...iconStyle, background: 'rgba(14,165,233,0.1)', color: '#0ea5e9'}}>📦</div>
            <div>
              <div style={{fontWeight: 500, fontSize: '15px'}}>{t('profile.exportData') || '导出我的数据'}</div>
              <div style={{fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px'}}>{t('profile.exportDataDesc') || '下载你的所有数据'}</div>
            </div>
          </div>
          <button
            className="btn btn-secondary"
            style={{fontSize: '13px', padding: '6px 14px'}}
            onClick={handleExportData}
            disabled={exportLoading}
          >
            {exportLoading ? (t('common.processing') || '处理中...') : (t('profile.exportData') || '导出')}
          </button>
        </div>
      </div>

      {/* 注销账号 */}
      <div style={{
        ...sectionStyle,
        background: 'var(--destructive-bg-subtle)',
        borderColor: 'var(--destructive-border-subtle)',
      }}>
        {deletionStatus ? (
          <div>
            <h3 style={{ color: 'var(--destructive-text)', marginBottom: '12px', fontSize: '16px' }}>{t('profile.accountDeleting')}</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.7, marginBottom: '12px' }}>
              {t('profile.deletionCountdown')} <strong style={{ color: 'var(--destructive-text)' }}>{formatCountdown(deletionStatus.deleteAt)}</strong> {t('profile.deletionCountdownAfter')}
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '16px' }}>
              {t('profile.estimatedDeleteTime')}{new Date(deletionStatus.deleteAt).toLocaleString()}
            </p>
            <button
              className="btn"
              style={{ background: 'var(--btn-gradient-success)', fontSize: '14px' }}
              onClick={handleCancelDeletion}
              disabled={cancelLoading}
            >
              {cancelLoading ? t('common.processing') : t('profile.cancelDeletionKeepAccount')}
            </button>
          </div>
        ) : (
          <>
            <div style={lastRowStyle}>
              <div style={labelStyle}>
                <div style={{...iconStyle, background: 'var(--destructive-bg)', color: 'var(--destructive-text)'}}>⚠️</div>
                <div>
                  <div style={{fontWeight: 500, fontSize: '15px', color: 'var(--destructive-text)'}}>{t('profile.deleteAccountSection') || '注销账号'}</div>
                  <div style={{fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px'}}>{t('profile.deleteAccountWarning') || '注销后数据将无法恢复'}</div>
                </div>
              </div>
              <button
                style={{
                  fontSize: '13px', padding: '6px 14px', borderRadius: '8px',
                  background: 'var(--destructive-bg)', border: '1px solid var(--destructive-border)',
                  color: 'var(--destructive-text)', cursor: 'pointer'
                }}
                onClick={() => { setShowDeleteConfirm(true); setDeleteStep(0); setDeletePassword(''); setDeleteError(''); }}
              >
                {t('profile.requestDeletion') || '申请注销'}
              </button>
            </div>
            {showDeleteConfirm && (
              <div style={{
                background: 'var(--destructive-bg-subtle)', border: '1px solid var(--destructive-border-subtle)',
                borderRadius: '8px', padding: '16px', marginTop: '12px'
              }}>
                {deleteStep === 0 && (
                  <>
                    <h4 style={{ color: 'var(--destructive-text)', marginBottom: '12px', fontSize: '14px' }}>{t('profile.deleteConfirmTitle')}</h4>
                    <div style={{ background: 'var(--destructive-bg-subtle)', borderRadius: '6px', padding: '12px', marginBottom: '16px', fontSize: '13px', color: 'var(--destructive-text-light)', lineHeight: 1.7 }}>
                      <p style={{ margin: '0 0 8px 0' }}>{t('profile.pleaseReadCarefully')}</p>
                      <ul style={{ margin: 0, paddingLeft: '16px' }}>
                        <li>{t('profile.deletionCoolingPeriod')}</li>
                        <li>{t('profile.canCancelAnytime')}</li>
                        <li>{t('profile.permanentDeleteAfter7Days')}</li>
                        <li>{t('profile.deletionIrreversible')}</li>
                      </ul>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn btn-secondary" style={{ fontSize: '13px' }} onClick={() => setShowDeleteConfirm(false)}>{t('profile.letMeThink')}</button>
                      <button style={{ background: 'var(--destructive-bg-strong)', border: '1px solid var(--destructive-border)', color: 'var(--destructive-text)', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px' }} onClick={() => setDeleteStep(1)}>{t('profile.understoodContinue')}</button>
                    </div>
                  </>
                )}
                {deleteStep === 1 && (
                  <>
                    <h4 style={{ color: 'var(--destructive-text)', marginBottom: '12px', fontSize: '14px' }}>{t('profile.enterPasswordConfirm')}</h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '12px' }}>{t('profile.enterPasswordToConfirm')}</p>
                    <PasswordToggle
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      show={showDeletePassword}
                      onToggle={() => setShowDeletePassword(!showDeletePassword)}
                      placeholder={t('profile.enterLoginPassword')}
                      style={{
                        width: '100%', padding: '10px 14px', borderRadius: '6px',
                        background: 'var(--input)', border: '1px solid var(--border)',
                        color: 'var(--foreground)', fontSize: '14px', marginBottom: '12px'
                      }}
                    />
                    {deleteError && <p style={{ color: 'var(--destructive-text)', fontSize: '13px', marginBottom: '8px' }}>{deleteError}</p>}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn btn-secondary" style={{ fontSize: '13px' }} onClick={() => { setDeleteStep(0); setDeletePassword(''); setDeleteError(''); }}>{t('common.back')}</button>
                      <button
                        style={{ background: 'var(--destructive-bg-strong)', border: '1px solid var(--destructive-border)', color: 'var(--destructive-text)', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px' }}
                        disabled={!deletePassword || deleteLoading}
                        onClick={async () => {
                          try {
                            await axios.post(API.AUTH.LOGIN, { email: user.email, password: deletePassword });
                            setDeleteStep(2);
                            setDeleteError('');
                          } catch {
                            setDeleteError(t('profile.incorrectPassword'));
                          }
                        }}
                      >
                        {deleteLoading ? t('profile.verifying') : t('profile.verifyPassword')}
                      </button>
                    </div>
                  </>
                )}
                {deleteStep === 2 && (
                  <>
                    <h4 style={{ color: 'var(--destructive-text)', marginBottom: '12px', fontSize: '14px' }}>{t('profile.finalConfirm')}</h4>
                    <p style={{ color: 'var(--destructive-text-light)', fontSize: '14px', marginBottom: '16px', fontWeight: 500 }}>
                      {t('profile.finalConfirmText')}
                    </p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn btn-secondary" style={{ fontSize: '13px' }} onClick={() => { setShowDeleteConfirm(false); setDeleteStep(0); }}>{t('common.cancel')}</button>
                      <button
                        style={{ background: 'var(--destructive)', border: 'none', color: 'var(--btn-text)', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}
                        disabled={deleteLoading}
                        onClick={handleRequestDeletion}
                      >
                        {deleteLoading ? t('common.processing') : t('profile.confirmSubmitDeletion')}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* 2FA 弹窗 */}
      {show2FA && (
        <TwoFactorAuth user={user} setUser={setUser} onClose={() => setShow2FA(false)} />
      )}
    </div>
  );
};

export default AccountSecurity;
