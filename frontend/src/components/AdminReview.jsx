import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const AdminReview = () => {
  const [admin, setAdmin] = useState(null);
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

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    const adminData = localStorage.getItem('adminData');
    if (token && adminData) {
      const parsed = JSON.parse(adminData);
      setAdmin(parsed);
      if (parsed.role === 'admin' || parsed.role === 'superadmin') {
        fetchPendingEpisodes();
        fetchAllEpisodes();
        fetchCreators();
      } else {
        navigate('/admin/dashboard', { replace: true });
      }
    } else {
      navigate('/admin', { replace: true });
    }
  }, [navigate]);

  const fetchPendingEpisodes = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const res = await axios.get('/api/review/pending', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPendingEpisodes(res.data);
    } catch (err) {
      console.error('获取待审核剧集失败', err);
    }
  };

  const fetchAllEpisodes = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const res = await axios.get('/api/review/all', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAllEpisodes(res.data);
    } catch (err) {
      console.error('获取所有剧集失败', err);
    }
  };

  const fetchCreators = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const res = await axios.get('/api/admin/creators', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCreators(res.data);
    } catch (err) {
      console.error('获取创作者列表失败', err);
    }
  };

  const handleApprove = async (id) => {
    try {
      const token = localStorage.getItem('adminToken');
      await axios.put(`/api/review/approve/${id}`, { note: reviewNote }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReviewNote('');
      fetchPendingEpisodes();
      fetchAllEpisodes();
    } catch (err) {
      setError(err.response?.data?.message || '审核失败');
    }
  };

  const handleReject = async (id) => {
    if (!reviewNote.trim()) {
      setError('拒绝时请填写原因');
      return;
    }
    try {
      const token = localStorage.getItem('adminToken');
      await axios.put(`/api/review/reject/${id}`, { note: reviewNote }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReviewNote('');
      fetchPendingEpisodes();
      fetchAllEpisodes();
    } catch (err) {
      setError(err.response?.data?.message || '审核失败');
    }
  };

  const handleAssignEditor = async () => {
    if (!assignEpisodeId || !assignEditorId) {
      setError('请选择剧集和创作者');
      return;
    }
    try {
      const token = localStorage.getItem('adminToken');
      await axios.put(`/api/review/assign-editor/${assignEpisodeId}`, { editorId: assignEditorId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAssignEpisodeId('');
      setAssignEditorId('');
      fetchAllEpisodes();
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || '分配失败');
    }
  };

  const handleRemoveEditor = async (episodeId, editorId) => {
    try {
      const token = localStorage.getItem('adminToken');
      await axios.put(`/api/review/remove-editor/${episodeId}`, { editorId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchAllEpisodes();
    } catch (err) {
      setError(err.response?.data?.message || '移除失败');
    }
  };

  if (!admin) return null;

  return (
    <div className="admin-panel">
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
          <h2>审核管理</h2>
        </div>
      </div>

      <div style={{display: 'flex', gap: '10px', marginBottom: '20px'}}>
        <button
          className={`btn ${activeTab === 'pending' ? '' : 'btn-secondary'}`}
          onClick={() => setActiveTab('pending')}
        >待审核 ({pendingEpisodes.length})</button>
        <button
          className={`btn ${activeTab === 'all' ? '' : 'btn-secondary'}`}
          onClick={() => setActiveTab('all')}
        >所有剧集</button>
        <button
          className={`btn ${activeTab === 'assign' ? '' : 'btn-secondary'}`}
          onClick={() => setActiveTab('assign')}
        >权限分配</button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {activeTab === 'pending' && (
        <div>
          {pendingEpisodes.length === 0 ? (
            <p style={{color: 'var(--text-secondary)', textAlign: 'center', padding: '40px'}}>暂无待审核剧集</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>标题</th>
                  <th>创建者</th>
                  <th>集数</th>
                  <th>状态</th>
                  <th>提交时间</th>
                  <th>操作</th>
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
                      <span style={{
                        fontSize: '12px', padding: '2px 8px', borderRadius: '4px',
                        background: 'var(--warning-bg)', color: 'var(--warning-text)',
                        border: '1px solid var(--warning-border)'
                      }}>待审核</span>
                    </td>
                    <td>{new Date(ep.updatedAt).toLocaleDateString()}</td>
                    <td>
                      <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                        <input
                          type="text"
                          placeholder="审核备注（拒绝时必填）"
                          value={reviewNote}
                          onChange={(e) => setReviewNote(e.target.value)}
                          style={{fontSize: '13px', padding: '6px 10px'}}
                        />
                        <div style={{display: 'flex', gap: '8px'}}>
                          <button className="btn" style={{fontSize: '13px', padding: '6px 14px'}} onClick={() => handleApprove(ep._id)}>通过</button>
                          <button className="btn btn-secondary" style={{fontSize: '13px', padding: '6px 14px', background: 'var(--destructive-bg)', color: 'var(--destructive-text)', borderColor: 'var(--destructive-border)'}} onClick={() => handleReject(ep._id)}>拒绝</button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'all' && (
        <div>
          <table className="admin-table">
            <thead>
              <tr>
                <th>标题</th>
                <th>创建者</th>
                <th>审核状态</th>
                <th>授权编辑</th>
                <th>操作</th>
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
                  <td>{ep.createdBy ? ep.createdBy.username : '系统'}</td>
                  <td>
                    <span style={{
                      fontSize: '12px', padding: '2px 8px', borderRadius: '4px',
                      background: ep.reviewStatus === 'approved' ? 'var(--success-bg)' :
                                  ep.reviewStatus === 'rejected' ? 'var(--destructive-bg)' : 'var(--warning-bg)',
                      color: ep.reviewStatus === 'approved' ? 'var(--success-text)' :
                             ep.reviewStatus === 'rejected' ? 'var(--destructive-text)' : 'var(--warning-text)',
                      border: `1px solid ${ep.reviewStatus === 'approved' ? 'var(--success-border)' :
                                        ep.reviewStatus === 'rejected' ? 'var(--destructive-border)' : 'var(--warning-border)'}`
                    }}>
                      {ep.reviewStatus === 'approved' ? '已通过' :
                       ep.reviewStatus === 'rejected' ? '已拒绝' : '待审核'}
                    </span>
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
                      <span style={{color: 'var(--text-secondary)', fontSize: '13px'}}>无</span>
                    )}
                  </td>
                  <td>
                    {ep.reviewStatus === 'pending' && (
                      <div style={{display: 'flex', gap: '8px'}}>
                        <button className="btn" style={{fontSize: '13px', padding: '6px 14px'}} onClick={() => handleApprove(ep._id)}>通过</button>
                        <button className="btn btn-secondary" style={{fontSize: '13px', padding: '6px 14px'}} onClick={() => handleReject(ep._id)}>拒绝</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'assign' && (
        <div className="form-container" style={{maxWidth: '600px'}}>
          <h3 style={{marginBottom: '15px'}}>分配剧集编辑权限</h3>
          <p style={{color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '15px'}}>选择剧集和创作者，授予该创作者编辑此剧集的权限</p>
          <div className="form-group">
            <label>选择剧集</label>
            <select
              value={assignEpisodeId}
              onChange={(e) => setAssignEpisodeId(e.target.value)}
              style={{width: '100%', padding: '10px', borderRadius: '8px', background: 'var(--card)', color: 'var(--foreground)', border: '1px solid var(--border)'}}
            >
              <option value="">-- 选择剧集 --</option>
              {allEpisodes.map(ep => (
                <option key={ep._id} value={ep._id}>{ep.title}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>选择创作者</label>
            <select
              value={assignEditorId}
              onChange={(e) => setAssignEditorId(e.target.value)}
              style={{width: '100%', padding: '10px', borderRadius: '8px', background: 'var(--card)', color: 'var(--foreground)', border: '1px solid var(--border)'}}
            >
              <option value="">-- 选择创作者 --</option>
              {creators.map(c => (
                <option key={c._id} value={c._id}>{c.username}</option>
              ))}
            </select>
          </div>
          <button className="btn" onClick={handleAssignEditor}>分配权限</button>
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
              <p style={{color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '16px'}}>{detailEpisode.description || '暂无描述'}</p>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '14px'}}>
                <p><strong>集数：</strong>{detailEpisode.currentEpisodes}/{detailEpisode.totalEpisodes}</p>
                <p><strong>状态：</strong>{detailEpisode.status === 'ongoing' ? '连载中' : detailEpisode.status === 'completed' ? '已完结' : '即将上映'}</p>
                <p><strong>分类：</strong>{detailEpisode.category ? detailEpisode.category.join('、') : '无'}</p>
                <p><strong>热度：</strong>{detailEpisode.views} 次浏览</p>
                <p><strong>创建者：</strong>{detailEpisode.createdBy ? detailEpisode.createdBy.username : '系统'}</p>
                <p><strong>审核：</strong>
                  <span style={{
                    fontSize: '12px', padding: '2px 8px', borderRadius: '4px',
                    background: detailEpisode.reviewStatus === 'approved' ? 'var(--success-bg)' :
                                detailEpisode.reviewStatus === 'rejected' ? 'var(--destructive-bg)' : 'var(--warning-bg)',
                    color: detailEpisode.reviewStatus === 'approved' ? 'var(--success-text)' :
                           detailEpisode.reviewStatus === 'rejected' ? 'var(--destructive-text)' : 'var(--warning-text)'
                  }}>
                    {detailEpisode.reviewStatus === 'approved' ? '已通过' :
                     detailEpisode.reviewStatus === 'rejected' ? '已拒绝' : '待审核'}
                  </span>
                </p>
              </div>
              {detailEpisode.reviewNote && (
                <p style={{fontSize: '13px', color: 'var(--text-secondary)', marginTop: '12px'}}><strong>审核备注：</strong>{detailEpisode.reviewNote}</p>
              )}
              {detailEpisode.allowedEditors && detailEpisode.allowedEditors.length > 0 && (
                <p style={{fontSize: '13px', color: 'var(--text-secondary)', marginTop: '8px'}}><strong>授权编辑：</strong>{detailEpisode.allowedEditors.map(e => e.username).join('、')}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReview;
