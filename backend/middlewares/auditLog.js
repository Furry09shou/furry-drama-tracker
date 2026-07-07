const AuditLog = require('../models/AuditLog');

const logAction = (action, target = '', details = '') => {
  return async (req, res, next) => {
    const originalEnd = res.end;
    res.end = function (...args) {
      const actor = req.user;
      if (actor && res.statusCode < 400) {
        AuditLog.create({
          userId: actor._id,
          userName: actor.username || actor.accountId,
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
        userId: args[0],
        userName: args[1],
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
