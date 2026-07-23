// setupFiles：在每个测试文件 require 业务模块之前运行。
// 1) 兜底设置环境变量（即使 globalSetup 的 env 未传播到 worker 也保证就位）
// 2) 连接 mongoose 到内存库（runInBand 单进程，连接在文件间复用）
const mongoose = require('mongoose');

module.exports = async () => {
  process.env.NODE_ENV = 'test';
  process.env.SKIP_RATE_LIMIT = '1';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-very-long-and-secure-aaaaaaaaaa';
  process.env.ALTCHA_HMAC_KEY = process.env.ALTCHA_HMAC_KEY || 'test-altcha-hmac-key';
  process.env.DEV_API_TOKEN = process.env.DEV_API_TOKEN || 'test-dev-token';
  process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'test-encryption-key';

  if (!process.env.MONGO_URI) {
    // 极端情况下 env 未传播：在此启动一个本进程内存库（forceExit 兜底退出）
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const fallback = await MongoMemoryServer.create();
    process.env.MONGO_URI = fallback.getUri();
  }

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI);
  }
};
