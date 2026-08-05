const express = require('express');
const router = express.Router();
const Episode = require('../models/Episode');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { sendPushToUser } = require('./notifications');
const { sendNotificationEmailToUser } = require('../utils/notifyHelper');
const { adminProtect } = require('../middlewares/authFactory');
const { clearCache, clearCacheByPrefix } = require('../middlewares/cache');

const adminOnly = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'superadmin')) {
    next();
  } else {
    return res.status(403).json({ message: '需要管理员权限' });
  }
};

// 审核结果通知创作者：站内通知 + Web Push + 邮件
// status: 'approved' | 'rejected'
const notifyCreatorReviewResult = async (episode, status, note = '') => {
  const creatorId = episode.createdBy;
  if (!creatorId) return;
  const isApproved = status === 'approved';
  const title = episode.title || '';
  const message = isApproved
    ? `您的剧集《${title}》已通过审核`
    : `您的剧集《${title}》未通过审核${note ? `：${note}` : ''}`;

  // 站内通知
  await Notification.create({
    userId: creatorId,
    episodeId: episode._id,
    episodeTitle: title,
    episodeTitleEn: episode.titleEn || '',
    type: 'review_result',
    message,
    link: `/admin/episodes`,
    metadata: { episodeId: episode._id, status, note }
  }).catch(() => {});

  // Web Push
  sendPushToUser(String(creatorId), {
    title: `剧集${isApproved ? '通过' : '未通过'}审核`,
    body: isApproved ? `《${title}》已通过审核，现已上线` : `《${title}》未通过审核${note ? `：${note}` : ''}`,
    icon: '/vite.svg',
    data: { url: `/admin/episodes` }
  }).catch(() => {});

  // 邮件通知（受用户偏好控制）
  sendNotificationEmailToUser(creatorId, 'reviewResult', title, status, note).catch(() => {});
};

router.get('/pending', adminProtect, adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 100);
    const total = await Episode.countDocuments({ reviewStatus: 'pending' });
    const totalPages = Math.ceil(total / limitNum);
    const episodes = await Episode.find({ reviewStatus: 'pending' })
      .populate('createdBy', 'accountId username email')
      .sort({ updatedAt: -1 })
      .skip((pageNum - 1) * limitNum).limit(limitNum);
    res.json({ list: episodes, page: pageNum, limit: limitNum, total, totalPages });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/all', adminProtect, adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 100);
    const total = await Episode.countDocuments({});
    const totalPages = Math.ceil(total / limitNum);
    const episodes = await Episode.find({})
      .populate('createdBy', 'accountId username email')
      .populate('allowedEditors', 'accountId username email')
      .sort({ updatedAt: -1 })
      .skip((pageNum - 1) * limitNum).limit(limitNum);
    res.json({ list: episodes, page: pageNum, limit: limitNum, total, totalPages });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/approve/:id', adminProtect, adminOnly, async (req, res) => {
  try {
    const episode = await Episode.findByIdAndUpdate(
      req.params.id,
      { reviewStatus: 'approved', reviewNote: req.body.note || '' },
      { new: true }
    );
    if (!episode) {
      return res.status(404).json({ message: 'Episode not found' });
    }
    clearCache(`episode_${req.params.id}`);
    clearCacheByPrefix('episodes_');
    // 通知创作者审核通过
    notifyCreatorReviewResult(episode, 'approved', req.body.note || '');
    res.json(episode);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/reject/:id', adminProtect, adminOnly, async (req, res) => {
  try {
    const episode = await Episode.findByIdAndUpdate(
      req.params.id,
      { reviewStatus: 'rejected', reviewNote: req.body.note || '' },
      { new: true }
    );
    if (!episode) {
      return res.status(404).json({ message: 'Episode not found' });
    }
    clearCache(`episode_${req.params.id}`);
    clearCacheByPrefix('episodes_');
    // 通知创作者审核未通过
    notifyCreatorReviewResult(episode, 'rejected', req.body.note || '');
    res.json(episode);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/assign-editor/:episodeId', adminProtect, adminOnly, async (req, res) => {
  try {
    const { editorId } = req.body;
    const editor = await User.findById(editorId);
    if (!editor) {
      return res.status(404).json({ message: 'Editor not found' });
    }
    const episode = await Episode.findById(req.params.episodeId);
    if (!episode) {
      return res.status(404).json({ message: 'Episode not found' });
    }
    if (!episode.allowedEditors) {
      episode.allowedEditors = [];
    }
    if (!episode.allowedEditors.some(e => e.toString() === editorId)) {
      episode.allowedEditors.push(editorId);
      await episode.save();
    }
    clearCache(`episode_${req.params.episodeId}`);
    const updated = await Episode.findById(req.params.episodeId)
      .populate('createdBy', 'accountId username')
      .populate('allowedEditors', 'accountId username');
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/remove-editor/:episodeId', adminProtect, adminOnly, async (req, res) => {
  try {
    const { editorId } = req.body;
    const episode = await Episode.findById(req.params.episodeId);
    if (!episode) {
      return res.status(404).json({ message: 'Episode not found' });
    }
    if (episode.allowedEditors) {
      episode.allowedEditors = episode.allowedEditors.filter(e => e.toString() !== editorId);
      await episode.save();
    }
    const updated = await Episode.findById(req.params.episodeId)
      .populate('createdBy', 'accountId username email')
      .populate('allowedEditors', 'accountId username email');
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
