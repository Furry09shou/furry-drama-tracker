const express = require('express');
const router = express.Router();
const Follow = require('../models/Follow');
const Episode = require('../models/Episode');
const History = require('../models/History');
const { protect } = require('../middlewares/authFactory');
const { asyncHandler } = require('../utils/errorHandler');

router.post('/add', protect, async (req, res) => {
  const { episodeId, folderId } = req.body;
  try {
    const existing = await Follow.findOne({ userId: req.user._id, episodeId });
    if (existing) {
      return res.status(400).json({ message: 'Already following' });
    }
    const episode = await Episode.findById(episodeId);
    if (!episode) {
      return res.status(404).json({ message: 'Episode not found' });
    }
    const followData = { userId: req.user._id, episodeId, followedAtEpisodes: episode.currentEpisodes };
    if (folderId) {
      followData.folderId = folderId;
    }
    const follow = await Follow.create(followData);
    res.json(follow);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/remove', protect, async (req, res) => {
  const { episodeId } = req.body;
  try {
    await Follow.deleteOne({ userId: req.user._id, episodeId });
    res.json({ message: 'Unfollowed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/list', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20, folderId, sort = 'updatedAt' } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const filter = { userId: req.user._id };
    if (folderId) {
      filter.folderId = folderId === 'null' ? null : folderId;
    }

    const total = await Follow.countDocuments(filter);
    const totalPages = Math.ceil(total / limitNum);

    let list;

    if (sort === 'name' || sort === 'rating') {
      const maxItems = Math.min(total, pageNum * limitNum + 100);
      const allItems = await Follow.find(filter)
        .populate('episodeId')
        .populate('folderId')
        .limit(maxItems);

      allItems.sort((a, b) => {
        if (sort === 'name') {
          return (a.episodeId?.title || '').localeCompare(b.episodeId?.title || '');
        }
        return (b.episodeId?.averageRating || 0) - (a.episodeId?.averageRating || 0);
      });

      list = allItems.slice((pageNum - 1) * limitNum, pageNum * limitNum);
    } else if (sort === 'lastWatched') {
      const maxItems = Math.min(total, pageNum * limitNum + 100);
      const allItems = await Follow.find(filter)
        .populate('episodeId')
        .populate('folderId')
        .limit(maxItems);

      const episodeIds = allItems.map(item => item.episodeId?._id).filter(Boolean);
      const histories = await History.find({ userId: req.user._id, episodeId: { $in: episodeIds } });
      const historyMap = {};
      histories.forEach(h => { historyMap[h.episodeId.toString()] = h.lastWatched; });

      allItems.sort((a, b) => {
        const aLast = historyMap[a.episodeId?._id?.toString()] || new Date(0);
        const bLast = historyMap[b.episodeId?._id?.toString()] || new Date(0);
        return new Date(bLast) - new Date(aLast);
      });

      list = allItems.slice((pageNum - 1) * limitNum, pageNum * limitNum);
    } else {
      list = await Follow.find(filter)
        .populate('episodeId')
        .populate('folderId')
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum);
    }

    res.json({ list, page: pageNum, limit: limitNum, total, totalPages });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/check/:episodeId', protect, async (req, res) => {
  try {
    const follow = await Follow.findOne({ userId: req.user._id, episodeId: req.params.episodeId });
    res.json({
      isFollowing: !!follow,
      followedAtEpisodes: follow ? follow.followedAtEpisodes : undefined
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
