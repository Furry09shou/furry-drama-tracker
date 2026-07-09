const crypto = require('crypto');

// 字段加密密钥：优先使用独立的 ENCRYPTION_KEY，回退到 JWT_SECRET 以兼容旧数据
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET;
const ALGORITHM = 'aes-256-cbc';

const getKey = () => crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();

const encryptField = (text) => {
  if (!text || !ENCRYPTION_KEY) return text;
  // 已加密则不重复加密
  if (typeof text === 'string' && text.startsWith('enc:')) return text;
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `enc:${iv.toString('hex')}:${encrypted}`;
  } catch {
    return text;
  }
};

const decryptField = (text) => {
  if (!text || typeof text !== 'string' || !text.startsWith('enc:')) return text;
  try {
    const parts = text.split(':');
    const iv = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return text;
  }
};

const encryptArray = (arr) => {
  if (!Array.isArray(arr)) return arr;
  return arr.map(item => encryptField(item));
};

const decryptArray = (arr) => {
  if (!Array.isArray(arr)) return arr;
  return arr.map(item => decryptField(item));
};

module.exports = { encryptField, decryptField, encryptArray, decryptArray };
