import axios from 'axios';

axios.defaults.timeout = 15000;
axios.defaults.withCredentials = true;

let csrfToken = null;
let csrfReady = null;
let csrfResolve = null;

const initCsrf = () => {
  csrfReady = new Promise(resolve => { csrfResolve = resolve; });
  axios.get('/api/csrf-token').then(res => {
    csrfToken = res.data.csrfToken;
    csrfResolve();
  }).catch(() => {
    csrfResolve(); // 即使失败也继续
  });
};

initCsrf();

axios.interceptors.request.use(async (config) => {
  if (!config.headers['X-Requested-With']) {
    config.headers['X-Requested-With'] = 'XMLHttpRequest';
  }
  if (config.method !== 'get' && config.method !== 'GET') {
    await csrfReady;
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
      if (url.includes('/admin')) {
        window.dispatchEvent(new CustomEvent('auth:session-expired', { detail: { type: 'admin' } }));
        if (!skipRedirect && !window.location.pathname.startsWith('/admin')) {
          window.location.href = '/admin';
        }
      } else {
        localStorage.removeItem('user');
        window.dispatchEvent(new CustomEvent('auth:session-expired', { detail: { type: 'user' } }));
        if (!skipRedirect && !window.location.pathname.startsWith('/admin') && window.location.pathname !== '/login' && window.location.pathname !== '/register' && window.location.pathname !== '/reset-password') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status >= 500) {
      window.dispatchEvent(new CustomEvent('api-error', { detail: {
        status: error.response.status,
        message: error.response.data?.message,
        messageKey: 'common.serverUnavailable',
      } }));
    }
    return Promise.reject(error);
  }
);

export const fetchCsrfToken = async () => {
  try {
    const res = await axios.get('/api/csrf-token');
    csrfToken = res.data.csrfToken;
  } catch (err) {
    console.error('Failed to fetch CSRF token:', err.message);
  }
};

export default axios;
