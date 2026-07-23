// Jest 配置：后端认证特征测试
// 使用 mongodb-memory-server 提供隔离的内存数据库，runInBand 保证单进程串行执行
module.exports = {
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  // globalSetup/globalTeardown 在同一上下文运行，共享 mongoSingleton 实例，可干净启停 mongod
  globalSetup: '<rootDir>/tests/jest.globalSetup.js',
  globalTeardown: '<rootDir>/tests/jest.globalTeardown.js',
  // setupFiles 在每个测试文件的 require 之前运行，确保 env（JWT_SECRET 等）在 auth.js 加载前就位
  setupFiles: ['<rootDir>/tests/jest.setup.js'],
  // auth.js 启动了一个 deviceLoginCodes 清理 setInterval（Phase A 提取后会 unref），用 forceExit 兜底
  forceExit: true,
  testTimeout: 20000,
  verbose: true,
};
