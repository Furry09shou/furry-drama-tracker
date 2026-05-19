import React, { useState, useEffect } from 'react';
import { useEpisodes } from '../hooks/useEpisodes';
import { useI18n } from '../contexts/I18nContext';

const SingleEpisodeManager = ({ episode, onClose }) => {
  const { t } = useI18n();
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
    if (!window.confirm(t('singleEpisode.deleteConfirm'))) return;
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
      title: t('calendar.episodeNum', { num: nextNum }),
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
        <h4>{t('singleEpisode.title')}</h4>
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
          {showAddForm && !editingSingleEpisode ? t('common.cancel') : t('singleEpisode.addEpisode')}
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
          <h4>{editingSingleEpisode ? t('singleEpisode.editEpisode', { num: editingSingleEpisode.episodeNumber }) : t('singleEpisode.addEpisode')}</h4>
          <form onSubmit={handleAddSingleEpisode}>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>{t('singleEpisode.episodeNum')}</label>
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
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>{t('singleEpisode.episodeTitle')}</label>
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
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>{t('singleEpisode.duration')}</label>
              <input
                type="text"
                value={newSingleEpisode.duration}
                onChange={(e) => setNewSingleEpisode({...newSingleEpisode, duration: e.target.value})}
                placeholder={t('singleEpisode.durationPlaceholder')}
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
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>{t('singleEpisode.publishDate')} <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{t('singleEpisode.publishDateNote')}</span></label>
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
                  {t('singleEpisode.latePublishNote')}
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
                <label style={{ fontSize: '14px', cursor: 'pointer', color: 'var(--foreground)' }}>{t('singleEpisode.setPreview')}</label>
              </div>
              {newSingleEpisode.isScheduled && (
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: 'var(--text-secondary)' }}>{t('singleEpisode.previewDate')}</label>
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
                    {t('singleEpisode.previewNote')}
                  </p>
                </div>
              )}
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>{t('singleEpisode.jumpLink')}</label>
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
                      {t('common.delete')}
                    </button>
                    <div style={{ marginBottom: '8px' }}>
                      <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px' }}>{t('singleEpisode.platformName')}</label>
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => updatePlatformLink(index, 'name', e.target.value)}
                        placeholder={t('singleEpisode.platformPlaceholder')}
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
                      <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px' }}>{t('singleEpisode.linkUrl')}</label>
                      <input
                        type="text"
                        value={item.url}
                        onChange={(e) => updatePlatformLink(index, 'url', e.target.value)}
                        placeholder={t('singleEpisode.linkPlaceholder')}
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
                  {t('singleEpisode.addPlatform')}
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
                {editingSingleEpisode ? t('singleEpisode.updateEpisode') : t('singleEpisode.addEpisode')}
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
                {t('common.cancel')}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="single-episodes-list">
        {singleEpisodes.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{t('singleEpisode.noEpisodes')}</p>
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
                  <h5 style={{ margin: 0 }}>{t('calendar.episodeNum', { num: singleEpisode.episodeNumber })}</h5>
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
                      {t('common.edit')}
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
                      {t('common.delete')}
                    </button>
                  </div>
                </div>
                <p style={{ margin: '8px 0', fontSize: '14px' }}>{singleEpisode.title}</p>
                {singleEpisode.releaseDate && (
                  <p style={{ margin: '8px 0', fontSize: '13px', color: 'var(--primary-light)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    📅 {t('singleEpisode.published')} {new Date(singleEpisode.releaseDate).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                )}
                {singleEpisode.isScheduled && singleEpisode.scheduledDate && (
                  <p style={{ margin: '8px 0', fontSize: '13px', color: 'var(--warning-text)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    🔔 {t('singleEpisode.previewLabel')} {new Date(singleEpisode.scheduledDate).toLocaleString('zh-CN')}
                  </p>
                )}
                {singleEpisode.duration && (
                  <p style={{ margin: '8px 0', fontSize: '13px', color: 'var(--text-secondary)' }}>{t('singleEpisode.durationLabel')} {singleEpisode.duration}</p>
                )}
                {singleEpisode.platformLinks && Object.keys(singleEpisode.platformLinks).length > 0 && (
                  <div style={{ marginTop: '10px' }}>
                    <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: 'var(--text-secondary)' }}>{t('singleEpisode.jumpLinkLabel')}</p>
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
