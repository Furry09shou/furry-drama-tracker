const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const Feedback = require('../models/Feedback');
const Notification = require('../models/Notification');
const { protect, adminProtect } = require('../middlewares/authFactory');

const feedbackLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { message: '反馈提交过于频繁，请1小时后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/', protect, feedbackLimiter, async (req, res) => {
  try {
    const { type, content } = req.body;
    if (!content || !content.trim()) return res.status(400).json({ message: '内容不能为空' });
    if (content.length > 2000) return res.status(400).json({ message: '内容不能超过2000字' });
    await Feedback.create({
      userId: req.user._id,
      username: req.user.username || req.user.accountId || req.user.email,
      type: type || 'suggestion',
      content: content.trim().slice(0, 2000)
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
    const validStatuses = ['pending', 'read', 'replied'];
    if (status && !validStatuses.includes(status)) return res.status(400).json({ message: '无效的状态值' });
    const update = {};
    if (status) update.status = status;
    if (reply !== undefined) update.reply = reply.slice(0, 1000);
    const fb = await Feedback.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!fb) return res.status(404).json({ message: 'Not found' });
    if (reply) {
      await Notification.create({
        userId: fb.userId,
        type: 'feedback_reply',
        message: `您的反馈已收到回复：${reply.slice(0, 50)}...`
      });
    }
    res.json(fb);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
