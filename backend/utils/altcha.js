// Altcha PoW 校验 + 开发绕过口令
// ALTCHA_HMAC_KEY：优先环境变量，回退 JWT_SECRET 派生，再回退随机值
// DEV_API_TOKEN：开发/测试用口令，请求头 x-dev-token 匹配时绕过 altcha 校验

const crypto = require('crypto');
const { verifySolution, sha } = require('altcha/lib');

const ALTCHA_HMAC_KEY = process.env.ALTCHA_HMAC_KEY || (process.env.JWT_SECRET ? crypto.createHash('sha256').update('altcha-' + process.env.JWT_SECRET).digest('hex') : crypto.randomBytes(32).toString('hex'));

// 开发/测试用 API 口令，绕过 altcha 验证
const DEV_API_TOKEN = process.env.DEV_API_TOKEN;

const verifyAltcha = async (payload, req) => {
  // 开发环境口令绕过
  if (DEV_API_TOKEN && req?.headers?.['x-dev-token'] === DEV_API_TOKEN) {
    return true;
  }
  if (!payload) return false;
  try {
    const json = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
    const { challenge, solution } = json;
    if (!challenge || !solution) return false;
    const result = await verifySolution({
      challenge,
      solution,
      hmacSignatureSecret: ALTCHA_HMAC_KEY,
      deriveKey: sha.deriveKey,
    });
    return result.verified === true;
  } catch {
    return false;
  }
};

module.exports = { ALTCHA_HMAC_KEY, DEV_API_TOKEN, verifyAltcha };
