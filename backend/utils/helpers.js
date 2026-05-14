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

module.exports = { parseUserAgent, hashToken, getClientIp, escapeRegex };
