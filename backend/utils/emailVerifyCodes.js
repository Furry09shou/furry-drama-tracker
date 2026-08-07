// 邮箱验证一次性验证码（内存存储，10分钟过期）
// code -> { userId, email, expiresAt, attempts }
// 与 deviceLoginCodes 类似但用于邮箱验证场景
// 定期清理过期验证码，interval 调用 .unref() 避免阻止 Node/jest 退出

const map = new Map();

// 定期清理过期验证码
const interval = setInterval(() => {
  const now = Date.now();
  for (const [code, entry] of map) {
    if (entry.expiresAt < now) map.delete(code);
  }
}, 60 * 1000);
interval.unref();

const set = (code, entry) => map.set(code, entry);
const get = (code) => map.get(code);
const remove = (code) => map.delete(code);

// 测试用：停止清理 interval
const stopCleanup = () => {
  clearInterval(interval);
};

module.exports = { set, get, delete: remove, stopCleanup };
