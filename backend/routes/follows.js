const express = require('express');
const router = express.Router();
const Follow = require('../models/Follow');
const Episode = require('../models/Episode');
const protect = require('../middlewares/auth');

router.post('/add', protect, async (req, res) => {
  const { episodeId } = req.body;
  try {
    const existing = await Follow.findOne({ userId: req.user._id, episodeId });
    if (existing) {
      return res.status(400).json({ message: 'Already following' });
    }
    const episode = await Episode.findById(episodeId);
    const currentEps = episode ? episode.currentEpisodes : 0;
    const follow = await Follow.create({ userId: req.user._id, episodeId, followedAtEpisodes: currentEps });
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
    const follows = await Follow.find({ userId: req.user._id }).populate('episodeId');
    res.json(follows);
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
