const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog');
const adminProtect = require('../middlewares/adminAuth');

router.get('/', adminProtect, async (req, res) => {
  try {
    const { page = 1, limit = 50, action, admin } = req.query;
    const query = {};
    if (action) query.action = { $regex: action, $options: 'i' };
    if (admin) query.adminName = { $regex: admin, $options: 'i' };
    const total = await AuditLog.countDocuments(query);
    const logs = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    res.json({ logs, total, page: parseInt(page), totalPages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
