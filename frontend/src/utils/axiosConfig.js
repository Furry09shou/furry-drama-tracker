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

// ===== 双 Token 自动刷新拦截器 =====
// 当后端返回 419（access token 过期）时：
// 1. 调用 /api/auth/refresh 获取新的 access + refresh token
// 2. 用新 access token 重试原请求
// 3. 如果刷新失败（refresh token 也过期/重用），走 401 流程跳登录
//
// 并发请求合并：同一时刻只发一次刷新请求，其他请求挂起等待结果
let isRefreshing = false;
let refreshSubscribers = [];

const subscribeTokenRefresh = (cb) => {
  refreshSubscribers.push(cb);
};

const onTokenRefreshed = (newAccessToken) => {
  refreshSubscribers.forEach(cb => cb(newAccessToken));
  refreshSubscribers = [];
};

const onRefreshFailed = () => {
  refreshSubscribers.forEach(cb => cb(null, new Error('refresh failed')));
  refreshSubscribers = [];
};

// 跳过自动刷新的请求：刷新端点本身、CSRF 端点、登录/注册相关
const shouldSkipAutoRefresh = (config) => {
  const url = config?.url || '';
  return url.includes('/api/auth/refresh')
    || url.includes('/api/auth/login')
    || url.includes('/api/auth/register')
    || url.includes('/api/csrf-token');
};

const refreshAccessToken = async () => {
  try {
    const res = await axios.post('/api/auth/refresh', {}, { skipRedirect: true, _isRetry: true });
    return { ok: true, user: res.data };
  } catch (e) {
    return { ok: false, error: e };
  }
};

axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    // 419 = access token 过期
    if (error.response?.status === 419 && originalRequest && !originalRequest._isRetry && !shouldSkipAutoRefresh(originalRequest)) {
      originalRequest._isRetry = true;

      // 如果已经在刷新，挂起等待
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh((newToken, err) => {
            if (err) {
              reject(err);
              return;
            }
            // access token 在 cookie 中自动携带，无需手动设置 header，直接重试
            resolve(axios(originalRequest));
          });
        });
      }

      isRefreshing = true;
      const result = await refreshAccessToken();
      isRefreshing = false;

      if (result.ok) {
        // 通知所有挂起的请求重试
        onTokenRefreshed();
        // 同步前端 user 状态（角色/邮箱等可能变化）
        try {
          if (result.user) {
            const stored = localStorage.getItem('user');
            if (stored) {
              const oldUser = JSON.parse(stored);
              const merged = {
                ...oldUser,
                _id: result.user._id,
                accountId: result.user.accountId,
                username: result.user.username,
                email: result.user.email,
                isEmailVerified: result.user.isEmailVerified,
                role: result.user.role,
                forceEmailChange: !!result.user.forceEmailChange
              };
              localStorage.setItem('user', JSON.stringify(merged));
              window.dispatchEvent(new CustomEvent('auth:token-refreshed', { detail: { user: merged } }));
            }
          }
        } catch {}
        // access token 在 httpOnly cookie 中自动携带，直接重试原请求
        return axios(originalRequest);
      } else {
        onRefreshFailed();
        // refresh 失败：触发 401 流程
        localStorage.removeItem('user');
        window.dispatchEvent(new CustomEvent('auth:session-expired', { detail: { type: 'user', reason: 'refresh-failed' } }));
        const isAdminPage = window.location.pathname.startsWith('/admin');
        const isAuthPage = window.location.pathname === '/login' || window.location.pathname === '/register' || window.location.pathname === '/reset-password';
        if (!isAuthPage) {
          if (isAdminPage || (window.location.pathname !== '/login' && window.location.pathname !== '/register')) {
            window.location.href = '/login';
          }
        }
        return Promise.reject(result.error);
      }
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
