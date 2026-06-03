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
      if (url.includes('/admin')) {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminData');
        window.dispatchEvent(new CustomEvent('auth:session-expired', { detail: { type: 'admin' } }));
        if (!skipRedirect && !window.location.pathname.startsWith('/admin')) {
          window.location.href = '/admin';
        }
      } else {
        localStorage.removeItem('user');
        window.dispatchEvent(new CustomEvent('auth:session-expired', { detail: { type: 'user' } }));
        if (!skipRedirect && window.location.pathname !== '/login' && window.location.pathname !== '/register' && window.location.pathname !== '/reset-password') {
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
      const notification = document.createElement('div');
      notification.style.cssText = 'position:fixed;top:20px;right:20px;background:#e74c3c;color:#fff;padding:12px 20px;border-radius:8px;z-index:10000;font-size:14px;max-width:300px;box-shadow:0 4px 12px rgba(0,0,0,0.15);';
      notification.textContent = error.response.data?.message || '服务器错误，请稍后重试';
      document.body.appendChild(notification);
      setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s';
        setTimeout(() => notification.remove(), 300);
      }, 3000);
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
