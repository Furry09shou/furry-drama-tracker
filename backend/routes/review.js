const express = require('express');
const router = express.Router();
const Episode = require('../models/Episode');
const adminProtect = require('../middlewares/adminAuth');

router.get('/pending', adminProtect, async (req, res) => {
  try {
    const episodes = await Episode.find({ reviewStatus: 'pending' })
      .populate('createdBy', 'username email')
      .sort({ updatedAt: -1 });
    res.json(episodes);
  } catch (error) {
    console.error('Get pending episodes error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/all', adminProtect, async (req, res) => {
  try {
    const episodes = await Episode.find({})
      .populate('createdBy', 'username email')
      .populate('allowedEditors', 'username email')
      .sort({ updatedAt: -1 });
    res.json(episodes);
  } catch (error) {
    console.error('Get all episodes for review error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/approve/:id', adminProtect, async (req, res) => {
  try {
    const episode = await Episode.findByIdAndUpdate(
      req.params.id,
      { reviewStatus: 'approved', reviewNote: req.body.note || '' },
      { new: true }
    );
    if (!episode) {
      return res.status(404).json({ message: 'Episode not found' });
    }
    res.json(episode);
  } catch (error) {
    console.error('Approve episode error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/reject/:id', adminProtect, async (req, res) => {
  try {
    const episode = await Episode.findByIdAndUpdate(
      req.params.id,
      { reviewStatus: 'rejected', reviewNote: req.body.note || '' },
      { new: true }
    );
    if (!episode) {
      return res.status(404).json({ message: 'Episode not found' });
    }
    res.json(episode);
  } catch (error) {
    console.error('Reject episode error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/assign-editor/:episodeId', adminProtect, async (req, res) => {
  try {
    const { editorId } = req.body;
    const episode = await Episode.findById(req.params.episodeId);
    if (!episode) {
      return res.status(404).json({ message: 'Episode not found' });
    }
    if (!episode.allowedEditors) {
      episode.allowedEditors = [];
    }
    if (!episode.allowedEditors.includes(editorId)) {
      episode.allowedEditors.push(editorId);
      await episode.save();
    }
    const updated = await Episode.findById(req.params.episodeId)
      .populate('createdBy', 'username email')
      .populate('allowedEditors', 'username email');
    res.json(updated);
  } catch (error) {
    console.error('Assign editor error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/remove-editor/:episodeId', adminProtect, async (req, res) => {
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
    console.error('Remove editor error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
