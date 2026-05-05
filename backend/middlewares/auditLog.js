const AuditLog = require('../models/AuditLog');

const logAction = (action, target = '', details = '') => {
  return async (req, res, next) => {
    const originalEnd = res.end;
    res.end = function (...args) {
      if (req.admin && res.statusCode < 400) {
        AuditLog.create({
          adminId: req.admin._id,
          adminName: req.admin.username,
          action,
          target,
          details,
          ip: req.ip || req.connection?.remoteAddress || ''
        }).catch(() => {});
      }
      originalEnd.apply(res, args);
    };
    next();
  };
};

const logManual = async (adminId, adminName, action, target = '', details = '', ip = '') => {
  try {
    await AuditLog.create({ adminId, adminName, action, target, details, ip });
  } catch (e) {}
};

module.exports = { logAction, logManual };
