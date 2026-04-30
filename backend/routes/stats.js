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
    const { month, year } = req.query;
    const now = new Date();
    const targetYear = year ? parseInt(year) : now.getFullYear();
    const targetMonth = month ? parseInt(month) : now.getMonth() + 1;

    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 1);

    const released = await SingleEpisode.find({
      releaseDate: { $gte: startDate, $lt: endDate }
    })
      .populate('episodeId', 'title coverImage currentEpisodes totalEpisodes status')
      .sort({ releaseDate: 1 });

    const scheduled = await SingleEpisode.find({
      scheduledDate: { $gte: startDate, $lt: endDate },
      isScheduled: true
    })
      .populate('episodeId', 'title coverImage currentEpisodes totalEpisodes status')
      .sort({ scheduledDate: 1 });

    const calendar = {};

    released.forEach(se => {
      if (!se.episodeId) return;
      const dateKey = new Date(se.releaseDate).toISOString().split('T')[0];
      if (!calendar[dateKey]) calendar[dateKey] = { released: [], scheduled: [] };
      calendar[dateKey].released.push({
        _id: se.episodeId._id,
        title: se.episodeId.title,
        coverImage: se.episodeId.coverImage,
        episodeNumber: se.episodeNumber,
        singleTitle: se.title,
        currentEpisodes: se.episodeId.currentEpisodes,
        totalEpisodes: se.episodeId.totalEpisodes,
        status: se.episodeId.status
      });
    });

    scheduled.forEach(se => {
      if (!se.episodeId) return;
      const dateKey = new Date(se.scheduledDate).toISOString().split('T')[0];
      if (!calendar[dateKey]) calendar[dateKey] = { released: [], scheduled: [] };
      calendar[dateKey].scheduled.push({
        _id: se.episodeId._id,
        title: se.episodeId.title,
        coverImage: se.episodeId.coverImage,
        episodeNumber: se.episodeNumber,
        singleTitle: se.title,
        currentEpisodes: se.episodeId.currentEpisodes,
        totalEpisodes: se.episodeId.totalEpisodes,
        status: se.episodeId.status,
        scheduledId: se._id
      });
    });

    res.json({
      year: targetYear,
      month: targetMonth,
      calendar
    });
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
