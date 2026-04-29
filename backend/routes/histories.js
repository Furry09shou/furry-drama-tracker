const express = require('express');
const router = express.Router();
const History = require('../models/History');
const protect = require('../middlewares/auth');

router.post('/record', protect, async (req, res) => {
  const { episodeId, episodeNumber } = req.body;
  try {
    const epNum = parseInt(episodeNumber, 10);
    if (isNaN(epNum)) {
      return res.status(400).json({ message: 'Invalid episode number' });
    }
    let history = await History.findOne({ userId: req.user._id, episodeId });
    if (!history) {
      history = await History.create({
        userId: req.user._id,
        episodeId,
        watchedEpisodes: [epNum],
        lastWatched: Date.now()
      });
    } else {
      if (!history.watchedEpisodes.includes(epNum)) {
        history.watchedEpisodes.push(epNum);
      }
      history.lastWatched = Date.now();
      await history.save();
    }
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/list', protect, async (req, res) => {
  try {
    const histories = await History.find({ userId: req.user._id }).populate('episodeId').sort({ lastWatched: -1 });
    res.json(histories);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/check/:episodeId', protect, async (req, res) => {
  try {
    const history = await History.findOne({ userId: req.user._id, episodeId: req.params.episodeId });
    res.json(history ? { watchedEpisodes: history.watchedEpisodes } : { watchedEpisodes: [] });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:episodeId', protect, async (req, res) => {
  try {
    await History.deleteOne({ userId: req.user._id, episodeId: req.params.episodeId });
    res.json({ message: 'History deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
