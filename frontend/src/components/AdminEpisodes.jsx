import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import adminApi from '../utils/adminApi';
import { useNavigate, useOutletContext } from 'react-router-dom';
import CustomSelect from './CustomSelect';
import SearchInput from './SearchInput';
import ImageUploader from './ImageUploader';
import { useI18n } from '../contexts/I18nContext';
import EpisodeVersionHistory from './EpisodeVersionHistory';

const AdminEpisodes = () => {
  const { locale, t } = useI18n();
  const { admin } = useOutletContext();
  const [episodes, setEpisodes] = useState([]);
  const [filteredEpisodes, setFilteredEpisodes] = useState([]);
  const [episodeSearch, setEpisodeSearch] = useState('');
  const [categories, setCategories] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingEpisode, setEditingEpisode] = useState(null);
  const [showSingleEpisodeForm, setShowSingleEpisodeForm] = useState(false);
  const [editingSingleEpisode, setEditingSingleEpisode] = useState(null);
  const [singleEpisodes, setSingleEpisodes] = useState([]);
  const [coverImageMode, setCoverImageMode] = useState('url');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const [newEpisode, setNewEpisode] = useState({
    title: '',
    titleEn: '',
    description: '',
    descriptionEn: '',
    coverImage: '',
    totalEpisodes: 0,
    status: 'ongoing',
    categories: [],
    tags: [],
    updateDay: '',
    premiereDate: '',
    hideCreator: false
  });
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
  const [historyEpisodeId, setHistoryEpisodeId] = useState(null);

  useEffect(() => {
    fetchEpisodes();
    fetchCategories();
  }, []);

  // ===== 数据获取 =====
  const fetchEpisodes = async () => {
    try {
      let response;
      if (admin.role === 'creator') {
        response = await adminApi.get('/api/creator/my-episodes');
      } else {
        response = await adminApi.get('/api/episodes');
      }
      const data = response.data;
      setEpisodes(Array.isArray(data) ? data : (data.episodes || data.list || []));
    } catch (error) {
      console.error('Error fetching episodes:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await adminApi.get('/api/categories');
      setCategories(res.data);
    } catch (err) {
      console.error('获取分类失败', err);
    }
  };

  useEffect(() => {
    if (!episodeSearch.trim()) {
      setFilteredEpisodes(episodes);
      return;
    }
    const keyword = episodeSearch.toLowerCase();
    setFilteredEpisodes(episodes.filter(ep =>
      ep.title.toLowerCase().includes(keyword) ||
      ep.description.toLowerCase().includes(keyword) ||
      (ep.category && ep.category.some(c => c.toLowerCase().includes(keyword)))
    ));
  }, [episodeSearch, episodes]);

  const handleAddEpisode = async (e) => {
    e.preventDefault();
    setError('');
    if (!newEpisode.coverImage.trim()) {
      setError(t('adminEpisodes.coverRequired'));
      return;
    }
    if (!newEpisode.title.trim()) {
      setError(t('adminEpisodes.titleRequired'));
      return;
    }
    if (!newEpisode.description.trim()) {
      setError(t('adminEpisodes.descriptionRequired'));
      return;
    }
    if (newEpisode.totalEpisodes <= 0) {
      setError(t('adminEpisodes.totalEpisodesRequired'));
      return;
    }
    try {
      const episodeData = {
        title: newEpisode.title,
        titleEn: newEpisode.titleEn || '',
        description: newEpisode.description,
        descriptionEn: newEpisode.descriptionEn || '',
        coverImage: newEpisode.coverImage,
        totalEpisodes: newEpisode.totalEpisodes,
        currentEpisodes: 0,
        status: newEpisode.status,
        category: newEpisode.categories,
        tags: newEpisode.tags,
        updateDay: newEpisode.updateDay,
        premiereDate: newEpisode.status === 'upcoming' && newEpisode.premiereDate
          ? new Date(newEpisode.premiereDate).toISOString()
          : null,
        hideCreator: !!newEpisode.hideCreator
      };

      const response = await adminApi.post('/api/episodes', episodeData);

      setShowAddForm(false);
      resetEpisodeForm();
      fetchEpisodes();

      if (response.data) {
        setEditingEpisode(response.data);
        setNewEpisode({
          title: response.data.title,
          titleEn: response.data.titleEn || '',
          description: response.data.description,
          descriptionEn: response.data.descriptionEn || '',
          coverImage: response.data.coverImage,
          totalEpisodes: response.data.totalEpisodes,
          status: response.data.status,
          categories: response.data.category || [],
          tags: response.data.tags || [],
          updateDay: response.data.updateDay || '',
          premiereDate: '',
          hideCreator: !!response.data.hideCreator
        });
        setShowEditForm(true);
        fetchSingleEpisodes(response.data._id);
        setShowSingleEpisodeForm(true);
        setNewSingleEpisode({
          episodeNumber: 1,
          title: t('adminEpisodes.episodePrefix', { num: 1 }),
          duration: '',
          platformLinksList: [],
          scheduledDate: '',
          isScheduled: false,
          premiereDate: '',
          isUpcoming: false
        });
      }
    } catch (error) {
      setError(error.response?.data?.message || t('adminEpisodes.addEpisodeFailed'));
    }
  };

  const handleEditEpisode = (episode) => {
    setEditingEpisode(episode);
    setNewEpisode({
      title: episode.title,
      titleEn: episode.titleEn || '',
      description: episode.description,
      descriptionEn: episode.descriptionEn || '',
      coverImage: episode.coverImage,
      totalEpisodes: episode.totalEpisodes,
      status: episode.status,
      categories: episode.category || [],
      tags: episode.tags || [],
      updateDay: episode.updateDay || '',
      premiereDate: episode.premiereDate
        ? new Date(episode.premiereDate).toISOString().slice(0, 16)
        : '',
      hideCreator: !!episode.hideCreator
    });
    setShowEditForm(true);
    fetchSingleEpisodes(episode._id);
  };

  const handleUpdateEpisode = async (e) => {
    e.preventDefault();
    setError('');
    if (!newEpisode.coverImage.trim()) {
      setError(t('adminEpisodes.coverRequired'));
      return;
    }
    try {
      const episodeData = {
        title: newEpisode.title,
        titleEn: newEpisode.titleEn || '',
        description: newEpisode.description,
        descriptionEn: newEpisode.descriptionEn || '',
        coverImage: newEpisode.coverImage,
        totalEpisodes: newEpisode.totalEpisodes,
        status: newEpisode.status,
        category: newEpisode.categories,
        tags: newEpisode.tags,
        updateDay: newEpisode.updateDay,
        premiereDate: newEpisode.status === 'upcoming' && newEpisode.premiereDate
          ? new Date(newEpisode.premiereDate).toISOString()
          : null,
        hideCreator: !!newEpisode.hideCreator
      };

      await adminApi.put(`/api/episodes/${editingEpisode._id}`, episodeData);

      fetchEpisodes();
      setError('');
    } catch (error) {
      setError(error.response?.data?.message || t('adminEpisodes.editEpisodeFailed'));
    }
  };

  const handleDeleteEpisode = async (id) => {
    if (!window.confirm(t('adminEpisodes.deleteConfirm'))) return;
    try {
      await adminApi.delete(`/api/episodes/${id}`);
      fetchEpisodes();
    } catch (error) {
      setError(t('adminEpisodes.deleteFailed'));
    }
  };

  const fetchSingleEpisodes = async (episodeId) => {
    try {
      const response = await adminApi.get(`/api/episodes/${episodeId}`);
      setSingleEpisodes(response.data.episodes || []);
    } catch (error) {
      console.error('Error fetching single episodes:', error);
    }
  };

  const handleAddSingleEpisode = async (e) => {
    e.preventDefault();
    try {
      const episodeId = editingEpisode._id;
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
      delete submitData.platformLinksList;

      if (editingSingleEpisode) {
        await adminApi.put(`/api/episodes/single/${editingSingleEpisode._id}`, submitData);
      } else {
        await adminApi.post(`/api/episodes/${episodeId}/episodes`, submitData);
      }

      setEditingSingleEpisode(null);
      const nextNum = singleEpisodes.length + 1;
      setNewSingleEpisode({
        episodeNumber: nextNum,
        title: t('adminEpisodes.episodePrefix', { num: nextNum }),
        duration: '',
        platformLinksList: [],
        scheduledDate: '',
        isScheduled: false,
        releaseDate: ''
      });
      fetchSingleEpisodes(episodeId);
      fetchEpisodes();
    } catch (error) {
      setError(error.response?.data?.message || (editingSingleEpisode ? t('adminEpisodes.editSingleEpisodeFailed') : t('adminEpisodes.addSingleEpisodeFailed')));
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
    setShowSingleEpisodeForm(true);
  };

  const handleDeleteSingleEpisode = async (id) => {
    if (!window.confirm(t('adminEpisodes.deleteSingleEpisodeConfirm'))) return;
    try {
      await adminApi.delete(`/api/episodes/single/${id}`);
      fetchSingleEpisodes(editingEpisode._id);
      fetchEpisodes();
    } catch (error) {
      setError(t('adminEpisodes.deleteSingleEpisodeFailed'));
    }
  };

  const handleCloseEditForm = () => {
    setShowEditForm(false);
    setEditingEpisode(null);
    setShowSingleEpisodeForm(false);
    setEditingSingleEpisode(null);
    resetEpisodeForm();
  };

  const resetEpisodeForm = () => {
    setNewEpisode({
      title: '',
      titleEn: '',
      description: '',
      descriptionEn: '',
      coverImage: '',
      totalEpisodes: 0,
      status: 'ongoing',
      categories: [],
      tags: [],
      updateDay: '',
      premiereDate: '',
      hideCreator: false
    });
  };

  const availableCategories = categories.map(c => c.name);

  const toPlainObject = (platformLinks) => {
    if (!platformLinks) return {};
    if (Array.isArray(platformLinks)) {
      const obj = {};
      platformLinks.forEach(item => { if (item.name) obj[item.name] = item.url; });
      return obj;
    }
    if (typeof platformLinks === 'object' && !(platformLinks instanceof Map)) return platformLinks;
    try { return Object.fromEntries(platformLinks); } catch (e) { return {}; }
  };

  const toLinksList = (platformLinks) => {
    const obj = toPlainObject(platformLinks);
    return Object.entries(obj).map(([name, url]) => ({ name, url }));
  };

  const linksListToObj = (list) => {
    const obj = {};
    list.forEach(item => { if (item.name.trim()) obj[item.name.trim()] = item.url; });
    return obj;
  };

  const handleCategoryChange = (category) => {
    setNewEpisode(prev => {
      const currentCategories = prev.categories;
      if (currentCategories.includes(category)) {
        return { ...prev, categories: currentCategories.filter(c => c !== category) };
      } else {
        return { ...prev, categories: [...currentCategories, category] };
      }
    });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError(t('adminEpisodes.imageSizeExceeded'));
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError(t('adminEpisodes.imageFormatUnsupported'));
      return;
    }

    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('image', file);
      const response = await adminApi.post('/api/episodes/upload', formData, {
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      setNewEpisode(prev => ({ ...prev, coverImage: response.data.url }));
    } catch (err) {
      setError(err.response?.data?.message || t('adminEpisodes.imageUploadFailed'));
    } finally {
      setUploading(false);
    }
  };

  if (!admin) return null;

  const renderEpisodeForm = (isEdit) => (
    <form onSubmit={isEdit ? handleUpdateEpisode : handleAddEpisode}>
      <div className="form-group">
        <label>{t('adminEpisodes.titleLabel')} <span style={{color: 'var(--destructive-text)'}}>*</span></label>
        <input
          type="text"
          value={newEpisode.title}
          onChange={(e) => setNewEpisode({...newEpisode, title: e.target.value})}
          required
        />
      </div>
      <div className="form-group">
        <label>{t('adminEpisodes.englishName')} <span style={{color: 'var(--text-tertiary)', fontWeight: 'normal', fontSize: '12px'}}>{t('adminEpisodes.englishNameHint')}</span></label>
        <input
          type="text"
          value={newEpisode.titleEn}
          onChange={(e) => setNewEpisode({...newEpisode, titleEn: e.target.value})}
          placeholder="English title (optional)"
        />
      </div>
      <div className="form-group">
        <label>{t('adminEpisodes.descriptionLabel')} <span style={{color: 'var(--destructive-text)'}}>*</span></label>
        <textarea
          value={newEpisode.description}
          onChange={(e) => setNewEpisode({...newEpisode, description: e.target.value})}
          required
          rows="3"
        />
      </div>
      <div className="form-group">
        <label>{t('adminEpisodes.englishDescription')} <span style={{color: 'var(--text-tertiary)', fontWeight: 'normal', fontSize: '12px'}}>{t('adminEpisodes.englishDescriptionHint')}</span></label>
        <textarea
          value={newEpisode.descriptionEn}
          onChange={(e) => setNewEpisode({...newEpisode, descriptionEn: e.target.value})}
          rows="2"
          placeholder="English description (optional)"
        />
      </div>
      <div className="form-group">
        <label>{t('adminEpisodes.coverImage')} <span style={{color: 'var(--destructive-text)'}}>*</span></label>
        <ImageUploader
          value={newEpisode.coverImage}
          onChange={(url) => setNewEpisode({...newEpisode, coverImage: url})}
          label=""
          aspectRatio={2/3}
          outputWidth={400}
          outputHeight={600}
          uploadEndpoint="/api/episodes/upload"
        />
      </div>
      <div className="form-group">
        <label>{t('adminEpisodes.totalEpisodesLabel')} <span style={{color: 'var(--destructive-text)'}}>*</span></label>
        <input
          type="number"
          value={newEpisode.totalEpisodes}
          onChange={(e) => setNewEpisode({...newEpisode, totalEpisodes: parseInt(e.target.value) || 0})}
          required
        />
      </div>
      <div className="form-group">
        <label>{t('adminEpisodes.categories')}</label>
        <div className="checkbox-group">
          {availableCategories.map(category => (
            <label key={category}>
              <input
                type="checkbox"
                checked={newEpisode.categories.includes(category)}
                onChange={() => handleCategoryChange(category)}
              />
              <span>{category}</span>
            </label>
          ))}
        </div>
        <p style={{fontSize: '14px', color: 'var(--text-secondary)', marginTop: '12px'}}>{t('adminEpisodes.selected')} {newEpisode.categories.join(', ')}</p>
      </div>
      <div className="form-group">
        <label>{t('adminEpisodes.statusLabel')}</label>
        <CustomSelect
          options={[
            { value: 'ongoing', label: t('adminEpisodes.ongoing') },
            { value: 'completed', label: t('adminEpisodes.completed') },
            { value: 'upcoming', label: t('adminEpisodes.upcoming') }
          ]}
          value={newEpisode.status}
          onChange={(status) => setNewEpisode({...newEpisode, status})}
          placeholder={t('adminEpisodes.selectStatus')}
        />
      </div>
      <div className="form-group">
        <label>{t('adminEpisodes.tags')}</label>
        <input
          type="text"
          value={newEpisode.tags.join(', ')}
          onChange={(e) => setNewEpisode({...newEpisode, tags: e.target.value.split(',').map(t => t.trim()).filter(t => t)})}
          placeholder={t('adminEpisodes.tagsPlaceholder')}
        />
      </div>
      {newEpisode.status === 'upcoming' && (
        <div className="form-group">
          <label>{t('adminEpisodes.premiereDate')}</label>
          <input
            type="datetime-local"
            value={newEpisode.premiereDate}
            onChange={(e) => setNewEpisode({...newEpisode, premiereDate: e.target.value})}
            style={{
              width: '100%', padding: '8px 12px', borderRadius: '6px',
              border: '1px solid var(--border)', backgroundColor: 'var(--hover-bg-strong)',
              color: 'var(--text-light)', fontSize: '14px'
            }}
          />
          <p style={{fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px'}}>{t('adminEpisodes.premiereHint')}</p>
        </div>
      )}
      {error && <div className="error-message">{error}</div>}
      <div className="form-group">
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={!!newEpisode.hideCreator}
            onChange={(e) => setNewEpisode({...newEpisode, hideCreator: e.target.checked})}
            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
          />
          <span>{t('adminEpisodes.hideCreator')}</span>
          <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{t('adminEpisodes.hideCreatorHint')}</span>
        </label>
      </div>
      <div className="form-group">
        <button type="submit">{isEdit ? t('adminEpisodes.updateEpisode') : t('adminEpisodes.addAndManage')}</button>
      </div>
    </form>
  );

  const addFormModal = showAddForm ? (
    <div className="modal-overlay" onClick={(e) => { if (e.target.className === 'modal-overlay') setShowAddForm(false); }}>
      <div className="modal-content">
        <div className="modal-header">
          <h3>{t('adminEpisodes.addNewEpisode')}</h3>
          <button className="btn btn-secondary" onClick={() => setShowAddForm(false)}>{t('adminEpisodes.close')}</button>
        </div>
        <p style={{color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '15px'}}>{t('adminEpisodes.addEpisodeHint')}</p>
        {renderEpisodeForm(false)}
      </div>
    </div>
  ) : null;

  const editFormModal = showEditForm && editingEpisode ? (
    <div className="modal-overlay" onClick={(e) => { if (e.target.className === 'modal-overlay') handleCloseEditForm(); }}>
      <div className="modal-content">
        <div className="modal-header">
          <h3>{t('adminEpisodes.editEpisode')} - {editingEpisode.title}</h3>
          <button className="btn btn-secondary" onClick={handleCloseEditForm}>{t('adminEpisodes.close')}</button>
        </div>
        {renderEpisodeForm(true)}

        <div style={{marginTop: '20px', borderTop: '1px solid var(--border)', paddingTop: '20px'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
            <h4>{t('adminEpisodes.singleEpisodeManagement')}</h4>
            <button className="btn" onClick={() => {
              if (showSingleEpisodeForm && !editingSingleEpisode) {
                setShowSingleEpisodeForm(false);
              } else {
                setShowSingleEpisodeForm(true);
                setEditingSingleEpisode(null);
                const nextNum = singleEpisodes.length + 1;
                setNewSingleEpisode({
                  episodeNumber: nextNum,
                  title: t('adminEpisodes.episodePrefix', { num: nextNum }),
                  duration: '',
                  platformLinksList: [],
                  scheduledDate: '',
                  isScheduled: false,
                  releaseDate: ''
                });
              }
            }}>
              {showSingleEpisodeForm && !editingSingleEpisode ? t('adminEpisodes.cancel') : t('adminEpisodes.addSingleEpisode')}
            </button>
          </div>

          {showSingleEpisodeForm && (
            <div className="form-container" style={{marginBottom: '15px', background: 'var(--hover-bg)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border)'}}>
              <h4>{editingSingleEpisode ? t('adminEpisodes.editEpisodeNum', { num: editingSingleEpisode.episodeNumber }) : t('adminEpisodes.addSingleEpisode')}</h4>
              <form onSubmit={handleAddSingleEpisode}>
                <div className="form-group">
                  <label>{t('adminEpisodes.episodeNumberLabel')}</label>
                  <input
                    type="number"
                    value={newSingleEpisode.episodeNumber}
                    onChange={(e) => setNewSingleEpisode({...newSingleEpisode, episodeNumber: parseInt(e.target.value) || 1})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>{t('adminEpisodes.titleLabel')}</label>
                  <input
                    type="text"
                    value={newSingleEpisode.title}
                    onChange={(e) => setNewSingleEpisode({...newSingleEpisode, title: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>{t('adminEpisodes.duration')}</label>
                  <input
                    type="text"
                    value={newSingleEpisode.duration}
                    onChange={(e) => setNewSingleEpisode({...newSingleEpisode, duration: e.target.value})}
                    placeholder={t('adminEpisodes.durationPlaceholder')}
                  />
                </div>
                {editingEpisode && (editingEpisode.status === 'ongoing' || editingEpisode.status === 'completed') && (
                  <div className="form-group">
                    <label>{t('adminEpisodes.publishDate')} <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{t('adminEpisodes.publishDateHint')}</span></label>
                    <input
                      type="datetime-local"
                      value={newSingleEpisode.releaseDate}
                      onChange={(e) => setNewSingleEpisode({...newSingleEpisode, releaseDate: e.target.value})}
                      style={{
                        width: '100%', padding: '8px 12px', borderRadius: '6px',
                        border: '1px solid var(--border)', backgroundColor: 'var(--hover-bg)',
                        color: 'var(--text-light)', fontSize: '14px'
                      }}
                    />
                    <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>{t('adminEpisodes.latePublishNote')}</p>
                  </div>
                )}
                <div className="form-group" style={{ padding: '12px', background: 'var(--hover-bg-strong)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <input
                      type="checkbox"
                      checked={newSingleEpisode.isScheduled}
                      onChange={(e) => setNewSingleEpisode({...newSingleEpisode, isScheduled: e.target.checked, scheduledDate: e.target.checked ? newSingleEpisode.scheduledDate || '' : ''})}
                      style={{ accentColor: 'var(--primary)', cursor: 'pointer' }}
                    />
                    <label style={{ fontSize: '14px', cursor: 'pointer', color: 'var(--foreground)' }}>{t('adminEpisodes.scheduledPreview')}</label>
                  </div>
                  {newSingleEpisode.isScheduled && (
                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: 'var(--text-secondary)' }}>{t('adminEpisodes.scheduledDate')}</label>
                      <input
                        type="datetime-local"
                        value={newSingleEpisode.scheduledDate}
                        onChange={(e) => setNewSingleEpisode({...newSingleEpisode, scheduledDate: e.target.value})}
                        style={{
                          width: '100%', padding: '8px 12px', borderRadius: '6px',
                          border: '1px solid var(--border)', backgroundColor: 'var(--hover-bg)',
                          color: 'var(--text-light)', fontSize: '14px'
                        }}
                      />
                      <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>{t('adminEpisodes.scheduledHint')}</p>
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label>{t('adminEpisodes.videoUrl')}</label>
                  <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
                    {newSingleEpisode.platformLinksList.map((item, index) => (
                      <div key={index} style={{
                        background: 'var(--hover-bg)', border: '1px solid var(--border)',
                        borderRadius: '8px', padding: '12px'
                      }}>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px'}}>
                          <span style={{fontSize: '13px', color: 'var(--text-secondary)'}}>{t('adminEpisodes.platformNum', { num: index + 1 })}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const newList = newSingleEpisode.platformLinksList.filter((_, i) => i !== index);
                              setNewSingleEpisode({...newSingleEpisode, platformLinksList: newList});
                            }}
                            style={{
                              background: 'var(--destructive-bg)', border: '1px solid var(--destructive-border)',
                              color: 'var(--destructive-text)', borderRadius: '6px', padding: '4px 10px',
                              cursor: 'pointer', fontSize: '12px', lineHeight: 1
                            }}
                          >{t('adminEpisodes.deleteBtn')}</button>
                        </div>
                        <div style={{marginBottom: '8px'}}>
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => {
                              const newList = [...newSingleEpisode.platformLinksList];
                              newList[index] = {...newList[index], name: e.target.value};
                              setNewSingleEpisode({...newSingleEpisode, platformLinksList: newList});
                            }}
                            placeholder={t('adminEpisodes.platformNamePlaceholder')}
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            value={item.url}
                            onChange={(e) => {
                              const newList = [...newSingleEpisode.platformLinksList];
                              newList[index] = {...newList[index], url: e.target.value};
                              setNewSingleEpisode({...newSingleEpisode, platformLinksList: newList});
                            }}
                            placeholder={t('adminEpisodes.linkUrlPlaceholder')}
                          />
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setNewSingleEpisode({
                          ...newSingleEpisode,
                          platformLinksList: [...newSingleEpisode.platformLinksList, { name: '', url: '' }]
                        });
                      }}
                      style={{
                        background: 'var(--primary-bg-subtle)', border: '1px dashed var(--primary)',
                        color: 'var(--primary)', borderRadius: '8px', padding: '10px',
                        cursor: 'pointer', fontSize: '14px'
                      }}
                    >{t('adminEpisodes.addPlatformLink')}</button>
                  </div>
                  <p style={{fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px'}}>{t('adminEpisodes.platformHint')}</p>
                </div>
                <div className="form-group" style={{display: 'flex', gap: '10px'}}>
                  <button type="submit">{editingSingleEpisode ? t('adminEpisodes.updateBtn') : t('adminEpisodes.addBtn')}</button>
                  {editingSingleEpisode && (
                    <button type="button" className="btn btn-secondary" onClick={() => {
                      setEditingSingleEpisode(null);
                      const nextNum = singleEpisodes.length + 1;
                      setNewSingleEpisode({
                        episodeNumber: nextNum,
                        title: t('adminEpisodes.episodePrefix', { num: nextNum }),
                        duration: '',
                        platformLinksList: [],
                        scheduledDate: '',
                        isScheduled: false
                      });
                    }}>{t('adminEpisodes.cancelEdit')}</button>
                  )}
                </div>
              </form>
            </div>
          )}

          {singleEpisodes.length === 0 ? (
            <p style={{color: 'var(--text-secondary)', textAlign: 'center', padding: '20px'}}>{t('adminEpisodes.noSingleEpisodes')}</p>
          ) : (
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table className="admin-table">
              <thead>
                <tr>
                    <th>{t('adminEpisodes.episodeNumber')}</th>
                    <th>{t('adminEpisodes.titleLabel')}</th>
                  <th>{t('adminEpisodes.duration')}</th>
                  <th>{t('adminEpisodes.videoUrl')}</th>
                  <th>{t('adminEpisodes.views')}</th>
                  <th>{t('adminEpisodes.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {singleEpisodes.map(se => (
                  <tr key={se._id}>
                    <td>{se.episodeNumber}</td>
                    <td>{se.title}</td>
                    <td>
                      {se.duration || '-'}
                      {se.isScheduled && se.scheduledDate && (
                        <div style={{ fontSize: '12px', color: 'var(--warning-text)', marginTop: '2px' }}>
                          {t('adminEpisodes.previewLabel')} {new Date(se.scheduledDate).toLocaleString(locale)}
                        </div>
                      )}
                    </td>
                    <td style={{maxWidth: '250px'}}>
                      {se.platformLinks && Object.keys(toPlainObject(se.platformLinks)).length > 0 ? (
                        <div style={{display: 'flex', flexWrap: 'wrap', gap: '4px'}}>
                          {Object.entries(toPlainObject(se.platformLinks)).map(([platform, url]) => (
                            <a key={platform} href={url} target="_blank" rel="noreferrer" style={{
                              color: 'var(--primary)', fontSize: '12px',
                              background: 'var(--primary-bg-subtle)', padding: '2px 8px',
                              borderRadius: '4px', textDecoration: 'none'
                            }}>
                              {platform}
                            </a>
                          ))}
                        </div>
                      ) : (
                        <span style={{color: 'var(--text-secondary)'}}>-</span>
                      )}
                    </td>
                    <td>{se.views}</td>
                    <td>
                      <div className="action-buttons">
                        <button className="btn btn-small" onClick={() => handleEditSingleEpisode(se)}>{t('adminEpisodes.editBtn')}</button>
                        <button className="btn btn-secondary btn-small" onClick={() => handleDeleteSingleEpisode(se._id)}>{t('adminEpisodes.deleteBtn')}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>
      </div>
    </div>
  ) : null;

  // ===== 剧集列表渲染 =====
  return (
    <div className="admin-panel">
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
          <h2>{t('adminEpisodes.episodeManagement')}</h2>
        </div>
        <button className="btn" onClick={() => { resetEpisodeForm(); setError(''); setShowAddForm(true); }}>
          {t('adminEpisodes.addNewEpisode')}
        </button>
      </div>

      <h3>{t('adminEpisodes.episodeList')}</h3>
      <div style={{marginBottom: '15px'}}>
        <SearchInput
          data={episodes}
          searchKey={['title']}
          placeholder={t('adminEpisodes.searchPlaceholder')}
          onSearch={setEpisodeSearch}
          onSelect={(item) => setEpisodeSearch(item.title)}
          displayRender={(item) => (
            <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
              <span style={{fontWeight: '500'}}>{item.title}</span>
              <span style={{fontSize: '12px', color: 'var(--text-secondary)'}}>{t('adminEpisodes.episodeProgress', { current: item.currentEpisodes, total: item.totalEpisodes })}</span>
            </div>
          )}
        />
      </div>
      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <table className="admin-table">
          <thead>
            <tr>
            <th>{t('adminEpisodes.titleLabel')}</th>
            <th>{t('adminEpisodes.statusLabel')}</th>
            <th>{t('adminEpisodes.episodeNumber')}</th>
            <th>{t('adminEpisodes.views')}</th>
            {admin && admin.role !== 'creator' && <th>{t('adminEpisodes.creator')}</th>}
            {admin && admin.role !== 'creator' && <th>{t('adminEpisodes.authorizedEdit')}</th>}
            {admin && admin.role === 'creator' && <th>{t('adminEpisodes.review')}</th>}
            <th>{t('adminEpisodes.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {filteredEpisodes.length === 0 ? (
            <tr><td colSpan={admin && admin.role === 'creator' ? 6 : 7} style={{textAlign: 'center'}}>{episodeSearch ? t('adminEpisodes.noMatch') : t('adminEpisodes.noEpisodes')}</td></tr>
          ) : (
            filteredEpisodes.map(episode => (
              <tr key={episode._id}>
                <td>{episode.title}</td>
                <td>
                  <span className={`status ${episode.status}`}>
                    {episode.status === 'ongoing' ? t('adminEpisodes.ongoing') : episode.status === 'completed' ? t('adminEpisodes.completed') : t('adminEpisodes.upcoming')}
                  </span>
                </td>
                <td>{episode.currentEpisodes}/{episode.totalEpisodes}</td>
                <td>{episode.views}</td>
                {admin && admin.role !== 'creator' && (
                  <td style={{fontSize: '13px'}}>{episode.createdBy ? episode.createdBy.username : t('adminEpisodes.system')}</td>
                )}
                {admin && admin.role !== 'creator' && (
                  <td style={{fontSize: '13px'}}>
                    {episode.allowedEditors && episode.allowedEditors.length > 0
                      ? episode.allowedEditors.map(e => e.username).join('、')
                      : '-'}
                  </td>
                )}
                {admin && admin.role === 'creator' && (
                  <td>
                    <ReviewStatusBadge status={episode.reviewStatus} />
                    {episode.reviewNote && (
                      <span style={{fontSize: '11px', color: 'var(--text-secondary)', marginLeft: '4px'}}>({episode.reviewNote})</span>
                    )}
                  </td>
                )}
                <td>
                  <div className="action-buttons">
                    <button className="btn" onClick={() => { setError(''); handleEditEpisode(episode); }}>{t('adminEpisodes.editBtn')}</button>
                    <button className="btn btn-secondary" onClick={() => setHistoryEpisodeId(episode._id)}>{t('version.history')}</button>
                    {admin && admin.role !== 'creator' && (
                      <button className="btn btn-secondary" onClick={() => handleDeleteEpisode(episode._id)}>{t('adminEpisodes.deleteBtn')}</button>
                    )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      </div>

      {createPortal(addFormModal, document.body)}
      {createPortal(editFormModal, document.body)}

      {historyEpisodeId && (
        <EpisodeVersionHistory
          episodeId={historyEpisodeId}
          onClose={() => setHistoryEpisodeId(null)}
        />
      )}
    </div>
  );
};

export default AdminEpisodes;
