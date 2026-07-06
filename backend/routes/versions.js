const express = require('express');
const router = express.Router();
const EpisodeVersion = require('../models/EpisodeVersion');
const Episode = require('../models/Episode');
const { adminProtect } = require('../middlewares/authFactory');
const { asyncHandler } = require('../utils/errorHandler');

router.get('/:episodeId', adminProtect, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const total = await EpisodeVersion.countDocuments({ episodeId: req.params.episodeId });
    const totalPages = Math.ceil(total / limitNum);
    const versions = await EpisodeVersion.find({ episodeId: req.params.episodeId })
      .sort({ version: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .populate('changedBy', 'accountId username');
    res.json({ versions, page: pageNum, limit: limitNum, total, totalPages });
  } catch (error) {
    console.error('Get version history error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:episodeId/:version', adminProtect, async (req, res) => {
  try {
    const versionDoc = await EpisodeVersion.findOne({
      episodeId: req.params.episodeId,
      version: parseInt(req.params.version)
    }).populate('changedBy', 'accountId username');
    if (!versionDoc) {
      return res.status(404).json({ message: 'Version not found' });
    }
    res.json(versionDoc);
  } catch (error) {
    console.error('Get version error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:episodeId/diff/:v1/:v2', adminProtect, async (req, res) => {
  try {
    const v1Doc = await EpisodeVersion.findOne({
      episodeId: req.params.episodeId,
      version: parseInt(req.params.v1)
    });
    const v2Doc = await EpisodeVersion.findOne({
      episodeId: req.params.episodeId,
      version: parseInt(req.params.v2)
    });
    if (!v1Doc || !v2Doc) {
      return res.status(404).json({ message: 'Version not found' });
    }
    const diff = [];
    const allFields = new Set([...Object.keys(v1Doc.data), ...Object.keys(v2Doc.data)]);
    for (const field of allFields) {
      const oldVal = v1Doc.data[field];
      const newVal = v2Doc.data[field];
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        diff.push({ field, oldValue: oldVal, newValue: newVal });
      }
    }
    res.json(diff);
  } catch (error) {
    console.error('Diff versions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/:episodeId/rollback/:version', adminProtect, async (req, res) => {
  try {
    const versionDoc = await EpisodeVersion.findOne({
      episodeId: req.params.episodeId,
      version: parseInt(req.params.version)
    });
    if (!versionDoc) {
      return res.status(404).json({ message: 'Version not found' });
    }

    const currentEpisode = await Episode.findById(req.params.episodeId);
    if (!currentEpisode) {
      return res.status(404).json({ message: 'Episode not found' });
    }

    const isCreatorRole = req.user.role === 'creator';
    if (isCreatorRole) {
      const isOwner = currentEpisode.createdBy && currentEpisode.createdBy.toString() === req.user._id.toString();
      const isAllowed = currentEpisode.allowedEditors && currentEpisode.allowedEditors.some(e => e.toString() === req.user._id.toString());
      if (!isOwner && !isAllowed) {
        return res.status(403).json({ message: 'No permission to rollback this episode' });
      }
    }

    const lastVersion = await EpisodeVersion.findOne({ episodeId: req.params.episodeId })
      .sort({ version: -1 });
    const newVersionNum = (lastVersion ? lastVersion.version : 0) + 1;

    await EpisodeVersion.create({
      episodeId: req.params.episodeId,
      version: newVersionNum,
      data: currentEpisode.toObject(),
      changedBy: req.user._id,
      changeSummary: `Rolled back to version ${req.params.version}`
    });

    // 限制版本数量为50
    const versionCount = await EpisodeVersion.countDocuments({ episodeId: req.params.episodeId });
    if (versionCount > 50) {
      const oldestVersions = await EpisodeVersion.find({ episodeId: req.params.episodeId })
        .sort({ version: 1 })
        .limit(versionCount - 50)
        .select('_id');
      await EpisodeVersion.deleteMany({ _id: { $in: oldestVersions.map(v => v._id) } });
    }

    const rollbackData = { ...versionDoc.data, updatedAt: Date.now() };
    delete rollbackData._id;
    delete rollbackData.__v;

    const updatedEpisode = await Episode.findByIdAndUpdate(
      req.params.episodeId,
      rollbackData,
      { new: true, runValidators: true }
    );

    res.json(updatedEpisode);
  } catch (error) {
    console.error('Rollback error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
