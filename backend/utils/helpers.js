const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const parseUserAgent = (ua) => {
  const result = { browser: '', browserVersion: '', os: '', osVersion: '', deviceType: 'desktop', deviceModel: '' };
  if (!ua) return result;

  if (/Mobile|Android|iPhone/i.test(ua)) result.deviceType = 'mobile';
  if (/iPad|Tablet/i.test(ua)) result.deviceType = 'tablet';

  if (/Edg\/(\d+)/i.test(ua)) { result.browser = 'Edge'; result.browserVersion = ua.match(/Edg\/(\d+)/)[1]; }
  else if (/Chrome\/(\d+)/i.test(ua) && !/Edg/i.test(ua)) { result.browser = 'Chrome'; result.browserVersion = ua.match(/Chrome\/(\d+)/)[1]; }
  else if (/Firefox\/(\d+)/i.test(ua)) { result.browser = 'Firefox'; result.browserVersion = ua.match(/Firefox\/(\d+)/)[1]; }
  else if (/Safari\/(\d+)/i.test(ua) && !/Chrome/i.test(ua)) { result.browser = 'Safari'; result.browserVersion = ua.match(/Version\/(\d+)/)?.[1] || ''; }
  else if (/MSIE|Trident/i.test(ua)) { result.browser = 'IE'; }

  if (/Windows NT (\d+\.\d+)/i.test(ua)) { result.os = 'Windows'; result.osVersion = ua.match(/Windows NT (\d+\.\d+)/i)[1]; }
  else if (/Mac OS X (\d+[._\d]*)/i.test(ua)) {
    result.os = 'macOS';
    result.osVersion = ua.match(/Mac OS X (\d+[._\d]*)/i)[1].replace(/_/g, '.');
    // macOS 11+ 起 Safari 冻结 Mac OS X 版本号为 10.15.x，真实版本从 Version/ 推断
    if (result.osVersion.startsWith('10.15') && !/Chrome|Firefox|Edg|OPR/i.test(ua)) {
      const vMatch = ua.match(/Version\/(\d+)(?:\.(\d+))?/i);
      if (vMatch) {
        const safariMajor = parseInt(vMatch[1], 10);
        const safariMinor = vMatch[2] || '0';
        if (safariMajor >= 26) {
          // macOS 26+: Safari 版本即 macOS 版本
          result.osVersion = vMatch[1] + (safariMinor !== '0' ? '.' + safariMinor : '');
        } else if (safariMajor >= 14 && safariMajor <= 18) {
          // Safari 14-18 → macOS 11-15
          result.osVersion = (safariMajor - 3) + '.' + safariMinor;
        }
      }
    }
  }
  else if (/Android (\d+\.?\d*)/i.test(ua)) { result.os = 'Android'; result.osVersion = ua.match(/Android (\d+\.?\d*)/i)[1]; }
  else if (/iPhone OS (\d+[_\d]*)/i.test(ua)) {
    result.os = 'iOS';
    result.osVersion = ua.match(/iPhone OS (\d+[_\d]*)/i)[1].replace(/_/g, '.');
    // iOS 26+ 起 Safari 冻结 iPhone OS 版本号为 18_x，真实系统版本需从 Version/ 获取
    if (!/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua)) {
      const vMatch = ua.match(/Version\/(\d+[\.\d]*)/i);
      if (vMatch && parseInt(vMatch[1], 10) >= 26) {
        result.osVersion = vMatch[1];
      }
    }
  }
  else if (/iPad/i.test(ua) && /(?:CPU|iPhone) OS (\d+[_\d]*)/i.test(ua)) {
    result.os = 'iPadOS';
    result.osVersion = ua.match(/(?:CPU|iPhone) OS (\d+[_\d]*)/i)[1].replace(/_/g, '.');
    // iPadOS 26+ 同样冻结版本号，真实版本从 Version/ 获取
    if (!/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua)) {
      const vMatch = ua.match(/Version\/(\d+[\.\d]*)/i);
      if (vMatch && parseInt(vMatch[1], 10) >= 26) {
        result.osVersion = vMatch[1];
      }
    }
  }
  else if (/Linux/i.test(ua)) { result.os = 'Linux'; }

  const modelMatch = ua.match(/\(([^)]+)\)/);
  if (modelMatch && /mobile|android|iphone|ipad/i.test(ua)) {
    const parts = modelMatch[1].split(';');
    const last = parts[parts.length - 1].trim();
    if (last && !/^(Mozilla|Compatible|Windows|Mac|Linux|Android|iPhone|iPad)/i.test(last)) {
      result.deviceModel = last;
    }
  }

  return result;
};

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

// In production, configure app.set('trust proxy', 1) so req.ip reflects the real client IP
const getClientIp = (req) => {
  return req.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.headers['x-real-ip'] || '';
};

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const verifyTOTP = (secret, token) => {
  if (typeof token !== 'string' || !/^\d{6}$/.test(token)) return false;
  const window = 1;
  const currentTime = Math.floor(Date.now() / 30000);
  let verified = false;
  for (let i = -window; i <= window; i++) {
    const time = currentTime + i;
    const timeBuffer = Buffer.alloc(8);
    timeBuffer.writeUInt32BE(Math.floor(time / 0x100000000), 0);
    timeBuffer.writeUInt32BE(time & 0xffffffff, 4);

    const hmac = crypto.createHmac('sha1', Buffer.from(secret, 'base64'));
    hmac.update(timeBuffer);
    const hash = hmac.digest();

    const offset = hash[hash.length - 1] & 0xf;
    const code = ((hash[offset] & 0x7f) << 24) |
                 ((hash[offset + 1] & 0xff) << 16) |
                 ((hash[offset + 2] & 0xff) << 8) |
                 (hash[offset + 3] & 0xff);
    const mod = code % 1000000;
    const generatedToken = mod.toString().padStart(6, '0');

    // 常量时间比较，避免计时攻击
    const a = Buffer.from(generatedToken, 'utf8');
    const b = Buffer.from(token, 'utf8');
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
      verified = true;
    }
  }
  return verified;
};

