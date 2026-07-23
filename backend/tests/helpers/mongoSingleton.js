// mongodb-memory-server 单例：globalSetup 与 globalTeardown 共享同一 require 缓存，
// 因此 instance 在两个生命周期钩子间共享，可在 teardown 中干净停止。
const { MongoMemoryServer } = require('mongodb-memory-server');

let instance = null;

const start = async () => {
  if (!instance) {
    instance = await MongoMemoryServer.create();
  }
  return instance.getUri();
};

const stop = async () => {
  if (instance) {
    await instance.stop();
    instance = null;
  }
};

const getUri = () => (instance ? instance.getUri() : null);

module.exports = { start, stop, getUri };
