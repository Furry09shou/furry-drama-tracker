const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const connectDB = require('../config/db');
const cors = require('cors');
const helmet = require('helmet');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const compression = require('compression');
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
const userSessionRoutes = require('../routes/userSessions');
const twoFactorRoutes = require('../routes/twoFactor');
const translateRoutes = require('../routes/translate');
const folderRoutes = require('../routes/folders');
const savedFolderRoutes = require('../routes/savedFolders');
const activityRoutes = require('../routes/activity');
const versionRoutes = require('../routes/versions');
const announcementRoutes = require('../routes/announcements');
const { sanitizeInput, sanitizeHeaders } = require('../middlewares/security');
const trackApiUsage = require('../middlewares/apiTracker');
const { startCronJobs } = require('./cron');
const cron = require('node-cron');
const { swaggerUi, swaggerSpec } = require('./swagger');

const requiredEnvVars = ['JWT_SECRET', 'MONGO_URI'];
for (const varName of requiredEnvVars) {
  if (!process.env[varName]) {
    console.error(`FATAL: Missing required environment variable: ${varName}`);
    process.exit(1);
  }
}

if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
  console.error('FATAL: JWT_SECRET must be at least 32 characters long');
  process.exit(1);
}

const app = express();
// 仅在生产环境（反向代理后）信任代理，开发环境无需信任
app.set('trust proxy', process.env.NODE_ENV === 'production' ? 1 : false);

app.use(cookieParser());
app.use(compression());

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

connectDB().then(async () => {
  const User = require('../models/User');
  try {
    // 检查是否需要运行迁移
    const Setting = mongoose.models.Setting || mongoose.model('Setting', new mongoose.Schema({ key: String, value: mongoose.Schema.Types.Mixed }));
    const migrationDone = await Setting.findOne({ key: 'accountId_migration_v1' });
    if (!migrationDone) {
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
      await Setting.findOneAndUpdate({ key: 'accountId_migration_v1' }, { value: true }, { upsert: true });
    }

    // 迁移 adminAccess -> role（一次性）
    const roleMigrationDone = await Setting.findOne({ key: 'role_migration_v1' });
    if (!roleMigrationDone) {
      const usersWithAdminAccess = await User.find({ adminAccess: true, role: { $ne: 'superadmin' } });
      for (const u of usersWithAdminAccess) {
        if (u.role === 'user' || !u.role) {
          u.role = 'admin';
          u.adminAccess = undefined;
          await u.save({ validateBeforeSave: false });
        }
      }
      // 清除所有用户的 adminAccess 字段
      await User.updateMany({}, { $unset: { adminAccess: '' } });
      if (usersWithAdminAccess.length > 0) {
        console.log(`已将 ${usersWithAdminAccess.length} 个 adminAccess 用户迁移为 admin 角色`);
      }
      await Setting.findOneAndUpdate({ key: 'role_migration_v1' }, { value: true }, { upsert: true });
    }

    // 迁移：为所有 creator/admin/superadmin 角色但没有 CreatorProfile 的用户补建初始状态创作者主页（一次性，幂等）
    const CreatorProfile = require('../models/CreatorProfile');
    const usersNeedingProfile = await User.find({
      role: { $in: ['creator', 'admin', 'superadmin'] }
    }).select('_id username role');
    let createdProfiles = 0;
    for (const user of usersNeedingProfile) {
      const existing = await CreatorProfile.findOne({ adminId: user._id });
      if (existing) continue;
      const defaultBio = user.role === 'superadmin'
        ? '站点管理员，负责内容审核与平台运营。'
        : '这位创作者还没有填写个人简介。';
      try {
        await CreatorProfile.create({
          adminId: user._id,
          displayName: user.username || '创作者',
          bio: defaultBio,
          socialLinks: {}
        });
        createdProfiles += 1;
      } catch (e) {
        // 已存在则跳过（幂等）
        if (e.code !== 11000) console.warn('补建创作者主页跳过:', user.username, e.message);
      }
    }
    if (createdProfiles > 0) {
      console.log(`已为 ${createdProfiles} 个用户补建创作者主页`);
    }
  } catch (e) {
    console.error('迁移失败:', e.message);
  }
  const { ensureIndexes } = require('./indexes');
  ensureIndexes();
});

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "blob:"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      fontSrc: ["'self'"],
      connectSrc: ["'self'", "https://api.mymemory.translated.net", "https://translate.googleapis.com", "https://api.cognitive.microsofttranslator.com", "https://ipapi.co"],
      frameSrc: ["'self'", "https://player.bilibili.com", "https://www.youtube.com", "https://embed.nicovideo.jp"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false,
}));

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:5000',
  process.env.FRONTEND_URL,
  ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : []),
].filter(Boolean);

const isProduction = process.env.NODE_ENV === 'production';

