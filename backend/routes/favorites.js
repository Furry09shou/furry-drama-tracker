const express = require('express');
const router = express.Router();
const Favorite = require('../models/Favorite');
const Episode = require('../models/Episode');
const protect = require('../middlewares/auth');

router.post('/add', protect, async (req, res) => {
  try {
    const { episodeId } = req.body;
    const episode = await Episode.findById(episodeId);
    if (!episode) {
      return res.status(404).json({ message: 'Episode not found' });
    }
    const existing = await Favorite.findOne({ userId: req.user._id, episodeId });
    if (existing) {
      return res.status(400).json({ message: 'Already favorited' });
    }
    await Favorite.create({ userId: req.user._id, episodeId });
    res.json({ message: 'Favorited' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/remove', protect, async (req, res) => {
  try {
    const { episodeId } = req.body;
    await Favorite.deleteOne({ userId: req.user._id, episodeId });
    res.json({ message: 'Unfavorited' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/list', protect, async (req, res) => {
  try {
    const favorites = await Favorite.find({ userId: req.user._id }).populate('episodeId').sort({ createdAt: -1 });
    res.json(favorites);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/check/:episodeId', protect, async (req, res) => {
  try {
    const fav = await Favorite.findOne({ userId: req.user._id, episodeId: req.params.episodeId });
    res.json({ isFavorite: !!fav });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
