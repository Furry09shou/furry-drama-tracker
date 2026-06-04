const express = require('express');
const router = express.Router();
const Folder = require('../models/Folder');
const Follow = require('../models/Follow');
const Favorite = require('../models/Favorite');
const { protect } = require('../middlewares/authFactory');
const { asyncHandler } = require('../utils/errorHandler');

router.get('/', protect, async (req, res) => {
  try {
    const filter = { userId: req.user._id };
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
    const folder = await Folder.create({ userId: req.user._id, name, type });
    res.json(folder);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/reorder', protect, async (req, res) => {
  try {
    const { folderIds } = req.body;
    for (let i = 0; i < folderIds.length; i++) {
      await Folder.updateOne({ _id: folderIds[i], userId: req.user._id }, { sortOrder: i });
    }
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

module.exports = router;
