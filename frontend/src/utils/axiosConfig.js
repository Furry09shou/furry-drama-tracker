import axios from 'axios';

axios.defaults.timeout = 15000;
axios.defaults.withCredentials = true;

let csrfToken = null;

axios.interceptors.request.use((config) => {
  if (!config.headers['X-Requested-With']) {
    config.headers['X-Requested-With'] = 'XMLHttpRequest';
  }
  if (csrfToken && config.method !== 'get') {
    config.headers['X-XSRF-TOKEN'] = csrfToken;
  }
  return config;
});

axios.interceptors.response.use(
  (response) => {
    if (response.data && response.data.csrfToken) {
      csrfToken = response.data.csrfToken;
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      const skipRedirect = error.config?.skipRedirect;
      if (skipRedirect) {
        return Promise.reject(error);
      }
      if (url.includes('/admin')) {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminData');
        if (!window.location.pathname.startsWith('/admin')) {
          window.location.href = '/admin';
        }
      } else {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (window.location.pathname !== '/login' && window.location.pathname !== '/register' && window.location.pathname !== '/reset-password') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export const fetchCsrfToken = async () => {
  try {
    const res = await axios.get('/api/csrf-token');
    csrfToken = res.data.csrfToken;
  } catch {}
};

export default axios;
