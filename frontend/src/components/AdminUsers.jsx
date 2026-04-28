import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import CustomSelect from './CustomSelect';
import SearchInput from './SearchInput';

const AdminUsers = () => {
  const [admin, setAdmin] = useState(null);
  const [users, setUsers] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [filteredAdmins, setFilteredAdmins] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [adminSearch, setAdminSearch] = useState('');
  const [activeTab, setActiveTab] = useState('users');
  const [showAddForm, setShowAddForm] = useState(false);
  const [detailUser, setDetailUser] = useState(null);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    role: 'admin'
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    const adminData = localStorage.getItem('adminData');
    if (token && adminData) {
      const parsed = JSON.parse(adminData);
      if (parsed.role !== 'superadmin') {
        navigate('/admin/dashboard', { replace: true });
        return;
      }
      setAdmin(parsed);
    } else {
      navigate('/admin', { replace: true });
    }
  }, [navigate]);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const res = await axios.get('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(res.data);
    } catch (err) {
      console.error('获取用户列表失败', err);
    }
  };

  const fetchAdmins = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const res = await axios.get('/api/admin/list', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAdmins(res.data);
    } catch (err) {
      console.error('获取管理员列表失败', err);
    }
  };

  useEffect(() => {
    if (admin) {
      fetchUsers();
      fetchAdmins();
    }
  }, [admin]);

  useEffect(() => {
    if (!userSearch.trim()) {
      setFilteredUsers(users);
      return;
    }
    const keyword = userSearch.toLowerCase();
    setFilteredUsers(users.filter(u =>
      u.username.toLowerCase().includes(keyword) ||
      u.email.toLowerCase().includes(keyword)
    ));
  }, [userSearch, users]);

  useEffect(() => {
    if (!adminSearch.trim()) {
      setFilteredAdmins(admins);
      return;
    }
    const keyword = adminSearch.toLowerCase();
    setFilteredAdmins(admins.filter(a =>
      a.username.toLowerCase().includes(keyword)
    ));
  }, [adminSearch, admins]);

  const handleAddUser = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const token = localStorage.getItem('adminToken');
      await axios.post('/api/admin/register', newUser, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowAddForm(false);
      setNewUser({ username: '', password: '', role: 'admin' });
      setSuccess('管理员创建成功');
      fetchAdmins();
    } catch (error) {
      setError(error.response?.data?.message || '创建用户失败');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('确定要删除该用户吗？删除后不可恢复！')) return;
    try {
      const token = localStorage.getItem('adminToken');
      await axios.delete(`/api/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess('用户已删除');
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || '删除失败');
    }
  };

  const handleDeleteAdmin = async (adminId) => {
    if (admin && admin._id === adminId) {
      setError('不能删除自己的账号');
      return;
    }
    if (!window.confirm('确定要删除该管理员账号吗？')) return;
    try {
      const token = localStorage.getItem('adminToken');
      await axios.delete(`/api/admin/${adminId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess('管理员账号已删除');
      fetchAdmins();
    } catch (err) {
      setError(err.response?.data?.message || '删除失败');
    }
  };

  if (!admin) return null;

  const getRoleLabel = (role) => {
    return role === 'superadmin' ? '超级管理员' : role === 'creator' ? '创作者' : '管理员';
  };

  const getRoleBadgeStyle = (role) => {
    if (role === 'superadmin') return { background: 'rgba(168, 85, 247, 0.2)', color: '#a855f7', border: '1px solid rgba(168, 85, 247, 0.3)' };
    if (role === 'creator') return { background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)' };
    return { background: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.3)' };
  };

  const addFormModal = showAddForm ? (
    <div className="modal-overlay" onClick={(e) => { if (e.target.className === 'modal-overlay') setShowAddForm(false); }}>
      <div className="modal-content">
        <div className="modal-header">
          <h3>添加管理员账号</h3>
          <button className="btn btn-secondary" onClick={() => setShowAddForm(false)}>关闭</button>
        </div>
        <form onSubmit={handleAddUser}>
          <div className="form-group">
            <label>用户名</label>
            <input
              type="text"
              value={newUser.username}
              onChange={(e) => setNewUser({...newUser, username: e.target.value})}
              required
            />
          </div>
          <div className="form-group">
            <label>密码</label>
            <input
              type="password"
              value={newUser.password}
              onChange={(e) => setNewUser({...newUser, password: e.target.value})}
              required
            />
          </div>
          <div className="form-group">
            <label>角色</label>
            <CustomSelect
              options={[
                { value: 'admin', label: '管理员' },
                { value: 'superadmin', label: '超级管理员' },
                { value: 'creator', label: '创作者' }
              ]}
              value={newUser.role}
              onChange={(role) => setNewUser({...newUser, role})}
              placeholder="选择角色"
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

  const tabStyle = (isActive) => ({
    padding: '10px 24px',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: isActive ? '600' : '400',
    color: isActive ? 'var(--primary)' : '#94a3b8',
    borderBottom: isActive ? '2px solid var(--primary)' : '2px solid transparent',
    transition: 'all 0.2s ease',
    background: 'none',
    border: 'none',
    borderBottomWidth: '2px',
    borderBottomStyle: 'solid',
    borderBottomColor: isActive ? 'var(--primary)' : 'transparent'
  });

  return (
    <div className="admin-panel">
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
          <Link to="/admin/dashboard" className="btn btn-secondary">返回控制台</Link>
          <h2>用户管理</h2>
        </div>
        {activeTab === 'admins' && (
          <button className="btn" onClick={() => setShowAddForm(true)}>
            添加管理员账号
          </button>
        )}
      </div>

      {error && <div className="error-message" style={{marginBottom: '15px'}}>{error}</div>}
      {success && <div className="success-message" style={{marginBottom: '15px', padding: '10px', background: 'rgba(34, 197, 94, 0.2)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '6px', color: '#22c55e'}}>{success}</div>}

      <div style={{display: 'flex', gap: '0', marginBottom: '20px', borderBottom: '1px solid var(--border)'}}>
        <button style={tabStyle(activeTab === 'users')} onClick={() => setActiveTab('users')}>
          普通用户 ({users.length})
        </button>
        <button style={tabStyle(activeTab === 'admins')} onClick={() => setActiveTab('admins')}>
          管理员 ({admins.length})
        </button>
      </div>

      {activeTab === 'users' && (
        <div style={{background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden'}}>
          <div style={{padding: '15px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <h3 style={{margin: 0}}>普通用户列表</h3>
            <span style={{color: '#94a3b8', fontSize: '14px'}}>共 {filteredUsers.length} 个用户</span>
          </div>
          <div style={{padding: '12px 20px', borderBottom: '1px solid var(--border)'}}>
            <SearchInput
              data={users}
              searchKey={['username', 'email']}
              placeholder="搜索用户名或邮箱..."
              onSearch={setUserSearch}
              onSelect={(item) => setUserSearch(item.username)}
              displayRender={(item) => (
                <div>
                  <span style={{fontWeight: '500'}}>{item.username}</span>
                  <span style={{fontSize: '12px', color: '#94a3b8', marginLeft: '10px'}}>{item.email}</span>
                </div>
              )}
            />
          </div>
          {filteredUsers.length === 0 ? (
            <div style={{padding: '40px', textAlign: 'center', color: '#94a3b8'}}>
              {userSearch ? '没有匹配的用户' : '暂无普通用户'}
            </div>
          ) : (
            <div style={{overflowX: 'auto'}}>
              <table style={{width: '100%', borderCollapse: 'collapse'}}>
                <thead>
                  <tr style={{borderBottom: '1px solid var(--border)'}}>
                    <th style={{padding: '12px 20px', textAlign: 'left', color: '#94a3b8', fontWeight: '500', fontSize: '14px'}}>用户名</th>
                    <th style={{padding: '12px 20px', textAlign: 'left', color: '#94a3b8', fontWeight: '500', fontSize: '14px'}}>邮箱</th>
                    <th style={{padding: '12px 20px', textAlign: 'left', color: '#94a3b8', fontWeight: '500', fontSize: '14px'}}>注册时间</th>
                    <th style={{padding: '12px 20px', textAlign: 'right', color: '#94a3b8', fontWeight: '500', fontSize: '14px'}}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => (
                    <tr key={u._id} style={{borderBottom: '1px solid var(--border)'}}>
                      <td style={{padding: '12px 20px'}}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                          <div style={{
                            width: '36px', height: '36px', borderRadius: '50%',
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', fontWeight: '600', fontSize: '14px'
                          }}>
                            {u.username.charAt(0).toUpperCase()}
                          </div>
                          <span style={{fontWeight: '500'}}>{u.username}</span>
                        </div>
                      </td>
                      <td style={{padding: '12px 20px', color: '#94a3b8', fontSize: '14px'}}>
                        {u.email}
                      </td>
                      <td style={{padding: '12px 20px', color: '#94a3b8', fontSize: '14px'}}>
                        {new Date(u.createdAt).toLocaleDateString('zh-CN')}
                      </td>
                      <td style={{padding: '12px 20px', textAlign: 'right'}}>
                        <div style={{display: 'flex', gap: '8px', justifyContent: 'flex-end'}}>
                          <button
                            className="btn"
                            style={{padding: '6px 14px', fontSize: '13px'}}
                            onClick={() => setDetailUser(u)}
                          >
                            详细信息
                          </button>
                          <button
                            className="btn btn-secondary"
                            style={{padding: '6px 14px', fontSize: '13px', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)'}}
                            onClick={() => handleDeleteUser(u._id)}
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
      )}

      {activeTab === 'admins' && (
        <div style={{background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden'}}>
          <div style={{padding: '15px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <h3 style={{margin: 0}}>管理员列表</h3>
            <span style={{color: '#94a3b8', fontSize: '14px'}}>共 {filteredAdmins.length} 个账号</span>
          </div>
          <div style={{padding: '12px 20px', borderBottom: '1px solid var(--border)'}}>
            <SearchInput
              data={admins}
              searchKey={['username']}
              placeholder="搜索管理员用户名..."
              onSearch={setAdminSearch}
              onSelect={(item) => setAdminSearch(item.username)}
              displayRender={(item) => (
                <div>
                  <span style={{fontWeight: '500'}}>{item.username}</span>
                  <span style={{fontSize: '12px', color: '#94a3b8', marginLeft: '10px'}}>{item.role === 'superadmin' ? '超级管理员' : '管理员'}</span>
                </div>
              )}
            />
          </div>
          {filteredAdmins.length === 0 ? (
            <div style={{padding: '40px', textAlign: 'center', color: '#94a3b8'}}>
              {adminSearch ? '没有匹配的管理员' : '暂无管理员账号'}
            </div>
          ) : (
            <div style={{overflowX: 'auto'}}>
              <table style={{width: '100%', borderCollapse: 'collapse'}}>
                <thead>
                  <tr style={{borderBottom: '1px solid var(--border)'}}>
                    <th style={{padding: '12px 20px', textAlign: 'left', color: '#94a3b8', fontWeight: '500', fontSize: '14px'}}>用户名</th>
                    <th style={{padding: '12px 20px', textAlign: 'left', color: '#94a3b8', fontWeight: '500', fontSize: '14px'}}>角色</th>
                    <th style={{padding: '12px 20px', textAlign: 'left', color: '#94a3b8', fontWeight: '500', fontSize: '14px'}}>创建时间</th>
                    <th style={{padding: '12px 20px', textAlign: 'right', color: '#94a3b8', fontWeight: '500', fontSize: '14px'}}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAdmins.map(a => (
                    <tr key={a._id} style={{borderBottom: '1px solid var(--border)'}}>
                      <td style={{padding: '12px 20px'}}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                          <div style={{
                            width: '36px', height: '36px', borderRadius: '50%',
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', fontWeight: '600', fontSize: '14px'
                          }}>
                            {a.username.charAt(0).toUpperCase()}
                          </div>
                          <span style={{fontWeight: '500'}}>{a.username}</span>
                          {admin._id === a._id && (
                            <span style={{fontSize: '12px', color: '#22c55e', background: 'rgba(34, 197, 94, 0.1)', padding: '2px 8px', borderRadius: '4px'}}>当前</span>
                          )}
                        </div>
                      </td>
                      <td style={{padding: '12px 20px'}}>
                        <span style={{
                          ...getRoleBadgeStyle(a.role),
                          padding: '4px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '500'
                        }}>
                          {getRoleLabel(a.role)}
                        </span>
                      </td>
                      <td style={{padding: '12px 20px', color: '#94a3b8', fontSize: '14px'}}>
                        {new Date(a.createdAt).toLocaleDateString('zh-CN')}
                      </td>
                      <td style={{padding: '12px 20px', textAlign: 'right'}}>
                        {admin._id !== a._id && (
                          <div style={{display: 'flex', gap: '8px', justifyContent: 'flex-end'}}>
                            <select
                              value={a.role}
                              onChange={async (e) => {
                                if (!window.confirm(`确定将 ${a.username} 的角色更改为 ${getRoleLabel(e.target.value)} 吗？`)) return;
                                try {
                                  const token = localStorage.getItem('adminToken');
                                  await axios.put(`/api/admin/role/${a._id}`, { role: e.target.value }, {
                                    headers: { Authorization: `Bearer ${token}` }
                                  });
                                  fetchAdmins();
                                  setSuccess('角色已更新');
                                } catch (err) {
                                  setError(err.response?.data?.message || '更新角色失败');
                                }
                              }}
                              style={{
                                padding: '6px 10px', borderRadius: '6px', fontSize: '13px',
                                background: 'var(--card)', color: 'var(--foreground)',
                                border: '1px solid var(--border)', cursor: 'pointer'
                              }}
                            >
                              <option value="admin">管理员</option>
                              <option value="superadmin">超级管理员</option>
                              <option value="creator">创作者</option>
                            </select>
                            <button
                              className="btn btn-secondary"
                              style={{padding: '6px 14px', fontSize: '13px', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)'}}
                              onClick={() => handleDeleteAdmin(a._id)}
                            >
                              删除
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {createPortal(addFormModal, document.body)}
      {detailUser && createPortal(
        <div className="modal-overlay" onClick={(e) => { if (e.target.className === 'modal-overlay') setDetailUser(null); }}>
          <div className="modal-content" style={{maxWidth: '520px'}}>
            <div className="modal-header">
              <h3>用户详细信息 - {detailUser.username}</h3>
              <button className="btn btn-secondary" onClick={() => setDetailUser(null)}>关闭</button>
            </div>
            <div style={{display: 'flex', flexDirection: 'column', gap: '0'}}>
              <InfoRow label="用户名" value={detailUser.username} />
              <InfoRow label="邮箱" value={detailUser.email} />
              <InfoRow label="注册时间" value={new Date(detailUser.createdAt).toLocaleString('zh-CN')} />
              <InfoRow label="最后登录" value={detailUser.lastLoginAt ? new Date(detailUser.lastLoginAt).toLocaleString('zh-CN') : '从未登录'} />
              <InfoRow label="最后登录IP" value={detailUser.lastLoginIp || '未知'} />
              <InfoRow label="IP地区" value={detailUser.lastLoginRegion || '未知'} icon="🌍" />
              <InfoRow label="运营商" value={detailUser.deviceInfo?.carrier || '未知'} icon="📡" />

              <div style={{padding: '12px 0', borderTop: '1px solid var(--border)', marginTop: '8px'}}>
                <h4 style={{color: 'var(--primary)', marginBottom: '8px'}}>设备信息</h4>
              </div>
              <InfoRow label="设备类型" value={detailUser.deviceInfo?.deviceType || '未知'} icon={detailUser.deviceInfo?.deviceType === '移动端' ? '📱' : detailUser.deviceInfo?.deviceType === '平板' ? '📟' : '🖥️'} />
              <InfoRow label="设备型号" value={detailUser.deviceInfo?.deviceModel || '未知'} icon="📲" />
              <InfoRow label="操作系统" value={detailUser.deviceInfo?.os ? `${detailUser.deviceInfo.os} ${detailUser.deviceInfo.osVersion || ''}`.trim() : '未知'} />
              <InfoRow label="浏览器" value={detailUser.deviceInfo?.browser ? `${detailUser.deviceInfo.browser} ${detailUser.deviceInfo.browserVersion || ''}`.trim() : '未知'} />
              <InfoRow label="屏幕分辨率" value={detailUser.deviceInfo?.screenWidth ? `${detailUser.deviceInfo.screenWidth} × ${detailUser.deviceInfo.screenHeight}` : '未知'} />
              <InfoRow label="语言" value={detailUser.deviceInfo?.language || '未知'} />
              <InfoRow label="User-Agent" value={detailUser.deviceInfo?.userAgent || '未知'} isLong />
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

const InfoRow = ({ label, value, icon, isLong }) => (
  <div style={{
    display: 'flex', padding: '10px 0',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    alignItems: isLong ? 'flex-start' : 'center'
  }}>
    <span style={{color: '#94a3b8', fontSize: '14px', minWidth: '100px', flexShrink: 0}}>
      {icon && <span style={{marginRight: '6px'}}>{icon}</span>}{label}
    </span>
    <span style={{color: 'var(--foreground)', fontSize: '14px', wordBreak: 'break-all', lineHeight: '1.5'}}>
      {value}
    </span>
  </div>
);

export default AdminUsers;
