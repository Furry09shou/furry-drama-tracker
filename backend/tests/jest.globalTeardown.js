// Jest globalTeardown：所有测试结束后停止内存 MongoDB，释放 mongod 子进程
const mongoSingleton = require('./helpers/mongoSingleton');

module.exports = async () => {
  await mongoSingleton.stop();
  // eslint-disable-next-line no-console
  console.log('[jest globalTeardown] MongoMemoryServer stopped');
};
