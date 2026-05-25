import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useLocation } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import useTranslation from '../hooks/useTranslation';
import TwoFactorAuth from './TwoFactorAuth';

const Profile = ({ user, setUser, logout }) => {
  const { t, lang, locale } = useI18n();
  const { getLocalizedTitle } = useTranslation();
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };
  const [followedEpisodes, setFollowedEpisodes] = useState([]);
  const [historyEpisodes, setHistoryEpisodes] = useState([]);
  const [favoriteEpisodes, setFavoriteEpisodes] = useState([]);

  const [loading, setLoading] = useState(true);
  const [deletionStatus, setDeletionStatus] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteStep, setDeleteStep] = useState(0);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('follows');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMsg, setResendMsg] = useState('');
  const [resendSuccess, setResendSuccess] = useState(false);
  const [editingNickname, setEditingNickname] = useState(false);
  const [nicknameValue, setNicknameValue] = useState('');
  const [nicknameLoading, setNicknameLoading] = useState(false);
  const [nicknameError, setNicknameError] = useState('');
  const [show2FA, setShow2FA] = useState(false);

  const location = useLocation();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) { setLoading(false); return; }
        const config = { headers: getAuthHeaders() };
        let followData = [];
        let historyData = [];
        try {
          const followRes = await axios.get('/api/follows/list', config);
          followData = followRes.data.list || followRes.data || [];
        } catch (e) {
          if (e.response?.status === 401) { setLoading(false); return; }
          console.error(t('profile.fetchFollowsFailed') + ':', e.response?.data || e.message);
        }
        try {
          const historyRes = await axios.get('/api/histories/list', config);
          historyData = historyRes.data.list || historyRes.data || [];
        } catch (e) {
          if (e.response?.status === 401) { setLoading(false); return; }
          console.error(t('profile.fetchHistoryFailed') + ':', e.response?.data || e.message);
        }
        try {
          const favRes = await axios.get('/api/favorites/list', config);
          setFavoriteEpisodes(favRes.data.list || favRes.data || []);
        } catch (e) {
          if (e.response?.status === 401) { setLoading(false); return; }
        }

        setFollowedEpisodes(followData);
        setHistoryEpisodes(historyData);
        try {
          const delRes = await axios.get('/api/auth/deletion-status', config);
          if (delRes.data.requested) {
            setDeletionStatus(delRes.data);
          }
        } catch (e) {}
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };
    fetchData();
  }, [location]);

  const handleRequestDeletion = async () => {
    setDeleteLoading(true);
    setDeleteError('');
    try {
      const res = await axios.post('/api/auth/request-deletion', {}, {
        headers: getAuthHeaders()
      });
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
      await axios.post('/api/auth/cancel-deletion', {}, {
        headers: getAuthHeaders()
      });
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

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert(t('profile.avatarSizeLimit')); return; }
    if (!file.type.startsWith('image/')) { alert(t('profile.selectImageFile')); return; }
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const res = await axios.post('/api/users/avatar', formData, {
        headers: { ...getAuthHeaders(), 'X-Requested-With': 'XMLHttpRequest' }
      });
      if (setUser && user) {
        const updatedUser = { ...user, avatar: res.data.url };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
    } catch (err) {
      console.error('Avatar upload failed:', err);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleUnfavorite = async (episodeId) => {
    try {
      await axios.post('/api/favorites/remove', { episodeId }, {
        headers: getAuthHeaders()
      });
      setFavoriteEpisodes(prev => prev.filter(f => f.episodeId && String(f.episodeId._id) !== String(episodeId)));
    } catch (err) {
      console.error('Unfavorite failed:', err);
    }
  };

  if (loading) {
    return <div className="container"><h2>{t('common.loading')}</h2></div>;
  }

  const renderFollowCard = (follow) => {
    const episode = follow.episodeId;
    if (!episode) return null;
    const eid = String(episode._id);
    const historyRecord = historyEpisodes.find(h => h.episodeId && String(h.episodeId._id) === eid);
    const watchedEps = historyRecord ? historyRecord.watchedEpisodes : [];
    const progress = episode.totalEpisodes > 0 ? (watchedEps.length / episode.totalEpisodes) * 100 : 0;
    const unwatchedCount = episode.currentEpisodes - watchedEps.length;
    const hasUpdate = unwatchedCount > 0;
    const followedAtEps = follow.followedAtEpisodes || 0;
    const newUnwatchedCount = Math.max(0, episode.currentEpisodes - Math.max(watchedEps.length, followedAtEps));
    const hasNewUpdate = newUnwatchedCount > 0;
    return (
      <div key={episode._id} className="followed-episode-card">
        <Link to={`/episode/${episode._id}`}>
          <img src={episode.coverImage} alt={episode.title} />
        </Link>
        <div className="followed-episode-info">
          <h4>
            {getLocalizedTitle(episode)}
            {hasNewUpdate && (
              <span style={{
                fontSize: '12px', color: 'var(--destructive-text)', marginLeft: '8px',
                background: 'var(--destructive-bg)', padding: '2px 8px',
                borderRadius: '4px', border: '1px solid var(--destructive-border)'
              }}>{t('profile.hasUpdate')} +{newUnwatchedCount}{t('profile.episodesUnwatched')}</span>
            )}
            {hasUpdate && (
              <span style={{
                fontSize: '12px', color: 'var(--warning-text)', marginLeft: '8px',
                background: 'var(--warning-bg)', padding: '2px 8px',
                borderRadius: '4px', border: '1px solid var(--warning-border)'
              }}>{unwatchedCount}{t('profile.episodesUnwatched')}</span>
            )}
          </h4>
          <p>{t('episode.updatedTo')}{episode.currentEpisodes}{t('episode.epTotal')}{episode.totalEpisodes}{t('episode.epSuffix')}</p>
          {watchedEps.length > 0 && (
            <>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }}></div>
              </div>
              <p>{t('profile.watched')} {watchedEps.length} {t('episode.epSuffix')}</p>
              <p style={{fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px'}}>
                {t('profile.watchedEps')}{[...watchedEps].sort((a, b) => a - b).join(`${lang === 'zh' ? '、' : ', '}`)}{t('episode.epSuffix')}
              </p>
            </>
          )}
          <div style={{display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap'}}>
            <button
              className="btn btn-secondary"
              style={{fontSize: '13px', padding: '6px 14px'}}
              onClick={async () => {
                try {
                  await axios.post('/api/follows/remove', { episodeId: episode._id }, {
                    headers: getAuthHeaders()
                });
                setFollowedEpisodes(prev => prev.filter(f => f.episodeId && f.episodeId._id !== episode._id));
              } catch (err) {
                console.error(t('episode.unfollow'), err);
              }
            }}
          >{t('episode.unfollow')}</button>
          </div>
        </div>
      </div>
    );
  };

  const renderHistoryCard = (history) => {
    const episode = history.episodeId;
    if (!episode) return null;
    const progress = episode.totalEpisodes > 0 ? (history.watchedEpisodes.length / episode.totalEpisodes) * 100 : 0;
    return (
      <div key={episode._id} className="followed-episode-card">
        <Link to={`/episode/${episode._id}`}>
          <img src={episode.coverImage} alt={episode.title} />
        </Link>
        <div className="followed-episode-info">
          <h4>{getLocalizedTitle(episode)}</h4>
          <p>{t('episode.updatedTo')}{episode.currentEpisodes}{t('episode.epTotal')}{episode.totalEpisodes}{t('episode.epSuffix')}</p>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
          </div>
          <p>{t('profile.watched')} {history.watchedEpisodes.length} {t('episode.epSuffix')}</p>
          {history.watchedEpisodes.length > 0 && (
            <p style={{fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px'}}>
              {t('profile.watchedEps')}{[...history.watchedEpisodes].sort((a, b) => a - b).join(`${lang === 'zh' ? '、' : ', '}`)}{t('episode.epSuffix')}
            </p>
          )}
          <div style={{display: 'flex', gap: '8px', marginTop: '8px'}}>
            {!followedEpisodes.some(f => f.episodeId && String(f.episodeId._id) === String(episode._id)) && (
              <button
                className="btn"
                style={{fontSize: '13px', padding: '6px 14px'}}
                onClick={async () => {
                  try {
                    await axios.post('/api/follows/add', { episodeId: episode._id }, {
                      headers: getAuthHeaders()
                    });
                    setFollowedEpisodes(prev => [...prev, { episodeId: episode }]);
                  } catch (err) {
                    console.error(t('episode.follow'), err);
                  }
                }}
              >{t('episode.follow')}</button>
            )}
            <button
              className="btn btn-secondary"
              style={{fontSize: '13px', padding: '6px 14px'}}
              onClick={async () => {
                try {
                  await axios.delete(`/api/histories/${episode._id}`, {
                    headers: getAuthHeaders()
                  });
                  setHistoryEpisodes(prev => prev.filter(h => h.episodeId && h.episodeId._id !== episode._id));
                } catch (err) {
                  console.error(t('profile.deleteHistoryFailed'), err);
                }
              }}
            >{t('profile.deleteRecord')}</button>
          </div>
        </div>
      </div>
    );
  };

  const renderDeleteSection = () => {
    if (deletionStatus) {
      return (
        <div style={{
          marginTop: '30px', padding: '20px', borderRadius: '12px',
          background: 'var(--destructive-bg-subtle)', border: '1px solid var(--destructive-border-subtle)'
        }}>
          <h3 style={{ color: 'var(--destructive-text)', marginBottom: '12px', fontSize: '16px' }}>{t('profile.accountDeleting')}</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.7, marginBottom: '12px' }}>
            {t('profile.deletionCountdown')} <strong style={{ color: 'var(--destructive-text)' }}>{formatCountdown(deletionStatus.deleteAt)}</strong> {t('profile.deletionCountdownAfter')}
          </p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '16px' }}>
            {t('profile.estimatedDeleteTime')}{new Date(deletionStatus.deleteAt).toLocaleString(locale)}
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
      );
    }

    return (
      <div style={{
        marginTop: '30px', padding: '20px', borderRadius: '12px',
        background: 'var(--hover-bg)', border: '1px solid var(--border)'
      }}>
        <h3 style={{ color: 'var(--text-secondary)', marginBottom: '8px', fontSize: '16px' }}>{t('profile.deleteAccountSection')}</h3>
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
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
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
                        const token = localStorage.getItem('token');
                        await axios.post('/api/auth/login', { email: user.email, password: deletePassword });
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
    );
  };

  return (
    <div className="user-profile">
      <h2>{t('profile.title')}</h2>

      <div className="user-info">
        <div style={{display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px', flexWrap: 'wrap', justifyContent: 'center'}}>
          <div style={{position: 'relative'}}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%',
              background: user.avatar ? 'transparent' : 'var(--btn-gradient)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '24px', fontWeight: 700, color: 'var(--btn-text)', overflow: 'hidden'
            }}>
              {user.avatar ? (
                <img src={user.avatar} alt="" style={{width: '100%', height: '100%', objectFit: 'cover'}} />
              ) : (
                user.username?.charAt(0)?.toUpperCase()
              )}
            </div>
            <label style={{
              position: 'absolute', bottom: '-2px', right: '-2px',
              width: '22px', height: '22px', borderRadius: '50%',
              background: 'var(--primary)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', fontSize: '12px', border: '2px solid var(--card)'
            }}>
              📷
              <input type="file" accept="image/*" onChange={handleAvatarUpload}
                disabled={uploadingAvatar}
                style={{display: 'none'}} />
            </label>
          </div>
          <div>
            <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
              <h3 style={{margin: '0 0 4px 0'}}>{user.username}</h3>
              {!editingNickname && (
                <button
                  onClick={() => { setEditingNickname(true); setNicknameValue(user.username); setNicknameError(''); }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--primary)', fontSize: '13px', padding: '2px 4px',
                    display: 'flex', alignItems: 'center'
                  }}
                  title={t('profile.editNickname')}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
              )}
            </div>
            {editingNickname && (
              <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', marginBottom: '4px'}}>
                <input
                  type="text"
                  value={nicknameValue}
                  onChange={(e) => setNicknameValue(e.target.value)}
                  maxLength={20}
                  style={{
                    padding: '4px 8px', borderRadius: '6px', fontSize: '14px',
                    background: 'var(--input)', border: '1px solid var(--border)',
                    color: 'var(--foreground)', width: '160px'
                  }}
                />
                <button
                  onClick={async () => {
                    if (!nicknameValue.trim()) { setNicknameError(t('profile.nicknameRequired')); return; }
                    setNicknameLoading(true);
                    setNicknameError('');
                    try {
                      const res = await axios.put('/api/users/profile', { username: nicknameValue.trim() }, {
                        headers: getAuthHeaders()
                      });
                      const updatedUser = { ...user, username: res.data.username };
                      setUser(updatedUser);
                      localStorage.setItem('user', JSON.stringify(updatedUser));
                      setEditingNickname(false);
                    } catch (err) {
                      setNicknameError(err.response?.data?.message || t('profile.updateFailed'));
                    }
                    setNicknameLoading(false);
                  }}
                  disabled={nicknameLoading}
                  style={{
                    padding: '4px 12px', borderRadius: '6px', fontSize: '13px',
                    background: 'var(--primary)', color: '#fff', border: 'none',
                    cursor: 'pointer', fontWeight: 500
                  }}
                >
                  {nicknameLoading ? t('common.saving') : t('common.save')}
                </button>
                <button
                  onClick={() => { setEditingNickname(false); setNicknameError(''); }}
                  style={{
                    padding: '4px 12px', borderRadius: '6px', fontSize: '13px',
                    background: 'var(--hover-bg)', color: 'var(--foreground)',
                    border: '1px solid var(--border)', cursor: 'pointer'
                  }}
                >
                  {t('common.cancel')}
                </button>
              </div>
            )}
            {nicknameError && <p style={{color: 'var(--destructive-text)', fontSize: '12px', margin: '2px 0 0 0'}}>{nicknameError}</p>}
            <p style={{margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '13px'}}>
              {t('profile.accountIdLabel')}: <span style={{color: 'var(--text-tertiary)', letterSpacing: '0.5px'}}>{user.accountId || '-'}</span>
            </p>
            <p style={{margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '14px'}}>{user.email}</p>
            {user.isEmailVerified ? (
              <span style={{
                display: 'inline-block', marginTop: '6px', fontSize: '12px',
                color: 'var(--success-text)', background: 'var(--success-bg)',
                padding: '2px 10px', borderRadius: '12px',
                border: '1px solid var(--success-border)'
              }}>{t('auth.emailVerified')}</span>
            ) : (
              <div style={{ marginTop: '8px' }}>
                <span style={{
                  display: 'inline-block', fontSize: '12px',
                  color: 'var(--warning-text)', background: 'var(--warning-bg)',
                  padding: '2px 10px', borderRadius: '12px',
                  border: '1px solid var(--warning-border)', marginRight: '8px'
                }}>⚠ {t('auth.emailNotVerified')}</span>
                <button
                  onClick={async () => {
                    setResendLoading(true);
                    setResendMsg('');
                    setResendSuccess(false);
                    try {
                      const res = await axios.post('/api/auth/resend-verification', {}, {
                        headers: getAuthHeaders()
                      });
                      setResendMsg(res.data.message);
                      setResendSuccess(true);
                    } catch (err) {
                      setResendMsg(err.response?.data?.message || t('common.sendFailed'));
                      setResendSuccess(false);
                    }
                    setResendLoading(false);
                  }}
                  disabled={resendLoading}
                  style={{
                    fontSize: '12px', color: 'var(--primary)', background: 'none',
                    border: 'none', cursor: 'pointer', padding: '2px 4px',
                    textDecoration: 'underline'
                  }}
                >
                  {resendLoading ? t('auth.sending') : t('auth.resendVerification')}
                </button>
                {resendMsg && (
                  <p style={{
                    fontSize: '12px', margin: '4px 0 0 0',
                    color: resendSuccess ? 'var(--success-text)' : 'var(--destructive-text)'
                  }}>{resendMsg}</p>
                )}
              </div>
            )}
          </div>
        </div>
        <div style={{display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap', justifyContent: 'center'}}>
          <Link to="/change-password" className="btn" style={{display: 'inline-block'}}>{t('profile.changePassword')}</Link>
          <Link to="/devices" className="btn" style={{display: 'inline-block', border: '1px solid var(--primary-border)', background: 'var(--primary-bg)', color: 'var(--primary-light)'}}>{t('profile.manageDevices')}</Link>
          {show2FA ? (
            <></>
          ) : (
            <button onClick={() => setShow2FA(true)} className="btn" style={{display: 'inline-block', border: '1px solid var(--primary-border)', background: 'var(--primary-bg)', color: 'var(--primary-light)'}}>
              {t('twoFactor.title')}
            </button>
          )}
          <button onClick={async () => {
            try {
              const res = await fetch('/api/users/export-my-data', {
                headers: getAuthHeaders()
              });
              const blob = await res.blob();
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `my_data_${new Date().toISOString().split('T')[0]}.json`;
              a.click();
              window.URL.revokeObjectURL(url);
            } catch (e) {}
          }} style={{
            padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--primary-border)',
            background: 'var(--primary-bg)', color: 'var(--primary-light)',
            cursor: 'pointer', fontSize: '14px', fontWeight: 500, transition: 'all 0.2s'
          }}>{t('profile.exportData')}</button>
          <button onClick={logout} style={{
            padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--destructive-border)',
            background: 'var(--destructive-bg)', color: 'var(--destructive-text)',
            cursor: 'pointer', fontSize: '14px', fontWeight: 500, transition: 'all 0.2s'
          }}>{t('nav.logout')}</button>
        </div>
      </div>

      {show2FA && (
        <TwoFactorAuth user={user} setUser={setUser} onClose={() => setShow2FA(false)} />
      )}

      <div style={{display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap'}}>
        {[
          { key: 'follows', label: t('profile.myFollows'), count: followedEpisodes.length },
          { key: 'favorites', label: t('profile.myFavorites'), count: favoriteEpisodes.length },
          { key: 'history', label: t('profile.myHistory'), count: historyEpisodes.length },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            style={{
              background: activeTab === tab.key ? 'var(--primary)' : 'var(--hover-bg-strong)',
              color: activeTab === tab.key ? '#fff' : 'var(--foreground)',
              border: activeTab === tab.key ? '1px solid var(--primary)' : '1px solid var(--border)',
              padding: '8px 20px', borderRadius: '20px',
              cursor: 'pointer', fontSize: '14px', fontWeight: activeTab === tab.key ? 600 : 500,
              transition: 'all 0.2s',
              opacity: activeTab === tab.key ? 1 : 0.85
            }}>
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {activeTab === 'follows' && (
        <div className="followed-episodes">
          {followedEpisodes.length === 0 ? (
            <p>{t('profile.noFollows')}</p>
          ) : (
            followedEpisodes.map(follow => renderFollowCard(follow))
          )}
        </div>
      )}

      {activeTab === 'favorites' && (
        <div className="followed-episodes">
          {favoriteEpisodes.length === 0 ? (
            <p>{t('profile.noFavorites')}</p>
          ) : (
            favoriteEpisodes.map(fav => {
              const episode = fav.episodeId;
              if (!episode) return null;
              return (
                <div key={fav._id} className="followed-episode-card">
                  <Link to={`/episode/${episode._id}`}>
                    <img src={episode.coverImage} alt={episode.title} />
                  </Link>
                  <div className="followed-episode-info">
                    <h4>{getLocalizedTitle(episode)}</h4>
                    <p>{t('episode.updatedTo')}{episode.currentEpisodes}{t('episode.epTotal')}{episode.totalEpisodes}{t('episode.epSuffix')}</p>
                    {episode.averageRating > 0 && (
                      <p style={{fontSize: '13px', color: 'var(--warning-text)'}}>⭐ {episode.averageRating} ({episode.ratingCount}{t('episode.ratingCountLabel')})</p>
                    )}
                    <button className="btn btn-secondary" onClick={() => handleUnfavorite(episode._id)}
                      style={{marginTop: '8px', fontSize: '13px'}}>
                      {t('profile.unfavorite')}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="followed-episodes">
          {historyEpisodes.length === 0 ? (
            <p>{t('profile.noHistory')}</p>
          ) : (
            historyEpisodes.map(history => renderHistoryCard(history))
          )}
        </div>
      )}

      {renderDeleteSection()}
    </div>
  );
};

export default Profile;
