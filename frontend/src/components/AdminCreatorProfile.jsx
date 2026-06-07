import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import adminApi from '../utils/adminApi';
import ImageUploader from './ImageUploader';
import { useI18n } from '../contexts/I18nContext';

const AdminCreatorProfile = () => {
  const { admin } = useOutletContext();
  const [profile, setProfile] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [avatar, setAvatar] = useState('');
  const [bio, setBio] = useState('');
  const [socialLinks, setSocialLinks] = useState([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const { t } = useI18n();

  useEffect(() => {
    if (admin.role === 'creator' || admin.role === 'admin' || admin.role === 'superadmin') {
      fetchProfile();
    } else {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [admin, navigate]);

  const fetchProfile = async () => {
    try {
      const res = await adminApi.get('/api/creator-profile/my-profile');
      setProfile(res.data);
      setDisplayName(res.data.displayName || '');
      setAvatar(res.data.avatar || '');
      setBio(res.data.bio || '');
      const links = res.data.socialLinks
        ? (typeof res.data.socialLinks === 'object' && !(res.data.socialLinks instanceof Map)
          ? res.data.socialLinks
          : Object.fromEntries(res.data.socialLinks))
        : {};
      setSocialLinks(Object.entries(links).map(([name, url]) => ({ name, url })));
    } catch (err) {
      console.error('获取创作者主页失败', err);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const linksObj = {};
      socialLinks.forEach(item => {
        if (item.name.trim()) linksObj[item.name.trim()] = item.url.trim();
      });
      const res = await adminApi.put('/api/creator-profile/my-profile', {
        displayName, avatar, bio, socialLinks: linksObj
      });
      setProfile(res.data);
      setMessage(t('adminCreatorProfile.saveSuccess'));
    } catch (err) {
      setMessage(err.response?.data?.message || t('adminCreatorProfile.saveFailed'));
    }
    setSaving(false);
  };

  if (!admin) return null;

  return (
    <div className="admin-panel">
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
          <h2>{t('adminCreatorProfile.title')}</h2>
        </div>
      </div>

      <div className="form-container" style={{maxWidth: '700px'}}>
        <div className="form-group">
          <label>{t('adminCreatorProfile.displayName')}</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={t('adminCreatorProfile.displayNamePlaceholder')}
          />
        </div>

        <div className="form-group">
          <label>{t('adminCreatorProfile.avatar')}</label>
          <ImageUploader
            value={avatar}
            onChange={setAvatar}
            label=""
            aspectRatio={1}
            outputWidth={200}
            outputHeight={200}
          />
        </div>

        <div className="form-group">
          <label>{t('adminCreatorProfile.bio')}</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder={t('adminCreatorProfile.bioPlaceholder')}
            rows={4}
            style={{width: '100%', padding: '10px', borderRadius: '8px', background: 'var(--card)', color: 'var(--foreground)', border: '1px solid var(--border)', resize: 'vertical'}}
          />
        </div>

        <div className="form-group">
          <label>{t('adminCreatorProfile.socialLinks')}</label>
          <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
            {socialLinks.map((item, index) => (
              <div key={index} style={{
                background: 'var(--hover-bg)', border: '1px solid var(--border)',
                borderRadius: '8px', padding: '12px'
              }}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px'}}>
                  <span style={{fontSize: '13px', color: 'var(--text-secondary)'}}>{t('adminCreatorProfile.linkIndex')} {index + 1}</span>
                  <button
                    type="button"
                    onClick={() => setSocialLinks(socialLinks.filter((_, i) => i !== index))}
                    style={{
                      background: 'var(--destructive-bg)', border: '1px solid var(--destructive-border)',
                      color: 'var(--destructive-text)', borderRadius: '6px', padding: '4px 10px',
                      cursor: 'pointer', fontSize: '12px', lineHeight: 1
                    }}
                  >{t('adminCreatorProfile.delete')}</button>
                </div>
                <div style={{display: 'flex', flexDirection: 'column', gap: '6px'}}>
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => {
                      const newList = [...socialLinks];
                      newList[index] = {...newList[index], name: e.target.value};
                      setSocialLinks(newList);
                    }}
                    placeholder={t('adminCreatorProfile.platformNamePlaceholder')}
                    style={{width: '100%'}}
                  />
                  <input
                    type="text"
                    value={item.url}
                    onChange={(e) => {
                      const newList = [...socialLinks];
                      newList[index] = {...newList[index], url: e.target.value};
                      setSocialLinks(newList);
                    }}
                    placeholder={t('adminCreatorProfile.linkUrlPlaceholder')}
                    style={{width: '100%'}}
                  />
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setSocialLinks([...socialLinks, { name: '', url: '' }])}
              style={{
                background: 'var(--primary-bg-subtle)', border: '1px dashed var(--primary)',
                color: 'var(--primary)', borderRadius: '8px', padding: '10px',
                cursor: 'pointer', fontSize: '14px'
              }}
            >{t('adminCreatorProfile.addSocialLink')}</button>
          </div>
        </div>

        {message && (
          <div style={{
            padding: '10px 16px', borderRadius: '8px', marginBottom: '16px',
            background: message.includes(t('adminCreatorProfile.successKeyword')) ? 'var(--success-bg)' : 'var(--destructive-bg)',
            color: message.includes(t('adminCreatorProfile.successKeyword')) ? 'var(--success-text)' : 'var(--destructive-text)',
            border: `1px solid ${message.includes(t('adminCreatorProfile.successKeyword')) ? 'var(--success-border)' : 'var(--destructive-border)'}`
          }}>{message}</div>
        )}

        <button className="btn" onClick={handleSave} disabled={saving}>
          {saving ? t('adminCreatorProfile.saving') : t('adminCreatorProfile.saveProfile')}
        </button>

        {profile && (
          <div style={{marginTop: '20px', padding: '16px', background: 'var(--primary-bg-subtle)', borderRadius: '8px', border: '1px solid var(--primary-border-subtle)'}}>
            <p style={{margin: '0 0 8px 0', fontSize: '14px', color: 'var(--foreground)'}}>
              <strong>{t('adminCreatorProfile.profileLinkLabel')}</strong>
              <Link
                to={`/creator/${admin._id}`}
                style={{color: 'var(--primary)', textDecoration: 'none', marginLeft: '8px'}}
              >{t('adminCreatorProfile.viewMyProfile')}</Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminCreatorProfile;
