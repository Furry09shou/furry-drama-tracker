import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const Profile = ({ user, setUser }) => {
  const [followedEpisodes, setFollowedEpisodes] = useState([]);
  const [historyEpisodes, setHistoryEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletionStatus, setDeletionStatus] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteStep, setDeleteStep] = useState(0);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

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
                fontSize: '12px', color: '#ef4444', marginLeft: '8px',
                background: 'rgba(239,68,68,0.15)', padding: '2px 8px',
                borderRadius: '4px', border: '1px solid rgba(239,68,68,0.3)'
              }}>有更新 +{newUnwatchedCount}集</span>
            )}
            {hasUpdate && (
              <span style={{
                fontSize: '12px', color: '#f59e0b', marginLeft: '8px',
                background: 'rgba(245,158,11,0.15)', padding: '2px 8px',
                borderRadius: '4px', border: '1px solid rgba(245,158,11,0.3)'
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
              <p style={{fontSize: '13px', color: '#94a3b8', marginTop: '4px'}}>
                已看：第{watchedEps.sort((a, b) => a - b).join('、')}集
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
            <p style={{fontSize: '13px', color: '#94a3b8', marginTop: '4px'}}>
              已看：第{history.watchedEpisodes.sort((a, b) => a - b).join('、')}集
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
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)'
        }}>
          <h3 style={{ color: '#ef4444', marginBottom: '12px', fontSize: '16px' }}>⚠️ 账号注销中</h3>
          <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: 1.7, marginBottom: '12px' }}>
            您已提交注销申请，账号将在 <strong style={{ color: '#ef4444' }}>{formatCountdown(deletionStatus.deleteAt)}</strong> 后被永久删除。
          </p>
          <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '16px' }}>
            预计删除时间：{new Date(deletionStatus.deleteAt).toLocaleString('zh-CN')}
          </p>
          <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '16px' }}>
            在反悔期内，您可以随时取消注销申请，恢复账号正常使用。
          </p>
          <button
            className="btn"
            style={{ background: 'linear-gradient(135deg, #10b981, #059669)', fontSize: '14px' }}
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
        background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)'
      }}>
        <h3 style={{ color: '#94a3b8', marginBottom: '8px', fontSize: '16px' }}>危险区域</h3>
        <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '16px' }}>
          注销账号后，您的所有数据将被永久删除，且无法恢复。
        </p>
        {!showDeleteConfirm ? (
          <button
            style={{
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              color: '#ef4444', borderRadius: '8px', padding: '8px 16px',
              cursor: 'pointer', fontSize: '13px'
            }}
            onClick={() => { setShowDeleteConfirm(true); setDeleteStep(0); setDeletePassword(''); setDeleteError(''); }}
          >
            🗑️ 申请注销账号
          </button>
        ) : (
          <div style={{
            background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: '8px', padding: '16px'
          }}>
            {deleteStep === 0 && (
              <>
                <h4 style={{ color: '#ef4444', marginBottom: '12px', fontSize: '14px' }}>确认注销账号</h4>
                <div style={{ background: 'rgba(239,68,68,0.08)', borderRadius: '6px', padding: '12px', marginBottom: '16px', fontSize: '13px', color: '#f87171', lineHeight: 1.7 }}>
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
                  <button style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', color: '#ef4444', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px' }} onClick={() => setDeleteStep(1)}>我已了解，继续</button>
                </div>
              </>
            )}
            {deleteStep === 1 && (
              <>
                <h4 style={{ color: '#ef4444', marginBottom: '12px', fontSize: '14px' }}>输入密码确认</h4>
                <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '12px' }}>请输入您的登录密码以确认身份</p>
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
                {deleteError && <p style={{ color: '#ef4444', fontSize: '13px', marginBottom: '8px' }}>{deleteError}</p>}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-secondary" style={{ fontSize: '13px' }} onClick={() => { setDeleteStep(0); setDeletePassword(''); setDeleteError(''); }}>返回</button>
                  <button
                    style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', color: '#ef4444', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px' }}
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
                <h4 style={{ color: '#ef4444', marginBottom: '12px', fontSize: '14px' }}>最后确认</h4>
                <p style={{ color: '#f87171', fontSize: '14px', marginBottom: '16px', fontWeight: 500 }}>
                  确定要提交注销申请吗？提交后有7天反悔期。
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-secondary" style={{ fontSize: '13px' }} onClick={() => { setShowDeleteConfirm(false); setDeleteStep(0); }}>取消</button>
                  <button
                    style={{ background: '#ef4444', border: 'none', color: '#fff', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}
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
        <h3>用户信息</h3>
        <p><strong>用户名：</strong>{user.username}</p>
        <p><strong>邮箱：</strong>{user.email}</p>
        <Link to="/change-password" className="btn" style={{marginTop: '10px', display: 'inline-block'}}>修改密码</Link>
      </div>

      <div className="followed-episodes">
        <h3>我的追番</h3>
        {followedEpisodes.length === 0 ? (
          <p>还没有追番，去首页发现感兴趣的内容吧！</p>
        ) : (
          followedEpisodes.map(follow => renderFollowCard(follow))
        )}
      </div>

      <div className="followed-episodes" style={{marginTop: '30px'}}>
        <h3>观看历史</h3>
        {historyEpisodes.length === 0 ? (
          <p>暂无观看记录</p>
        ) : (
          historyEpisodes.map(history => renderHistoryCard(history))
        )}
      </div>

      {renderDeleteSection()}
    </div>
  );
};

export default Profile;
