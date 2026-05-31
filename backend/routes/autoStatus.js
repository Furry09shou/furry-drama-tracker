const express = require('express');
const router = express.Router();
const Episode = require('../models/Episode');
const SingleEpisode = require('../models/SingleEpisode');
const { adminProtect } = require('../middlewares/authFactory');

router.post('/auto-complete', adminProtect, async (req, res) => {
  try {
    const now = new Date();
    const episodes = await Episode.find({ status: 'ongoing' });
    let updated = 0;
    for (const ep of episodes) {
      if (ep.currentEpisodes > 0 && ep.totalEpisodes > 0 && ep.currentEpisodes >= ep.totalEpisodes) {
        ep.status = 'completed';
        await ep.save();
        updated++;
      }
    }
    res.json({ message: `已自动将 ${updated} 部剧集标记为已完结`, updated });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/check-premieres', adminProtect, async (req, res) => {
  try {
    const now = new Date();
    const upcomingSingles = await SingleEpisode.find({
      isUpcoming: true,
      premiereDate: { $lte: now }
    });
    let released = 0;
    for (const se of upcomingSingles) {
      se.isUpcoming = false;
      se.releaseDate = se.premiereDate;
      await se.save();
      released++;
    }
    res.json({ message: `已自动发布 ${released} 个预告单集`, released });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
