import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import adminApi from '../utils/adminApi';
import { useNavigate, useOutletContext } from 'react-router-dom';
import CustomSelect from './CustomSelect';
import PasswordToggle from './PasswordToggle';
import SearchInput from './SearchInput';
import { useI18n } from '../contexts/I18nContext';

const DEVICE_TYPE_KEY_MAP = {
  mobile: 'adminUsers.mobile',
  tablet: 'adminUsers.tablet',
  desktop: 'adminUsers.desktop',
  '移动端': 'adminUsers.mobile',
  '平板': 'adminUsers.tablet',
  '桌面端': 'adminUsers.desktop',
};

const getDeviceIcon = (type) => {
  if (type === 'mobile' || type === '移动端') return '📱';
  if (type === 'tablet' || type === '平板') return '📟';
  return '🖥️';
};

const ROLE_FILTER_OPTIONS = [
  { value: 'all', labelKey: 'adminUsers.allRoles' },
  { value: 'admin', labelKey: 'adminUsers.adminFilter' },
  { value: 'user', labelKey: 'adminUsers.userFilter' },
];

const AdminUsers = () => {
  const { t, locale } = useI18n();
  const { admin } = useOutletContext();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [detailUser, setDetailUser] = useState(null);
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    password: '',
    role: 'admin'
  });
  const [showNewUserPassword, setShowNewUserPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const getDeviceTypeLabel = (type) => {
    if (!type) return t('adminUsers.unknown');
    const key = DEVICE_TYPE_KEY_MAP[type];
    return key ? t(key) : type;
  };

  useEffect(() => {
    if (admin.role !== 'superadmin') {
      navigate('/admin/dashboard', { replace: true });
      return;
    }
  }, [admin, navigate]);

  const fetchUsers = async () => {
    try {
      const res = await adminApi.get('/api/admin/users', { params: { limit: 9999 } });
      setUsers(res.data.list || res.data);
    } catch (err) {
      console.error('获取用户列表失败', err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    let result = users;

    // 角色筛选
    if (roleFilter === 'admin') {
      result = result.filter(u => ['superadmin', 'creator', 'admin'].includes(u.role));
    } else if (roleFilter === 'user') {
      result = result.filter(u => !['superadmin', 'creator', 'admin'].includes(u.role));
    }

    // 搜索筛选
    if (search.trim()) {
      const keyword = search.toLowerCase();
      result = result.filter(u =>
        (u.accountId && u.accountId.toLowerCase().includes(keyword)) ||
        u.username.toLowerCase().includes(keyword) ||
        u.email.toLowerCase().includes(keyword)
      );
    }

    setFilteredUsers(result);
  }, [search, users, roleFilter]);

  const handleAddUser = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await adminApi.post('/api/admin/register', newUser);
      setShowAddForm(false);
      setNewUser({ username: '', email: '', password: '', role: 'admin' });
      setSuccess(t('adminUsers.adminCreated'));
      fetchUsers();
    } catch (error) {
      setError(error.response?.data?.message || t('adminUsers.createFailed'));
    }
  };

  const handleDeleteUser = async (userId) => {
    if (admin && admin._id === userId) {
      setError(t('adminUsers.cannotDeleteSelf'));
      return;
    }
    if (!window.confirm(t('adminUsers.deleteUserConfirm'))) return;
    try {
      await adminApi.delete(`/api/admin/users/${userId}`);
      setSuccess(t('adminUsers.userDeleted'));
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || t('adminUsers.deleteFailed'));
    }
  };

  if (!admin) return null;

  const getRoleLabel = (role) => {
    if (role === 'superadmin') return t('adminUsers.superAdmin');
    if (role === 'creator') return t('adminUsers.creator');
    if (role === 'admin') return t('adminUsers.admin');
    return t('adminUsers.normalUser');
  };

  const getRoleBadgeStyle = (role) => {
    if (role === 'superadmin') return { background: 'var(--purple-bg)', color: 'var(--purple)', border: '1px solid var(--purple-border)' };
    if (role === 'creator') return { background: 'var(--warning-bg-strong)', color: 'var(--warning-text)', border: '1px solid var(--warning-border)' };
    if (role === 'admin') return { background: 'var(--info-bg)', color: 'var(--info)', border: '1px solid var(--info-border)' };
    return { background: 'var(--hover-bg)', color: 'var(--text-secondary)', border: '1px solid var(--border)' };
  };

  const adminCount = users.filter(u => ['superadmin', 'creator', 'admin'].includes(u.role)).length;
  const normalCount = users.length - adminCount;

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
            <label>{t('adminUsers.email')}</label>
            <input
              type="email"
              value={newUser.email}
              onChange={(e) => setNewUser({...newUser, email: e.target.value})}
              required
            />
          </div>
          <div className="form-group">
            <label>{t('adminUsers.password')}</label>
            <PasswordToggle
              value={newUser.password}
              onChange={(e) => setNewUser({...newUser, password: e.target.value})}
              show={showNewUserPassword}
              onToggle={() => setShowNewUserPassword(!showNewUserPassword)}
              required
            />
          </div>
          <div className="form-group">
            <label>{t('adminUsers.role')}</label>
            <CustomSelect
              options={[
                { value: 'admin', label: t('adminUsers.admin') },
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

  return (
    <div className="admin-panel">
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px'}}>
        <h2>{t('adminUsers.accountList')}</h2>
        <button className="btn" onClick={() => setShowAddForm(true)}>
          {t('adminUsers.addAdminAccount')}
        </button>
      </div>

      {error && <div className="error-message" style={{marginBottom: '15px'}}>{error}</div>}
      {success && <div className="success-message" style={{marginBottom: '15px', padding: '10px', background: 'var(--success-bg-strong)', border: '1px solid var(--success-border)', borderRadius: '6px', color: 'var(--success-text)'}}>{success}</div>}

      <div style={{background: 'var(--card)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden'}}>
        <div style={{padding: '15px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
            <h3 style={{margin: 0}}>{t('adminUsers.accountListTitle')}</h3>
            <span style={{color: 'var(--text-secondary)', fontSize: '14px'}}>
              {t('adminUsers.accountCount', { count: filteredUsers.length })}
            </span>
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap'}}>
            <span style={{fontSize: '12px', color: 'var(--text-tertiary)'}}>
              {t('adminUsers.adminCountLabel', { count: adminCount })} / {t('adminUsers.userCountLabel', { count: normalCount })}
            </span>
            <CustomSelect
              options={ROLE_FILTER_OPTIONS.map(opt => ({ value: opt.value, label: t(opt.labelKey) }))}
              value={roleFilter}
              onChange={setRoleFilter}
              placeholder={t('adminUsers.filterByRole')}
            />
          </div>
        </div>
        <div style={{padding: '12px 20px', borderBottom: '1px solid var(--border)'}}>
          <SearchInput
            data={users}
            searchKey={['accountId', 'username', 'email']}
            placeholder={t('adminUsers.searchPlaceholder')}
            onSearch={setSearch}
            onSelect={(item) => setSearch(item.username)}
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
            {search || roleFilter !== 'all' ? t('adminUsers.noMatch') : t('adminUsers.noAccounts')}
          </div>
        ) : (
          <div style={{overflowX: 'auto'}}>
            <table style={{width: '100%', borderCollapse: 'collapse'}}>
              <thead>
                <tr style={{borderBottom: '1px solid var(--border)'}}>
                  <th style={{padding: '12px 20px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: '500', fontSize: '14px'}}>{t('adminUsers.nickname')}</th>
                  <th style={{padding: '12px 20px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: '500', fontSize: '14px'}}>{t('adminUsers.accountId')}</th>
                  <th style={{padding: '12px 20px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: '500', fontSize: '14px'}}>{t('adminUsers.email')}</th>
                  <th style={{padding: '12px 20px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: '500', fontSize: '14px'}}>{t('adminUsers.role')}</th>
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
                          background: ['superadmin', 'creator', 'admin'].includes(u.role) ? 'var(--btn-gradient-purple)' : 'var(--btn-gradient-success)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'var(--btn-text)', fontWeight: '600', fontSize: '14px'
                        }}>
                          {u.username.charAt(0).toUpperCase()}
                        </div>
                        <span style={{fontWeight: '500'}}>{u.username}</span>
                        {admin._id === u._id && (
                          <span style={{fontSize: '12px', color: 'var(--success-text)', background: 'var(--success-bg-subtle)', padding: '2px 8px', borderRadius: '4px'}}>{t('adminUsers.current')}</span>
                        )}
                      </div>
                    </td>
                    <td style={{padding: '12px 20px', color: 'var(--text-tertiary)', fontSize: '13px', letterSpacing: '0.5px'}}>
                      {u.accountId || '-'}
                    </td>
                    <td style={{padding: '12px 20px', color: 'var(--text-secondary)', fontSize: '14px'}}>
                      {u.email}
                    </td>
                    <td style={{padding: '12px 20px'}}>
                      {admin._id === u._id ? (
                        <span style={{
                          ...getRoleBadgeStyle(u.role),
                          padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '500'
                        }}>{getRoleLabel(u.role)}</span>
                      ) : (
                        <select
                          value={u.role}
                          onChange={async (e) => {
                            const newRole = e.target.value;
                            if (newRole === u.role) return;
                            if (!window.confirm(t('adminUsers.roleChangeConfirm', { name: u.username, role: getRoleLabel(newRole) }))) return;
                            try {
                              if (newRole === 'user') {
                                await adminApi.put(`/api/admin/user-admin-access/${u._id}`, { adminAccess: false });
                                setSuccess(t('adminUsers.accessRevoked'));
                              } else if (u.role === 'user' && newRole === 'admin') {
                                await adminApi.put(`/api/admin/user-admin-access/${u._id}`, { adminAccess: true });
                                setSuccess(t('adminUsers.accessGranted'));
                              } else {
                                await adminApi.put(`/api/admin/role/${u._id}`, { role: newRole });
                                setSuccess(t('adminUsers.roleUpdated'));
                              }
                              fetchUsers();
                            } catch (err) {
                              setError(err.response?.data?.message || t('adminUsers.operationFailed'));
                            }
                          }}
                          style={{
                            padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '500',
                            cursor: 'pointer', border: '1px solid',
                            ...getRoleBadgeStyle(u.role),
                          }}
                        >
                          <option value="user">{t('adminUsers.normalUser')}</option>
                          <option value="admin">{t('adminUsers.admin')}</option>
                          <option value="creator">{t('adminUsers.creator')}</option>
                        </select>
                      )}
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
                        {admin._id !== u._id && (
                          <button
                            className="btn btn-secondary"
                            style={{padding: '6px 14px', fontSize: '13px', color: 'var(--destructive-text)', borderColor: 'var(--destructive-border)'}}
                            onClick={() => handleDeleteUser(u._id)}
                          >
                            {t('adminUsers.delete')}
                          </button>
                        )}
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
              <InfoRow label={t('adminUsers.role')} value={getRoleLabel(detailUser.role)} icon={['superadmin', 'creator', 'admin'].includes(detailUser.role) ? '🛡️' : '👤'} />
              <InfoRow label={t('adminUsers.registerTime')} value={new Date(detailUser.createdAt).toLocaleString(locale)} />
              <InfoRow label={t('adminUsers.lastLogin')} value={detailUser.lastLoginAt ? new Date(detailUser.lastLoginAt).toLocaleString(locale) : t('adminUsers.neverLoggedIn')} />
              <InfoRow label={t('adminUsers.lastLoginIP')} value={detailUser.lastLoginIp || t('adminUsers.unknown')} />
              <InfoRow label={t('adminUsers.ipRegion')} value={detailUser.lastLoginRegion || t('adminUsers.unknown')} icon="🌍" />
              <InfoRow label={t('adminUsers.isp')} value={detailUser.deviceInfo?.carrier || t('adminUsers.unknown')} icon="📡" />

              <div style={{padding: '12px 0', borderTop: '1px solid var(--border)', marginTop: '8px'}}>
                <h4 style={{color: 'var(--primary)', marginBottom: '8px'}}>{t('adminUsers.deviceInfo')}</h4>
              </div>
              <InfoRow label={t('adminUsers.deviceType')} value={getDeviceTypeLabel(detailUser.deviceInfo?.deviceType)} icon={getDeviceIcon(detailUser.deviceInfo?.deviceType)} />
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
