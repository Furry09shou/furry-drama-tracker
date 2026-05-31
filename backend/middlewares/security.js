const xss = require('xss');

const sanitizeInput = (req, res, next) => {
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
        sanitized[key] = sanitize(obj[key]);
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

module.exports = { sanitizeInput, validatePassword };
