const AuditLog = require('../models/AuditLog');

const logAction = (action, target = '', details = '') => {
  return async (req, res, next) => {
    const originalEnd = res.end;
    res.end = function (...args) {
      const actor = req.admin || req.user;
      if (actor && res.statusCode < 400) {
        AuditLog.create({
          adminId: req.admin ? req.admin._id : undefined,
          adminName: req.admin ? req.admin.username : undefined,
          userId: req.user ? req.user._id : undefined,
          userName: req.user ? (req.user.username || req.user.accountId) : undefined,
          action,
          target,
          details,
          ip: req.ip || req.connection?.remoteAddress || '',
          userAgent: req.headers['user-agent'] || '',
        }).catch(() => {});
      }
      originalEnd.apply(res, args);
    };
    next();
  };
};

const logManual = async (...args) => {
  try {
    let logData;
    if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null && args[0].action) {
      logData = args[0];
    } else {
      logData = {
        adminId: args[0],
        adminName: args[1],
        action: args[2],
        target: args[3] || '',
        details: args[4] || '',
        ip: args[5] || '',
      };
    }
    await AuditLog.create(logData);
  } catch (e) {}
};

const logUserAction = (action, target = '', details = '') => {
  return async (req, res, next) => {
    const originalEnd = res.end;
    res.end = function (...args) {
      if (req.user && res.statusCode < 400) {
        AuditLog.create({
          userId: req.user._id,
          userName: req.user.username || req.user.accountId,
          action,
          target,
          details,
          ip: req.ip || req.connection?.remoteAddress || '',
          userAgent: req.headers['user-agent'] || '',
        }).catch(() => {});
      }
      originalEnd.apply(res, args);
    };
    next();
  };
};

module.exports = { logAction, logManual, logUserAction };
