// 数据库辅助：连接 / 清空 / 断开。测试间用 clearDB 清空集合保证隔离。
const mongoose = require('mongoose');

const connectDB = async () => {
  if (mongoose.connection.readyState === 0) {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI not set; globalSetup/setupFiles did not run');
    }
    await mongoose.connect(process.env.MONGO_URI);
  }
};

const clearDB = async () => {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    // eslint-disable-next-line no-await-in-loop
    await collections[key].deleteMany({});
  }
};

const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
};

module.exports = { connectDB, clearDB, disconnectDB };
