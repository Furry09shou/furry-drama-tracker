import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import CustomSelect from './CustomSelect';
import SearchInput from './SearchInput';
import ImageUploader from './ImageUploader';

const AdminEpisodes = () => {
  const [admin, setAdmin] = useState(null);
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
    titleJa: '',
    description: '',
    descriptionEn: '',
    descriptionJa: '',
    coverImage: '',
    totalEpisodes: 0,
    status: 'ongoing',
    categories: [],
    tags: [],
    updateDay: '',
    premiereDate: ''
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
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    const adminData = localStorage.getItem('adminData');
    if (token && adminData) {
      setAdmin(JSON.parse(adminData));
      fetchEpisodes();
      fetchCategories();
    } else {
      navigate('/admin', { replace: true });
    }
  }, [navigate]);

  const fetchEpisodes = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const adminData = JSON.parse(localStorage.getItem('adminData') || '{}');
      let response;
      if (adminData.role === 'creator') {
        response = await axios.get('/api/creator/my-episodes', {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        response = await axios.get('/api/episodes', {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      const data = response.data;
      setEpisodes(Array.isArray(data) ? data : (data.episodes || data.list || []));
    } catch (error) {
      console.error('Error fetching episodes:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await axios.get('/api/categories');
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
      setError('请上传或输入封面图片');
      return;
    }
    if (!newEpisode.title.trim()) {
      setError('请输入标题');
      return;
    }
    if (!newEpisode.description.trim()) {
      setError('请输入描述');
      return;
    }
    if (newEpisode.totalEpisodes <= 0) {
      setError('总集数必须大于0');
      return;
    }
    try {
      const token = localStorage.getItem('adminToken');
      const episodeData = {
        title: newEpisode.title,
        titleEn: newEpisode.titleEn || '',
        titleJa: newEpisode.titleJa || '',
        description: newEpisode.description,
        descriptionEn: newEpisode.descriptionEn || '',
        descriptionJa: newEpisode.descriptionJa || '',
        coverImage: newEpisode.coverImage,
        totalEpisodes: newEpisode.totalEpisodes,
        currentEpisodes: 0,
        status: newEpisode.status,
        category: newEpisode.categories,
        tags: newEpisode.tags,
        updateDay: newEpisode.updateDay,
        premiereDate: newEpisode.status === 'upcoming' && newEpisode.premiereDate
          ? new Date(newEpisode.premiereDate).toISOString()
          : null
      };
      
      const response = await axios.post('/api/episodes', episodeData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setShowAddForm(false);
      resetEpisodeForm();
      fetchEpisodes();

      if (response.data) {
        setEditingEpisode(response.data);
        setNewEpisode({
          title: response.data.title,
          titleEn: response.data.titleEn || '',
          titleJa: response.data.titleJa || '',
          description: response.data.description,
          descriptionEn: response.data.descriptionEn || '',
          descriptionJa: response.data.descriptionJa || '',
          coverImage: response.data.coverImage,
          totalEpisodes: response.data.totalEpisodes,
          status: response.data.status,
          categories: response.data.category || [],
          tags: response.data.tags || [],
          updateDay: response.data.updateDay || '',
          premiereDate: ''
        });
        setShowEditForm(true);
        fetchSingleEpisodes(response.data._id);
        setShowSingleEpisodeForm(true);
        setNewSingleEpisode({
          episodeNumber: 1,
          title: '第1集',
          duration: '',
          platformLinksList: [],
          scheduledDate: '',
          isScheduled: false,
          premiereDate: '',
          isUpcoming: false
        });
      }
    } catch (error) {
      setError(error.response?.data?.message || '添加剧集失败');
    }
  };

  const handleEditEpisode = (episode) => {
    setEditingEpisode(episode);
    setNewEpisode({
      title: episode.title,
      titleEn: episode.titleEn || '',
      titleJa: episode.titleJa || '',
      description: episode.description,
      descriptionEn: episode.descriptionEn || '',
      descriptionJa: episode.descriptionJa || '',
      coverImage: episode.coverImage,
      totalEpisodes: episode.totalEpisodes,
      status: episode.status,
      categories: episode.category || [],
      tags: episode.tags || [],
      updateDay: episode.updateDay || '',
      premiereDate: episode.premiereDate
        ? new Date(episode.premiereDate).toISOString().slice(0, 16)
        : ''
    });
    setShowEditForm(true);
    fetchSingleEpisodes(episode._id);
  };

  const handleUpdateEpisode = async (e) => {
    e.preventDefault();
    setError('');
    if (!newEpisode.coverImage.trim()) {
      setError('请上传或输入封面图片');
      return;
    }
    try {
      const token = localStorage.getItem('adminToken');
      const episodeData = {
        title: newEpisode.title,
        titleEn: newEpisode.titleEn || '',
        titleJa: newEpisode.titleJa || '',
        description: newEpisode.description,
        descriptionEn: newEpisode.descriptionEn || '',
        descriptionJa: newEpisode.descriptionJa || '',
        coverImage: newEpisode.coverImage,
        totalEpisodes: newEpisode.totalEpisodes,
        status: newEpisode.status,
        category: newEpisode.categories,
        tags: newEpisode.tags,
        updateDay: newEpisode.updateDay,
        premiereDate: newEpisode.status === 'upcoming' && newEpisode.premiereDate
          ? new Date(newEpisode.premiereDate).toISOString()
          : null
      };

      await axios.put(`/api/episodes/${editingEpisode._id}`, episodeData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      fetchEpisodes();
      setError('');
    } catch (error) {
      setError(error.response?.data?.message || '编辑剧集失败');
    }
  };

  const handleDeleteEpisode = async (id) => {
    if (!window.confirm('确定要删除这个剧集吗？')) return;
    try {
      const token = localStorage.getItem('adminToken');
      await axios.delete(`/api/episodes/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchEpisodes();
    } catch (error) {
      setError('删除失败');
    }
  };

  const fetchSingleEpisodes = async (episodeId) => {
    try {
      const response = await axios.get(`/api/episodes/${episodeId}`);
      setSingleEpisodes(response.data.episodes || []);
    } catch (error) {
      console.error('Error fetching single episodes:', error);
    }
  };

  const handleAddSingleEpisode = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('adminToken');
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
        await axios.put(`/api/episodes/single/${editingSingleEpisode._id}`, submitData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post(`/api/episodes/${episodeId}/episodes`, submitData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      
      setEditingSingleEpisode(null);
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
      fetchSingleEpisodes(episodeId);
      fetchEpisodes();
    } catch (error) {
      setError(error.response?.data?.message || (editingSingleEpisode ? '编辑单集失败' : '添加单集失败'));
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
    if (!window.confirm('确定要删除这个单集吗？')) return;
    try {
      const token = localStorage.getItem('adminToken');
      await axios.delete(`/api/episodes/single/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchSingleEpisodes(editingEpisode._id);
      fetchEpisodes();
    } catch (error) {
      setError('删除单集失败');
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
      titleJa: '',
      description: '',
      descriptionEn: '',
      descriptionJa: '',
      coverImage: '',
      totalEpisodes: 0,
      status: 'ongoing',
      categories: [],
      tags: [],
      updateDay: '',
      premiereDate: ''
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
      setError('图片大小不能超过5MB');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('只支持 JPEG、PNG、GIF、WebP 格式的图片');
      return;
    }

    setUploading(true);
    setError('');
    try {
      const token = localStorage.getItem('adminToken');
      const formData = new FormData();
      formData.append('image', file);
      const response = await axios.post('/api/episodes/upload', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      setNewEpisode(prev => ({ ...prev, coverImage: response.data.url }));
    } catch (err) {
      setError(err.response?.data?.message || '图片上传失败');
    } finally {
      setUploading(false);
    }
  };

  if (!admin) return null;

  const renderEpisodeForm = (isEdit) => (
    <form onSubmit={isEdit ? handleUpdateEpisode : handleAddEpisode}>
      <div className="form-group">
        <label>标题 <span style={{color: 'var(--destructive-text)'}}>*</span></label>
        <input
          type="text"
          value={newEpisode.title}
          onChange={(e) => setNewEpisode({...newEpisode, title: e.target.value})}
          required
        />
      </div>
      <div style={{display: 'flex', gap: '12px'}}>
        <div className="form-group" style={{flex: 1}}>
          <label>英文名称 <span style={{color: 'var(--text-tertiary)', fontWeight: 'normal', fontSize: '12px'}}>(选填，不填则自动翻译)</span></label>
          <input
            type="text"
            value={newEpisode.titleEn}
            onChange={(e) => setNewEpisode({...newEpisode, titleEn: e.target.value})}
            placeholder="English title (optional)"
          />
        </div>
        <div className="form-group" style={{flex: 1}}>
          <label>日文名称 <span style={{color: 'var(--text-tertiary)', fontWeight: 'normal', fontSize: '12px'}}>(选填，不填则自动翻译)</span></label>
          <input
            type="text"
            value={newEpisode.titleJa}
            onChange={(e) => setNewEpisode({...newEpisode, titleJa: e.target.value})}
            placeholder="日本語タイトル (任意)"
          />
        </div>
      </div>
      <div className="form-group">
        <label>描述 <span style={{color: 'var(--destructive-text)'}}>*</span></label>
        <textarea
          value={newEpisode.description}
          onChange={(e) => setNewEpisode({...newEpisode, description: e.target.value})}
          required
          rows="3"
        />
      </div>
      <div style={{display: 'flex', gap: '12px'}}>
        <div className="form-group" style={{flex: 1}}>
          <label>英文描述 <span style={{color: 'var(--text-tertiary)', fontWeight: 'normal', fontSize: '12px'}}>(选填)</span></label>
          <textarea
            value={newEpisode.descriptionEn}
            onChange={(e) => setNewEpisode({...newEpisode, descriptionEn: e.target.value})}
            rows="2"
            placeholder="English description (optional)"
          />
        </div>
        <div className="form-group" style={{flex: 1}}>
          <label>日文描述 <span style={{color: 'var(--text-tertiary)', fontWeight: 'normal', fontSize: '12px'}}>(选填)</span></label>
          <textarea
            value={newEpisode.descriptionJa}
            onChange={(e) => setNewEpisode({...newEpisode, descriptionJa: e.target.value})}
            rows="2"
            placeholder="日本語説明 (任意)"
          />
        </div>
      </div>
      <div className="form-group">
        <label>封面图片 <span style={{color: 'var(--destructive-text)'}}>*</span></label>
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
        <label>总集数 <span style={{color: 'var(--destructive-text)'}}>*</span></label>
        <input
          type="number"
          value={newEpisode.totalEpisodes}
          onChange={(e) => setNewEpisode({...newEpisode, totalEpisodes: parseInt(e.target.value) || 0})}
          required
        />
      </div>
      <div className="form-group">
        <label>分类（可多选）</label>
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
        <p style={{fontSize: '14px', color: 'var(--text-secondary)', marginTop: '12px'}}>已选择: {newEpisode.categories.join(', ')}</p>
      </div>
      <div className="form-group">
        <label>状态</label>
        <CustomSelect
          options={[
            { value: 'ongoing', label: '连载中' },
            { value: 'completed', label: '已完结' },
            { value: 'upcoming', label: '即将上映' }
          ]}
          value={newEpisode.status}
          onChange={(status) => setNewEpisode({...newEpisode, status})}
          placeholder="选择状态"
        />
      </div>
      <div className="form-group">
        <label>标签（逗号分隔）</label>
        <input
          type="text"
          value={newEpisode.tags.join(', ')}
          onChange={(e) => setNewEpisode({...newEpisode, tags: e.target.value.split(',').map(t => t.trim()).filter(t => t)})}
          placeholder="如：3D, 系列, 风格"
        />
      </div>
      {newEpisode.status === 'upcoming' && (
        <div className="form-group">
          <label>🎬 首播日期</label>
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
          <p style={{fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px'}}>设置后将在更新日历中显示为首播预告</p>
        </div>
      )}
      {error && <div className="error-message">{error}</div>}
      <div className="form-group">
        <button type="submit">{isEdit ? '更新剧集信息' : '添加并管理单集'}</button>
      </div>
    </form>
  );

  const addFormModal = showAddForm ? (
    <div className="modal-overlay" onClick={(e) => { if (e.target.className === 'modal-overlay') setShowAddForm(false); }}>
      <div className="modal-content">
        <div className="modal-header">
          <h3>添加新剧集</h3>
          <button className="btn btn-secondary" onClick={() => setShowAddForm(false)}>关闭</button>
        </div>
        <p style={{color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '15px'}}>添加剧集后将自动打开单集管理，您可以为每一集设置独立的跳转链接</p>
        {renderEpisodeForm(false)}
      </div>
    </div>
  ) : null;

  const editFormModal = showEditForm && editingEpisode ? (
    <div className="modal-overlay" onClick={(e) => { if (e.target.className === 'modal-overlay') handleCloseEditForm(); }}>
      <div className="modal-content">
        <div className="modal-header">
          <h3>编辑剧集 - {editingEpisode.title}</h3>
          <button className="btn btn-secondary" onClick={handleCloseEditForm}>关闭</button>
        </div>
        {renderEpisodeForm(true)}

        <div style={{marginTop: '20px', borderTop: '1px solid var(--border)', paddingTop: '20px'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
            <h4>单集管理</h4>
            <button className="btn" onClick={() => {
              if (showSingleEpisodeForm && !editingSingleEpisode) {
                setShowSingleEpisodeForm(false);
              } else {
                setShowSingleEpisodeForm(true);
                setEditingSingleEpisode(null);
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
              }
            }}>
              {showSingleEpisodeForm && !editingSingleEpisode ? '取消' : '添加单集'}
            </button>
          </div>

          {showSingleEpisodeForm && (
            <div className="form-container" style={{marginBottom: '15px', background: 'var(--hover-bg)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border)'}}>
              <h4>{editingSingleEpisode ? `编辑第${editingSingleEpisode.episodeNumber}集` : '添加单集'}</h4>
              <form onSubmit={handleAddSingleEpisode}>
                <div className="form-group">
                  <label>集数</label>
                  <input
                    type="number"
                    value={newSingleEpisode.episodeNumber}
                    onChange={(e) => setNewSingleEpisode({...newSingleEpisode, episodeNumber: parseInt(e.target.value) || 1})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>标题</label>
                  <input
                    type="text"
                    value={newSingleEpisode.title}
                    onChange={(e) => setNewSingleEpisode({...newSingleEpisode, title: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>时长</label>
                  <input
                    type="text"
                    value={newSingleEpisode.duration}
                    onChange={(e) => setNewSingleEpisode({...newSingleEpisode, duration: e.target.value})}
                    placeholder="例如：24分钟"
                  />
                </div>
                {editingEpisode && (editingEpisode.status === 'ongoing' || editingEpisode.status === 'completed') && (
                  <div className="form-group">
                    <label>发布日期 <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>（选填，不填默认上传日期）</span></label>
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
                    <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>适用于已上映但平台补充信息较晚的剧集</p>
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
                          width: '100%', padding: '8px 12px', borderRadius: '6px',
                          border: '1px solid var(--border)', backgroundColor: 'var(--hover-bg)',
                          color: 'var(--text-light)', fontSize: '14px'
                        }}
                      />
                      <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>设置后将在更新日历中显示为预告</p>
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label>跳转链接</label>
                  <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
                    {newSingleEpisode.platformLinksList.map((item, index) => (
                      <div key={index} style={{
                        background: 'var(--hover-bg)', border: '1px solid var(--border)',
                        borderRadius: '8px', padding: '12px'
                      }}>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px'}}>
                          <span style={{fontSize: '13px', color: 'var(--text-secondary)'}}>平台 {index + 1}</span>
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
                          >删除</button>
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
                            placeholder="平台名称，如：B站、YouTube、网盘"
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
                            placeholder="链接地址，如：https://www.bilibili.com/video/..."
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
                    >+ 添加平台链接</button>
                  </div>
                  <p style={{fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px'}}>支持添加多个平台，如：B站、YouTube、网盘等</p>
                </div>
                <div className="form-group" style={{display: 'flex', gap: '10px'}}>
                  <button type="submit">{editingSingleEpisode ? '更新' : '添加'}</button>
                  {editingSingleEpisode && (
                    <button type="button" className="btn btn-secondary" onClick={() => {
                      setEditingSingleEpisode(null);
                      const nextNum = singleEpisodes.length + 1;
                      setNewSingleEpisode({
                        episodeNumber: nextNum,
                        title: `第${nextNum}集`,
                        duration: '',
                        platformLinksList: [],
                        scheduledDate: '',
                        isScheduled: false
                      });
                    }}>取消编辑</button>
                  )}
                </div>
              </form>
            </div>
          )}

          {singleEpisodes.length === 0 ? (
            <p style={{color: 'var(--text-secondary)', textAlign: 'center', padding: '20px'}}>暂无单集，点击上方"添加单集"按钮为每一集设置跳转链接</p>
          ) : (
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table className="admin-table">
              <thead>
                <tr>
                    <th>集数</th>
                    <th>标题</th>
                  <th>时长</th>
                  <th>跳转链接</th>
                  <th>热度</th>
                  <th>操作</th>
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
                          🔔 预告: {new Date(se.scheduledDate).toLocaleString('zh-CN')}
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
                        <button className="btn btn-small" onClick={() => handleEditSingleEpisode(se)}>编辑</button>
                        <button className="btn btn-secondary btn-small" onClick={() => handleDeleteSingleEpisode(se._id)}>删除</button>
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

  return (
    <div className="admin-panel">
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
          <h2>剧集管理</h2>
        </div>
        <button className="btn" onClick={() => { resetEpisodeForm(); setError(''); setShowAddForm(true); }}>
          添加新剧集
        </button>
      </div>

      <h3>剧集列表</h3>
      <div style={{marginBottom: '15px'}}>
        <SearchInput
          data={episodes}
          searchKey={['title']}
          placeholder="搜索剧集名称..."
          onSearch={setEpisodeSearch}
          onSelect={(item) => setEpisodeSearch(item.title)}
          displayRender={(item) => (
            <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
              <span style={{fontWeight: '500'}}>{item.title}</span>
              <span style={{fontSize: '12px', color: 'var(--text-secondary)'}}>{item.currentEpisodes}/{item.totalEpisodes}集</span>
            </div>
          )}
        />
      </div>
      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <table className="admin-table">
          <thead>
            <tr>
            <th>标题</th>
            <th>状态</th>
            <th>集数</th>
            <th>热度</th>
            {admin && admin.role !== 'creator' && <th>创建者</th>}
            {admin && admin.role !== 'creator' && <th>授权编辑</th>}
            {admin && admin.role === 'creator' && <th>审核</th>}
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {filteredEpisodes.length === 0 ? (
            <tr><td colSpan={admin && admin.role === 'creator' ? 6 : 7} style={{textAlign: 'center'}}>{episodeSearch ? '没有匹配的剧集' : '暂无剧集'}</td></tr>
          ) : (
            filteredEpisodes.map(episode => (
              <tr key={episode._id}>
                <td>{episode.title}</td>
                <td>
                  <span className={`status ${episode.status}`}>
                    {episode.status === 'ongoing' ? '连载中' : episode.status === 'completed' ? '已完结' : '即将上映'}
                  </span>
                </td>
                <td>{episode.currentEpisodes}/{episode.totalEpisodes}</td>
                <td>{episode.views}</td>
                {admin && admin.role !== 'creator' && (
                  <td style={{fontSize: '13px'}}>{episode.createdBy ? episode.createdBy.username : '系统'}</td>
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
                    <span style={{
                      fontSize: '12px', padding: '2px 8px', borderRadius: '4px',
                      background: episode.reviewStatus === 'approved' ? 'var(--success-bg)' :
                                  episode.reviewStatus === 'rejected' ? 'var(--destructive-bg)' : 'var(--warning-bg)',
                      color: episode.reviewStatus === 'approved' ? 'var(--success-text)' :
                             episode.reviewStatus === 'rejected' ? 'var(--destructive-text)' : 'var(--warning-text)',
                      border: `1px solid ${episode.reviewStatus === 'approved' ? 'var(--success-border)' :
                                        episode.reviewStatus === 'rejected' ? 'var(--destructive-border)' : 'var(--warning-border)'}`
                    }}>
                      {episode.reviewStatus === 'approved' ? '已通过' :
                       episode.reviewStatus === 'rejected' ? '已拒绝' : '待审核'}
                    </span>
                    {episode.reviewNote && (
                      <span style={{fontSize: '11px', color: 'var(--text-secondary)', marginLeft: '4px'}}>({episode.reviewNote})</span>
                    )}
                  </td>
                )}
                <td>
                  <div className="action-buttons">
                    <button className="btn" onClick={() => { setError(''); handleEditEpisode(episode); }}>编辑</button>
                    {admin && admin.role !== 'creator' && (
                      <button className="btn btn-secondary" onClick={() => handleDeleteEpisode(episode._id)}>删除</button>
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
    </div>
  );
};

export default AdminEpisodes;