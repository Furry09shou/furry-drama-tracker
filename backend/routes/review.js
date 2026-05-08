const express = require('express');
const router = express.Router();
const Episode = require('../models/Episode');
const Admin = require('../models/Admin');
const adminProtect = require('../middlewares/adminAuth');
const { clearCache, clearCacheByPrefix } = require('../middlewares/cache');

const adminOnly = (req, res, next) => {
  if (req.admin && (req.admin.role === 'admin' || req.admin.role === 'superadmin' || req.admin.role === 'user-admin')) {
    next();
  } else {
    return res.status(403).json({ message: '需要管理员权限' });
  }
};

router.get('/pending', adminProtect, adminOnly, async (req, res) => {
  try {
    const episodes = await Episode.find({ reviewStatus: 'pending' })
      .populate('createdBy', 'username email')
      .sort({ updatedAt: -1 });
    res.json(episodes);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/all', adminProtect, adminOnly, async (req, res) => {
  try {
    const episodes = await Episode.find({})
      .populate('createdBy', 'username email')
      .populate('allowedEditors', 'username email')
      .sort({ updatedAt: -1 });
    res.json(episodes);
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
    res.json(episode);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/assign-editor/:episodeId', adminProtect, adminOnly, async (req, res) => {
  try {
    const { editorId } = req.body;
    const editor = await Admin.findById(editorId);
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
      .populate('createdBy', 'username')
      .populate('allowedEditors', 'username');
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
      .populate('createdBy', 'username email')
      .populate('allowedEditors', 'username email');
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
