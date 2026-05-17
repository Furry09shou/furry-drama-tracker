const express = require('express');
const path = require('path');
const connectDB = require('../config/db');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const authRoutes = require('../routes/auth');
const episodeRoutes = require('../routes/episodes');
const followRoutes = require('../routes/follows');
const historyRoutes = require('../routes/histories');
const notificationRoutes = require('../routes/notifications');
const adminRoutes = require('../routes/admin');
const categoryRoutes = require('../routes/categories');
const bannerRoutes = require('../routes/banners');
const creatorRoutes = require('../routes/creator');
const reviewRoutes = require('../routes/review');
const creatorProfileRoutes = require('../routes/creatorProfiles');
const siteContentRoutes = require('../routes/siteContent');
const ratingRoutes = require('../routes/ratings');
const favoriteRoutes = require('../routes/favorites');
const reportRoutes = require('../routes/reports');
const userRoutes = require('../routes/users');
const statsRoutes = require('../routes/stats');
const auditLogRoutes = require('../routes/auditLogs');

const feedbackRoutes = require('../routes/feedback');
const seriesRoutes = require('../routes/series');
const backupRoutes = require('../routes/backup');
const rssRoutes = require('../routes/rss');
const autoStatusRoutes = require('../routes/autoStatus');
const friendLinkRoutes = require('../routes/friendLinks');
const adminSessionRoutes = require('../routes/adminSessions');
const userSessionRoutes = require('../routes/userSessions');
const twoFactorRoutes = require('../routes/twoFactor');
const translateRoutes = require('../routes/translate');
const { sanitizeInput } = require('../middlewares/security');
const trackApiUsage = require('../middlewares/apiTracker');
const { startCronJobs } = require('./cron');
const { swaggerUi, swaggerSpec } = require('./swagger');

const requiredEnvVars = ['JWT_SECRET', 'MONGO_URI'];
for (const varName of requiredEnvVars) {
  if (!process.env[varName]) {
    console.error(`FATAL: Missing required environment variable: ${varName}`);
    process.exit(1);
  }
}

const app = express();

app.use(cookieParser());

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

connectDB().then(async () => {
  const User = require('../models/User');
  try {
    const usersWithoutAccountId = await User.find({ accountId: { $exists: false } });
    for (const user of usersWithoutAccountId) {
      let baseId = user.username.replace(/[^\w]/g, '_').toLowerCase();
      let accountId = baseId;
      let counter = 1;
      while (await User.findOne({ accountId, _id: { $ne: user._id } })) {
        accountId = `${baseId}_${counter}`;
        counter++;
      }
      user.accountId = accountId;
      await user.save({ validateBeforeSave: false });
    }
    if (usersWithoutAccountId.length > 0) {
      console.log(`已为 ${usersWithoutAccountId.length} 个用户自动生成账号ID`);
    }
  } catch (e) {
    console.error('迁移accountId失败:', e.message);
  }
});

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false,
}));

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5000',
  process.env.FRONTEND_URL,
  ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : []),
].filter(Boolean);

app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-XSRF-TOKEN'],
}));

app.use((req, res, next) => {
  req.setTimeout(30000);
  res.setTimeout(30000);
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(sanitizeInput);

app.get('/api/csrf-token', (req, res) => {
  const csrfToken = crypto.randomBytes(32).toString('hex');
  res.cookie('XSRF-TOKEN', csrfToken, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000,
    path: '/',
  });
  res.json({ csrfToken });
});

app.use((req, res, next) => {
  if (req.method !== 'GET') {
    const cookieXsrf = req.cookies ? req.cookies['XSRF-TOKEN'] : null;
    const headerXsrf = req.headers['x-xsrf-token'];

    if (cookieXsrf && headerXsrf) {
      if (cookieXsrf !== headerXsrf) {
        return res.status(403).json({ message: 'CSRF token mismatch' });
      }
    } else if (!req.headers['x-requested-with']) {
      return res.status(403).json({ message: 'CSRF protection: missing required headers' });
    }
  }
  next();
});

app.use(trackApiUsage);

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`);
  });
  next();
});

const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { message: '请求过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', globalLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: '登录尝试过多，请15分钟后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});
const adminAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: '登录尝试过多，请15分钟后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth/login', authLimiter);
app.use('/api/admin/login', adminAuthLimiter);

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { message: '注册尝试过多，请1小时后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth/register', registerLimiter);

const checkAccountIdLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { message: '请求过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth/check-accountId', checkAccountIdLimiter);

const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { message: '操作过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth/forgot-password', passwordResetLimiter);
app.use('/api/auth/reset-password', passwordResetLimiter);
app.use('/api/auth/change-password', passwordResetLimiter);
app.use('/api/auth/admin/change-password', passwordResetLimiter);

const twoFactorLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: '操作过于频繁，请15分钟后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth/login-2fa', twoFactorLimiter);
app.use('/api/2fa/verify-enable', twoFactorLimiter);
app.use('/api/2fa/disable', twoFactorLimiter);
app.use('/api/2fa/verify', twoFactorLimiter);

const emailVerifyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { message: '操作过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth/verify-email', emailVerifyLimiter);
app.use('/api/auth/resend-verification', emailVerifyLimiter);
app.use('/api/auth/verify-device', twoFactorLimiter);

app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  maxAge: '7d',
  etag: true,
}));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: '兽剧 API 文档',
}));

app.get('/api/docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json(swaggerSpec);
});

app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: '兽剧 API 文档',
}));

app.get('/api/v1/docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json(swaggerSpec);
});

const routeMounts = [
  ['/api/auth', authRoutes],
  ['/api/episodes', episodeRoutes],
  ['/api/follows', followRoutes],
  ['/api/histories', historyRoutes],
  ['/api/notifications', notificationRoutes],
  ['/api/admin', adminRoutes],
  ['/api/categories', categoryRoutes],
  ['/api/banners', bannerRoutes],
  ['/api/creator', creatorRoutes],
  ['/api/review', reviewRoutes],
  ['/api/creator-profile', creatorProfileRoutes],
  ['/api/site-content', siteContentRoutes],
  ['/api/ratings', ratingRoutes],
  ['/api/favorites', favoriteRoutes],
  ['/api/reports', reportRoutes],
  ['/api/users', userRoutes],
  ['/api/stats', statsRoutes],
  ['/api/audit-logs', auditLogRoutes],
  ['/api/feedback', feedbackRoutes],
  ['/api/series', seriesRoutes],
  ['/api/backup', backupRoutes],
  ['/api/rss', rssRoutes],
  ['/api/auto-status', autoStatusRoutes],
  ['/api/friend-links', friendLinkRoutes],
  ['/api/admin-sessions', adminSessionRoutes],
  ['/api/user-sessions', userSessionRoutes],
  ['/api/2fa', twoFactorRoutes],
  ['/api/translate', translateRoutes],
];

for (const [mountPath, route] of routeMounts) {
  app.use(mountPath, route);
  app.use(mountPath.replace('/api/', '/api/v1/'), route);
}

app.use((err, req, res, next) => {
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ message: 'CORS policy denied' });
  }
  console.error(err.stack);
  const isDev = process.env.NODE_ENV !== 'production';
  res.status(err.status || 500).json({
    message: err.message || 'Server error',
    ...(isDev && { stack: err.stack })
  });
});

startCronJobs();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