const normalizedOrigins = allowedOrigins.map(o => o.replace(/\/+$/, ''));

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) {
      if (isProduction) {
        return callback(new Error('Not allowed by CORS'));
      }
      return callback(null, true);
    }
    if (normalizedOrigins.includes(origin.replace(/\/+$/, ''))) {
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

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const isDev = process.env.NODE_ENV !== 'production';
    const slowThreshold = isDev ? 1000 : 3000;
    if (isDev && (res.statusCode >= 400 || duration > 1000 || req.path.includes('/list') || req.path.includes('/histories') || req.path.includes('/follows'))) {
      console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms${duration > 1000 ? ' [SLOW]' : ''}`);
    } else if (duration > slowThreshold) {
      console.warn(`[Slow] ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
    }
  });
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(sanitizeInput);
app.use(sanitizeHeaders);

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
    } else if (cookieXsrf && !headerXsrf) {
      return res.status(403).json({ message: 'CSRF protection: missing X-XSRF-TOKEN header' });
    } else {
      return res.status(403).json({ message: 'CSRF protection: missing XSRF-TOKEN cookie, please refresh the page' });
    }
  }
  next();
});

app.use(trackApiUsage);

const requestLogger = require('../middlewares/requestLogger');
app.use(requestLogger);

const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  message: { message: '请求过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path.startsWith('/api/translate') || req.path.startsWith('/api/auth/captcha'),
});
app.use('/api/', globalLimiter);

const captchaLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { message: '请求过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth/captcha', captchaLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: '登录尝试过多，请15分钟后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});
const adminAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
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

const changeEmailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { message: '操作过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth/change-email', changeEmailLimiter);

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
app.use('/api/auth/resend-verification-by-email', emailVerifyLimiter);
app.use('/api/auth/verify-device', twoFactorLimiter);

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
app.use('/api/auth/request-email-change', requestEmailChangeLimiter);

// 静态文件访问日志（不阻止访问，仅记录）
app.use('/uploads', (req, res, next) => {
  next();
}, express.static(path.join(__dirname, '../uploads'), {
  maxAge: '7d',
  etag: true,
  setHeaders: (res, filePath) => {
    // 防止搜索引擎索引上传文件
    res.set('X-Robots-Tag', 'noindex, nofollow');
  }
}));

app.get('/api/health', async (req, res) => {
  try {
    await mongoose.connection.db.admin().ping();
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      db: 'connected'
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      db: 'disconnected'
    });
  }
});

if (process.env.NODE_ENV !== 'production') {
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
}

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
  ['/api/user-sessions', userSessionRoutes],
  ['/api/2fa', twoFactorRoutes],
  ['/api/translate', translateRoutes],
  ['/api/folders', folderRoutes],
  ['/api/saved-folders', savedFolderRoutes],
  ['/api/activity', activityRoutes],
  ['/api/versions', versionRoutes],
  ['/api/announcements', announcementRoutes],
];

for (const [mountPath, route] of routeMounts) {
  app.use(mountPath, route);
  app.use(mountPath.replace('/api/', '/api/v1/'), (req, res, next) => {
    res.setHeader('Deprecation', 'true');
    res.setHeader('Sunset', 'Sat, 01 Jan 2027 00:00:00 GMT');
    next();
  }, route);
}

app.use((err, req, res, next) => {
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ message: 'CORS policy denied' });
  }
  const isDev = process.env.NODE_ENV !== 'production';
  // 生产环境仅记录 5xx 错误日志，4xx 为正常客户端错误不打日志
  if (isDev || (err.status || 500) >= 500) {
    console.error(`[Error] ${req.method} ${req.path}:`, err.message);
  }
  if (err.name === 'MulterError') {
    return res.status(400).json({ message: '文件上传错误: ' + err.message });
  }
  const status = err.status || 500;
  const message = status < 500 || isDev ? (err.message || '服务器错误') : '服务器内部错误';
  res.status(status).json({
    message,
    ...(isDev && { stack: err.stack })
  });
});

startCronJobs();

// 清理过期会话 - 每小时执行
cron.schedule('0 * * * *', async () => {
  try {
    const UserSession = require('../models/UserSession');
    const userResult = await UserSession.updateMany(
      { isActive: true, lastActiveAt: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      { isActive: false, logoutAt: new Date() }
    );
    if (userResult.modifiedCount > 0) {
      console.log(`[Cron] Cleaned expired sessions: ${userResult.modifiedCount} user`);
    }
  } catch (error) {
    console.error('[Cron] Session cleanup error:', error.message);
  }
});

// 清理已读且超过30天的通知 - 每天执行
cron.schedule('0 3 * * *', async () => {
  try {
    const Notification = require('../models/Notification');
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const result = await Notification.deleteMany({ isRead: true, createdAt: { $lt: thirtyDaysAgo } });
    if (result.deletedCount > 0) {
      console.log(`[Cron] Cleaned ${result.deletedCount} old read notifications`);
    }
  } catch (error) {
    console.error('[Cron] Notification cleanup error:', error.message);
  }
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

const gracefulShutdown = (signal) => {
  console.log(`Received ${signal}, shutting down gracefully...`);
  server.close(() => {
    console.log('HTTP server closed');
    const mongoose = require('mongoose');
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
