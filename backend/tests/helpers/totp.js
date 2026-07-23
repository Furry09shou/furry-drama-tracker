// TOTP 生成器：与 utils/helpers.js 的 verifyTOTP 算法一致（RFC 6238, SHA1, 30s, 6 位）。
// 用于 2FA 特征测试中生成当前有效验证码。verifyTOTP 接受 ±1 时间窗口，当前码必然通过。
const crypto = require('crypto');

const generateTOTPCode = (secretBase64) => {
  const step = 30;
  const counter = Math.floor(Date.now() / 1000 / step);
  const buffer = Buffer.alloc(8);
  buffer.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  buffer.writeUInt32BE(counter & 0xffffffff, 4);

  const hmac = crypto.createHmac('sha1', Buffer.from(secretBase64, 'base64'));
  hmac.update(buffer);
  const hash = hmac.digest();

  const offset = hash[hash.length - 1] & 0xf;
  const code =
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff);

  return (code % 1000000).toString().padStart(6, '0');
};

module.exports = { generateTOTPCode };
