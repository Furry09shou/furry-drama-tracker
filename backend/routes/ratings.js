const express = require('express');
const router = express.Router();
const Rating = require('../models/Rating');
const Episode = require('../models/Episode');
const protect = require('../middlewares/auth');
const { clearCache, clearCacheByPrefix } = require('../middlewares/cache');

router.post('/', protect, async (req, res) => {
  try {
    const { episodeId, score } = req.body;
    if (!episodeId || !score || score < 1 || score > 5) {
      return res.status(400).json({ message: 'Invalid rating data' });
    }
    const episode = await Episode.findById(episodeId);
    if (!episode) {
      return res.status(404).json({ message: 'Episode not found' });
    }
    await Rating.findOneAndUpdate(
      { userId: req.user._id, episodeId },
      { score },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    const stats = await Rating.aggregate([
      { $match: { episodeId: episode._id } },
      { $group: { _id: null, avg: { $avg: '$score' }, count: { $sum: 1 } } }
    ]);
    const avg = stats.length > 0 ? Math.round(stats[0].avg * 10) / 10 : 0;
    const count = stats.length > 0 ? stats[0].count : 0;
    episode.averageRating = avg;
    episode.ratingCount = count;
    await episode.save();
    clearCache(`episode_${episodeId}`);
    clearCacheByPrefix('episodes_');
    res.json({ score, averageRating: avg, ratingCount: count });
  } catch (error) {
    console.error('Rating error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/check/:episodeId', protect, async (req, res) => {
  try {
    const rating = await Rating.findOne({ userId: req.user._id, episodeId: req.params.episodeId });
    res.json({ score: rating ? rating.score : 0 });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
