import axios from 'axios';

// 管理员 API 依赖 httpOnly cookie 自动传递认证信息，无需手动设置 Authorization header
const adminApi = {
  get: (url, config = {}) => axios.get(url, { ...config }),
  post: (url, data, config = {}) => axios.post(url, data, { ...config }),
  put: (url, data, config = {}) => axios.put(url, data, { ...config }),
  delete: (url, config = {}) => axios.delete(url, { ...config }),
  patch: (url, data, config = {}) => axios.patch(url, data, { ...config }),
};

export const getAdminToken = () => null;
export const getAdminData = () => null;

export default adminApi;
