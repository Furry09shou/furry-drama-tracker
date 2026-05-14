const express = require('express');
const router = express.Router();
const Episode = require('../models/Episode');
const SingleEpisode = require('../models/SingleEpisode');
const User = require('../models/User');
const Follow = require('../models/Follow');
const Rating = require('../models/Rating');
const Report = require('../models/Report');
const History = require('../models/History');
const { adminProtect } = require('../middlewares/authFactory');
const { setCache, getCache } = require('../middlewares/cache');

const cacheMiddleware = (duration) => {
  return (req, res, next) => {
    const cacheKey = `stats_${req.originalUrl}`;
    const cached = getCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }
    const originalJson = res.json.bind(res);
    res.json = (data) => {
      setCache(cacheKey, data);
      return originalJson(data);
    };
    next();
  };
};

router.get('/overview', adminProtect, cacheMiddleware(300), async (req, res) => {
  try {
    const period = req.query.period || '7d';
    const days = period === '30d' ? 30 : 7;
    const periodAgo = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const totalEpisodes = await Episode.countDocuments({ reviewStatus: 'approved' });
    const pendingEpisodes = await Episode.countDocuments({ reviewStatus: 'pending' });
    const totalUsers = await User.countDocuments();
    const totalFollows = await Follow.countDocuments();
    const totalRatings = await Rating.countDocuments();
    const pendingReports = await Report.countDocuments({ status: 'pending' });

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const newUsers = await User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });
    const newEpisodes = await Episode.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });

    const totalViewsAgg = await Episode.aggregate([
      { $group: { _id: null, total: { $sum: '$views' } } }
    ]);
    const totalViews = totalViewsAgg.length > 0 ? totalViewsAgg[0].total : 0;

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

    // 活跃度趋势
    const trendDays = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      trendDays.push(date.toISOString().split('T')[0]);
    }
    const startDate = new Date(trendDays[0]);
    const activityAgg = await History.aggregate([
      { $match: { watchedAt: { $gte: startDate } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$watchedAt' } }, users: { $addToSet: '$userId' } } },
      { $project: { _id: 1, count: { $size: '$users' } } },
      { $sort: { _id: 1 } }
    ]);
    const activityTrend = trendDays.map(dateStr => {
      const found = activityAgg.find(a => a._id === dateStr);
      return { date: dateStr, activeUsers: found ? found.count : 0 };
    });

    const last30DaysActive = await History.distinct('userId', { watchedAt: { $gte: thirtyDaysAgo } });
    const activeUsers = last30DaysActive.length;

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const last7DaysActive = await History.distinct('userId', { watchedAt: { $gte: sevenDaysAgo } });
    const activeUsers7d = last7DaysActive.length;

    const ratingDistribution = await Rating.aggregate([
      { $group: { _id: '$score', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    const sevenDaysAgoDate = new Date();
    sevenDaysAgoDate.setHours(0, 0, 0, 0);
    sevenDaysAgoDate.setDate(sevenDaysAgoDate.getDate() - 6);
    const dauAgg = await History.aggregate([
      { $match: { watchedAt: { $gte: sevenDaysAgoDate } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$watchedAt' } }, users: { $addToSet: '$userId' } } },
      { $project: { _id: 1, count: { $size: '$users' } } },
      { $sort: { _id: 1 } }
    ]);
    const dailyActiveUsers = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      const found = dauAgg.find(d => d._id === dateStr);
      dailyActiveUsers.push({ date: dateStr, count: found ? found.count : 0 });
    }

    const episodeStatusDist = await Episode.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // 热门剧集排行（按浏览量/追番数/评分）
    const topEpisodesByViews = await Episode.find({ reviewStatus: 'approved' })
      .sort({ views: -1 }).limit(8).select('title views');
    const topEpisodesByFollows = await Follow.aggregate([
      { $group: { _id: '$episodeId', followCount: { $sum: 1 } } },
      { $sort: { followCount: -1 } },
      { $limit: 8 }
    ]);
    const followEpIds = topEpisodesByFollows.map(f => f._id);
    const followEps = await Episode.find({ _id: { $in: followEpIds } }).select('title');
    const topEpisodesByFollowsResult = topEpisodesByFollows.map(f => {
      const ep = followEps.find(e => e._id.toString() === f._id.toString());
      return { title: ep ? ep.title : 'Unknown', followCount: f.followCount };
    });
    const topEpisodesByRating = await Episode.find({ reviewStatus: 'approved', ratingCount: { $gt: 0 } })
      .sort({ averageRating: -1 }).limit(8).select('title averageRating');

    // 用户留存率
    const retention = [];
    const cohortUsers = await User.find({ createdAt: { $gte: thirtyDaysAgo } }).select('_id createdAt');
    for (let d = 1; d <= 7; d++) {
      const targetDate = new Date(Date.now() - (7 - d) * 24 * 60 * 60 * 1000);
      const activeOnDay = await History.distinct('userId', { watchedAt: { $gte: targetDate, $lt: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000) } });
      const rate = cohortUsers.length > 0 ? Math.round((activeOnDay.length / totalUsers) * 100) : 0;
      retention.push({ day: `第${d}天`, rate: Math.min(rate, 100) });
    }

    // 用户注册趋势
    const userTrendAgg = await User.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    const userTrend = trendDays.map(dateStr => {
      const found = userTrendAgg.find(u => u._id === dateStr);
      return { date: dateStr, count: found ? found.count : 0 };
    });

    res.json({
      totalEpisodes, pendingEpisodes, totalUsers, totalFollows,
      totalRatings, pendingReports, newUsers, newEpisodes, totalViews,
      topRated, mostViewed, mostFollowed: mostFollowedResult,
      userTrend,
      activeUsers,
      activeUsers7d,
      activeUsers30d: activeUsers,
      ratingDistribution,
      dailyActiveUsers,
      episodeStatusDist,
      activityTrend,
      topEpisodesByViews,
      topEpisodesByFollows: topEpisodesByFollowsResult,
      topEpisodesByRating,
      retention
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/calendar', cacheMiddleware(300), async (req, res) => {
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

    const premieres = await Episode.find({
      status: 'upcoming',
      premiereDate: { $gte: startDate, $lt: endDate }
    }).sort({ premiereDate: 1 });

    const upcomingSingles = await SingleEpisode.find({
      isUpcoming: true,
      premiereDate: { $gte: startDate, $lt: endDate }
    })
      .populate('episodeId', 'title coverImage currentEpisodes totalEpisodes status')
      .sort({ premiereDate: 1 });

    const calendar = {};

    released.forEach(se => {
      if (!se.episodeId) return;
      const dateKey = new Date(se.releaseDate).toISOString().split('T')[0];
      if (!calendar[dateKey]) calendar[dateKey] = { released: [], scheduled: [], premieres: [] };
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
      if (!calendar[dateKey]) calendar[dateKey] = { released: [], scheduled: [], premieres: [] };
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

    premieres.forEach(ep => {
      const dateKey = new Date(ep.premiereDate).toISOString().split('T')[0];
      if (!calendar[dateKey]) calendar[dateKey] = { released: [], scheduled: [], premieres: [] };
      calendar[dateKey].premieres.push({
        _id: ep._id,
        title: ep.title,
        coverImage: ep.coverImage,
        totalEpisodes: ep.totalEpisodes,
        status: ep.status
      });
    });

    upcomingSingles.forEach(se => {
      if (!se.episodeId) return;
      const dateKey = new Date(se.premiereDate).toISOString().split('T')[0];
      if (!calendar[dateKey]) calendar[dateKey] = { released: [], scheduled: [], premieres: [] };
      calendar[dateKey].premieres.push({
        _id: se.episodeId._id,
        title: se.episodeId.title,
        coverImage: se.episodeId.coverImage,
        episodeNumber: se.episodeNumber,
        singleTitle: se.title,
        totalEpisodes: se.episodeId.totalEpisodes,
        status: se.episodeId.status,
        isSinglePremiere: true
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

router.get('/recommendations/:episodeId', cacheMiddleware(300), async (req, res) => {
  try {
    const episode = await Episode.findById(req.params.episodeId);
    if (!episode) {
      return res.status(404).json({ message: 'Episode not found' });
    }

    // 获取所有已审核通过的剧集（排除自身）
    const allEpisodes = await Episode.find({
      _id: { $ne: req.params.episodeId },
      reviewStatus: 'approved'
    }).select('title coverImage currentEpisodes totalEpisodes status averageRating views category tags');

    // 获取最大浏览量用于归一化
    const maxViews = Math.max(...allEpisodes.map(e => e.views || 0), 1);

    // 计算综合评分
    const scored = allEpisodes.map(ep => {
      // 基于标签的相似度：匹配共同标签数量
      let tagScore = 0;
      if (episode.tags && episode.tags.length > 0 && ep.tags && ep.tags.length > 0) {
        const episodeTags = new Set(episode.tags);
        tagScore = ep.tags.filter(t => episodeTags.has(t)).length;
      }

      // 基于分类的协同过滤：同分类下评分最高
      let categoryScore = 0;
      if (episode.category && episode.category.length > 0 && ep.category && ep.category.length > 0) {
        const episodeCats = new Set(episode.category);
        const commonCats = ep.category.filter(c => episodeCats.has(c));
        categoryScore = commonCats.length > 0 ? (ep.averageRating || 0) : 0;
      }

      // 浏览量归一化
      const viewsScore = (ep.views || 0) / maxViews;

      // 综合排序：标签匹配度 * 0.4 + 分类匹配度 * 0.3 + 浏览量归一化 * 0.3
      const totalScore = tagScore * 0.4 + categoryScore * 0.3 + viewsScore * 0.3;

      return { ...ep.toObject(), _score: totalScore };
    });

    // 按综合评分排序
    scored.sort((a, b) => b._score - a._score);

    // 返回前8个
    const results = scored.slice(0, 8).map(({ _score, ...rest }) => rest);
    res.json(results);
  } catch (error) {
    console.error('Recommendations error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
