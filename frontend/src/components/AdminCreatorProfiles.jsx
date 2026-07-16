import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import adminApi from '../utils/adminApi';
import ImageUploader from './ImageUploader';
import { useI18n } from '../contexts/I18nContext';

const AdminCreatorProfiles = () => {
  const { admin } = useOutletContext();
  const [profiles, setProfiles] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ displayName: '', avatar: '', bio: '', socialLinks: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const { t } = useI18n();

  useEffect(() => {
    if (admin.role === 'superadmin') {
      fetchProfiles();
    } else {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [admin, navigate]);

  const fetchProfiles = async () => {
    try {
      const res = await adminApi.get('/api/admin/creator-profiles');
      setProfiles(res.data);
    } catch (err) {
      console.error('获取创作者主页列表失败', err);
    }
    setLoading(false);
  };

  const startEdit = (profile) => {
    setEditingId(profile._id);
    const links = profile.socialLinks
      ? (typeof profile.socialLinks === 'object' && !(profile.socialLinks instanceof Map)
        ? profile.socialLinks
        : Object.fromEntries(profile.socialLinks))
      : {};
    setEditForm({
      displayName: profile.displayName || '',
      avatar: profile.avatar || '',
      bio: profile.bio || '',
      socialLinks: Object.entries(links).map(([name, url]) => ({ name, url }))
    });
    setMessage('');
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const linksObj = {};
      editForm.socialLinks.forEach(item => {
        if (item.name.trim()) linksObj[item.name.trim()] = item.url.trim();
      });
      await adminApi.put(`/api/admin/creator-profiles/${editingId}`, {
        displayName: editForm.displayName,
        avatar: editForm.avatar,
        bio: editForm.bio,
        socialLinks: linksObj
      });
      setMessage(t('adminCreatorProfiles.saveSuccess'));
      fetchProfiles();
    } catch (err) {
      setMessage(err.response?.data?.message || t('adminCreatorProfiles.saveFailed'));
    }
    setSaving(false);
  };

  if (!admin || admin.role !== 'superadmin') return null;
  if (loading) return <div className="admin-panel"><h2>{t('common.loading')}</h2></div>;

  return (
    <div className="admin-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h2>{t('adminCreatorProfiles.title')}</h2>
        <button onClick={() => setEditingId(null)} className="btn btn-secondary">
          {t('adminCreatorProfiles.backToList')}
        </button>
      </div>

      {editingId ? (
        <div className="form-container" style={{ maxWidth: '700px', margin: '0 auto' }}>
          <div className="form-group">
            <label>{t('adminCreatorProfiles.displayName')}</label>
            <input
              type="text"
              value={editForm.displayName}
              onChange={(e) => setEditForm({...editForm, displayName: e.target.value})}
              placeholder={t('adminCreatorProfiles.displayNamePlaceholder')}
            />
          </div>

          <div className="form-group">
            <label>{t('adminCreatorProfiles.avatar')}</label>
            <ImageUploader
              value={editForm.avatar}
              onChange={(avatar) => setEditForm({...editForm, avatar})}
              label=""
              aspectRatio={1}
              outputWidth={200}
              outputHeight={200}
            />
          </div>

          <div className="form-group">
            <label>{t('adminCreatorProfiles.bio')}</label>
            <textarea
              value={editForm.bio}
              onChange={(e) => setEditForm({...editForm, bio: e.target.value})}
              placeholder={t('adminCreatorProfiles.bioPlaceholder')}
              rows={4}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'var(--card)', color: 'var(--foreground)', border: '1px solid var(--border)', resize: 'vertical' }}
            />
          </div>

          <div className="form-group">
            <label>{t('adminCreatorProfiles.socialLinks')}</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {editForm.socialLinks.map((item, index) => (
                <div key={index} style={{
                  background: 'var(--hover-bg)', border: '1px solid var(--border)',
                  borderRadius: '8px', padding: '12px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{t('adminCreatorProfiles.linkIndex')} {index + 1}</span>
                    <button
                      type="button"
                      onClick={() => setEditForm({...editForm, socialLinks: editForm.socialLinks.filter((_, i) => i !== index)})}
                      style={{
                        background: 'var(--destructive-bg)', border: '1px solid var(--destructive-border)',
                        color: 'var(--destructive-text)', borderRadius: '6px', padding: '4px 10px',
                        cursor: 'pointer', fontSize: '12px', lineHeight: 1
                      }}
                    >{t('common.delete')}</button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => {
                        const newList = [...editForm.socialLinks];
                        newList[index] = {...newList[index], name: e.target.value};
                        setEditForm({...editForm, socialLinks: newList});
                      }}
                      placeholder={t('adminCreatorProfiles.platformNamePlaceholder')}
                      style={{ width: '100%' }}
                    />
                    <input
                      type="text"
                      value={item.url}
                      onChange={(e) => {
                        const newList = [...editForm.socialLinks];
                        newList[index] = {...newList[index], url: e.target.value};
                        setEditForm({...editForm, socialLinks: newList});
                      }}
                      placeholder={t('adminCreatorProfiles.linkUrlPlaceholder')}
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setEditForm({...editForm, socialLinks: [...editForm.socialLinks, { name: '', url: '' }]})}
                style={{
                  background: 'var(--primary-bg-subtle)', border: '1px dashed var(--primary)',
                  color: 'var(--primary)', borderRadius: '8px', padding: '10px',
                  cursor: 'pointer', fontSize: '14px'
                }}
              >{t('adminCreatorProfiles.addSocialLink')}</button>
            </div>
          </div>

          {message && (
            <div style={{
              padding: '10px 16px', borderRadius: '8px', marginBottom: '16px',
              background: message === t('adminCreatorProfiles.saveSuccess') ? 'var(--success-bg)' : 'var(--destructive-bg)',
              color: message === t('adminCreatorProfiles.saveSuccess') ? 'var(--success-text)' : 'var(--destructive-text)',
              border: `1px solid ${message === t('adminCreatorProfiles.saveSuccess') ? 'var(--success-border)' : 'var(--destructive-border)'}`
            }}>{message}</div>
          )}

          <button className="btn" onClick={handleSave} disabled={saving}>
            {saving ? t('common.saving') : t('adminCreatorProfiles.saveProfile')}
          </button>
        </div>
      ) : (
        <div>
          {profiles.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '40px' }}>
              {t('adminCreatorProfiles.noProfiles')}
            </p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
              {profiles.map(profile => (
                <div key={profile._id} style={{
                  background: 'var(--card)', borderRadius: '12px', padding: '20px',
                  border: '1px solid var(--border)', transition: 'border-color 0.2s'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    {profile.avatar ? (
                      <img src={profile.avatar} alt={profile.displayName} style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--hover-bg-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>👤</div>
                    )}
                    <div>
                      <h3 style={{ margin: 0, fontSize: '16px' }}>{profile.displayName}</h3>
                      {profile.adminId && (
                        <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-tertiary)' }}>
                          {profile.adminId.username || profile.adminId.accountId} ({profile.adminId.email})
                        </p>
                      )}
                    </div>
                  </div>
                  {profile.bio && (
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {profile.bio}
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => startEdit(profile)}
                      style={{
                        flex: 1, padding: '8px 12px', borderRadius: '8px', cursor: 'pointer',
                        background: 'var(--primary-bg)', border: '1px solid var(--primary-border)',
                        color: 'var(--primary-light)', fontSize: '13px', fontWeight: 500
                      }}
                    >{t('common.edit')}</button>
                    {profile.adminId && (
                      <Link
                        to={`/creator/${profile.adminId._id}`}
                        style={{
                          flex: 1, padding: '8px 12px', borderRadius: '8px', cursor: 'pointer',
                          background: 'var(--hover-bg)', border: '1px solid var(--border)',
                          color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 500,
                          textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                      >{t('adminCreatorProfiles.viewPage')}</Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminCreatorProfiles;
