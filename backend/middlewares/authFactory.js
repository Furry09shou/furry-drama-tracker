const jwt = require('jsonwebtoken');
const User = require('../models/User');
const UserSession = require('../models/UserSession');
const { hashToken } = require('../utils/helpers');

// 统一鉴权工厂：所有身份均通过 User + UserSession + token cookie 校验
// 通过 allowedRoles 控制访问权限（基于 User.role）
const createAuthMiddleware = ({ allowedRoles = [] }) => {
  return async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token && req.cookies) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ message: 'Not authorized, no token' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }

      if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        return res.status(403).json({ message: 'Not authorized' });
      }

      const tokenHash = hashToken(token);
      const session = await UserSession.findOne({ tokenHash, isActive: true });
      if (!session) {
        return res.status(401).json({ message: 'Session invalid or expired' });
      }

      req.user = user;
      req.authToken = token;
      next();
    } catch (error) {
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  };
};

module.exports = {
  createAuthMiddleware,
  // 普通登录用户
  protect: createAuthMiddleware({ allowedRoles: [] }),
  // 管理员（creator / admin / superadmin）
  adminProtect: createAuthMiddleware({ allowedRoles: ['creator', 'admin', 'superadmin'] }),
  // 创作者及以上（creator / admin / superadmin）
  creatorProtect: createAuthMiddleware({ allowedRoles: ['creator', 'admin', 'superadmin'] }),
  // 超级管理员
  superAdminProtect: createAuthMiddleware({ allowedRoles: ['superadmin'] }),
};
