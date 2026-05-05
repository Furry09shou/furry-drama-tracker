const express = require('express');
const router = express.Router();
const Wishlist = require('../models/Wishlist');
const Episode = require('../models/Episode');
const protect = require('../middlewares/auth');

router.post('/add', protect, async (req, res) => {
  try {
    const { episodeId } = req.body;
    const episode = await Episode.findById(episodeId);
    if (!episode) return res.status(404).json({ message: 'Episode not found' });
    const existing = await Wishlist.findOne({ userId: req.user._id, episodeId });
    if (existing) return res.status(400).json({ message: 'Already in wishlist' });
    await Wishlist.create({ userId: req.user._id, episodeId });
    res.json({ message: 'Added to wishlist' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/remove', protect, async (req, res) => {
  try {
    await Wishlist.deleteOne({ userId: req.user._id, episodeId: req.body.episodeId });
    res.json({ message: 'Removed from wishlist' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/list', protect, async (req, res) => {
  try {
    const list = await Wishlist.find({ userId: req.user._id }).populate('episodeId').sort({ createdAt: -1 });
    res.json(list);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/check/:episodeId', protect, async (req, res) => {
  try {
    const item = await Wishlist.findOne({ userId: req.user._id, episodeId: req.params.episodeId });
    res.json({ isWishlisted: !!item });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
