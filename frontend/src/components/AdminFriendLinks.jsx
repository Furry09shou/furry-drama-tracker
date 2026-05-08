import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const AdminFriendLinks = () => {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingLink, setEditingLink] = useState(null);
  const [formData, setFormData] = useState({
    name: '', url: '', logo: '', description: '', order: 0, isActive: true
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) { navigate('/admin'); return; }
    fetchLinks();
  }, [navigate]);

  const fetchLinks = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const res = await axios.get('/api/friend-links/all', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLinks(res.data);
      setLoading(false);
    } catch (e) {
      setError('获取友链列表失败');
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const token = localStorage.getItem('adminToken');
      if (editingLink) {
        await axios.put(`/api/friend-links/${editingLink._id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post('/api/friend-links', formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      setShowForm(false);
      setEditingLink(null);
      setFormData({ name: '', url: '', logo: '', description: '', order: 0, isActive: true });
      fetchLinks();
    } catch (e) {
      setError(e.response?.data?.message || '操作失败');
    }
  };

  const handleEdit = (link) => {
    setEditingLink(link);
    setFormData({
      name: link.name, url: link.url, logo: link.logo || '',
      description: link.description || '', order: link.order || 0,
      isActive: link.isActive !== undefined ? link.isActive : true
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('确定要删除此友链吗？')) return;
    try {
      const token = localStorage.getItem('adminToken');
      await axios.delete(`/api/friend-links/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchLinks();
    } catch (e) {
      setError('删除失败');
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingLink(null);
    setFormData({ name: '', url: '', logo: '', description: '', order: 0, isActive: true });
    setError('');
  };

  if (loading) return <div className="container"><h2>加载中...</h2></div>;

  return (
    <div className="admin-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <h2>友链管理</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={() => navigate('/admin/dashboard')}>返回控制台</button>
          {!showForm && (
            <button className="btn" onClick={() => { setShowForm(true); setEditingLink(null); setFormData({ name: '', url: '', logo: '', description: '', order: 0, isActive: true }); }}>添加友链</button>
          )}
        </div>
      </div>

      {error && <div className="error-message" style={{ marginBottom: '16px' }}>{error}</div>}

      {showForm && (
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: '12px', padding: '20px', marginBottom: '20px'
        }}>
          <h3 style={{ marginTop: 0, marginBottom: '16px' }}>{editingLink ? '编辑友链' : '添加友链'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>名称 <span style={{ color: 'var(--destructive-text)' }}>*</span></label>
              <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required placeholder="友链名称" />
            </div>
            <div className="form-group">
              <label>链接 <span style={{ color: 'var(--destructive-text)' }}>*</span></label>
              <input type="url" value={formData.url} onChange={(e) => setFormData({ ...formData, url: e.target.value })} required placeholder="https://example.com" />
            </div>
            <div className="form-group">
              <label>Logo URL</label>
              <input type="text" value={formData.logo} onChange={(e) => setFormData({ ...formData, logo: e.target.value })} placeholder="https://example.com/logo.png（选填）" />
            </div>
            <div className="form-group">
              <label>描述</label>
              <input type="text" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="简短描述（选填）" />
            </div>
            <div className="form-group">
              <label>排序</label>
              <input type="number" value={formData.order} onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })} placeholder="数字越小越靠前" />
            </div>
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="checkbox" checked={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} style={{ accentColor: 'var(--primary)', cursor: 'pointer' }} />
              <label style={{ cursor: 'pointer' }}>启用</label>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button type="submit" className="btn">{editingLink ? '保存修改' : '添加'}</button>
              <button type="button" className="btn btn-secondary" onClick={handleCancel}>取消</button>
            </div>
          </form>
        </div>
      )}

      {links.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>暂无友链，点击上方按钮添加</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {links.map(link => (
            <div key={link._id} style={{
              display: 'flex', alignItems: 'center', gap: '14px',
              padding: '12px 14px', borderRadius: '10px',
              background: 'var(--card)', border: '1px solid var(--border)',
              opacity: link.isActive ? 1 : 0.5,
              flexWrap: 'wrap'
            }}>
              {link.logo ? (
                <img src={link.logo} alt="" style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} />
              ) : (
                <div style={{
                  width: '36px', height: '36px', borderRadius: '8px',
                  background: 'var(--hover-bg-strong)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  fontSize: '16px', flexShrink: 0
                }}>🔗</div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: 600, fontSize: '15px' }}>{link.name}</span>
                  {!link.isActive && (
                    <span style={{
                      fontSize: '11px', color: 'var(--text-tertiary)',
                      background: 'var(--hover-bg)', padding: '1px 8px',
                      borderRadius: '4px', border: '1px solid var(--border)'
                    }}>已禁用</span>
                  )}
                  <span style={{
                    fontSize: '11px', color: 'var(--text-tertiary)',
                    background: 'var(--hover-bg)', padding: '1px 8px',
                    borderRadius: '4px'
                  }}>排序: {link.order}</span>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{link.url}</div>
                {link.description && (
                  <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px' }}>{link.description}</div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                <button className="btn btn-secondary" style={{ fontSize: '13px', padding: '6px 14px' }} onClick={() => handleEdit(link)}>编辑</button>
                <button style={{
                  background: 'var(--destructive-bg)', border: '1px solid var(--destructive-border)',
                  color: 'var(--destructive-text)', borderRadius: '6px', padding: '6px 14px',
                  cursor: 'pointer', fontSize: '13px'
                }} onClick={() => handleDelete(link._id)}>删除</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminFriendLinks;
