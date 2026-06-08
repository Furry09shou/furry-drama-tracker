const express = require('express');
const router = express.Router();
const SavedFolder = require('../models/SavedFolder');
const Folder = require('../models/Folder');
const { protect } = require('../middlewares/authFactory');
const { asyncHandler } = require('../utils/errorHandler');

// 获取当前用户收藏的他人收藏夹列表
router.get('/', protect, async (req, res) => {
  try {
    const savedFolders = await SavedFolder.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(savedFolders);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// 收藏他人收藏夹
router.post('/', protect, async (req, res) => {
  try {
    const { shareToken } = req.body;
    if (!shareToken) {
      return res.status(400).json({ message: 'shareToken is required' });
    }

    // 查找分享的收藏夹
    const folder = await Folder.findOne({ shareToken });
    if (!folder) {
      return res.status(404).json({ message: 'Folder not found' });
    }

    // 不能收藏自己的收藏夹
    if (folder.userId.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: '不能收藏自己的收藏夹' });
    }

    // 检查是否已收藏
    const existing = await SavedFolder.findOne({ userId: req.user._id, shareToken });
    if (existing) {
      return res.status(400).json({ message: '已收藏过该收藏夹' });
    }

    const isUnclassified = folder.name === '__unclassified__';
    const savedFolder = await SavedFolder.create({
      userId: req.user._id,
      shareToken,
      folderName: isUnclassified ? '默认收藏夹' : folder.name,
      creatorId: folder.userId,
      creatorName: req.body.creatorName || 'Unknown',
      description: isUnclassified ? '' : (folder.description || ''),
      folderType: folder.type
    });

    res.json(savedFolder);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// 取消收藏他人收藏夹
router.delete('/:id', protect, async (req, res) => {
  try {
    const savedFolder = await SavedFolder.findOne({ _id: req.params.id, userId: req.user._id });
    if (!savedFolder) {
      return res.status(404).json({ message: 'Saved folder not found' });
    }
    await savedFolder.deleteOne();
    res.json({ message: 'Removed' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
