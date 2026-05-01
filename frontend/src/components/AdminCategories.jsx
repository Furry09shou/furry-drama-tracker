﻿﻿﻿﻿﻿import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

const AdminCategories = () => {
  const [admin, setAdmin] = useState(null);
  const [categories, setCategories] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryOrder, setNewCategoryOrder] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
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

  const fetchCategories = async () => {
    try {
      const res = await axios.get('/api/categories');
      setCategories(res.data);
    } catch (err) {
      console.error('获取分类失败', err);
    }
  };

  useEffect(() => {
    if (admin) fetchCategories();
  }, [admin]);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');
    if (!newCategoryName.trim()) {
      setError('分类名称不能为空');
      return;
    }
    try {
      const token = localStorage.getItem('adminToken');
      await axios.post('/api/categories', {
        name: newCategoryName.trim(),
        order: newCategoryOrder
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNewCategoryName('');
      setNewCategoryOrder(0);
      setShowAddForm(false);
      setSuccess('分类添加成功');
      fetchCategories();
    } catch (err) {
      setError(err.response?.data?.message || '添加失败');
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setError('');
    if (!newCategoryName.trim()) {
      setError('分类名称不能为空');
      return;
    }
    try {
      const token = localStorage.getItem('adminToken');
      await axios.put(`/api/categories/${editingCategory._id}`, {
        name: newCategoryName.trim(),
        order: newCategoryOrder
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEditingCategory(null);
      setNewCategoryName('');
      setNewCategoryOrder(0);
      setSuccess('分类修改成功');
      fetchCategories();
    } catch (err) {
      setError(err.response?.data?.message || '修改失败');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('确定要删除该分类吗？')) return;
    try {
      const token = localStorage.getItem('adminToken');
      await axios.delete(`/api/categories/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess('分类已删除');
      fetchCategories();
    } catch (err) {
      setError(err.response?.data?.message || '删除失败');
    }
  };

  const openEdit = (cat) => {
    setEditingCategory(cat);
    setNewCategoryName(cat.name);
    setNewCategoryOrder(cat.order || 0);
  };

  if (!admin) return null;

  const addFormModal = showAddForm ? (
    <div className="modal-overlay" onClick={(e) => { if (e.target.className === 'modal-overlay') setShowAddForm(false); }}>
      <div className="modal-content" style={{maxWidth: '400px'}}>
        <div className="modal-header">
          <h3>添加分类</h3>
          <button className="btn btn-secondary" onClick={() => setShowAddForm(false)}>关闭</button>
        </div>
        <form onSubmit={handleAdd}>
          <div className="form-group">
            <label>分类名称</label>
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="输入分类名称"
              required
            />
          </div>
          <div className="form-group">
            <label>排序（数字越小越靠前）</label>
            <input
              type="number"
              value={newCategoryOrder}
              onChange={(e) => setNewCategoryOrder(Number(e.target.value))}
              min={0}
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          <div className="form-group">
            <button type="submit">添加</button>
          </div>
        </form>
      </div>
    </div>
  ) : null;

  const editFormModal = editingCategory ? (
    <div className="modal-overlay" onClick={(e) => { if (e.target.className === 'modal-overlay') setEditingCategory(null); }}>
      <div className="modal-content" style={{maxWidth: '400px'}}>
        <div className="modal-header">
          <h3>编辑分类</h3>
          <button className="btn btn-secondary" onClick={() => setEditingCategory(null)}>关闭</button>
        </div>
        <form onSubmit={handleEdit}>
          <div className="form-group">
            <label>分类名称</label>
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="输入分类名称"
              required
            />
          </div>
          <div className="form-group">
            <label>排序（数字越小越靠前）</label>
            <input
              type="number"
              value={newCategoryOrder}
              onChange={(e) => setNewCategoryOrder(Number(e.target.value))}
              min={0}
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          <div className="form-group">
            <button type="submit">保存</button>
          </div>
        </form>
      </div>
    </div>
  ) : null;

  return (
    <div className="admin-panel">
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
          <Link to="/admin/dashboard" className="btn btn-secondary">返回控制台</Link>
          <h2>分类管理</h2>
        </div>
        <button className="btn" onClick={() => { setShowAddForm(true); setNewCategoryName(''); setNewCategoryOrder(0); setError(''); }}>
          添加分类
        </button>
      </div>

      {error && <div className="error-message" style={{marginBottom: '15px'}}>{error}</div>}
      {success && <div className="success-message" style={{marginBottom: '15px', padding: '10px', background: 'var(--success-bg-strong)', border: '1px solid var(--success-border)', borderRadius: '6px', color: 'var(--success-text)'}}>{success}</div>}

      <div style={{background: 'var(--card)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden'}}>
        <div style={{padding: '15px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <h3 style={{margin: 0}}>分类列表</h3>
          <span style={{color: 'var(--text-secondary)', fontSize: '14px'}}>共 {categories.length} 个分类</span>
        </div>
        {categories.length === 0 ? (
          <div style={{padding: '40px', textAlign: 'center', color: 'var(--text-secondary)'}}>
            暂无分类，请添加
          </div>
        ) : (
          <div style={{overflowX: 'auto'}}>
            <table style={{width: '100%', borderCollapse: 'collapse'}}>
              <thead>
                <tr style={{borderBottom: '1px solid var(--border)'}}>
                  <th style={{padding: '12px 20px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: '500', fontSize: '14px'}}>分类名称</th>
                  <th style={{padding: '12px 20px', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: '500', fontSize: '14px'}}>排序</th>
                  <th style={{padding: '12px 20px', textAlign: 'right', color: 'var(--text-secondary)', fontWeight: '500', fontSize: '14px'}}>操作</th>
                </tr>
              </thead>
              <tbody>
                {categories.map(cat => (
                  <tr key={cat._id} style={{borderBottom: '1px solid var(--border)'}}>
                    <td style={{padding: '12px 20px'}}>
                      <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                        <div style={{
                          padding: '4px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '500',
                          background: 'var(--primary-bg)', color: 'var(--primary)',
                          border: '1px solid var(--primary-border)'
                        }}>
                          {cat.name}
                        </div>
                      </div>
                    </td>
                    <td style={{padding: '12px 20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px'}}>
                      {cat.order || 0}
                    </td>
                    <td style={{padding: '12px 20px', textAlign: 'right'}}>
                      <div style={{display: 'flex', gap: '8px', justifyContent: 'flex-end'}}>
                        <button
                          className="btn"
                          style={{padding: '6px 14px', fontSize: '13px'}}
                          onClick={() => { setError(''); openEdit(cat); }}
                        >
                          编辑
                        </button>
                        <button
                          className="btn btn-secondary"
                          style={{padding: '6px 14px', fontSize: '13px', color: 'var(--destructive-text)', borderColor: 'var(--destructive-border)'}}
                          onClick={() => handleDelete(cat._id)}
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {createPortal(addFormModal, document.body)}
      {createPortal(editFormModal, document.body)}
    </div>
  );
};

export default AdminCategories;
