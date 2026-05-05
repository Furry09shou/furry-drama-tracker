const express = require('express');
const path = require('path');
const connectDB = require('../config/db');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
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
const wishlistRoutes = require('../routes/wishlists');
const feedbackRoutes = require('../routes/feedback');
const seriesRoutes = require('../routes/series');
const backupRoutes = require('../routes/backup');
const rssRoutes = require('../routes/rss');
const autoStatusRoutes = require('../routes/autoStatus');
const { sanitizeInput } = require('../middlewares/security');
const trackApiUsage = require('../middlewares/apiTracker');

const requiredEnvVars = ['JWT_SECRET', 'MONGO_URI'];
for (const varName of requiredEnvVars) {
  if (!process.env[varName]) {
    console.error(`FATAL: Missing required environment variable: ${varName}`);
    process.exit(1);
  }
}

const app = express();

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

connectDB();

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://localhost:5000'];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(sanitizeInput);
app.use(trackApiUsage);

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { message: '请求过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', globalLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
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
  max: 5,
  message: { message: '注册尝试过多，请1小时后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth/register', registerLimiter);

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

app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  maxAge: '7d',
  etag: true,
}));

app.use('/api/auth', authRoutes);
app.use('/api/episodes', episodeRoutes);
app.use('/api/follows', followRoutes);
app.use('/api/histories', historyRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/creator', creatorRoutes);
app.use('/api/review', reviewRoutes);
app.use('/api/creator-profile', creatorProfileRoutes);
app.use('/api/site-content', siteContentRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/wishlists', wishlistRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/series', seriesRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/rss', rssRoutes);
app.use('/api/auto-status', autoStatusRoutes);

app.use((err, req, res, next) => {
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ message: 'CORS policy denied' });
  }
  console.error('Unhandled error:', err.message);
  res.status(500).json({ message: '服务器内部错误' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
