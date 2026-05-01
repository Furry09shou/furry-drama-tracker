﻿﻿﻿﻿﻿import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import ImageUploader from './ImageUploader';

const AdminBanners = () => {
  const [admin, setAdmin] = useState(null);
  const [banners, setBanners] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    title: '', subtitle: '', image: '', link: '', order: 0, active: true
  });
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    const adminData = localStorage.getItem('adminData');
    if (token && adminData) {
      setAdmin(JSON.parse(adminData));
    } else {
      navigate('/admin', { replace: true });
    }
  }, [navigate]);

  const fetchBanners = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const res = await axios.get('/api/banners/all', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBanners(res.data);
    } catch (err) {
      console.error('获取轮播图失败', err);
    }
  };

  useEffect(() => {
    if (admin) fetchBanners();
  }, [admin]);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');
    if (!formData.title.trim()) { setError('标题不能为空'); return; }
    if (!formData.image.trim()) { setError('请上传或输入图片地址'); return; }
    try {
      const token = localStorage.getItem('adminToken');
      await axios.post('/api/banners', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowAddForm(false);
      setFormData({ title: '', subtitle: '', image: '', link: '', order: 0, active: true });
      setSuccess('轮播图添加成功');
      fetchBanners();
    } catch (err) {
      setError(err.response?.data?.message || '添加失败');
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setError('');
    if (!formData.title.trim()) { setError('标题不能为空'); return; }
    if (!formData.image.trim()) { setError('请上传或输入图片地址'); return; }
    try {
      const token = localStorage.getItem('adminToken');
      await axios.put(`/api/banners/${editingBanner._id}`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEditingBanner(null);
      setFormData({ title: '', subtitle: '', image: '', link: '', order: 0, active: true });
      setSuccess('轮播图修改成功');
      fetchBanners();
    } catch (err) {
      setError(err.response?.data?.message || '修改失败');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('确定要删除该轮播图吗？')) return;
    try {
      const token = localStorage.getItem('adminToken');
      await axios.delete(`/api/banners/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess('轮播图已删除');
      fetchBanners();
    } catch (err) {
      setError(err.response?.data?.message || '删除失败');
    }
  };

  const handleToggleActive = async (banner) => {
    try {
      const token = localStorage.getItem('adminToken');
      await axios.put(`/api/banners/${banner._id}`, { active: !banner.active }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchBanners();
    } catch (err) {
      setError('操作失败');
    }
  };

  const openEdit = (banner) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title,
      subtitle: banner.subtitle || '',
      image: banner.image || '',
      link: banner.link || '',
      order: banner.order || 0,
      active: banner.active
    });
    setError('');
  };

  const openAdd = () => {
    setShowAddForm(true);
    setFormData({ title: '', subtitle: '', image: '', link: '', order: 0, active: true });
    setError('');
  };

  if (!admin) return null;

  const renderForm = (onSubmit, submitLabel) => (
    <form onSubmit={onSubmit}>
      <div className="form-group">
        <label>标题</label>
        <input type="text" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} required />
      </div>
      <div className="form-group">
        <label>副标题</label>
        <input type="text" value={formData.subtitle} onChange={(e) => setFormData({...formData, subtitle: e.target.value})} placeholder="可选" />
      </div>
      <div className="form-group">
        <label>轮播图片</label>
        <ImageUploader
          value={formData.image}
          onChange={(url) => setFormData({...formData, image: url})}
          label=""
          aspectRatio={3}
          outputWidth={1200}
          outputHeight={400}
          uploadEndpoint="/api/episodes/upload"
        />
      </div>
      <div className="form-group">
        <label>跳转链接</label>
        <input type="text" value={formData.link} onChange={(e) => setFormData({...formData, link: e.target.value})} placeholder="可选，点击轮播图跳转的地址" />
      </div>
      <div className="form-group">
        <label>排序（数字越小越靠前）</label>
        <input type="number" value={formData.order} onChange={(e) => setFormData({...formData, order: Number(e.target.value)})} min={0} />
      </div>
      <div className="form-group" style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
        <input type="checkbox" checked={formData.active} onChange={(e) => setFormData({...formData, active: e.target.checked})} id="banner-active" />
        <label htmlFor="banner-active" style={{margin: 0}}>启用</label>
      </div>
      {error && <div className="error-message">{error}</div>}
      <div className="form-group"><button type="submit">{submitLabel}</button></div>
    </form>
  );

  const addModal = showAddForm ? (
    <div className="modal-overlay" onClick={(e) => { if (e.target.className === 'modal-overlay') setShowAddForm(false); }}>
      <div className="modal-content" style={{maxWidth: '520px'}}>
        <div className="modal-header">
          <h3>添加轮播图</h3>
          <button className="btn btn-secondary" onClick={() => setShowAddForm(false)}>关闭</button>
        </div>
        {renderForm(handleAdd, '添加')}
      </div>
    </div>
  ) : null;

  const editModal = editingBanner ? (
    <div className="modal-overlay" onClick={(e) => { if (e.target.className === 'modal-overlay') setEditingBanner(null); }}>
      <div className="modal-content" style={{maxWidth: '520px'}}>
        <div className="modal-header">
          <h3>编辑轮播图</h3>
          <button className="btn btn-secondary" onClick={() => setEditingBanner(null)}>关闭</button>
        </div>
        {renderForm(handleEdit, '保存')}
      </div>
    </div>
  ) : null;

  return (
    <div className="admin-panel">
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
          <Link to="/admin/dashboard" className="btn btn-secondary">返回控制台</Link>
          <h2>轮播图管理</h2>
        </div>
        <button className="btn" onClick={openAdd}>添加轮播图</button>
      </div>

      {error && <div className="error-message" style={{marginBottom: '15px'}}>{error}</div>}
      {success && <div style={{marginBottom: '15px', padding: '10px', background: 'var(--success-bg-strong)', border: '1px solid var(--success-border)', borderRadius: '6px', color: 'var(--success-text)'}}>{success}</div>}

      {banners.length === 0 ? (
        <div style={{padding: '60px', textAlign: 'center', color: 'var(--text-secondary)', background: 'var(--card)', borderRadius: '12px', border: '1px solid var(--border)'}}>暂无轮播图，请添加</div>
      ) : (
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px'}}>
          {banners.map(banner => (
            <div key={banner._id} style={{background: 'var(--card)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden', opacity: banner.active ? 1 : 0.5}}>
              <div style={{width: '100%', height: '160px', overflow: 'hidden'}}>
                <img src={banner.image} alt={banner.title} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
              </div>
              <div style={{padding: '16px'}}>
                <h4 style={{marginBottom: '4px'}}>{banner.title}</h4>
                {banner.subtitle && <p style={{color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '8px'}}>{banner.subtitle}</p>}
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px'}}>
                  <span style={{fontSize: '12px', padding: '2px 8px', borderRadius: '4px', background: banner.active ? 'var(--success-bg)' : 'var(--destructive-bg)', color: banner.active ? 'var(--success-text)' : 'var(--destructive-text)'}}>
                    {banner.active ? '已启用' : '已禁用'}
                  </span>
                  <span style={{fontSize: '12px', color: 'var(--text-secondary)'}}>排序: {banner.order}</span>
                </div>
                <div style={{display: 'flex', gap: '8px'}}>
                  <button className="btn" style={{padding: '6px 14px', fontSize: '13px', flex: 1}} onClick={() => openEdit(banner)}>编辑</button>
                  <button className="btn btn-secondary" style={{padding: '6px 14px', fontSize: '13px', flex: 1}} onClick={() => handleToggleActive(banner)}>
                    {banner.active ? '禁用' : '启用'}
                  </button>
                  <button className="btn btn-secondary" style={{padding: '6px 14px', fontSize: '13px', color: 'var(--destructive-text)', borderColor: 'var(--destructive-border)'}} onClick={() => handleDelete(banner._id)}>删除</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {createPortal(addModal, document.body)}
      {createPortal(editModal, document.body)}
    </div>
  );
};

export default AdminBanners;
