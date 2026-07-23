// 构造最小 Express app 供 supertest 使用。
// 只挂载 auth 路由 + 必需中间件（json / cookie-parser），不引入 helmet/cors/csrf/限流，
// 以便聚焦测试 auth 行为本身（CSRF、限流是独立关注点，且 SKIP_RATE_LIMIT=1 已在 env 中）。
const express = require('express');
const cookieParser = require('cookie-parser');
const authRoutes = require('../../routes/auth');

const createApp = () => {
  const app = express();
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use('/api/auth', authRoutes);
  // 兜底错误处理，形状与生产 globalErrorHandler 对齐
  app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ message: err.message || 'Server error' });
  });
  return app;
};

module.exports = { createApp };
