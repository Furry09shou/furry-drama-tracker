const crypto = require('crypto');

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

  if (/Windows NT (\d+\.\d+)/i.test(ua)) { result.os = 'Windows'; result.osVersion = ua.match(/Windows NT (\d+\.\d+)/)[1]; }
  else if (/Mac OS X (\d+[._]\d+)/i.test(ua)) { result.os = 'macOS'; result.osVersion = ua.match(/Mac OS X (\d+[._]\d+)/)[1].replace(/_/g, '.'); }
  else if (/Android (\d+\.?\d*)/i.test(ua)) { result.os = 'Android'; result.osVersion = ua.match(/Android (\d+\.?\d*)/)[1]; }
  else if (/iPhone OS (\d+_\d+)/i.test(ua)) { result.os = 'iOS'; result.osVersion = ua.match(/iPhone OS (\d+_\d+)/)[1].replace(/_/g, '.'); }
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

const getClientIp = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.headers['x-real-ip'] || req.ip || '';
};

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const verifyTOTP = (secret, token) => {
  const window = 1;
  const currentTime = Math.floor(Date.now() / 30000);
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

    if (generatedToken === token) return true;
  }
  return false;
};

const generateTOTPSecret = () => {
  return crypto.randomBytes(20).toString('base64');
};

const generateBackupCodes = () => {
  const codes = [];
  for (let i = 0; i < 10; i++) {
    codes.push(crypto.randomBytes(4).toString('hex'));
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

const createUserSession = async (userId, token, deviceInfo, parsed, ua, ip) => {
  const UserSession = require('../models/UserSession');
  const tokenHash = hashToken(token);
  const sessionDeviceInfo = parseUserAgent(ua);
  if (deviceInfo?.screenWidth) sessionDeviceInfo.screenWidth = deviceInfo.screenWidth;
  if (deviceInfo?.screenHeight) sessionDeviceInfo.screenHeight = deviceInfo.screenHeight;
  if (deviceInfo?.language) sessionDeviceInfo.language = deviceInfo.language;
  sessionDeviceInfo.userAgent = ua;
  await UserSession.create({ userId, tokenHash, deviceInfo: sessionDeviceInfo, ip });
};

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

module.exports = { parseUserAgent, hashToken, getClientIp, escapeRegex, verifyTOTP, generateTOTPSecret, generateBackupCodes, buildDeviceInfo, createUserSession, setAuthCookie };
