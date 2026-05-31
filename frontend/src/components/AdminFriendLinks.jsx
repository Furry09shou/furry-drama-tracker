import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';

const AdminFriendLinks = () => {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingLink, setEditingLink] = useState(null);
  const [activeTab, setActiveTab] = useState('approved');
  const [formData, setFormData] = useState({
    name: '', nameEn: '',
    url: '', logo: '',
    description: '', descriptionEn: '',
    order: 0, isActive: true
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { t } = useI18n();

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
      setError(t('adminFriendLinks.fetchFailed'));
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
      setFormData({ name: '', nameEn: '', url: '', logo: '', description: '', descriptionEn: '', order: 0, isActive: true });
      fetchLinks();
    } catch (e) {
      setError(e.response?.data?.message || t('adminFriendLinks.operationFailed'));
    }
  };

  const handleEdit = (link) => {
    setEditingLink(link);
    setFormData({
      name: link.name, nameEn: link.nameEn || '',
      url: link.url, logo: link.logo || '',
      description: link.description || '', descriptionEn: link.descriptionEn || '',
      order: link.order || 0,
      isActive: link.isActive !== undefined ? link.isActive : true
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('adminFriendLinks.deleteConfirm'))) return;
    try {
      const token = localStorage.getItem('adminToken');
      await axios.delete(`/api/friend-links/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchLinks();
    } catch (e) {
      setError(t('adminFriendLinks.deleteFailed'));
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingLink(null);
    setFormData({ name: '', nameEn: '', url: '', logo: '', description: '', descriptionEn: '', order: 0, isActive: true });
    setError('');
  };

  const handleApprove = async (id) => {
    try {
      const token = localStorage.getItem('adminToken');
      await axios.put(`/api/friend-links/${id}`, { status: 'approved' }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchLinks();
    } catch (e) {
      setError(t('adminFriendLinks.reviewFailed'));
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm(t('adminFriendLinks.rejectConfirm'))) return;
    try {
      const token = localStorage.getItem('adminToken');
      await axios.put(`/api/friend-links/${id}`, { status: 'rejected' }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchLinks();
    } catch (e) {
      setError(t('adminFriendLinks.reviewFailed'));
    }
  };

  const pendingLinks = links.filter(l => l.status === 'pending' || (!l.status && !l.isActive));
  const approvedLinks = links.filter(l => l.status === 'approved' || (!l.status && l.isActive));
  const rejectedLinks = links.filter(l => l.status === 'rejected');
  const displayLinks = activeTab === 'pending' ? pendingLinks : activeTab === 'approved' ? approvedLinks : rejectedLinks;

  if (loading) return <div className="container"><h2>{t('adminFriendLinks.loading')}</h2></div>;

  return (
    <div className="admin-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <h2>{t('adminFriendLinks.title')}</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          {!showForm && (
            <button className="btn" onClick={() => { setShowForm(true); setEditingLink(null); setFormData({ name: '', nameEn: '', url: '', logo: '', description: '', descriptionEn: '', order: 0, isActive: true }); }}>{t('adminFriendLinks.addLink')}</button>
          )}
        </div>
      </div>

      {error && <div className="error-message" style={{ marginBottom: '16px' }}>{error}</div>}

      {showForm && (
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: '12px', padding: '20px', marginBottom: '20px'
        }}>
          <h3 style={{ marginTop: 0, marginBottom: '16px' }}>{editingLink ? t('adminFriendLinks.editLink') : t('adminFriendLinks.addLink')}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>{t('adminFriendLinks.name')} <span style={{ color: 'var(--destructive-text)' }}>*</span></label>
              <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required placeholder={t('adminFriendLinks.namePlaceholder')} />
            </div>
            <div className="form-group">
              <label>{t('adminFriendLinks.nameEn')} <span style={{ color: 'var(--text-tertiary)', fontWeight: 'normal', fontSize: '12px' }}>{t('adminFriendLinks.optionalAutoTranslate')}</span></label>
              <input type="text" value={formData.nameEn} onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })} placeholder="English name (optional)" />
            </div>
            <div className="form-group">
              <label>{t('adminFriendLinks.url')} <span style={{ color: 'var(--destructive-text)' }}>*</span></label>
              <input type="url" value={formData.url} onChange={(e) => setFormData({ ...formData, url: e.target.value })} required placeholder="https://example.com" />
            </div>
            <div className="form-group">
              <label>{t('adminFriendLinks.logoUrl')}</label>
              <input type="text" value={formData.logo} onChange={(e) => setFormData({ ...formData, logo: e.target.value })} placeholder={t('adminFriendLinks.logoPlaceholder')} />
            </div>
            <div className="form-group">
              <label>{t('adminFriendLinks.description')}</label>
              <input type="text" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder={t('adminFriendLinks.descriptionPlaceholder')} />
            </div>
            <div className="form-group">
              <label>{t('adminFriendLinks.descriptionEn')} <span style={{ color: 'var(--text-tertiary)', fontWeight: 'normal', fontSize: '12px' }}>{t('adminFriendLinks.optional')}</span></label>
              <input type="text" value={formData.descriptionEn} onChange={(e) => setFormData({ ...formData, descriptionEn: e.target.value })} placeholder="English description (optional)" />
            </div>
            <div className="form-group">
              <label>{t('adminFriendLinks.order')}</label>
              <input type="number" value={formData.order} onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })} placeholder={t('adminFriendLinks.orderPlaceholder')} />
            </div>
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="checkbox" checked={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} style={{ accentColor: 'var(--primary)', cursor: 'pointer' }} />
              <label style={{ cursor: 'pointer' }}>{t('adminFriendLinks.active')}</label>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button type="submit" className="btn">{editingLink ? t('adminFriendLinks.saveChanges') : t('adminFriendLinks.add')}</button>
              <button type="button" className="btn btn-secondary" onClick={handleCancel}>{t('adminFriendLinks.cancel')}</button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {[
          { key: 'pending', label: t('adminFriendLinks.pending'), count: pendingLinks.length },
          { key: 'approved', label: t('adminFriendLinks.approved'), count: approvedLinks.length },
          { key: 'rejected', label: t('adminFriendLinks.rejected'), count: rejectedLinks.length },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
            padding: '8px 16px', borderRadius: '8px', fontSize: '14px',
            cursor: 'pointer', transition: 'all 0.2s', border: '1px solid',
            background: activeTab === tab.key ? 'var(--primary-bg)' : 'var(--card)',
            color: activeTab === tab.key ? 'var(--primary)' : 'var(--text-secondary)',
            borderColor: activeTab === tab.key ? 'var(--primary-border)' : 'var(--border)',
            fontWeight: activeTab === tab.key ? 600 : 400
          }}>{tab.label} ({tab.count})</button>
        ))}
      </div>

      {displayLinks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
          {activeTab === 'pending' ? t('adminFriendLinks.noPendingLinks') : activeTab === 'approved' ? t('adminFriendLinks.noApprovedLinks') : t('adminFriendLinks.noRejectedLinks')}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {displayLinks.map(link => (
            <div key={link._id} style={{
              display: 'flex', alignItems: 'center', gap: '14px',
              padding: '12px 14px', borderRadius: '10px',
              background: 'var(--card)', border: '1px solid var(--border)',
              opacity: link.isActive ? 1 : 0.6,
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
                  {(link.status === 'pending' || (!link.status && !link.isActive)) && (
                    <span style={{
                      fontSize: '11px', color: '#f59e0b',
                      background: '#fef3c7', padding: '1px 8px',
                      borderRadius: '4px', border: '1px solid #fde68a'
                    }}>{t('adminFriendLinks.pending')}</span>
                  )}
                  {link.status === 'rejected' && (
                    <span style={{
                      fontSize: '11px', color: 'var(--destructive-text)',
                      background: 'var(--destructive-bg)', padding: '1px 8px',
                      borderRadius: '4px', border: '1px solid var(--destructive-border)'
                    }}>{t('adminFriendLinks.rejected')}</span>
                  )}
                  {!link.isActive && (link.status === 'approved' || !link.status) && (
                    <span style={{
                      fontSize: '11px', color: 'var(--text-tertiary)',
                      background: 'var(--hover-bg)', padding: '1px 8px',
                      borderRadius: '4px', border: '1px solid var(--border)'
                    }}>{t('adminFriendLinks.disabled')}</span>
                  )}
                  <span style={{
                    fontSize: '11px', color: 'var(--text-tertiary)',
                    background: 'var(--hover-bg)', padding: '1px 8px',
                    borderRadius: '4px'
                  }}>{t('adminFriendLinks.orderLabel')}: {link.order}</span>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{link.url}</div>
                {link.description && (
                  <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px' }}>{link.description}</div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                {(link.status === 'pending' || (!link.status && !link.isActive)) && (
                  <>
                    <button style={{
                      background: 'var(--success-bg-subtle)', border: '1px solid var(--success-border)',
                      color: 'var(--success-text)', borderRadius: '6px', padding: '6px 14px',
                      cursor: 'pointer', fontSize: '13px', transition: 'all 0.2s'
                    }} onClick={() => handleApprove(link._id)}>{t('adminFriendLinks.approve')}</button>
                    <button style={{
                      background: 'var(--destructive-bg)', border: '1px solid var(--destructive-border)',
                      color: 'var(--destructive-text)', borderRadius: '6px', padding: '6px 14px',
                      cursor: 'pointer', fontSize: '13px'
                    }} onClick={() => handleReject(link._id)}>{t('adminFriendLinks.reject')}</button>
                  </>
                )}
                <button className="btn btn-secondary" style={{ fontSize: '13px', padding: '6px 14px' }} onClick={() => handleEdit(link)}>{t('adminFriendLinks.edit')}</button>
                <button style={{
                  background: 'var(--destructive-bg)', border: '1px solid var(--destructive-border)',
                  color: 'var(--destructive-text)', borderRadius: '6px', padding: '6px 14px',
                  cursor: 'pointer', fontSize: '13px'
                }} onClick={() => handleDelete(link._id)}>{t('adminFriendLinks.delete')}</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminFriendLinks;
