const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

const adminProtect = async (req, res, next) => {
  let token;
  
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      if (decoded.role !== 'admin' && decoded.role !== 'superadmin' && decoded.role !== 'creator') {
        return res.status(403).json({ message: 'Not authorized as admin' });
      }
      
      req.admin = await Admin.findById(decoded.id).select('-password');
      next();
    } catch (error) {
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }
  
  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

module.exports = adminProtect;