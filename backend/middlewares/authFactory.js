const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Admin = require('../models/Admin');
const UserSession = require('../models/UserSession');
const AdminSession = require('../models/AdminSession');
const { hashToken } = require('../utils/helpers');

const createAuthMiddleware = ({ modelType, allowedRoles = [], reqProperty }) => {
  return async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token && req.cookies) {
      const cookieName = modelType === 'admin' ? 'adminToken' : 'token';
      token = req.cookies[cookieName];
    }

    if (!token) {
      return res.status(401).json({ message: 'Not authorized, no token' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (modelType === 'admin' && allowedRoles.length > 0) {
        if (!allowedRoles.includes(decoded.role)) {
          return res.status(403).json({ message: 'Not authorized' });
        }
      }

      const Model = modelType === 'user' ? User : Admin;
      const entity = await Model.findById(decoded.id).select('-password');

      if (!entity) {
        return res.status(401).json({ message: `${modelType === 'user' ? 'User' : 'Admin'} not found` });
      }

      const tokenHash = hashToken(token);
      const SessionModel = modelType === 'user' ? UserSession : AdminSession;
      const session = await SessionModel.findOne({ tokenHash, isActive: true });
      if (!session) {
        return res.status(401).json({ message: 'Session invalid or expired' });
      }

      req[reqProperty] = entity;
      next();
    } catch (error) {
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  };
};

module.exports = {
  createAuthMiddleware,
  protect: createAuthMiddleware({ modelType: 'user', allowedRoles: [], reqProperty: 'user' }),
  adminProtect: createAuthMiddleware({ modelType: 'admin', allowedRoles: ['admin', 'superadmin', 'creator'], reqProperty: 'admin' }),
  creatorProtect: createAuthMiddleware({ modelType: 'admin', allowedRoles: ['creator', 'admin', 'superadmin'], reqProperty: 'admin' }),
  superAdminProtect: createAuthMiddleware({ modelType: 'admin', allowedRoles: ['superadmin'], reqProperty: 'admin' })
};
