const xss = require('xss');

const sanitizeInput = (req, res, next) => {
  // 这些字段不应被 XSS 过滤（可能包含合法特殊字符或破坏密码内容）
  const skipFields = new Set(['password', 'newPassword', 'currentPassword', 'confirmPassword', 'oldPassword']);

  const sanitize = (obj) => {
    if (typeof obj === 'string') {
      return xss(obj);
    }
    if (Array.isArray(obj)) {
      return obj.map(item => sanitize(item));
    }
    if (obj && typeof obj === 'object') {
      const sanitized = {};
      for (const key of Object.keys(obj)) {
        if (key.startsWith('$') || key.includes('.')) {
          continue;
        }
        // 跳过密码类字段，保留原始值
        if (skipFields.has(key) && typeof obj[key] === 'string') {
          sanitized[key] = obj[key];
        } else {
          sanitized[key] = sanitize(obj[key]);
        }
      }
      return sanitized;
    }
    return obj;
  };

  if (req.body) {
    req.body = sanitize(req.body);
  }
  if (req.query) {
    req.query = sanitize(req.query);
  }
  if (req.params) {
    req.params = sanitize(req.params);
  }
  next();
};

const sanitizeHeaders = (req, res, next) => {
  // 仅清理可能回显到响应中的 header。
  // 注意：不清理 x-forwarded-for / x-real-ip —— 它们被 req.ip 与限流 keyGenerator 使用，
  // XSS 过滤会改变其原始内容并干扰限流。XFF 的可信度由 app.set('trust proxy') 与反代配置负责：
  // 生产环境反向代理必须覆盖（而非追加）客户端发送的 X-Forwarded-For，以防伪造绕过 IP 限流。
  const riskyHeaders = ['referer'];
  riskyHeaders.forEach(header => {
    if (req.headers[header] && typeof req.headers[header] === 'string') {
      req.headers[header] = xss(req.headers[header]);
    }
  });
  next();
};

const validatePassword = (password) => {
  if (!password || password.length < 8) {
    return '密码长度至少8位';
  }
  if (!/[A-Za-z]/.test(password)) {
    return '密码必须包含至少一个字母';
  }
  if (!/[0-9]/.test(password)) {
    return '密码必须包含至少一个数字';
  }
  return null;
};

module.exports = { sanitizeInput, sanitizeHeaders, validatePassword };
