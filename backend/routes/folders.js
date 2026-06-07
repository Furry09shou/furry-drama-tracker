const express = require('express');
const router = express.Router();
const Folder = require('../models/Folder');
const Follow = require('../models/Follow');
const Favorite = require('../models/Favorite');
const Episode = require('../models/Episode');
const { protect } = require('../middlewares/authFactory');
const { asyncHandler } = require('../utils/errorHandler');

router.get('/', protect, async (req, res) => {
  try {
    const filter = { userId: req.user._id, name: { $ne: '__unclassified__' } };
    if (req.query.type) {
      filter.type = req.query.type;
    }
    const folders = await Folder.find(filter).sort({ sortOrder: 1, createdAt: 1 });
    res.json(folders);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', protect, async (req, res) => {
  try {
    const { name, type } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: '文件夹名称不能为空' });
    }
    if (name.trim().length > 50) {
      return res.status(400).json({ message: '文件夹名称不能超过50个字符' });
    }
    if (!type || !['follow', 'favorite'].includes(type)) {
      return res.status(400).json({ message: '无效的文件夹类型' });
    }
    const folder = await Folder.create({ userId: req.user._id, name: name.trim(), type });
    res.json(folder);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/reorder', protect, async (req, res) => {
  try {
    const { folderIds } = req.body;
    const bulkOps = folderIds.map((id, i) => ({
      updateOne: {
        filter: { _id: id, userId: req.user._id },
        update: { sortOrder: i }
      }
    }));
    await Folder.bulkWrite(bulkOps);
    res.json({ message: 'Reordered' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id', protect, async (req, res) => {
  try {
    const folder = await Folder.findOne({ _id: req.params.id, userId: req.user._id });
    if (!folder) {
      return res.status(404).json({ message: 'Folder not found' });
    }
    if (req.body.name !== undefined) {
      if (!req.body.name.trim()) {
        return res.status(400).json({ message: '文件夹名称不能为空' });
      }
      if (req.body.name.trim().length > 50) {
        return res.status(400).json({ message: '文件夹名称不能超过50个字符' });
      }
      folder.name = req.body.name.trim();
    }
    await folder.save();
    res.json(folder);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', protect, async (req, res) => {
  try {
    const folder = await Folder.findOne({ _id: req.params.id, userId: req.user._id });
    if (!folder) {
      return res.status(404).json({ message: 'Folder not found' });
    }
    const Model = folder.type === 'follow' ? Follow : Favorite;
    await Model.updateMany({ folderId: folder._id }, { $set: { folderId: null } });
    await folder.deleteOne();
    res.json({ message: 'Folder deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/:id/items', protect, async (req, res) => {
  try {
    const folder = await Folder.findOne({ _id: req.params.id, userId: req.user._id });
    if (!folder) {
      return res.status(404).json({ message: 'Folder not found' });
    }
    const { episodeId } = req.body;
    const Model = folder.type === 'follow' ? Follow : Favorite;
    const item = await Model.findOne({ userId: req.user._id, episodeId });
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }
    item.folderId = folder._id;
    await item.save();
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id/items/:episodeId', protect, async (req, res) => {
  try {
    const folder = await Folder.findOne({ _id: req.params.id, userId: req.user._id });
    if (!folder) {
      return res.status(404).json({ message: 'Folder not found' });
    }
    const Model = folder.type === 'follow' ? Follow : Favorite;
    await Model.updateOne(
      { userId: req.user._id, episodeId: req.params.episodeId, folderId: folder._id },
      { $set: { folderId: null } }
    );
    res.json({ message: 'Item removed from folder' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// 分享未分类收藏夹（放在 /:id 路由之前，避免被 /:id 匹配）
router.post('/share-unclassified', protect, async (req, res) => {
  try {
    let virtualFolder = await Folder.findOne({ userId: req.user._id, type: 'favorite', name: '__unclassified__' });
    if (!virtualFolder) {
      virtualFolder = await Folder.create({ userId: req.user._id, type: 'favorite', name: '__unclassified__', sortOrder: -1 });
    }
    if (!virtualFolder.shareToken) {
      virtualFolder.shareToken = require('crypto').randomBytes(12).toString('hex');
      await virtualFolder.save();
    }
    res.json({ shareToken: virtualFolder.shareToken });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// 分享收藏夹 — 生成 shareToken
router.post('/:id/share', protect, async (req, res) => {
  try {
    const folder = await Folder.findOne({ _id: req.params.id, userId: req.user._id });
    if (!folder) {
      return res.status(404).json({ message: 'Folder not found' });
    }
    if (!folder.shareToken) {
      folder.generateShareToken();
      await folder.save();
    }
    res.json({ shareToken: folder.shareToken });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// 取消分享收藏夹
router.delete('/:id/share', protect, async (req, res) => {
  try {
    const folder = await Folder.findOne({ _id: req.params.id, userId: req.user._id });
    if (!folder) {
      return res.status(404).json({ message: 'Folder not found' });
    }
    folder.revokeShareToken();
    await folder.save();
    res.json({ message: 'Share revoked' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// 公开访问分享的收藏夹（无需认证）
router.get('/shared/:shareToken', async (req, res) => {
  try {
    const folder = await Folder.findOne({ shareToken: req.params.shareToken });
    if (!folder) {
      return res.status(404).json({ message: 'Shared folder not found' });
    }
    const isUnclassified = folder.name === '__unclassified__';
    const Model = folder.type === 'follow' ? Follow : Favorite;
    const filter = isUnclassified ? { userId: folder.userId, folderId: null } : { folderId: folder._id };
    const items = await Model.find(filter)
      .populate('episodeId', 'title titleEn coverImage currentEpisodes totalEpisodes averageRating ratingCount status')
      .sort({ createdAt: -1 });

    const episodes = items
      .filter(item => item.episodeId)
      .map(item => item.episodeId);

    res.json({
      name: isUnclassified ? '未分类' : folder.name,
      type: folder.type,
      count: episodes.length,
      episodes,
      createdAt: folder.createdAt
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