const generateTOTPSecret = () => {
  return crypto.randomBytes(20).toString('base64');
};

const generateBackupCodes = () => {
  const codes = [];
  for (let i = 0; i < 10; i++) {
    // 8字节 = 64位熵，避免可预测
    codes.push(crypto.randomBytes(8).toString('hex'));
  }
  return codes;
};

const buildDeviceInfo = (deviceInfo, parsed, ua, req) => ({
  browser: deviceInfo?.browser || parsed.browser,
  browserVersion: deviceInfo?.browserVersion || parsed.browserVersion,
  os: deviceInfo?.os || parsed.os,
  osVersion: deviceInfo?.osVersion || parsed.osVersion,
  deviceType: deviceInfo?.deviceType || parsed.deviceType,
  deviceModel: deviceInfo?.deviceModel || parsed.deviceModel || '',
  screenWidth: deviceInfo?.screenWidth || 0,
  screenHeight: deviceInfo?.screenHeight || 0,
  language: deviceInfo?.language || req.headers['accept-language']?.split(',')[0] || '',
  userAgent: ua,
  carrier: deviceInfo?.carrier || ''
});

// 双 Token 机制：Access Token 短期(15min)，Refresh Token 长期(7d, 轮换)
const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '7d';
const ACCESS_TOKEN_MAX_AGE_MS = 15 * 60 * 1000;
const REFRESH_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const createAccessToken = (userId) => jwt.sign({ id: String(userId), purpose: 'access' }, process.env.JWT_SECRET, {
  expiresIn: ACCESS_TOKEN_TTL
});

// 统一 JWT 校验：固定算法为 HS256，防止算法混淆/降级攻击
// （jsonwebtoken 历史出现过 none/RS256 误用风险，显式指定 algorithms 是官方推荐做法）
const verifyJwt = (token) => jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });

const createRefreshToken = (userId) => {
  // refresh token 内嵌 jti（用于轮换时的索引），并声明 purpose 防 token 误用
  const jti = crypto.randomBytes(24).toString('hex');
  return {
    token: jwt.sign({ id: String(userId), purpose: 'refresh', jti }, process.env.JWT_SECRET, {
      expiresIn: REFRESH_TOKEN_TTL
    }),
    jti
  };
};

const createUserSession = async (userId, refreshToken, deviceInfo, parsed, ua, ip) => {
  const UserSession = require('../models/UserSession');
  const refreshTokenHash = hashToken(refreshToken);
  const sessionDeviceInfo = parseUserAgent(ua);
  if (deviceInfo?.screenWidth) sessionDeviceInfo.screenWidth = deviceInfo.screenWidth;
  if (deviceInfo?.screenHeight) sessionDeviceInfo.screenHeight = deviceInfo.screenHeight;
  if (deviceInfo?.language) sessionDeviceInfo.language = deviceInfo.language;
  sessionDeviceInfo.userAgent = ua;
  await UserSession.create({ userId, refreshTokenHash, deviceInfo: sessionDeviceInfo, ip });
  return refreshTokenHash;
};

// 设置 access + refresh 双 httpOnly cookie。
// refresh cookie 限定 path=/api/auth，缩小泄露面。
const setAuthCookies = (res, accessToken, refreshToken) => {
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: ACCESS_TOKEN_MAX_AGE_MS,
    path: '/',
  });
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: REFRESH_TOKEN_MAX_AGE_MS,
    path: '/api/auth',
  });
};

const clearAuthCookies = (res) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const baseOpts = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
  };
  res.clearCookie('accessToken', { ...baseOpts, path: '/' });
  res.clearCookie('refreshToken', { ...baseOpts, path: '/api/auth' });
  // 兼容旧 cookie
  res.clearCookie('token', { ...baseOpts, path: '/' });
};

// 兼容旧调用：保留 setAuthCookie，内部转发到 setAuthCookies
// 注意：旧调用仅传单个 token，无法用于双 Token；新代码应直接使用 setAuthCookies。
const setAuthCookie = (res, token) => {
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie('token', token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: '/',
  });
};

const timingSafeCompare = (a, b) => {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) {
    // Constant-time even when lengths differ
    return crypto.timingSafeEqual(bufA, bufA) && false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
};


const escapeHtml = (str) => {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
};
module.exports = {
  parseUserAgent,
  hashToken,
  getClientIp,
  escapeRegex,
  escapeHtml,
  verifyTOTP,
  generateTOTPSecret,
  generateBackupCodes,
  buildDeviceInfo,
  createUserSession,
  setAuthCookie,
  setAuthCookies,
  clearAuthCookies,
  createAccessToken,
  createRefreshToken,
  verifyJwt,
  ACCESS_TOKEN_MAX_AGE_MS,
  REFRESH_TOKEN_MAX_AGE_MS,
  timingSafeCompare
};
