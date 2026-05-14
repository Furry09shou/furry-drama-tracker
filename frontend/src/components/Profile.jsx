import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useLocation } from 'react-router-dom';

const Profile = ({ user, setUser, logout }) => {
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

  const location = useLocation();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) { setLoading(false); return; }
        const config = { headers: { Authorization: `Bearer ${token}` } };
        let followData = [];
        let historyData = [];
        try {
          const followRes = await axios.get('/api/follows/list', config);
          followData = followRes.data || [];
        } catch (e) { console.error('获取追番失败:', e.response?.data || e.message); }
        try {
          const historyRes = await axios.get('/api/histories/list', config);
          historyData = historyRes.data || [];
        } catch (e) { console.error('获取历史失败:', e.response?.data || e.message); }
        try {
          const favRes = await axios.get('/api/favorites/list', config);
          setFavoriteEpisodes(favRes.data || []);
        } catch (e) {}

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
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/auth/request-deletion', {}, {
        headers: { Authorization: `Bearer ${token}` }
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
      setDeleteError(err.response?.data?.message || '申请注销失败');
    }
    setDeleteLoading(false);
  };

  const handleCancelDeletion = async () => {
    setCancelLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/auth/cancel-deletion', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDeletionStatus(null);
    } catch (err) {
      console.error('取消注销失败', err);
    }
    setCancelLoading(false);
  };

  const formatCountdown = (deleteAt) => {
    const now = new Date();
    const target = new Date(deleteAt);
    const diff = target - now;
    if (diff <= 0) return '即将执行';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (days > 0) return `${days}天${hours}小时`;
    if (hours > 0) return `${hours}小时${minutes}分钟`;
    return `${minutes}分钟`;
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert('图片大小不能超过2MB'); return; }
    if (!file.type.startsWith('image/')) { alert('请选择图片文件'); return; }
    setUploadingAvatar(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('avatar', file);
      const res = await axios.post('/api/users/avatar', formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
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
      const token = localStorage.getItem('token');
      await axios.post('/api/favorites/remove', { episodeId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFavoriteEpisodes(prev => prev.filter(f => f.episodeId && String(f.episodeId._id) !== String(episodeId)));
    } catch (err) {
      console.error('Unfavorite failed:', err);
    }
  };

  if (loading) {
    return <div className="container"><h2>加载中...</h2></div>;
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
            {episode.title}
            {hasNewUpdate && (
              <span style={{
                fontSize: '12px', color: 'var(--destructive-text)', marginLeft: '8px',
                background: 'var(--destructive-bg)', padding: '2px 8px',
                borderRadius: '4px', border: '1px solid var(--destructive-border)'
              }}>有更新 +{newUnwatchedCount}集</span>
            )}
            {hasUpdate && (
              <span style={{
                fontSize: '12px', color: 'var(--warning-text)', marginLeft: '8px',
                background: 'var(--warning-bg)', padding: '2px 8px',
                borderRadius: '4px', border: '1px solid var(--warning-border)'
              }}>{unwatchedCount}集未看</span>
            )}
          </h4>
          <p>更新至第{episode.currentEpisodes}集，共{episode.totalEpisodes}集</p>
          {watchedEps.length > 0 && (
            <>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }}></div>
              </div>
              <p>已观看 {watchedEps.length} 集</p>
              <p style={{fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px'}}>
                已看：第{[...watchedEps].sort((a, b) => a - b).join('、')}集
              </p>
            </>
          )}
          <div style={{display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap'}}>
            <button
              className="btn btn-secondary"
              style={{fontSize: '13px', padding: '6px 14px'}}
              onClick={async () => {
                try {
                  const token = localStorage.getItem('token');
                  await axios.post('/api/follows/remove', { episodeId: episode._id }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setFollowedEpisodes(prev => prev.filter(f => f.episodeId && f.episodeId._id !== episode._id));
              } catch (err) {
                console.error('取消追番失败', err);
              }
            }}
          >取消追番</button>
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
          <h4>{episode.title}</h4>
          <p>更新至第{episode.currentEpisodes}集，共{episode.totalEpisodes}集</p>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
          </div>
          <p>已观看 {history.watchedEpisodes.length} 集</p>
          {history.watchedEpisodes.length > 0 && (
            <p style={{fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px'}}>
              已看：第{[...history.watchedEpisodes].sort((a, b) => a - b).join('、')}集
            </p>
          )}
          <div style={{display: 'flex', gap: '8px', marginTop: '8px'}}>
            {!followedEpisodes.some(f => f.episodeId && String(f.episodeId._id) === String(episode._id)) && (
              <button
                className="btn"
                style={{fontSize: '13px', padding: '6px 14px'}}
                onClick={async () => {
                  try {
                    const token = localStorage.getItem('token');
                    await axios.post('/api/follows/add', { episodeId: episode._id }, {
                      headers: { Authorization: `Bearer ${token}` }
                    });
                    setFollowedEpisodes(prev => [...prev, { episodeId: episode }]);
                  } catch (err) {
                    console.error('追番失败', err);
                  }
                }}
              >追番</button>
            )}
            <button
              className="btn btn-secondary"
              style={{fontSize: '13px', padding: '6px 14px'}}
              onClick={async () => {
                try {
                  const token = localStorage.getItem('token');
                  await axios.delete(`/api/histories/${episode._id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                  });
                  setHistoryEpisodes(prev => prev.filter(h => h.episodeId && h.episodeId._id !== episode._id));
                } catch (err) {
                  console.error('删除历史失败', err);
                }
              }}
            >删除记录</button>
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
          <h3 style={{ color: 'var(--destructive-text)', marginBottom: '12px', fontSize: '16px' }}>⚠️ 账号注销中</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.7, marginBottom: '12px' }}>
            您已提交注销申请，账号将在 <strong style={{ color: 'var(--destructive-text)' }}>{formatCountdown(deletionStatus.deleteAt)}</strong> 后被永久删除。
          </p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '16px' }}>
            预计删除时间：{new Date(deletionStatus.deleteAt).toLocaleString('zh-CN')}
          </p>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '13px', marginBottom: '16px' }}>
            在反悔期内，您可以随时取消注销申请，恢复账号正常使用。
          </p>
          <button
            className="btn"
            style={{ background: 'var(--btn-gradient-success)', fontSize: '14px' }}
            onClick={handleCancelDeletion}
            disabled={cancelLoading}
          >
            {cancelLoading ? '处理中...' : '↩️ 取消注销，保留账号'}
          </button>
        </div>
      );
    }

    return (
      <div style={{
        marginTop: '30px', padding: '20px', borderRadius: '12px',
        background: 'var(--hover-bg)', border: '1px solid var(--border)'
      }}>
        <h3 style={{ color: 'var(--text-secondary)', marginBottom: '8px', fontSize: '16px' }}>危险区域</h3>
        <p style={{ color: 'var(--text-tertiary)', fontSize: '13px', marginBottom: '16px' }}>
          注销账号后，您的所有数据将被永久删除，且无法恢复。
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
            🗑️ 申请注销账号
          </button>
        ) : (
          <div style={{
            background: 'var(--destructive-bg-subtle)', border: '1px solid var(--destructive-border-subtle)',
            borderRadius: '8px', padding: '16px'
          }}>
            {deleteStep === 0 && (
              <>
                <h4 style={{ color: 'var(--destructive-text)', marginBottom: '12px', fontSize: '14px' }}>确认注销账号</h4>
                <div style={{ background: 'var(--destructive-bg-subtle)', borderRadius: '6px', padding: '12px', marginBottom: '16px', fontSize: '13px', color: 'var(--destructive-text-light)', lineHeight: 1.7 }}>
                  <p style={{ margin: '0 0 8px 0' }}>⚠️ 请仔细阅读以下内容：</p>
                  <ul style={{ margin: 0, paddingLeft: '16px' }}>
                    <li>注销申请提交后有 <strong>7天反悔期</strong></li>
                    <li>反悔期内可随时取消注销</li>
                    <li>7天后账号及所有数据将被 <strong>永久删除</strong></li>
                    <li>删除后无法恢复，包括追番、观看记录等</li>
                  </ul>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-secondary" style={{ fontSize: '13px' }} onClick={() => setShowDeleteConfirm(false)}>我再想想</button>
                  <button style={{ background: 'var(--destructive-bg-strong)', border: '1px solid var(--destructive-border)', color: 'var(--destructive-text)', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px' }} onClick={() => setDeleteStep(1)}>我已了解，继续</button>
                </div>
              </>
            )}
            {deleteStep === 1 && (
              <>
                <h4 style={{ color: 'var(--destructive-text)', marginBottom: '12px', fontSize: '14px' }}>输入密码确认</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '12px' }}>请输入您的登录密码以确认身份</p>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="请输入登录密码"
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: '6px',
                    background: 'var(--input)', border: '1px solid var(--border)',
                    color: 'var(--foreground)', fontSize: '14px', marginBottom: '12px'
                  }}
                />
                {deleteError && <p style={{ color: 'var(--destructive-text)', fontSize: '13px', marginBottom: '8px' }}>{deleteError}</p>}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-secondary" style={{ fontSize: '13px' }} onClick={() => { setDeleteStep(0); setDeletePassword(''); setDeleteError(''); }}>返回</button>
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
                        setDeleteError('密码不正确');
                      }
                    }}
                  >
                    {deleteLoading ? '验证中...' : '验证密码'}
                  </button>
                </div>
              </>
            )}
            {deleteStep === 2 && (
              <>
                <h4 style={{ color: 'var(--destructive-text)', marginBottom: '12px', fontSize: '14px' }}>最后确认</h4>
                <p style={{ color: 'var(--destructive-text-light)', fontSize: '14px', marginBottom: '16px', fontWeight: 500 }}>
                  确定要提交注销申请吗？提交后有7天反悔期。
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-secondary" style={{ fontSize: '13px' }} onClick={() => { setShowDeleteConfirm(false); setDeleteStep(0); }}>取消</button>
                  <button
                    style={{ background: 'var(--destructive)', border: 'none', color: 'var(--btn-text)', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}
                    disabled={deleteLoading}
                    onClick={handleRequestDeletion}
                  >
                    {deleteLoading ? '提交中...' : '确认提交注销申请'}
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
      <h2>个人中心</h2>

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
            <h3 style={{margin: '0 0 4px 0'}}>{user.username}</h3>
            <p style={{margin: 0, color: 'var(--text-secondary)', fontSize: '14px'}}>{user.email}</p>
            {user.isEmailVerified ? (
              <span style={{
                display: 'inline-block', marginTop: '6px', fontSize: '12px',
                color: 'var(--success-text)', background: 'var(--success-bg)',
                padding: '2px 10px', borderRadius: '12px',
                border: '1px solid var(--success-border)'
              }}>✓ 邮箱已验证</span>
            ) : (
              <div style={{ marginTop: '8px' }}>
                <span style={{
                  display: 'inline-block', fontSize: '12px',
                  color: 'var(--warning-text)', background: 'var(--warning-bg)',
                  padding: '2px 10px', borderRadius: '12px',
                  border: '1px solid var(--warning-border)', marginRight: '8px'
                }}>⚠ 邮箱未验证</span>
                <button
                  onClick={async () => {
                    setResendLoading(true);
                    setResendMsg('');
                    try {
                      const token = localStorage.getItem('token');
                      const res = await axios.post('/api/auth/resend-verification', {}, {
                        headers: { Authorization: `Bearer ${token}` }
                      });
                      setResendMsg(res.data.message);
                    } catch (err) {
                      setResendMsg(err.response?.data?.message || '发送失败');
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
                  {resendLoading ? '发送中...' : '重新发送验证邮件'}
                </button>
                {resendMsg && (
                  <p style={{
                    fontSize: '12px', margin: '4px 0 0 0',
                    color: resendMsg.includes('已发送') ? 'var(--success-text)' : 'var(--destructive-text)'
                  }}>{resendMsg}</p>
                )}
              </div>
            )}
          </div>
        </div>
        <div style={{display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap', justifyContent: 'center'}}>
          <Link to="/change-password" className="btn" style={{display: 'inline-block'}}>修改密码</Link>
          <Link to="/devices" className="btn" style={{display: 'inline-block', border: '1px solid var(--primary-border)', background: 'var(--primary-bg)', color: 'var(--primary-light)'}}>管理设备</Link>
          <button onClick={async () => {
            try {
              const token = localStorage.getItem('token');
              const res = await fetch('/api/users/export-my-data', {
                headers: { Authorization: `Bearer ${token}` }
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
          }}>📥 导出我的数据</button>
          <button onClick={logout} style={{
            padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--destructive-border)',
            background: 'var(--destructive-bg)', color: 'var(--destructive-text)',
            cursor: 'pointer', fontSize: '14px', fontWeight: 500, transition: 'all 0.2s'
          }}>退出登录</button>
        </div>
      </div>

      <div style={{display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap'}}>
        {[
          { key: 'follows', label: '我的追番', count: followedEpisodes.length },
          { key: 'favorites', label: '我的收藏', count: favoriteEpisodes.length },
          { key: 'history', label: '观看历史', count: historyEpisodes.length },
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
            <p>还没有追番，去首页发现感兴趣的内容吧！</p>
          ) : (
            followedEpisodes.map(follow => renderFollowCard(follow))
          )}
        </div>
      )}

      {activeTab === 'favorites' && (
        <div className="followed-episodes">
          {favoriteEpisodes.length === 0 ? (
            <p>还没有收藏，在剧集详情页点击收藏按钮吧！</p>
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
                    <h4>{episode.title}</h4>
                    <p>更新至第{episode.currentEpisodes}集，共{episode.totalEpisodes}集</p>
                    {episode.averageRating > 0 && (
                      <p style={{fontSize: '13px', color: 'var(--warning-text)'}}>⭐ {episode.averageRating} ({episode.ratingCount}人评分)</p>
                    )}
                    <button className="btn btn-secondary" onClick={() => handleUnfavorite(episode._id)}
                      style={{marginTop: '8px', fontSize: '13px'}}>
                      取消收藏
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
            <p>暂无观看记录</p>
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
