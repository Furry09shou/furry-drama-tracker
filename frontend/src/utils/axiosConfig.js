import axios from 'axios';

axios.defaults.timeout = 15000;
axios.defaults.withCredentials = true;

let csrfToken = null;
let csrfReady = null;
let csrfResolve = null;

let isHandling401 = false;

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
      if (isHandling401) {
        return Promise.reject(error);
      }
      const skipRedirect = error.config?.skipRedirect;
      const isAdminPage = window.location.pathname.startsWith('/admin');
      let willRedirect = false;
      if (!skipRedirect) {
        if (isAdminPage) {
          willRedirect = true;
        } else if (window.location.pathname !== '/login' && window.location.pathname !== '/register' && window.location.pathname !== '/reset-password') {
          willRedirect = true;
        }
      }
      isHandling401 = true;
      localStorage.removeItem('user');
      window.dispatchEvent(new CustomEvent('auth:session-expired', { detail: { type: 'user' } }));
      if (willRedirect) {
        window.location.href = '/login';
      } else {
        isHandling401 = false;
      }
    } else if (error.response?.status === 403 && error.response.data?.forceEmailChange) {
      // 超管未改邮箱，后端拦截写操作
      const stored = localStorage.getItem('user');
      if (stored) {
        try {
          const u = JSON.parse(stored);
          u.forceEmailChange = true;
          localStorage.setItem('user', JSON.stringify(u));
          window.dispatchEvent(new CustomEvent('auth:force-email-change'));
        } catch {}
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
