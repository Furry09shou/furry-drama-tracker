import axios from 'axios';

const getAdminHeaders = () => {
  const token = localStorage.getItem('adminToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const adminApi = {
  get: (url, config = {}) => axios.get(url, { ...config, headers: { ...getAdminHeaders(), ...config.headers } }),
  post: (url, data, config = {}) => axios.post(url, data, { ...config, headers: { ...getAdminHeaders(), ...config.headers } }),
  put: (url, data, config = {}) => axios.put(url, data, { ...config, headers: { ...getAdminHeaders(), ...config.headers } }),
  delete: (url, config = {}) => axios.delete(url, { ...config, headers: { ...getAdminHeaders(), ...config.headers } }),
  patch: (url, data, config = {}) => axios.patch(url, data, { ...config, headers: { ...getAdminHeaders(), ...config.headers } }),
};

export const getAdminToken = () => localStorage.getItem('adminToken');
export const getAdminData = () => {
  try {
    const data = localStorage.getItem('adminData');
    return data ? JSON.parse(data) : null;
  } catch { return null; }
};

export default adminApi;
