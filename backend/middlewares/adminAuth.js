const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const User = require('../models/User');

const adminProtect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (decoded.role === 'user-admin') {
        const user = await User.findById(decoded.id).select('-password');
        if (!user || !user.adminAccess) {
          return res.status(403).json({ message: 'Not authorized as admin' });
        }
        req.admin = { _id: user._id, username: user.username, role: 'user-admin' };
        return next();
      }

      if (decoded.role !== 'admin' && decoded.role !== 'superadmin' && decoded.role !== 'creator') {
        return res.status(403).json({ message: 'Not authorized as admin' });
      }

      req.admin = await Admin.findById(decoded.id).select('-password');
      if (!req.admin) {
        return res.status(401).json({ message: 'Admin not found' });
      }
      next();
    } catch (error) {
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

const realAdminOnly = (req, res, next) => {
  if (!req.admin) return res.status(401).json({ message: 'Not authorized' });
  if (req.admin.role === 'user-admin' || req.admin.role === 'creator') {
    return res.status(403).json({ message: '权限不足' });
  }
  next();
};

module.exports = adminProtect;
module.exports.realAdminOnly = realAdminOnly;
