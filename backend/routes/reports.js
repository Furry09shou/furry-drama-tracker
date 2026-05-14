const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const { protect, adminProtect } = require('../middlewares/authFactory');

router.post('/', protect, async (req, res) => {
  try {
    const { targetType, targetId, reason, description } = req.body;
    if (!['episode', 'creator'].includes(targetType)) {
      return res.status(400).json({ message: 'Invalid target type' });
    }
    if (!['inappropriate', 'copyright', 'spam', 'misleading', 'other'].includes(reason)) {
      return res.status(400).json({ message: 'Invalid reason' });
    }
    const existing = await Report.findOne({
      reporterId: req.user._id,
      targetType,
      targetId,
      status: 'pending'
    });
    if (existing) {
      return res.status(400).json({ message: 'Already reported' });
    }
    const report = await Report.create({
      reporterId: req.user._id,
      targetType,
      targetId,
      reason,
      description: description || ''
    });
    res.status(201).json(report);
  } catch (error) {
    console.error('Report error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/list', adminProtect, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status) query.status = status;
    const reports = await Report.find(query)
      .populate('reporterId', 'username email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    const total = await Report.countDocuments(query);
    res.json({ reports, total, page: parseInt(page), totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/resolve/:id', adminProtect, async (req, res) => {
  try {
    const { status, resolveNote } = req.body;
    if (!['resolved', 'dismissed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    const report = await Report.findByIdAndUpdate(
      req.params.id,
      { status, resolveNote: resolveNote || '', resolvedBy: req.admin._id },
      { new: true }
    );
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }
    res.json(report);
  } catch (error) {
    console.error('Resolve report error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
