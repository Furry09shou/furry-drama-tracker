const mongoose = require('mongoose');

// 一次性令牌去重表：记录已使用的 tokenHash，防止重放攻击。
// TTL 索引在 expiresAt 到期后自动删除文档。
const usedTokenSchema = new mongoose.Schema({
  tokenHash: { type: String, required: true, unique: true },
  purpose: { type: String, required: true },
  expiresAt: { type: Date, required: true }
});
usedTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// 保留安全重编译模式：防 jest 热重载报 "Cannot overwrite model"
const UsedToken = mongoose.models.UsedToken || mongoose.model('UsedToken', usedTokenSchema);

const markTokenUsed = async (tokenHash, purpose, ttlMs) => {
  try {
    await UsedToken.create({ tokenHash, purpose, expiresAt: new Date(Date.now() + ttlMs) });
  } catch (e) {
    // 重复键忽略
  }
};

const isTokenUsed = async (tokenHash) => {
  const doc = await UsedToken.findOne({ tokenHash });
  return !!doc;
};

module.exports = { UsedToken, markTokenUsed, isTokenUsed };
