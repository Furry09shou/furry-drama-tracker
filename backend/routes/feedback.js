const express = require('express');
const router = express.Router();
const Feedback = require('../models/Feedback');
const protect = require('../middlewares/auth');
const adminProtect = require('../middlewares/adminAuth');

router.post('/', protect, async (req, res) => {
  try {
    const { type, content } = req.body;
    if (!content || !content.trim()) return res.status(400).json({ message: '内容不能为空' });
    await Feedback.create({
      userId: req.user._id,
      username: req.user.username || req.user.email,
      type: type || 'suggestion',
      content: content.trim()
    });
    res.json({ message: '反馈已提交，感谢您的建议！' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/my', protect, async (req, res) => {
  try {
    const list = await Feedback.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(list);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/', adminProtect, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status) query.status = status;
    const total = await Feedback.countDocuments(query);
    const list = await Feedback.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(parseInt(limit));
    res.json({ list, total, page: parseInt(page), totalPages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id', adminProtect, async (req, res) => {
  try {
    const { status, reply } = req.body;
    const update = {};
    if (status) update.status = status;
    if (reply !== undefined) update.reply = reply;
    const fb = await Feedback.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!fb) return res.status(404).json({ message: 'Not found' });
    res.json(fb);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
