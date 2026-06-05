import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import PasswordToggle from './PasswordToggle';
import API from '../utils/apiEndpoints';

const DeleteAccount = ({ user }) => {
  const { t } = useI18n();
  const { getAuthHeaders } = useAuth();
  const navigate = useNavigate();

  const [deletionStatus, setDeletionStatus] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteStep, setDeleteStep] = useState(0);
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

  useEffect(() => {
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

  return (
    <div style={{maxWidth: '560px', margin: '0 auto'}}>
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
        <h2 style={{margin: 0, color: 'var(--destructive-text)'}}>{t('profile.deleteAccountSection')}</h2>
      </div>

      {deletionStatus ? (
        <div style={{
          background: 'var(--destructive-bg-subtle)', border: '1px solid var(--destructive-border-subtle)',
          borderRadius: '12px', padding: '24px'
        }}>
          <h3 style={{ color: 'var(--destructive-text)', marginBottom: '12px', fontSize: '16px' }}>{t('profile.accountDeleting')}</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.7, marginBottom: '12px' }}>
            {t('profile.deletionCountdown')} <strong style={{ color: 'var(--destructive-text)' }}>{formatCountdown(deletionStatus.deleteAt)}</strong> {t('profile.deletionCountdownAfter')}
          </p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '16px' }}>
            {t('profile.estimatedDeleteTime')}{new Date(deletionStatus.deleteAt).toLocaleString()}
          </p>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '13px', marginBottom: '16px' }}>
            {t('profile.cancelHint')}
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
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: '12px', padding: '24px'
        }}>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '13px', marginBottom: '16px' }}>
            {t('profile.deleteAccountWarning')}
          </p>
          {!showDeleteConfirm ? (
            <button
              style={{
                background: 'var(--destructive-bg)', border: '1px solid var(--destructive-border)',
                color: 'var(--destructive-text)', borderRadius: '8px', padding: '8px 16px',
                cursor: 'pointer', fontSize: '13px'
              }}
              onClick={() => { setShowDeleteConfirm(true); setDeleteStep(0); setDeletePassword(''); setDeleteError(''); }}
            >
              {t('profile.requestDeletion')}
            </button>
          ) : (
            <div style={{
              background: 'var(--destructive-bg-subtle)', border: '1px solid var(--destructive-border-subtle)',
              borderRadius: '8px', padding: '16px'
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
        </div>
      )}
    </div>
  );
};

export default DeleteAccount;
