const express = require('express');
const router = express.Router();
const Episode = require('../models/Episode');
const SingleEpisode = require('../models/SingleEpisode');
const User = require('../models/User');
const Follow = require('../models/Follow');
const Rating = require('../models/Rating');
const Report = require('../models/Report');
const adminProtect = require('../middlewares/adminAuth');

router.get('/overview', adminProtect, async (req, res) => {
  try {
    const totalEpisodes = await Episode.countDocuments({ reviewStatus: 'approved' });
    const pendingEpisodes = await Episode.countDocuments({ reviewStatus: 'pending' });
    const totalUsers = await User.countDocuments();
    const totalFollows = await Follow.countDocuments();
    const totalRatings = await Rating.countDocuments();
    const pendingReports = await Report.countDocuments({ status: 'pending' });

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const newUsers = await User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });
    const newEpisodes = await Episode.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });

    const topRated = await Episode.find({ reviewStatus: 'approved', ratingCount: { $gt: 0 } })
      .sort({ averageRating: -1, ratingCount: -1 })
      .limit(5)
      .select('title averageRating ratingCount views');

    const mostViewed = await Episode.find({ reviewStatus: 'approved' })
      .sort({ views: -1 })
      .limit(5)
      .select('title views');

    const mostFollowed = await Follow.aggregate([
      { $group: { _id: '$episodeId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);
    const followedEpIds = mostFollowed.map(f => f._id);
    const followedEps = await Episode.find({ _id: { $in: followedEpIds } }).select('title');
    const mostFollowedResult = mostFollowed.map(f => {
      const ep = followedEps.find(e => e._id.toString() === f._id.toString());
      return { title: ep ? ep.title : 'Unknown', count: f.count };
    });

    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);
      const count = await User.countDocuments({ createdAt: { $gte: date, $lt: nextDate } });
      last7Days.push({ date: date.toISOString().split('T')[0], count });
    }

    res.json({
      totalEpisodes, pendingEpisodes, totalUsers, totalFollows,
      totalRatings, pendingReports, newUsers, newEpisodes,
      topRated, mostViewed, mostFollowed: mostFollowedResult,
      userTrend: last7Days
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/calendar', async (req, res) => {
  try {
    const episodes = await Episode.find({
      reviewStatus: 'approved',
      updateDay: { $ne: '' }
    }).select('title updateDay currentEpisodes totalEpisodes status coverImage');
    const calendar = {};
    const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    for (const day of days) {
      calendar[day] = episodes.filter(ep => ep.updateDay === day);
    }
    res.json(calendar);
  } catch (error) {
    console.error('Calendar error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/recommendations/:episodeId', async (req, res) => {
  try {
    const episode = await Episode.findById(req.params.episodeId);
    if (!episode) {
      return res.status(404).json({ message: 'Episode not found' });
    }
    const query = {
      _id: { $ne: req.params.episodeId },
      reviewStatus: 'approved'
    };
    if (episode.category && episode.category.length > 0) {
      query.category = { $in: episode.category };
    }
    let similar = await Episode.find(query).sort({ views: -1 }).limit(8).select('title coverImage currentEpisodes totalEpisodes status averageRating');
    if (similar.length < 4) {
      const extraIds = similar.map(s => s._id);
      extraIds.push(req.params.episodeId);
      const extra = await Episode.find({
        _id: { $nin: extraIds },
        reviewStatus: 'approved'
      }).sort({ views: -1 }).limit(8 - similar.length).select('title coverImage currentEpisodes totalEpisodes status averageRating');
      similar = [...similar, ...extra];
    }
    res.json(similar);
  } catch (error) {
    console.error('Recommendations error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
