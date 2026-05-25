import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';

const AdminCategories = () => {
  const [admin, setAdmin] = useState(null);
  const [categories, setCategories] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryNameEn, setNewCategoryNameEn] = useState('');
  const [newCategoryOrder, setNewCategoryOrder] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();
  const { t } = useI18n();

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
      setError(t('adminCategories.nameRequired'));
      return;
    }
    try {
      const token = localStorage.getItem('adminToken');
      await axios.post('/api/categories', {
        name: newCategoryName.trim(),
        nameEn: newCategoryNameEn.trim(),
        order: newCategoryOrder
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNewCategoryName('');
      setNewCategoryNameEn('');
      setNewCategoryOrder(0);
      setShowAddForm(false);
      setSuccess(t('adminCategories.addSuccess'));
      fetchCategories();
    } catch (err) {
      setError(err.response?.data?.message || t('adminCategories.addFailed'));
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setError('');
    if (!newCategoryName.trim()) {
      setError(t('adminCategories.nameRequired'));
      return;
    }
    try {
      const token = localStorage.getItem('adminToken');
      await axios.put(`/api/categories/${editingCategory._id}`, {
        name: newCategoryName.trim(),
        nameEn: newCategoryNameEn.trim(),
        order: newCategoryOrder
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEditingCategory(null);
      setNewCategoryName('');
      setNewCategoryNameEn('');
      setNewCategoryOrder(0);
      setSuccess(t('adminCategories.editSuccess'));
      fetchCategories();
    } catch (err) {
      setError(err.response?.data?.message || t('adminCategories.editFailed'));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('adminCategories.deleteConfirm'))) return;
    try {
      const token = localStorage.getItem('adminToken');
      await axios.delete(`/api/categories/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess(t('adminCategories.deleteSuccess'));
      fetchCategories();
    } catch (err) {
      setError(err.response?.data?.message || t('adminCategories.deleteFailed'));
    }
  };

  const openEdit = (cat) => {
    setEditingCategory(cat);
    setNewCategoryName(cat.name);
    setNewCategoryNameEn(cat.nameEn || '');
    setNewCategoryOrder(cat.order || 0);
  };

  if (!admin) return null;

  const addFormModal = showAddForm ? (
    <div className="modal-overlay" onClick={(e) => { if (e.target.className === 'modal-overlay') setShowAddForm(false); }}>
      <div className="modal-content" style={{maxWidth: '520px'}}>
        <div className="modal-header">
          <h3>{t('adminCategories.addCategory')}</h3>
          <button className="btn btn-secondary" onClick={() => setShowAddForm(false)}>{t('adminCategories.close')}</button>
        </div>
        <form onSubmit={handleAdd}>
          <div className="form-group">
            <label>{t('adminCategories.categoryName')}</label>
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder={t('adminCategories.categoryNamePlaceholder')}
              required
            />
          </div>
          <div className="form-group">
              <label>{t('adminCategories.nameEn')} <span style={{color: 'var(--text-tertiary)', fontWeight: 'normal', fontSize: '12px'}}>{t('adminCategories.optionalAutoTranslate')}</span></label>
              <input
                type="text"
                value={newCategoryNameEn}
                onChange={(e) => setNewCategoryNameEn(e.target.value)}
                placeholder="English name (optional)"
              />
            </div>
          <div className="form-group">
            <label>{t('adminCategories.orderLabel')}</label>
            <input
              type="number"
              value={newCategoryOrder}
              onChange={(e) => setNewCategoryOrder(Number(e.target.value))}
              min={0}
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          <div className="form-group">
            <button type="submit">{t('adminCategories.add')}</button>
          </div>
        </form>
      </div>
    </div>
  ) : null;

  const editFormModal = editingCategory ? (
    <div className="modal-overlay" onClick={(e) => { if (e.target.className === 'modal-overlay') setEditingCategory(null); }}>
      <div className="modal-content" style={{maxWidth: '520px'}}>
        <div className="modal-header">
          <h3>{t('adminCategories.editCategory')}</h3>
          <button className="btn btn-secondary" onClick={() => setEditingCategory(null)}>{t('adminCategories.close')}</button>
        </div>
        <form onSubmit={handleEdit}>
          <div className="form-group">
            <label>{t('adminCategories.categoryName')}</label>
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder={t('adminCategories.categoryNamePlaceholder')}
              required
            />
          </div>
          <div className="form-group">
              <label>{t('adminCategories.nameEn')} <span style={{color: 'var(--text-tertiary)', fontWeight: 'normal', fontSize: '12px'}}>{t('adminCategories.optionalAutoTranslate')}</span></label>
              <input
                type="text"
                value={newCategoryNameEn}
                onChange={(e) => setNewCategoryNameEn(e.target.value)}
                placeholder="English name (optional)"
              />
            </div>
          <div className="form-group">
            <label>{t('adminCategories.orderLabel')}</label>
            <input
              type="number"
              value={newCategoryOrder}
              onChange={(e) => setNewCategoryOrder(Number(e.target.value))}
              min={0}
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          <div className="form-group">
            <button type="submit">{t('adminCategories.save')}</button>
          </div>
        </form>
      </div>
    </div>
  ) : null;

  return (
    <div className="admin-panel">
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
          <h2>{t('adminCategories.title')}</h2>
        </div>
        <button className="btn" onClick={() => { setShowAddForm(true); setNewCategoryName(''); setNewCategoryNameEn(''); setNewCategoryOrder(0); setError(''); }}>
          {t('adminCategories.addCategoryBtn')}
        </button>
      </div>

      {error && <div className="error-message" style={{marginBottom: '15px'}}>{error}</div>}
      {success && <div className="success-message" style={{marginBottom: '15px', padding: '10px', background: 'var(--success-bg-strong)', border: '1px solid var(--success-border)', borderRadius: '6px', color: 'var(--success-text)'}}>{success}</div>}

      <div style={{background: 'var(--card)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden'}}>
        <div style={{padding: '15px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <h3 style={{margin: 0}}>{t('adminCategories.categoryList')}</h3>
          <span style={{color: 'var(--text-secondary)', fontSize: '14px'}}>{t('adminCategories.categoryCount', { count: categories.length })}</span>
        </div>
        {categories.length === 0 ? (
          <div style={{padding: '40px', textAlign: 'center', color: 'var(--text-secondary)'}}>
            {t('adminCategories.noCategories')}
          </div>
        ) : (
          <div style={{overflowX: 'auto'}}>
            <table style={{width: '100%', borderCollapse: 'collapse'}}>
              <thead>
                <tr style={{borderBottom: '1px solid var(--border)'}}>
                  <th style={{padding: '12px 20px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: '500', fontSize: '14px'}}>{t('adminCategories.categoryNameCol')}</th>
                  <th style={{padding: '12px 20px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: '500', fontSize: '14px'}}>{t('adminCategories.nameEnCol')}</th>
                  <th style={{padding: '12px 20px', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: '500', fontSize: '14px'}}>{t('adminCategories.orderCol')}</th>
                  <th style={{padding: '12px 20px', textAlign: 'right', color: 'var(--text-secondary)', fontWeight: '500', fontSize: '14px'}}>{t('adminCategories.actionsCol')}</th>
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
                    <td style={{padding: '12px 20px', color: cat.nameEn ? 'var(--foreground)' : 'var(--text-tertiary)', fontSize: '14px'}}>
                      {cat.nameEn || '—'}
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
                          {t('adminCategories.edit')}
                        </button>
                        <button
                          className="btn btn-secondary"
                          style={{padding: '6px 14px', fontSize: '13px', color: 'var(--destructive-text)', borderColor: 'var(--destructive-border)'}}
                          onClick={() => handleDelete(cat._id)}
                        >
                          {t('adminCategories.delete')}
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
