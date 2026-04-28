const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const protect = require('../middlewares/auth');

router.get('/list', protect, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/unread-count', protect, async (req, res) => {
  try {
    const count = await Notification.countDocuments({ userId: req.user._id, isRead: false });
    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/read-all', protect, async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.user._id, isRead: false }, { isRead: true });
    res.json({ message: 'All marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/read-episode/:episodeId', protect, async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user._id, episodeId: req.params.episodeId, isRead: false },
      { isRead: true }
    );
    res.json({ message: 'Episode notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/read/:id', protect, async (req, res) => {
  try {
    await Notification.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, { isRead: true });
    res.json({ message: 'Marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/clear-read', protect, async (req, res) => {
  try {
    await Notification.deleteMany({ userId: req.user._id, isRead: true });
    res.json({ message: 'Read notifications cleared' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', protect, async (req, res) => {
  try {
    await Notification.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    res.json({ message: 'Notification deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
