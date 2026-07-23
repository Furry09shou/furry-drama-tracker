// 设备验证一次性登录码（内存存储，10分钟过期）
// code -> { userId, expiresAt, need2FA }
// 定期清理过期登录码，interval 调用 .unref() 避免阻止 Node/jest 退出

const map = new Map();

// 定期清理过期登录码
const interval = setInterval(() => {
  const now = Date.now();
  for (const [code, entry] of map) {
    if (entry.expiresAt < now) map.delete(code);
  }
}, 60 * 1000);
interval.unref();

// 导出的 set/get/delete 与 Map API 一致，调用点无需改动
const set = (code, entry) => map.set(code, entry);
const get = (code) => map.get(code);
const remove = (code) => map.delete(code);

// 测试用：停止清理 interval，防 jest 进程不退出
const stopCleanup = () => {
  clearInterval(interval);
};

module.exports = { set, get, delete: remove, stopCleanup };
