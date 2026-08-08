const express = require('express');
const router = express.Router();
const CreatorProfile = require('../models/CreatorProfile');
const Episode = require('../models/Episode');
const { creatorProtect } = require('../middlewares/authFactory');
const { asyncHandler } = require('../utils/errorHandler');

// 公开端点剥离待审核字段，避免泄露 pendingChanges / reviewNote / reviewStatus
const toPublicProfile = (profile) => {
  const obj = profile.toObject ? profile.toObject({ depopulate: true }) : { ...profile };
  delete obj.pendingChanges;
  delete obj.reviewNote;
  delete obj.reviewStatus;
  return obj;
};

// 创建/获取自己的创作者主页（创作者视角，包含待审核修改）
router.get('/my-profile', creatorProtect, async (req, res) => {
  try {
    let profile = await CreatorProfile.findOne({ creatorId: req.user._id });
    if (!profile) {
      profile = await CreatorProfile.create({
        creatorId: req.user._id,
        displayName: req.user.username || '创作者',
        bio: '这位创作者还没有填写个人简介。',
        socialLinks: {}
      });
    }
    res.json(profile);
  } catch (error) {
    console.error('Get creator profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// 创作者修改主页：暂存为 pendingChanges，置 reviewStatus=pending，等待管理员审核
// 正式字段（displayName/avatar/bio/socialLinks）不变，确保对外展示的仍是上次已审核版本
router.put('/my-profile', creatorProtect, async (req, res) => {
  try {
    const pendingChanges = {
      displayName: req.body.displayName,
      avatar: req.body.avatar,
      bio: req.body.bio && req.body.bio.length > 500 ? req.body.bio.slice(0, 500) : req.body.bio,
      socialLinks: req.body.socialLinks || {},
      qqGroupLink: req.body.qqGroupLink || ''
    };
    let profile = await CreatorProfile.findOneAndUpdate(
      { creatorId: req.user._id },
      {
        $set: {
          pendingChanges,
          reviewStatus: 'pending',
          reviewNote: '',
          updatedAt: Date.now()
        }
      },
      { new: true, upsert: true, runValidators: true }
    );
    // 若是新创建的文档缺少正式 displayName，先用 pendingChanges 兜底初始化
    if (!profile.displayName) {
      profile.displayName = pendingChanges.displayName || '创作者';
      await profile.save();
    }
    res.json(profile);
  } catch (error) {
    console.error('Update creator profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// 公开主页：只返回已审核的正式字段，不泄露 pendingChanges
router.get('/public/:id', async (req, res) => {
  try {
    const profile = await CreatorProfile.findById(req.params.id);
    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }
    const creatorId = profile.creatorId;
    const episodes = await Episode.find({
      $or: [
        { createdBy: creatorId, hideCreator: { $ne: true } },
        { allowedEditors: creatorId },
        { customAuthors: creatorId }
      ],
      reviewStatus: 'approved'
    }).sort({ createdAt: -1 });
    res.json({ profile: toPublicProfile(profile), episodes });
  } catch (error) {
    console.error('Get public profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// 按创作者用户 ID 查询主页（曾用路径 /by-admin/:adminId，已重命名以避免语义误解）
router.get('/by-creator/:creatorId', async (req, res) => {
  try {
    const profile = await CreatorProfile.findOne({ creatorId: req.params.creatorId });
    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }
    const creatorId = profile.creatorId;
    const episodes = await Episode.find({
      $or: [
        { createdBy: creatorId, hideCreator: { $ne: true } },
        { allowedEditors: creatorId },
        { customAuthors: creatorId }
      ],
      reviewStatus: 'approved'
    }).sort({ createdAt: -1 });
    res.json({ profile: toPublicProfile(profile), episodes });
  } catch (error) {
    console.error('Get profile by creator error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
