// Jest globalSetup：在所有测试前启动内存 MongoDB，并把 URI 写入 env 供 worker 继承
const mongoSingleton = require('./helpers/mongoSingleton');

module.exports = async () => {
  // 测试环境变量（在 worker 启动前设置，确保 setupFiles 与测试文件均可见）
  process.env.NODE_ENV = 'test';
  process.env.SKIP_RATE_LIMIT = '1';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-very-long-and-secure-aaaaaaaaaa';
  process.env.ALTCHA_HMAC_KEY = process.env.ALTCHA_HMAC_KEY || 'test-altcha-hmac-key';
  process.env.DEV_API_TOKEN = process.env.DEV_API_TOKEN || 'test-dev-token';
  process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'test-encryption-key';

  const uri = await mongoSingleton.start();
  process.env.MONGO_URI = uri;
  // eslint-disable-next-line no-console
  console.log(`[jest globalSetup] MongoMemoryServer started at ${uri}`);
};
