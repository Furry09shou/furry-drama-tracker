const express = require('express');
const router = express.Router();
const Episode = require('../models/Episode');
const SingleEpisode = require('../models/SingleEpisode');
const User = require('../models/User');
const Follow = require('../models/Follow');
const Rating = require('../models/Rating');
const Report = require('../models/Report');
const History = require('../models/History');
const UserSession = require('../models/UserSession');
const { adminProtect, protect } = require('../middlewares/authFactory');
const { setCache, getCache } = require('../middlewares/cache');
const { asyncHandler } = require('../utils/errorHandler');

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
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalEpisodes, pendingEpisodes, totalUsers, totalFollows,
      totalRatings, pendingReports, newUsers, newEpisodes,
      totalViewsAgg, ratingDistribution, episodeStatusDist
    ] = await Promise.all([
      Episode.countDocuments({ reviewStatus: 'approved' }),
      Episode.countDocuments({ reviewStatus: 'pending' }),
      User.countDocuments(),
      Follow.countDocuments(),
      Rating.countDocuments(),
      Report.countDocuments({ status: 'pending' }),
      User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      Episode.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      Episode.aggregate([
        { $group: { _id: null, total: { $sum: '$views' } } }
      ]),
      Rating.aggregate([
        { $group: { _id: '$score', count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
      Episode.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ])
    ]);
    const totalViews = totalViewsAgg.length > 0 ? totalViewsAgg[0].total : 0;

    const [topRated, mostViewed, mostFollowed] = await Promise.all([
      Episode.find({ reviewStatus: 'approved', ratingCount: { $gt: 0 } })
        .sort({ averageRating: -1, ratingCount: -1 })
        .limit(5)
        .select('title averageRating ratingCount views'),
      Episode.find({ reviewStatus: 'approved' })
        .sort({ views: -1 })
        .limit(5)
        .select('title views'),
      Follow.aggregate([
        { $group: { _id: '$episodeId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ])
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
    const retentionAgg = await History.aggregate([
      { $match: { lastWatched: { $gte: sevenDaysAgo } } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$lastWatched' } },
        users: { $addToSet: '$userId' }
      }},
      { $project: { _id: 1, count: { $size: '$users' } } }
    ]);
    const retentionMap = {};
    retentionAgg.forEach(r => { retentionMap[r._id] = r.count; });
    const retention = [];
    for (let d = 1; d <= 7; d++) {
      const targetDate = new Date(Date.now() - (7 - d) * 24 * 60 * 60 * 1000);
      const dateStr = targetDate.toISOString().split('T')[0];
      const count = retentionMap[dateStr] || 0;
      const rate = totalUsers > 0 ? Math.round((count / totalUsers) * 100) : 0;
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
    // month=0 或未传时表示查询整个年份
    const targetMonth = month !== undefined && month !== '' ? parseInt(month) : 0;
    const isFullYear = targetMonth === 0;

    const startDate = isFullYear ? new Date(targetYear, 0, 1) : new Date(targetYear, targetMonth - 1, 1);
    const endDate = isFullYear ? new Date(targetYear + 1, 0, 1) : new Date(targetYear, targetMonth, 1);

    const released = await SingleEpisode.find({
      releaseDate: { $gte: startDate, $lt: endDate }
    })
      .populate('episodeId', 'title titleEn coverImage currentEpisodes totalEpisodes status')
      .sort({ releaseDate: 1 });

    const scheduled = await SingleEpisode.find({
      scheduledDate: { $gte: startDate, $lt: endDate },
      isScheduled: true
    })
      .populate('episodeId', 'title titleEn coverImage currentEpisodes totalEpisodes status')
      .sort({ scheduledDate: 1 });

    const premieres = await Episode.find({
      status: 'upcoming',
      premiereDate: { $gte: startDate, $lt: endDate }
    }).sort({ premiereDate: 1 });

    const upcomingSingles = await SingleEpisode.find({
      isUpcoming: true,
      premiereDate: { $gte: startDate, $lt: endDate }
    })
      .populate('episodeId', 'title titleEn coverImage currentEpisodes totalEpisodes status')
      .sort({ premiereDate: 1 });

    const calendar = {};

    released.forEach(se => {
      if (!se.episodeId) return;
      const dateKey = new Date(se.releaseDate).toISOString().split('T')[0];
      if (!calendar[dateKey]) calendar[dateKey] = { released: [], scheduled: [], premieres: [] };
      calendar[dateKey].released.push({
        _id: se.episodeId._id,
        title: se.episodeId.title,
        titleEn: se.episodeId.titleEn || '',
        coverImage: se.episodeId.coverImage,
        episodeNumber: se.episodeNumber,
        singleTitle: se.title,
        singleTitleEn: se.titleEn || '',
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
        titleEn: se.episodeId.titleEn || '',
        coverImage: se.episodeId.coverImage,
        episodeNumber: se.episodeNumber,
        singleTitle: se.title,
        singleTitleEn: se.titleEn || '',
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
        titleEn: ep.titleEn || '',
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
        titleEn: se.episodeId.titleEn || '',
        coverImage: se.episodeId.coverImage,
        episodeNumber: se.episodeNumber,
        singleTitle: se.title,
        singleTitleEn: se.titleEn || '',
        totalEpisodes: se.episodeId.totalEpisodes,
        status: se.episodeId.status,
        isSinglePremiere: true
      });
    });

    res.json({
      year: targetYear,
      month: isFullYear ? 0 : targetMonth,
      calendar
    });
  } catch (error) {
    console.error('Calendar error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/recommendations/collaborative', protect, async (req, res) => {
  try {
    const userId = req.user._id;

    const myHighRatings = await Rating.find({ userId, score: { $gte: 4 } }).select('episodeId');
    const myHighRatedIds = myHighRatings.map(r => r.episodeId);

    if (myHighRatedIds.length === 0) {
      return res.json([]);
    }

    const similarUserRatings = await Rating.find({
      episodeId: { $in: myHighRatedIds },
      score: { $gte: 4 },
      userId: { $ne: userId }
    }).select('userId episodeId');

    const similarUserIds = [...new Set(similarUserRatings.map(r => r.userId.toString()))];

    if (similarUserIds.length === 0) {
      return res.json([]);
    }

    const myAllRatings = await Rating.find({ userId }).select('episodeId');
    const myRatedIds = new Set(myAllRatings.map(r => r.episodeId.toString()));

    const myFollows = await Follow.find({ userId }).select('episodeId');
    const myFollowedIds = new Set(myFollows.map(f => f.episodeId.toString()));

    const candidateRatings = await Rating.find({
      userId: { $in: similarUserIds },
      score: { $gte: 4 },
      episodeId: { $nin: [...myRatedIds, ...myFollowedIds] }
    }).select('episodeId userId score');

    const episodeMap = {};
    for (const r of candidateRatings) {
      const eid = r.episodeId.toString();
      if (!episodeMap[eid]) {
        episodeMap[eid] = { matchScore: 0, totalScore: 0, count: 0 };
      }
      episodeMap[eid].matchScore += 1;
      episodeMap[eid].totalScore += r.score;
      episodeMap[eid].count += 1;
    }

    const sortedEpisodes = Object.entries(episodeMap)
      .map(([episodeId, data]) => ({
        episodeId,
        matchScore: data.matchScore,
        avgRating: data.totalScore / data.count
      }))
      .sort((a, b) => b.matchScore - a.matchScore || b.avgRating - a.avgRating)
      .slice(0, 10);

    if (sortedEpisodes.length === 0) {
      return res.json([]);
    }

    const episodeIds = sortedEpisodes.map(e => e.episodeId);
    const episodes = await Episode.find({
      _id: { $in: episodeIds },
      reviewStatus: 'approved'
    }).select('title titleEn coverImage totalEpisodes currentEpisodes averageRating ratingCount');

    const results = sortedEpisodes.map(se => {
      const ep = episodes.find(e => e._id.toString() === se.episodeId);
      if (!ep) return null;
      return {
        _id: ep._id,
        title: ep.title,
        titleEn: ep.titleEn,
        coverImage: ep.coverImage,
        totalEpisodes: ep.totalEpisodes,
        currentEpisodes: ep.currentEpisodes,
        averageRating: ep.averageRating,
        ratingCount: ep.ratingCount,
        matchScore: se.matchScore
      };
    }).filter(Boolean);

    res.json(results);
  } catch (error) {
    console.error('Collaborative recommendations error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/recommendations/personalized', protect, async (req, res) => {
  try {
    const userId = req.user._id;

    const [myFollows, myRatings] = await Promise.all([
      Follow.find({ userId }).select('episodeId'),
      Rating.find({ userId }).select('episodeId score')
    ]);

    const myFollowedIds = myFollows.map(f => f.episodeId);
    const myRatedIds = myRatings.map(r => r.episodeId);
    const excludeIds = [...new Set([...myFollowedIds, ...myRatedIds.map(id => id.toString())])];

    const interactedIds = [...myFollowedIds, ...myRatedIds];
    const interactedEpisodes = interactedIds.length > 0
      ? await Episode.find({ _id: { $in: interactedIds } }).select('tags category title')
      : [];

    const userTags = new Set();
    const userCategories = new Set();
    const followedTitles = [];

    for (const ep of interactedEpisodes) {
      if (ep.tags) ep.tags.forEach(t => userTags.add(t));
      if (ep.category) ep.category.forEach(c => userCategories.add(c));
      followedTitles.push(ep.title);
    }

    const tagBasedEpisodes = userTags.size > 0
      ? await Episode.find({
          tags: { $in: [...userTags] },
          _id: { $nin: excludeIds },
          reviewStatus: 'approved'
        }).select('title titleEn coverImage totalEpisodes currentEpisodes averageRating ratingCount views tags category')
      : [];

    const categoryBasedEpisodes = userCategories.size > 0
      ? await Episode.find({
          category: { $in: [...userCategories] },
          _id: { $nin: excludeIds },
          reviewStatus: 'approved'
        }).select('title titleEn coverImage totalEpisodes currentEpisodes averageRating ratingCount views tags category')
      : [];

    const popularEpisodes = await Episode.find({
      _id: { $nin: excludeIds },
      reviewStatus: 'approved',
      ratingCount: { $gt: 0 }
    }).sort({ averageRating: -1, views: -1 }).limit(20)
      .select('title titleEn coverImage totalEpisodes currentEpisodes averageRating ratingCount views tags category');

    const candidateMap = new Map();

    for (const ep of tagBasedEpisodes) {
      const id = ep._id.toString();
      if (!candidateMap.has(id)) {
        candidateMap.set(id, { ep, score: 0, reasons: [] });
      }
      const entry = candidateMap.get(id);
      const commonTags = ep.tags.filter(t => userTags.has(t));
      entry.score += commonTags.length * 2;
      if (commonTags.length > 0) {
        entry.reasons.push('tag');
      }
    }

    for (const ep of categoryBasedEpisodes) {
      const id = ep._id.toString();
      if (!candidateMap.has(id)) {
        candidateMap.set(id, { ep, score: 0, reasons: [] });
      }
      const entry = candidateMap.get(id);
      const commonCats = ep.category.filter(c => userCategories.has(c));
      entry.score += commonCats.length;
      if (commonCats.length > 0 && !entry.reasons.includes('category')) {
        entry.reasons.push('category');
      }
    }

    for (const ep of popularEpisodes) {
      const id = ep._id.toString();
      if (!candidateMap.has(id)) {
        candidateMap.set(id, { ep, score: 0, reasons: [] });
      }
      const entry = candidateMap.get(id);
      entry.score += (ep.averageRating || 0) * 0.5 + (ep.views || 0) * 0.001;
      if (!entry.reasons.includes('popular')) {
        entry.reasons.push('popular');
      }
    }

    const sorted = [...candidateMap.values()]
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);

    const results = sorted.map(({ ep, reasons }) => {
      let reason = '';
      const firstFollowed = interactedEpisodes[0];

      if (reasons.includes('tag') && firstFollowed) {
        reason = 'becauseYouFollow';
      } else if (reasons.includes('category')) {
        reason = 'popularInCategory';
      } else if (reasons.includes('popular')) {
        reason = 'similarUsersLiked';
      }

      return {
        _id: ep._id,
        title: ep.title,
        titleEn: ep.titleEn,
        coverImage: ep.coverImage,
        totalEpisodes: ep.totalEpisodes,
        currentEpisodes: ep.currentEpisodes,
        averageRating: ep.averageRating,
        ratingCount: ep.ratingCount,
        reason,
        reasonName: firstFollowed ? firstFollowed.title : ''
      };
    });

    res.json(results);
  } catch (error) {
    console.error('Personalized recommendations error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/recommendations/:episodeId', cacheMiddleware(300), async (req, res) => {
  try {
    const episode = await Episode.findById(req.params.episodeId);
    if (!episode) {
      return res.status(404).json({ message: 'Episode not found' });
    }

    const total = await Episode.countDocuments({
      _id: { $ne: req.params.episodeId },
      reviewStatus: 'approved'
    });
    const skip = total > 200 ? Math.floor(Math.random() * Math.max(1, total - 200)) : 0;
    const allEpisodes = await Episode.find({
      _id: { $ne: req.params.episodeId },
      reviewStatus: 'approved'
    }).select('title coverImage currentEpisodes totalEpisodes status averageRating views category tags').skip(skip).limit(200);

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

router.get('/activity-heatmap', adminProtect, cacheMiddleware(300), async (req, res) => {
  try {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 364);
    startDate.setHours(0, 0, 0, 0);

    const [followAgg, ratingAgg, episodeAgg] = await Promise.all([
      Follow.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } }
      ]),
      Rating.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } }
      ]),
      Episode.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } }
      ])
    ]);

    const dateMap = {};
    for (let i = 0; i < 365; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split('T')[0];
      dateMap[key] = 0;
    }
    followAgg.forEach(a => { if (dateMap[a._id] !== undefined) dateMap[a._id] += a.count; });
    ratingAgg.forEach(a => { if (dateMap[a._id] !== undefined) dateMap[a._id] += a.count; });
    episodeAgg.forEach(a => { if (dateMap[a._id] !== undefined) dateMap[a._id] += a.count; });

    const result = Object.entries(dateMap).map(([date, count]) => ({ date, count }));
    res.json(result);
  } catch (error) {
    console.error('Heatmap error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/episode-lifecycle', adminProtect, cacheMiddleware(300), async (req, res) => {
  try {
    const topEpisodes = await Episode.find({ reviewStatus: 'approved' })
      .sort({ views: -1 })
      .limit(20)
      .select('title views createdAt');

    const result = topEpisodes.map(ep => {
      const now = new Date();
      const created = new Date(ep.createdAt);
      const totalWeeks = Math.max(1, Math.ceil((now - created) / (7 * 24 * 60 * 60 * 1000)));
      const weeks = [];
      for (let w = 1; w <= totalWeeks; w++) {
        weeks.push({ week: w, views: Math.round(ep.views * (w / totalWeeks)) });
      }
      return {
        episodeId: ep._id,
        title: ep.title,
        weeks
      };
    });

    res.json(result);
  } catch (error) {
    console.error('Lifecycle error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/realtime', adminProtect, async (req, res) => {
  try {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [onlineUsers, todayVisits, todayNewUsers, todayNewEpisodes] = await Promise.all([
      UserSession.countDocuments({ isActive: true, lastActiveAt: { $gte: fiveMinAgo } }),
      UserSession.countDocuments({ isActive: true, lastActiveAt: { $gte: todayStart } }),
      User.countDocuments({ createdAt: { $gte: todayStart } }),
      Episode.countDocuments({ createdAt: { $gte: todayStart } })
    ]);

    res.json({ onlineUsers, todayVisits, todayNewUsers, todayNewEpisodes });
  } catch (error) {
    console.error('Realtime error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
