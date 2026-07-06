import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import adminApi from '../utils/adminApi';
import { useI18n } from '../contexts/I18nContext';
import ReviewStatusBadge from './ReviewStatusBadge';

const AdminReview = () => {
  const { admin } = useOutletContext();
  const [pendingEpisodes, setPendingEpisodes] = useState([]);
  const [allEpisodes, setAllEpisodes] = useState([]);
  const [creators, setCreators] = useState([]);
  const [activeTab, setActiveTab] = useState('pending');
  const [reviewNote, setReviewNote] = useState('');
  const [assignEpisodeId, setAssignEpisodeId] = useState('');
  const [assignEditorId, setAssignEditorId] = useState('');
  const [detailEpisode, setDetailEpisode] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { t } = useI18n();

  useEffect(() => {
    if (admin.role === 'admin' || admin.role === 'superadmin') {
      fetchPendingEpisodes();
      fetchAllEpisodes();
      fetchCreators();
    } else {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [admin, navigate]);

  const fetchPendingEpisodes = async () => {
    try {
      const res = await adminApi.get('/api/review/pending');
      setPendingEpisodes(res.data.list || res.data);
    } catch (err) {
      console.error('获取待审核剧集失败', err);
    }
  };

  const fetchAllEpisodes = async () => {
    try {
      const res = await adminApi.get('/api/review/all');
      setAllEpisodes(res.data.list || res.data);
    } catch (err) {
      console.error('获取所有剧集失败', err);
    }
  };

  const fetchCreators = async () => {
    try {
      const res = await adminApi.get('/api/admin/creators');
      setCreators(res.data);
    } catch (err) {
      console.error('获取创作者列表失败', err);
    }
  };

  const handleApprove = async (id) => {
    try {
      await adminApi.put(`/api/review/approve/${id}`, { note: reviewNote });
      setReviewNote('');
      fetchPendingEpisodes();
      fetchAllEpisodes();
    } catch (err) {
      setError(err.response?.data?.message || t('adminReview.reviewFailed'));
    }
  };

  const handleReject = async (id) => {
    if (!reviewNote.trim()) {
      setError(t('adminReview.rejectReasonRequired'));
      return;
    }
    try {
      await adminApi.put(`/api/review/reject/${id}`, { note: reviewNote });
      setReviewNote('');
      fetchPendingEpisodes();
      fetchAllEpisodes();
    } catch (err) {
      setError(err.response?.data?.message || t('adminReview.reviewFailed'));
    }
  };

  const handleAssignEditor = async () => {
    if (!assignEpisodeId || !assignEditorId) {
      setError(t('adminReview.selectEpisodeAndCreator'));
      return;
    }
    try {
      await adminApi.put(`/api/review/assign-editor/${assignEpisodeId}`, { editorId: assignEditorId });
      setAssignEpisodeId('');
      setAssignEditorId('');
      fetchAllEpisodes();
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || t('adminReview.assignFailed'));
    }
  };

  const handleRemoveEditor = async (episodeId, editorId) => {
    try {
      await adminApi.put(`/api/review/remove-editor/${episodeId}`, { editorId });
      fetchAllEpisodes();
    } catch (err) {
      setError(err.response?.data?.message || t('adminReview.removeFailed'));
    }
  };

  if (!admin) return null;

  return (
    <div className="admin-panel">
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
          <h2>{t('adminReview.reviewManagement')}</h2>
        </div>
      </div>

      <div style={{display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap'}}>
        <button
          className={`btn ${activeTab === 'pending' ? '' : 'btn-secondary'}`}
          onClick={() => setActiveTab('pending')}
        >{t('adminReview.pendingReview')} ({pendingEpisodes.length})</button>
        <button
          className={`btn ${activeTab === 'all' ? '' : 'btn-secondary'}`}
          onClick={() => setActiveTab('all')}
        >{t('adminReview.allEpisodes')}</button>
        <button
          className={`btn ${activeTab === 'assign' ? '' : 'btn-secondary'}`}
          onClick={() => setActiveTab('assign')}
        >{t('adminReview.permissionAssignment')}</button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {activeTab === 'pending' && (
        <div>
          {pendingEpisodes.length === 0 ? (
            <p style={{color: 'var(--text-secondary)', textAlign: 'center', padding: '40px'}}>{t('adminReview.noPendingEpisodes')}</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('adminReview.title')}</th>
                  <th>{t('adminReview.creator')}</th>
                  <th>{t('adminReview.episodeCount')}</th>
                  <th>{t('adminReview.status')}</th>
                  <th>{t('adminReview.submitTime')}</th>
                  <th>{t('adminReview.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {pendingEpisodes.map(ep => (
                  <tr key={ep._id}>
                    <td>
                      <span
                        style={{color: 'var(--primary)', cursor: 'pointer', textDecoration: 'none'}}
                        onClick={() => setDetailEpisode(ep)}
                        onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                        onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                      >{ep.title}</span>
                    </td>
                    <td>{ep.createdBy ? ep.createdBy.username : '-'}</td>
                    <td>{ep.currentEpisodes}/{ep.totalEpisodes}</td>
                    <td>
                      <ReviewStatusBadge status="pending" />
                    </td>
                    <td>{new Date(ep.updatedAt).toLocaleDateString()}</td>
                    <td>
                      <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                        <input
                          type="text"
                          placeholder={t('adminReview.reviewNotePlaceholder')}
                          value={reviewNote}
                          onChange={(e) => setReviewNote(e.target.value)}
                          style={{fontSize: '13px', padding: '6px 10px'}}
                        />
                        <div style={{display: 'flex', gap: '8px'}}>
                          <button className="btn" style={{fontSize: '13px', padding: '6px 14px'}} onClick={() => handleApprove(ep._id)}>{t('adminReview.approve')}</button>
                          <button className="btn btn-secondary" style={{fontSize: '13px', padding: '6px 14px', background: 'var(--destructive-bg)', color: 'var(--destructive-text)', borderColor: 'var(--destructive-border)'}} onClick={() => handleReject(ep._id)}>{t('adminReview.reject')}</button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'all' && (
        <div>
          <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('adminReview.title')}</th>
                <th>{t('adminReview.creator')}</th>
                <th>{t('adminReview.reviewStatus')}</th>
                <th>{t('adminReview.authorizedEdit')}</th>
                <th>{t('adminReview.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {allEpisodes.map(ep => (
                <tr key={ep._id}>
                  <td>
                    <span
                      style={{color: 'var(--primary)', cursor: 'pointer', textDecoration: 'none'}}
                      onClick={() => setDetailEpisode(ep)}
                      onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                      onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                    >{ep.title}</span>
                  </td>
                  <td>{ep.createdBy ? ep.createdBy.username : t('adminReview.system')}</td>
                  <td>
                    <ReviewStatusBadge status={ep.reviewStatus} />
                    {ep.reviewNote && <span style={{fontSize: '11px', color: 'var(--text-secondary)', marginLeft: '4px'}}>({ep.reviewNote})</span>}
                  </td>
                  <td>
                    {ep.allowedEditors && ep.allowedEditors.length > 0 ? (
                      <div style={{display: 'flex', flexWrap: 'wrap', gap: '4px'}}>
                        {ep.allowedEditors.map(editor => (
                          <span key={editor._id} style={{
                            fontSize: '12px', padding: '2px 8px', borderRadius: '4px',
                            background: 'var(--primary-bg-subtle)', color: 'var(--primary)',
                            border: '1px solid var(--primary-border)',
                            display: 'flex', alignItems: 'center', gap: '4px'
                          }}>
                            {editor.username}
                            <button
                              onClick={() => handleRemoveEditor(ep._id, editor._id)}
                              style={{background: 'none', border: 'none', color: 'var(--destructive-text)', cursor: 'pointer', fontSize: '12px', padding: '0 2px'}}
                            >×</button>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span style={{color: 'var(--text-secondary)', fontSize: '13px'}}>{t('adminReview.none')}</span>
                    )}
                  </td>
                  <td>
                    {ep.reviewStatus === 'pending' && (
                      <div style={{display: 'flex', gap: '8px'}}>
                        <button className="btn" style={{fontSize: '13px', padding: '6px 14px'}} onClick={() => handleApprove(ep._id)}>{t('adminReview.approve')}</button>
                        <button className="btn btn-secondary" style={{fontSize: '13px', padding: '6px 14px'}} onClick={() => handleReject(ep._id)}>{t('adminReview.reject')}</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {activeTab === 'assign' && (
        <div className="form-container" style={{maxWidth: '600px', margin: '0 auto'}}>
          <h3 style={{marginBottom: '15px'}}>{t('adminReview.assignEditPermission')}</h3>
          <p style={{color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '15px'}}>{t('adminReview.assignEditPermissionDesc')}</p>
          <div className="form-group">
            <label>{t('adminReview.selectEpisode')}</label>
            <select
              value={assignEpisodeId}
              onChange={(e) => setAssignEpisodeId(e.target.value)}
              style={{width: '100%', padding: '10px', borderRadius: '8px', background: 'var(--card)', color: 'var(--foreground)', border: '1px solid var(--border)'}}
            >
              <option value="">{t('adminReview.selectEpisodePlaceholder')}</option>
              {allEpisodes.map(ep => (
                <option key={ep._id} value={ep._id}>{ep.title}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>{t('adminReview.selectCreator')}</label>
            <select
              value={assignEditorId}
              onChange={(e) => setAssignEditorId(e.target.value)}
              style={{width: '100%', padding: '10px', borderRadius: '8px', background: 'var(--card)', color: 'var(--foreground)', border: '1px solid var(--border)'}}
            >
              <option value="">{t('adminReview.selectCreatorPlaceholder')}</option>
              {creators.map(c => (
                <option key={c._id} value={c._id}>{c.username}</option>
              ))}
            </select>
          </div>
          <button className="btn" onClick={handleAssignEditor}>{t('adminReview.assignPermission')}</button>
        </div>
      )}

      {detailEpisode && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'var(--overlay-bg-subtle)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }} onClick={() => setDetailEpisode(null)}>
          <div style={{
            background: 'var(--card)', borderRadius: '16px',
            maxWidth: '600px', width: '100%', maxHeight: '80vh',
            overflow: 'auto', border: '1px solid var(--border)',
            boxShadow: '0 25px 50px var(--shadow-strong)'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '20px 24px', borderBottom: '1px solid var(--border)'
            }}>
              <h3 style={{margin: 0, color: 'var(--foreground)'}}>{detailEpisode.title}</h3>
              <button onClick={() => setDetailEpisode(null)} style={{
                background: 'none', border: 'none', color: 'var(--foreground)',
                fontSize: '24px', cursor: 'pointer', padding: '0 4px', lineHeight: 1
              }}>✕</button>
            </div>
            <div style={{padding: '20px 24px'}}>
              {detailEpisode.coverImage && (
                <img src={detailEpisode.coverImage} alt={detailEpisode.title} style={{width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '8px', marginBottom: '16px'}} />
              )}
              <p style={{color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '16px'}}>{detailEpisode.description || t('adminReview.noDescription')}</p>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '14px'}}>
                <p><strong>{t('adminReview.episodes')}</strong>{detailEpisode.currentEpisodes}/{detailEpisode.totalEpisodes}</p>
                <p><strong>{t('adminReview.status')}</strong>{detailEpisode.status === 'ongoing' ? t('home.statusOngoing') : detailEpisode.status === 'completed' ? t('home.statusCompleted') : t('home.statusUpcoming')}</p>
                <p><strong>{t('adminReview.categories')}</strong>{detailEpisode.category ? detailEpisode.category.join('、') : t('adminReview.none')}</p>
                <p><strong>{t('adminReview.views')}</strong>{detailEpisode.views}</p>
                <p><strong>{t('adminReview.creator')}</strong>{detailEpisode.createdBy ? detailEpisode.createdBy.username : t('adminReview.system')}</p>
                <p><strong>{t('adminReview.reviewStatus')}</strong>
                  <ReviewStatusBadge status={detailEpisode.reviewStatus} />
                </p>
              </div>
              {detailEpisode.reviewNote && (
                <p style={{fontSize: '13px', color: 'var(--text-secondary)', marginTop: '12px'}}><strong>{t('adminReview.reviewNoteLabel')}</strong>{detailEpisode.reviewNote}</p>
              )}
              {detailEpisode.allowedEditors && detailEpisode.allowedEditors.length > 0 && (
                <p style={{fontSize: '13px', color: 'var(--text-secondary)', marginTop: '8px'}}><strong>{t('adminReview.authorizedEditLabel')}</strong>{detailEpisode.allowedEditors.map(e => e.username).join('、')}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReview;
