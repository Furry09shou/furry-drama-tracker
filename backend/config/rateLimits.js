// 限流器定义：从 src/index.js 提取（Phase C）
// 挂载语句（app.use('/path', limiter)）仍留在 index.js——它们是 app 级按 URL path 挂载，
// 搬进子 router 会改变执行顺序。
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  message: { message: '请求过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path.startsWith('/api/translate') || req.path.startsWith('/api/auth/captcha'),
});

const captchaLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { message: '请求过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: '登录尝试过多，请15分钟后再试' },
  standardHeaders: true,
  legacyHeaders: false,
  // 测试环境跳过限流以便自动化测试
  skip: () => process.env.NODE_ENV !== 'production' && process.env.SKIP_RATE_LIMIT === '1',
});

const adminAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: '登录尝试过多，请15分钟后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { message: '注册尝试过多，请1小时后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});

const checkAccountIdLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { message: '请求过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});

const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { message: '操作过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});

const changeEmailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { message: '操作过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});

const twoFactorLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: '操作过于频繁，请15分钟后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});

const emailVerifyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { message: '操作过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});

const requestEmailChangeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { message: '操作过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ip = ipKeyGenerator(req);
    const targetEmail = req.body?.newEmail || 'unknown';
    return `${ip}:${targetEmail.toLowerCase()}`;
  },
});

module.exports = {
  globalLimiter,
  captchaLimiter,
  authLimiter,
  adminAuthLimiter,
  registerLimiter,
  checkAccountIdLimiter,
  passwordResetLimiter,
  changeEmailLimiter,
  twoFactorLimiter,
  emailVerifyLimiter,
  requestEmailChangeLimiter,
};
