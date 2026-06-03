import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import adminApi, { getAdminToken, getAdminData } from '../utils/adminApi';
import { useNavigate } from 'react-router-dom';
import CustomSelect from './CustomSelect';
import SearchInput from './SearchInput';
import { useI18n } from '../contexts/I18nContext';

const AdminUsers = () => {
  const { t, locale } = useI18n();
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
    const token = getAdminToken();
    const adminData = getAdminData();
    if (token && adminData) {
      if (adminData.role !== 'superadmin') {
        navigate('/admin/dashboard', { replace: true });
        return;
      }
      setAdmin(adminData);
    } else {
      navigate('/admin', { replace: true });
    }
  }, [navigate]);

  const fetchUsers = async () => {
    try {
      const res = await adminApi.get('/api/admin/users');
      setUsers(res.data.list || res.data);
    } catch (err) {
      console.error('获取用户列表失败', err);
    }
  };

  const fetchAdmins = async () => {
    try {
      const res = await adminApi.get('/api/admin/list');
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
      (u.accountId && u.accountId.toLowerCase().includes(keyword)) ||
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
      await adminApi.post('/api/admin/register', newUser);
      setShowAddForm(false);
      setNewUser({ username: '', password: '', role: 'admin' });
      setSuccess(t('adminUsers.adminCreated'));
      fetchAdmins();
    } catch (error) {
      setError(error.response?.data?.message || t('adminUsers.createFailed'));
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm(t('adminUsers.deleteUserConfirm'))) return;
    try {
      await adminApi.delete(`/api/admin/users/${userId}`);
      setSuccess(t('adminUsers.userDeleted'));
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || t('adminUsers.deleteFailed'));
    }
  };

  const handleDeleteAdmin = async (adminId) => {
    if (admin && admin._id === adminId) {
      setError(t('adminUsers.cannotDeleteSelf'));
      return;
    }
    if (!window.confirm(t('adminUsers.deleteAdminConfirm'))) return;
    try {
      await adminApi.delete(`/api/admin/${adminId}`);
      setSuccess(t('adminUsers.adminDeleted'));
      fetchAdmins();
    } catch (err) {
      setError(err.response?.data?.message || t('adminUsers.deleteFailed'));
    }
  };

  if (!admin) return null;

  const getRoleLabel = (role) => {
    return role === 'superadmin' ? t('adminUsers.superAdmin') : role === 'creator' ? t('adminUsers.creator') : t('adminUsers.admin');
  };

  const getRoleBadgeStyle = (role) => {
    if (role === 'superadmin') return { background: 'var(--purple-bg)', color: 'var(--purple)', border: '1px solid var(--purple-border)' };
    if (role === 'creator') return { background: 'var(--warning-bg-strong)', color: 'var(--warning-text)', border: '1px solid var(--warning-border)' };
    return { background: 'var(--info-bg)', color: 'var(--info)', border: '1px solid var(--info-border)' };
  };

  const addFormModal = showAddForm ? (
    <div className="modal-overlay" onClick={(e) => { if (e.target.className === 'modal-overlay') setShowAddForm(false); }}>
      <div className="modal-content">
        <div className="modal-header">
          <h3>{t('adminUsers.addAdminAccount')}</h3>
          <button className="btn btn-secondary" onClick={() => setShowAddForm(false)}>{t('adminUsers.close')}</button>
        </div>
        <form onSubmit={handleAddUser}>
          <div className="form-group">
            <label>{t('adminUsers.username')}</label>
            <input
              type="text"
              value={newUser.username}
              onChange={(e) => setNewUser({...newUser, username: e.target.value})}
              required
            />
          </div>
          <div className="form-group">
            <label>{t('adminUsers.password')}</label>
            <input
              type="password"
              value={newUser.password}
              onChange={(e) => setNewUser({...newUser, password: e.target.value})}
              required
            />
          </div>
          <div className="form-group">
            <label>{t('adminUsers.role')}</label>
            <CustomSelect
              options={[
                { value: 'admin', label: t('adminUsers.admin') },
                { value: 'superadmin', label: t('adminUsers.superAdmin') },
                { value: 'creator', label: t('adminUsers.creator') }
              ]}
              value={newUser.role}
              onChange={(role) => setNewUser({...newUser, role})}
              placeholder={t('adminUsers.selectRole')}
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          <div className="form-group">
            <button type="submit">{t('adminUsers.add')}</button>
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
    color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
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
        <h2>{t('adminUsers.userManagement')}</h2>
        </div>
        {activeTab === 'admins' && (
          <button className="btn" onClick={() => setShowAddForm(true)}>
            {t('adminUsers.addAdminAccount')}
          </button>
        )}
      </div>

      {error && <div className="error-message" style={{marginBottom: '15px'}}>{error}</div>}
      {success && <div className="success-message" style={{marginBottom: '15px', padding: '10px', background: 'var(--success-bg-strong)', border: '1px solid var(--success-border)', borderRadius: '6px', color: 'var(--success-text)'}}>{success}</div>}

      <div style={{display: 'flex', gap: '0', marginBottom: '20px', borderBottom: '1px solid var(--border)'}}>
        <button style={tabStyle(activeTab === 'users')} onClick={() => setActiveTab('users')}>
          {t('adminUsers.normalUsers')} ({users.length})
        </button>
        <button style={tabStyle(activeTab === 'admins')} onClick={() => setActiveTab('admins')}>
          {t('adminUsers.admins')} ({admins.length})
        </button>
      </div>

      {activeTab === 'users' && (
        <div style={{background: 'var(--card)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden'}}>
          <div style={{padding: '15px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <h3 style={{margin: 0}}>{t('adminUsers.normalUserList')}</h3>
            <span style={{color: 'var(--text-secondary)', fontSize: '14px'}}>{t('adminUsers.userCount', { count: filteredUsers.length })}</span>
          </div>
          <div style={{padding: '12px 20px', borderBottom: '1px solid var(--border)'}}>
            <SearchInput
              data={users}
              searchKey={['accountId', 'username', 'email']}
              placeholder={t('adminUsers.searchPlaceholder')}
              onSearch={setUserSearch}
              onSelect={(item) => setUserSearch(item.username)}
              displayRender={(item) => (
                <div>
                  <span style={{fontWeight: '500'}}>{item.username}</span>
                  {item.accountId && <span style={{fontSize: '12px', color: 'var(--text-tertiary)', marginLeft: '6px'}}>@{item.accountId}</span>}
                  <span style={{fontSize: '12px', color: 'var(--text-secondary)', marginLeft: '10px'}}>{item.email}</span>
                </div>
              )}
            />
          </div>
          {filteredUsers.length === 0 ? (
            <div style={{padding: '40px', textAlign: 'center', color: 'var(--text-secondary)'}}>
              {userSearch ? t('adminUsers.noMatch') : t('adminUsers.noNormalUsers')}
            </div>
          ) : (
            <div style={{overflowX: 'auto'}}>
              <table style={{width: '100%', borderCollapse: 'collapse'}}>
                <thead>
                  <tr style={{borderBottom: '1px solid var(--border)'}}>
                    <th style={{padding: '12px 20px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: '500', fontSize: '14px'}}>{t('adminUsers.nickname')}</th>
                    <th style={{padding: '12px 20px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: '500', fontSize: '14px'}}>{t('adminUsers.accountId')}</th>
                    <th style={{padding: '12px 20px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: '500', fontSize: '14px'}}>{t('adminUsers.email')}</th>
                    <th style={{padding: '12px 20px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: '500', fontSize: '14px'}}>{t('adminUsers.adminAccess')}</th>
                    <th style={{padding: '12px 20px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: '500', fontSize: '14px'}}>{t('adminUsers.registerTime')}</th>
                    <th style={{padding: '12px 20px', textAlign: 'right', color: 'var(--text-secondary)', fontWeight: '500', fontSize: '14px'}}>{t('adminUsers.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => (
                    <tr key={u._id} style={{borderBottom: '1px solid var(--border)'}}>
                      <td style={{padding: '12px 20px'}}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                          <div style={{
                            width: '36px', height: '36px', borderRadius: '50%',
                            background: 'var(--btn-gradient-success)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'var(--btn-text)', fontWeight: '600', fontSize: '14px'
                          }}>
                            {u.username.charAt(0).toUpperCase()}
                          </div>
                          <span style={{fontWeight: '500'}}>{u.username}</span>
                        </div>
                      </td>
                      <td style={{padding: '12px 20px', color: 'var(--text-tertiary)', fontSize: '13px', letterSpacing: '0.5px'}}>
                        {u.accountId || '-'}
                      </td>
                      <td style={{padding: '12px 20px', color: 'var(--text-secondary)', fontSize: '14px'}}>
                        {u.email}
                      </td>
                      <td style={{padding: '12px 20px'}}>
                        <button
                          onClick={async () => {
                            const newVal = !u.adminAccess;
                            if (!window.confirm(newVal ? t('adminUsers.grantConfirm', { name: u.username }) : t('adminUsers.revokeConfirm', { name: u.username }))) return;
                            try {
                              await adminApi.put(`/api/admin/user-admin-access/${u._id}`, { adminAccess: newVal });
                              fetchUsers();
                              setSuccess(newVal ? t('adminUsers.accessGranted') : t('adminUsers.accessRevoked'));
                            } catch (err) {
                              setError(err.response?.data?.message || t('adminUsers.operationFailed'));
                            }
                          }}
                          style={{
                            padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '500',
                            cursor: 'pointer', border: '1px solid',
                            background: u.adminAccess ? 'var(--success-bg-subtle)' : 'var(--hover-bg)',
                            color: u.adminAccess ? 'var(--success-text)' : 'var(--text-secondary)',
                            borderColor: u.adminAccess ? 'var(--success-border)' : 'var(--border)',
                            transition: 'all 0.2s'
                          }}
                        >
                          {u.adminAccess ? t('adminUsers.authorised') : t('adminUsers.unauthorised')}
                        </button>
                      </td>
                      <td style={{padding: '12px 20px', color: 'var(--text-secondary)', fontSize: '14px'}}>
                        {new Date(u.createdAt).toLocaleDateString(locale)}
                      </td>
                      <td style={{padding: '12px 20px', textAlign: 'right'}}>
                        <div style={{display: 'flex', gap: '8px', justifyContent: 'flex-end'}}>
                          <button
                            className="btn"
                            style={{padding: '6px 14px', fontSize: '13px'}}
                            onClick={() => setDetailUser(u)}
                          >
                            {t('adminUsers.details')}
                          </button>
                          <button
                            className="btn btn-secondary"
                            style={{padding: '6px 14px', fontSize: '13px', color: 'var(--destructive-text)', borderColor: 'var(--destructive-border)'}}
                            onClick={() => handleDeleteUser(u._id)}
                          >
                            {t('adminUsers.delete')}
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
        <div style={{background: 'var(--card)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden'}}>
          <div style={{padding: '15px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <h3 style={{margin: 0}}>{t('adminUsers.adminList')}</h3>
            <span style={{color: 'var(--text-secondary)', fontSize: '14px'}}>{t('adminUsers.adminCount', { count: filteredAdmins.length })}</span>
          </div>
          <div style={{padding: '12px 20px', borderBottom: '1px solid var(--border)'}}>
            <SearchInput
              data={admins}
              searchKey={['username']}
              placeholder={t('adminUsers.searchAdminPlaceholder')}
              onSearch={setAdminSearch}
              onSelect={(item) => setAdminSearch(item.username)}
              displayRender={(item) => (
                <div>
                  <span style={{fontWeight: '500'}}>{item.username}</span>
                  <span style={{fontSize: '12px', color: 'var(--text-secondary)', marginLeft: '10px'}}>{item.role === 'superadmin' ? t('adminUsers.superAdmin') : t('adminUsers.admin')}</span>
                </div>
              )}
            />
          </div>
          {filteredAdmins.length === 0 ? (
            <div style={{padding: '40px', textAlign: 'center', color: 'var(--text-secondary)'}}>
              {adminSearch ? t('adminUsers.noMatchAdmin') : t('adminUsers.noAdminAccounts')}
            </div>
          ) : (
            <div style={{overflowX: 'auto'}}>
              <table style={{width: '100%', borderCollapse: 'collapse'}}>
                <thead>
                  <tr style={{borderBottom: '1px solid var(--border)'}}>
                    <th style={{padding: '12px 20px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: '500', fontSize: '14px'}}>{t('adminUsers.username')}</th>
                    <th style={{padding: '12px 20px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: '500', fontSize: '14px'}}>{t('adminUsers.role')}</th>
                    <th style={{padding: '12px 20px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: '500', fontSize: '14px'}}>{t('adminUsers.createTime')}</th>
                    <th style={{padding: '12px 20px', textAlign: 'right', color: 'var(--text-secondary)', fontWeight: '500', fontSize: '14px'}}>{t('adminUsers.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAdmins.map(a => (
                    <tr key={a._id} style={{borderBottom: '1px solid var(--border)'}}>
                      <td style={{padding: '12px 20px'}}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                          <div style={{
                            width: '36px', height: '36px', borderRadius: '50%',
                            background: 'var(--btn-gradient-purple)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'var(--btn-text)', fontWeight: '600', fontSize: '14px'
                          }}>
                            {a.username.charAt(0).toUpperCase()}
                          </div>
                          <span style={{fontWeight: '500'}}>{a.username}</span>
                          {admin._id === a._id && (
                            <span style={{fontSize: '12px', color: 'var(--success-text)', background: 'var(--success-bg-subtle)', padding: '2px 8px', borderRadius: '4px'}}>{t('adminUsers.current')}</span>
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
                      <td style={{padding: '12px 20px', color: 'var(--text-secondary)', fontSize: '14px'}}>
                        {new Date(a.createdAt).toLocaleDateString(locale)}
                      </td>
                      <td style={{padding: '12px 20px', textAlign: 'right'}}>
                        {admin._id !== a._id && (
                          <div style={{display: 'flex', gap: '8px', justifyContent: 'flex-end'}}>
                            <select
                              value={a.role}
                              onChange={async (e) => {
                                if (!window.confirm(t('adminUsers.roleChangeConfirm', { name: a.username, role: getRoleLabel(e.target.value) }))) return;
                                try {
                                  await adminApi.put(`/api/admin/role/${a._id}`, { role: e.target.value });
                                  fetchAdmins();
                                  setSuccess(t('adminUsers.roleUpdated'));
                                } catch (err) {
                                  setError(err.response?.data?.message || t('adminUsers.updateRoleFailed'));
                                }
                              }}
                              style={{
                                padding: '6px 10px', borderRadius: '6px', fontSize: '13px',
                                background: 'var(--card)', color: 'var(--foreground)',
                                border: '1px solid var(--border)', cursor: 'pointer'
                              }}
                            >
                              <option value="admin">{t('adminUsers.admin')}</option>
                              <option value="superadmin">{t('adminUsers.superAdmin')}</option>
                              <option value="creator">{t('adminUsers.creator')}</option>
                            </select>
                            <button
                              className="btn btn-secondary"
                              style={{padding: '6px 14px', fontSize: '13px', color: 'var(--destructive-text)', borderColor: 'var(--destructive-border)'}}
                              onClick={() => handleDeleteAdmin(a._id)}
                            >
                              {t('adminUsers.delete')}
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
              <h3>{t('adminUsers.userDetails', { username: detailUser.username })}</h3>
              <button className="btn btn-secondary" onClick={() => setDetailUser(null)}>{t('adminUsers.close')}</button>
            </div>
            <div style={{display: 'flex', flexDirection: 'column', gap: '0'}}>
              <InfoRow label={t('adminUsers.accountId')} value={detailUser.accountId || '-'} />
              <InfoRow label={t('adminUsers.nickname')} value={detailUser.username} />
              <InfoRow label={t('adminUsers.email')} value={detailUser.email} />
              <InfoRow label={t('adminUsers.registerTime')} value={new Date(detailUser.createdAt).toLocaleString(locale)} />
              <InfoRow label={t('adminUsers.lastLogin')} value={detailUser.lastLoginAt ? new Date(detailUser.lastLoginAt).toLocaleString(locale) : t('adminUsers.neverLoggedIn')} />
              <InfoRow label={t('adminUsers.lastLoginIP')} value={detailUser.lastLoginIp || t('adminUsers.unknown')} />
              <InfoRow label={t('adminUsers.ipRegion')} value={detailUser.lastLoginRegion || t('adminUsers.unknown')} icon="🌍" />
              <InfoRow label={t('adminUsers.isp')} value={detailUser.deviceInfo?.carrier || t('adminUsers.unknown')} icon="📡" />

              <div style={{padding: '12px 0', borderTop: '1px solid var(--border)', marginTop: '8px'}}>
                <h4 style={{color: 'var(--primary)', marginBottom: '8px'}}>{t('adminUsers.deviceInfo')}</h4>
              </div>
              <InfoRow label={t('adminUsers.deviceType')} value={detailUser.deviceInfo?.deviceType || t('adminUsers.unknown')} icon={detailUser.deviceInfo?.deviceType === '移动端' ? '📱' : detailUser.deviceInfo?.deviceType === '平板' ? '📟' : '🖥️'} />
              <InfoRow label={t('adminUsers.deviceModel')} value={detailUser.deviceInfo?.deviceModel || t('adminUsers.unknown')} icon="📲" />
              <InfoRow label={t('adminUsers.os')} value={detailUser.deviceInfo?.os ? `${detailUser.deviceInfo.os} ${detailUser.deviceInfo.osVersion || ''}`.trim() : t('adminUsers.unknown')} />
              <InfoRow label={t('adminUsers.browser')} value={detailUser.deviceInfo?.browser ? `${detailUser.deviceInfo.browser} ${detailUser.deviceInfo.browserVersion || ''}`.trim() : t('adminUsers.unknown')} />
              <InfoRow label={t('adminUsers.screenResolution')} value={detailUser.deviceInfo?.screenWidth ? `${detailUser.deviceInfo.screenWidth} × ${detailUser.deviceInfo.screenHeight}` : t('adminUsers.unknown')} />
              <InfoRow label={t('adminUsers.language')} value={detailUser.deviceInfo?.language || t('adminUsers.unknown')} />
              <InfoRow label={t('adminUsers.userAgent')} value={detailUser.deviceInfo?.userAgent || t('adminUsers.unknown')} isLong />
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
    borderBottom: '1px solid var(--border)',
    alignItems: isLong ? 'flex-start' : 'center'
  }}>
    <span style={{color: 'var(--text-secondary)', fontSize: '14px', minWidth: '100px', flexShrink: 0}}>
      {icon && <span style={{marginRight: '6px'}}>{icon}</span>}{label}
    </span>
    <span style={{color: 'var(--foreground)', fontSize: '14px', wordBreak: 'break-all', lineHeight: '1.5'}}>
      {value}
    </span>
  </div>
);

export default AdminUsers;
