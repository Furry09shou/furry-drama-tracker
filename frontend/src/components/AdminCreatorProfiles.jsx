import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import adminApi from '../utils/adminApi';
import ImageUploader from './ImageUploader';
import ReviewStatusBadge from './ReviewStatusBadge';
import { useI18n } from '../contexts/I18nContext';

// 把 socialLinks(Map 或对象) 转为 [{name,url}] 数组
const linksToArr = (links) => {
  if (!links) return [];
  const obj = (typeof links === 'object' && !(links instanceof Map))
    ? links
    : Object.fromEntries(links);
  return Object.entries(obj).map(([name, url]) => ({ name, url }));
};

const hasPending = (profile) => {
  const pc = profile?.pendingChanges;
  return !!(pc && pc.displayName);
};

const AdminCreatorProfiles = () => {
  const { admin } = useOutletContext();
  const [profiles, setProfiles] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ displayName: '', avatar: '', bio: '', socialLinks: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  // 审核相关状态
  const [reviewingId, setReviewingId] = useState(null);     // 展开待审核修改的 profileId
  const [reviewBusy, setReviewBusy] = useState(false);      // 审核 API 调用中
  const [rejectNoteMap, setRejectNoteMap] = useState({});   // { [profileId]: note }
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

  // 通过审核：将 pendingChanges 应用到正式字段
  const handleApprove = async (profileId) => {
    if (!window.confirm(t('adminCreatorProfiles.approveConfirm'))) return;
    setReviewBusy(true);
    try {
      await adminApi.put(`/api/admin/creator-profiles/${profileId}/approve`);
      setMessage(t('adminCreatorProfiles.approveSuccess'));
      setReviewingId(null);
      await fetchProfiles();
    } catch (err) {
      setMessage(err.response?.data?.message || t('adminCreatorProfiles.reviewFailed'));
    }
    setReviewBusy(false);
  };

  // 拒绝审核：保留 pendingChanges 供创作者修改重提，正式字段不变
  const handleReject = async (profileId) => {
    if (!window.confirm(t('adminCreatorProfiles.rejectConfirm'))) return;
    setReviewBusy(true);
    try {
      const note = (rejectNoteMap[profileId] || '').slice(0, 500);
      await adminApi.put(`/api/admin/creator-profiles/${profileId}/reject`, { note });
      setMessage(t('adminCreatorProfiles.rejectSuccess'));
      setReviewingId(null);
      setRejectNoteMap(prev => ({ ...prev, [profileId]: '' }));
      await fetchProfiles();
    } catch (err) {
      setMessage(err.response?.data?.message || t('adminCreatorProfiles.reviewFailed'));
    }
    setReviewBusy(false);
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
              {profiles.map(profile => {
                const pending = hasPending(profile);
                const expanded = reviewingId === profile._id;
                const pc = profile.pendingChanges || {};
                const pcLinks = linksToArr(pc.socialLinks);
                const curLinks = linksToArr(profile.socialLinks);
                return (
                <div key={profile._id} style={{
                  background: 'var(--card)', borderRadius: '12px', padding: '20px',
                  border: '1px solid var(--border)', transition: 'border-color 0.2s',
                  borderColor: pending ? 'var(--warning-border)' : 'var(--border)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    {profile.avatar ? (
                      <img src={profile.avatar} alt={profile.displayName} style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--hover-bg-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>👤</div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <h3 style={{ margin: 0, fontSize: '16px' }}>{profile.displayName}</h3>
                        <ReviewStatusBadge status={profile.reviewStatus || 'approved'} />
                      </div>
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
                  {/* 拒绝备注展示 */}
                  {profile.reviewStatus === 'rejected' && profile.reviewNote && (
                    <div style={{
                      padding: '8px 12px', borderRadius: '8px', marginBottom: '12px', fontSize: '12px',
                      background: 'var(--destructive-bg)', color: 'var(--destructive-text)',
                      border: '1px solid var(--destructive-border)'
                    }}>
                      {t('adminCreatorProfiles.reviewNote')}：{profile.reviewNote}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '8px', marginBottom: pending ? '8px' : '0' }}>
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

                  {/* 待审核修改入口 */}
                  {pending && (
                    <button
                      onClick={() => setReviewingId(expanded ? null : profile._id)}
                      style={{
                        width: '100%', marginTop: '8px', padding: '8px 12px', borderRadius: '8px',
                        cursor: 'pointer', fontSize: '13px', fontWeight: 500,
                        background: 'var(--warning-bg)', color: 'var(--warning-text)',
                        border: '1px solid var(--warning-border)'
                      }}
                    >{expanded ? t('adminCreatorProfiles.hidePending') : t('adminCreatorProfiles.viewPending')}</button>
                  )}

                  {/* 待审核修改对比面板 */}
                  {pending && expanded && (
                    <div style={{
                      marginTop: '12px', padding: '14px', borderRadius: '10px',
                      background: 'var(--hover-bg)', border: '1px solid var(--border)'
                    }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                        {/* 当前线上版本 */}
                        <div>
                          <p style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>{t('adminCreatorProfiles.currentVersion')}</p>
                          {profile.avatar ? (
                            <img src={profile.avatar} alt="" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', marginBottom: '6px' }} />
                          ) : (
                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--hover-bg-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', marginBottom: '6px' }}>👤</div>
                          )}
                          <p style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: 500 }}>{profile.displayName}</p>
                          <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: 'var(--text-secondary)', maxHeight: '60px', overflow: 'hidden' }}>{profile.bio || t('adminCreatorProfiles.bioEmpty')}</p>
                          <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: 'var(--text-tertiary)' }}>
                            {curLinks.length > 0 ? curLinks.map(l => l.name).join('、') : t('adminCreatorProfiles.linkEmpty')}
                          </p>
                        </div>
                        {/* 待审核版本 */}
                        <div style={{ borderLeft: '2px solid var(--warning-border)', paddingLeft: '12px' }}>
                          <p style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 600, color: 'var(--warning-text)' }}>{t('adminCreatorProfiles.pendingVersion')}</p>
                          {pc.avatar ? (
                            <img src={pc.avatar} alt="" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', marginBottom: '6px' }} />
                          ) : (
                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--hover-bg-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', marginBottom: '6px' }}>👤</div>
                          )}
                          <p style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: 500 }}>{pc.displayName || '-'}</p>
                          <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: 'var(--text-secondary)', maxHeight: '60px', overflow: 'hidden' }}>{pc.bio || t('adminCreatorProfiles.bioEmpty')}</p>
                          <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: 'var(--text-tertiary)' }}>
                            {pcLinks.length > 0 ? pcLinks.map(l => l.name).join('、') : t('adminCreatorProfiles.linkEmpty')}
                          </p>
                        </div>
                      </div>

                      {/* 拒绝备注输入 */}
                      <div style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>{t('adminCreatorProfiles.reviewNote')}</label>
                        <textarea
                          value={rejectNoteMap[profile._id] || ''}
                          onChange={(e) => setRejectNoteMap(prev => ({ ...prev, [profile._id]: e.target.value }))}
                          placeholder={t('adminCreatorProfiles.reviewNotePlaceholder')}
                          rows={2}
                          maxLength={500}
                          style={{
                            width: '100%', padding: '8px', borderRadius: '6px', fontSize: '13px',
                            background: 'var(--card)', color: 'var(--foreground)',
                            border: '1px solid var(--border)', resize: 'vertical'
                          }}
                        />
                      </div>

                      {/* 审核操作按钮 */}
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleApprove(profile._id)}
                          disabled={reviewBusy}
                          style={{
                            flex: 1, padding: '8px 12px', borderRadius: '8px', cursor: reviewBusy ? 'not-allowed' : 'pointer',
                            background: 'var(--success-bg)', color: 'var(--success-text)',
                            border: '1px solid var(--success-border)', fontSize: '13px', fontWeight: 500,
                            opacity: reviewBusy ? 0.6 : 1
                          }}
                        >{reviewBusy ? t('adminCreatorProfiles.reviewing') : t('adminCreatorProfiles.approve')}</button>
                        <button
                          onClick={() => handleReject(profile._id)}
                          disabled={reviewBusy}
                          style={{
                            flex: 1, padding: '8px 12px', borderRadius: '8px', cursor: reviewBusy ? 'not-allowed' : 'pointer',
                            background: 'var(--destructive-bg)', color: 'var(--destructive-text)',
                            border: '1px solid var(--destructive-border)', fontSize: '13px', fontWeight: 500,
                            opacity: reviewBusy ? 0.6 : 1
                          }}
                        >{reviewBusy ? t('adminCreatorProfiles.reviewing') : t('adminCreatorProfiles.reject')}</button>
                      </div>
                    </div>
                  )}
                </div>
              );})}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminCreatorProfiles;

