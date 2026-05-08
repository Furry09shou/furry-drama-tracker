import React, { useState, useEffect } from 'react';
import { useEpisodes } from '../hooks/useEpisodes';

const SingleEpisodeManager = ({ episode, onClose }) => {
  const { 
    fetchSingleEpisodes, 
    addSingleEpisode, 
    updateSingleEpisode, 
    deleteSingleEpisode 
  } = useEpisodes();
  
  const [singleEpisodes, setSingleEpisodes] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSingleEpisode, setEditingSingleEpisode] = useState(null);
  const [newSingleEpisode, setNewSingleEpisode] = useState({
    episodeNumber: 1,
    title: '',
    duration: '',
    platformLinksList: [],
    scheduledDate: '',
    isScheduled: false,
    releaseDate: ''
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (episode) {
      loadSingleEpisodes();
    }
  }, [episode]);

  const loadSingleEpisodes = async () => {
    const episodes = await fetchSingleEpisodes(episode._id);
    setSingleEpisodes(episodes);
  };

  const handleAddSingleEpisode = async (e) => {
    e.preventDefault();
    try {
      const submitData = {
        ...newSingleEpisode,
        platformLinks: linksListToObj(newSingleEpisode.platformLinksList),
        scheduledDate: newSingleEpisode.isScheduled && newSingleEpisode.scheduledDate
          ? new Date(newSingleEpisode.scheduledDate).toISOString()
          : null,
        isScheduled: newSingleEpisode.isScheduled,
        releaseDate: newSingleEpisode.releaseDate
          ? new Date(newSingleEpisode.releaseDate).toISOString()
          : null
      };
      
      if (editingSingleEpisode) {
        await updateSingleEpisode(editingSingleEpisode._id, submitData);
      } else {
        await addSingleEpisode(episode._id, submitData);
      }
      
      setEditingSingleEpisode(null);
      setShowAddForm(false);
      await loadSingleEpisodes();
      resetForm();
      setError('');
    } catch (err) {
      setError(editingSingleEpisode ? '编辑单集失败' : '添加单集失败');
    }
  };

  const handleEditSingleEpisode = (singleEpisode) => {
    setEditingSingleEpisode(singleEpisode);
    setNewSingleEpisode({
      episodeNumber: singleEpisode.episodeNumber,
      title: singleEpisode.title,
      duration: singleEpisode.duration,
      platformLinksList: toLinksList(singleEpisode.platformLinks),
      scheduledDate: singleEpisode.scheduledDate
        ? new Date(singleEpisode.scheduledDate).toISOString().slice(0, 16)
        : '',
      isScheduled: singleEpisode.isScheduled || false,
      releaseDate: singleEpisode.releaseDate
        ? new Date(singleEpisode.releaseDate).toISOString().slice(0, 16)
        : ''
    });
    setShowAddForm(true);
  };

  const handleDeleteSingleEpisode = async (id) => {
    if (!window.confirm('确定要删除这个单集吗？')) return;
    try {
      await deleteSingleEpisode(id);
      await loadSingleEpisodes();
      setError('');
    } catch (err) {
      setError('删除单集失败');
    }
  };

  const resetForm = () => {
    const nextNum = singleEpisodes.length + 1;
    setNewSingleEpisode({
      episodeNumber: nextNum,
      title: `第${nextNum}集`,
      duration: '',
      platformLinksList: [],
      scheduledDate: '',
      isScheduled: false,
      releaseDate: ''
    });
  };

  const toLinksList = (platformLinks) => {
    if (!platformLinks) return [];
    if (Array.isArray(platformLinks)) {
      return platformLinks.filter(item => item.name).map(item => ({ name: item.name, url: item.url }));
    }
    if (typeof platformLinks === 'object') {
      return Object.entries(platformLinks).map(([name, url]) => ({ name, url }));
    }
    return [];
  };

  const linksListToObj = (list) => {
    const obj = {};
    list.forEach(item => { if (item.name.trim()) obj[item.name.trim()] = item.url; });
    return obj;
  };

  const addPlatformLink = () => {
    setNewSingleEpisode(prev => ({
      ...prev,
      platformLinksList: [...prev.platformLinksList, { name: '', url: '' }]
    }));
  };

  const updatePlatformLink = (index, field, value) => {
    setNewSingleEpisode(prev => {
      const newList = [...prev.platformLinksList];
      newList[index] = { ...newList[index], [field]: value };
      return { ...prev, platformLinksList: newList };
    });
  };

  const removePlatformLink = (index) => {
    setNewSingleEpisode(prev => ({
      ...prev,
      platformLinksList: prev.platformLinksList.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="single-episode-manager" style={{ 
      marginTop: '20px', 
      borderTop: '1px solid var(--border)', 
      paddingTop: '20px' 
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '15px' 
      }}>
        <h4>单集管理</h4>
        <button 
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: '1px solid var(--border)',
            backgroundColor: 'transparent',
            color: 'var(--text-light)',
            cursor: 'pointer',
            fontSize: '14px'
          }}
          onClick={() => {
            if (showAddForm && !editingSingleEpisode) {
              setShowAddForm(false);
            } else {
              setShowAddForm(true);
              setEditingSingleEpisode(null);
              resetForm();
            }
          }}
        >
          {showAddForm && !editingSingleEpisode ? '取消' : '添加单集'}
        </button>
      </div>

      {showAddForm && (
        <div style={{ 
          marginBottom: '15px', 
          background: 'var(--hover-bg)', 
          padding: '15px', 
          borderRadius: '8px', 
          border: '1px solid var(--border)' 
        }}>
          <h4>{editingSingleEpisode ? `编辑第${editingSingleEpisode.episodeNumber}集` : '添加单集'}</h4>
          <form onSubmit={handleAddSingleEpisode}>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>集数</label>
              <input
                type="number"
                value={newSingleEpisode.episodeNumber}
                onChange={(e) => setNewSingleEpisode({...newSingleEpisode, episodeNumber: parseInt(e.target.value) || 1})}
                required
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--hover-bg-strong)',
                  color: 'var(--text-light)',
                  fontSize: '14px'
                }}
              />
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>标题</label>
              <input
                type="text"
                value={newSingleEpisode.title}
                onChange={(e) => setNewSingleEpisode({...newSingleEpisode, title: e.target.value})}
                required
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--hover-bg-strong)',
                  color: 'var(--text-light)',
                  fontSize: '14px'
                }}
              />
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>时长</label>
              <input
                type="text"
                value={newSingleEpisode.duration}
                onChange={(e) => setNewSingleEpisode({...newSingleEpisode, duration: e.target.value})}
                placeholder="例如：24分钟"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--hover-bg-strong)',
                  color: 'var(--text-light)',
                  fontSize: '14px'
                }}
              />
            </div>
            {(episode.status === 'ongoing' || episode.status === 'completed') && (
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>发布日期 <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>（选填，不填默认上传日期）</span></label>
                <input
                  type="datetime-local"
                  value={newSingleEpisode.releaseDate}
                  onChange={(e) => setNewSingleEpisode({...newSingleEpisode, releaseDate: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--hover-bg-strong)',
                    color: 'var(--text-light)',
                    fontSize: '14px'
                  }}
                />
                <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                  适用于已上映但平台补充信息较晚的剧集
                </p>
              </div>
            )}
            <div style={{ marginBottom: '12px', padding: '12px', background: 'var(--hover-bg-strong)', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <input
                  type="checkbox"
                  checked={newSingleEpisode.isScheduled}
                  onChange={(e) => setNewSingleEpisode({...newSingleEpisode, isScheduled: e.target.checked, scheduledDate: e.target.checked ? newSingleEpisode.scheduledDate || '' : ''})}
                  style={{ accentColor: 'var(--primary)', cursor: 'pointer' }}
                />
                <label style={{ fontSize: '14px', cursor: 'pointer', color: 'var(--foreground)' }}>设置为预告更新</label>
              </div>
              {newSingleEpisode.isScheduled && (
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: 'var(--text-secondary)' }}>预告更新日期</label>
                  <input
                    type="datetime-local"
                    value={newSingleEpisode.scheduledDate}
                    onChange={(e) => setNewSingleEpisode({...newSingleEpisode, scheduledDate: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border)',
                      backgroundColor: 'var(--hover-bg)',
                      color: 'var(--text-light)',
                      fontSize: '14px'
                    }}
                  />
                  <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                    设置后将在更新日历中显示为预告
                  </p>
                </div>
              )}
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>跳转链接</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {newSingleEpisode.platformLinksList.map((item, index) => (
                  <div key={index} style={{
                    background: 'var(--hover-bg)', 
                    border: '1px solid var(--border)',
                    borderRadius: '8px', 
                    padding: '12px', 
                    position: 'relative'
                  }}>
                    <button
                      type="button"
                      onClick={() => removePlatformLink(index)}
                      style={{
                        position: 'absolute', 
                        top: '8px', 
                        right: '8px',
                        background: 'var(--destructive-bg)', 
                        border: '1px solid var(--destructive-border)',
                        color: 'var(--destructive-text)',
                        borderRadius: '4px',
                        padding: '2px 6px',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      删除
                    </button>
                    <div style={{ marginBottom: '8px' }}>
                      <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px' }}>平台名称</label>
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => updatePlatformLink(index, 'name', e.target.value)}
                        placeholder="例如：优酷、腾讯视频"
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          borderRadius: '4px',
                          border: '1px solid var(--border)',
                          backgroundColor: 'var(--hover-bg-strong)',
                          color: 'var(--text-light)',
                          fontSize: '13px'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px' }}>链接地址</label>
                      <input
                        type="text"
                        value={item.url}
                        onChange={(e) => updatePlatformLink(index, 'url', e.target.value)}
                        placeholder="输入完整的URL地址"
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          borderRadius: '4px',
                          border: '1px solid var(--border)',
                          backgroundColor: 'var(--hover-bg-strong)',
                          color: 'var(--text-light)',
                          fontSize: '13px'
                        }}
                      />
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addPlatformLink}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: '1px dashed var(--border)',
                    backgroundColor: 'transparent',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: '13px'
                  }}
                >
                  添加平台链接
                </button>
              </div>
            </div>
            {error && (
              <div style={{ 
                color: 'var(--destructive-text)', 
                fontSize: '13px', 
                marginBottom: '12px' 
              }}>
                {error}
              </div>
            )}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                type="submit" 
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid var(--primary)',
                  backgroundColor: 'var(--primary)',
                  color: 'var(--btn-text)',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                {editingSingleEpisode ? '更新单集' : '添加单集'}
              </button>
              <button 
                type="button" 
                onClick={() => {
                  setShowAddForm(false);
                  setEditingSingleEpisode(null);
                  resetForm();
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  backgroundColor: 'transparent',
                  color: 'var(--text-light)',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                取消
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="single-episodes-list">
        {singleEpisodes.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>暂无单集，点击"添加单集"按钮开始添加</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px' }}>
            {singleEpisodes.map(singleEpisode => (
              <div key={singleEpisode._id} style={{
                background: 'var(--hover-bg)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '15px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h5 style={{ margin: 0 }}>第{singleEpisode.episodeNumber}集</h5>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleEditSingleEpisode(singleEpisode)}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        border: '1px solid var(--border)',
                        backgroundColor: 'transparent',
                        color: 'var(--text-light)',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => handleDeleteSingleEpisode(singleEpisode._id)}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        border: '1px solid var(--destructive-border)',
                        backgroundColor: 'var(--destructive-bg)',
                        color: 'var(--destructive-text)',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      删除
                    </button>
                  </div>
                </div>
                <p style={{ margin: '8px 0', fontSize: '14px' }}>{singleEpisode.title}</p>
                {singleEpisode.releaseDate && (
                  <p style={{ margin: '8px 0', fontSize: '13px', color: 'var(--primary-light)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    📅 发布: {new Date(singleEpisode.releaseDate).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                )}
                {singleEpisode.isScheduled && singleEpisode.scheduledDate && (
                  <p style={{ margin: '8px 0', fontSize: '13px', color: 'var(--warning-text)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    🔔 预告: {new Date(singleEpisode.scheduledDate).toLocaleString('zh-CN')}
                  </p>
                )}
                {singleEpisode.duration && (
                  <p style={{ margin: '8px 0', fontSize: '13px', color: 'var(--text-secondary)' }}>时长: {singleEpisode.duration}</p>
                )}
                {singleEpisode.platformLinks && Object.keys(singleEpisode.platformLinks).length > 0 && (
                  <div style={{ marginTop: '10px' }}>
                    <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: 'var(--text-secondary)' }}>跳转链接:</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {Object.entries(singleEpisode.platformLinks).map(([name, url]) => (
                        <a 
                          key={name} 
                          href={url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            backgroundColor: 'var(--primary-bg)',
                            color: 'var(--primary)',
                            textDecoration: 'none'
                          }}
                        >
                          {name}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SingleEpisodeManager;
