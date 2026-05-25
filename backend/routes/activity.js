const express = require('express');
const router = express.Router();
const Follow = require('../models/Follow');
const Episode = require('../models/Episode');
const SingleEpisode = require('../models/SingleEpisode');
const Rating = require('../models/Rating');
const { protect } = require('../middlewares/authFactory');

router.get('/', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const follows = await Follow.find({ userId: req.user._id }).select('episodeId');
    const followedIds = follows.map(f => f.episodeId);

    if (followedIds.length === 0) {
      return res.json({ activities: [], page: pageNum, limit: limitNum, total: 0, totalPages: 0 });
    }

    const activities = [];

    const newEpisodes = await SingleEpisode.find({
      episodeId: { $in: followedIds },
      releaseDate: { $gte: thirtyDaysAgo }
    }).sort({ releaseDate: -1 });

    const episodeIdsFromNew = [...new Set(newEpisodes.map(se => se.episodeId.toString()))];
    const allEpisodeIds = [...new Set([...followedIds.map(id => id.toString()), ...episodeIdsFromNew])];
    const episodeMap = {};
    const episodes = await Episode.find({ _id: { $in: allEpisodeIds } });
    episodes.forEach(ep => { episodeMap[ep._id.toString()] = ep; });

    for (const se of newEpisodes) {
      const ep = episodeMap[se.episodeId.toString()];
      if (!ep) continue;
      activities.push({
        type: 'new_episode',
        episodeId: ep._id,
        episodeTitle: ep.title,
        episodeTitleEn: ep.titleEn || ep.title,
        coverImage: ep.coverImage,
        description: `${ep.title} 发布了新单集：第${se.episodeNumber}集 ${se.title}`,
        descriptionEn: `${ep.titleEn || ep.title} released a new episode: Ep.${se.episodeNumber} ${se.titleEn || se.title}`,
        date: se.releaseDate,
        metadata: { episodeNumber: se.episodeNumber, singleEpisodeTitle: se.title, singleEpisodeTitleEn: se.titleEn || se.title }
      });
    }

    const recentlyUpdatedEpisodes = await Episode.find({
      _id: { $in: followedIds },
      updatedAt: { $gte: thirtyDaysAgo }
    }).sort({ updatedAt: -1 });

    for (const ep of recentlyUpdatedEpisodes) {
      activities.push({
        type: 'status_change',
        episodeId: ep._id,
        episodeTitle: ep.title,
        episodeTitleEn: ep.titleEn || ep.title,
        coverImage: ep.coverImage,
        description: `${ep.title} 状态变更为：${ep.status === 'ongoing' ? '连载中' : ep.status === 'completed' ? '已完结' : '即将上映'}`,
        descriptionEn: `${ep.titleEn || ep.title} status changed to: ${ep.status}`,
        date: ep.updatedAt,
        metadata: { status: ep.status }
      });
    }

    const highRatings = await Rating.find({
      episodeId: { $in: followedIds },
      score: { $gte: 4 },
      createdAt: { $gte: thirtyDaysAgo }
    }).sort({ createdAt: -1 }).limit(50);

    for (const rating of highRatings) {
      const ep = episodeMap[rating.episodeId.toString()];
      if (!ep) continue;
      activities.push({
        type: 'new_rating',
        episodeId: ep._id,
        episodeTitle: ep.title,
        episodeTitleEn: ep.titleEn || ep.title,
        coverImage: ep.coverImage,
        description: `${ep.title} 获得了高评分：${rating.score}分`,
        descriptionEn: `${ep.titleEn || ep.title} received a high rating: ${rating.score}/5`,
        date: rating.createdAt,
        metadata: { score: rating.score, averageRating: ep.averageRating }
      });
    }

    activities.sort((a, b) => new Date(b.date) - new Date(a.date));

    const total = activities.length;
    const totalPages = Math.ceil(total / limitNum);
    const paged = activities.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    res.json({ activities: paged, page: pageNum, limit: limitNum, total, totalPages });
  } catch (error) {
    console.error('Activity feed error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/public', async (req, res) => {
  try {
    const limitNum = 20;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const activities = [];

    const newEpisodes = await SingleEpisode.find({
      releaseDate: { $gte: thirtyDaysAgo }
    }).sort({ releaseDate: -1 }).limit(30);

    const episodeIdsFromNew = [...new Set(newEpisodes.map(se => se.episodeId.toString()))];
    const episodeMap = {};
    const episodes = await Episode.find({
      _id: { $in: episodeIdsFromNew },
      reviewStatus: 'approved'
    });
    episodes.forEach(ep => { episodeMap[ep._id.toString()] = ep; });

    for (const se of newEpisodes) {
      const ep = episodeMap[se.episodeId.toString()];
      if (!ep) continue;
      activities.push({
        type: 'new_episode',
        episodeId: ep._id,
        episodeTitle: ep.title,
        episodeTitleEn: ep.titleEn || ep.title,
        coverImage: ep.coverImage,
        description: `${ep.title} 发布了新单集：第${se.episodeNumber}集 ${se.title}`,
        descriptionEn: `${ep.titleEn || ep.title} released a new episode: Ep.${se.episodeNumber} ${se.titleEn || se.title}`,
        date: se.releaseDate,
        metadata: { episodeNumber: se.episodeNumber, singleEpisodeTitle: se.title, singleEpisodeTitleEn: se.titleEn || se.title }
      });
    }

    const trendingEpisodes = await Episode.find({
      reviewStatus: 'approved',
      averageRating: { $gte: 4 },
      ratingCount: { $gte: 1 }
    }).sort({ averageRating: -1, ratingCount: -1 }).limit(10);

    for (const ep of trendingEpisodes) {
      activities.push({
        type: 'new_rating',
        episodeId: ep._id,
        episodeTitle: ep.title,
        episodeTitleEn: ep.titleEn || ep.title,
        coverImage: ep.coverImage,
        description: `${ep.title} 获得了高评分：${ep.averageRating}分（${ep.ratingCount}人评分）`,
        descriptionEn: `${ep.titleEn || ep.title} received a high rating: ${ep.averageRating}/5 (${ep.ratingCount} ratings)`,
        date: ep.updatedAt,
        metadata: { score: ep.averageRating, ratingCount: ep.ratingCount }
      });
    }

    const statusChangedEpisodes = await Episode.find({
      reviewStatus: 'approved',
      updatedAt: { $gte: thirtyDaysAgo }
    }).sort({ updatedAt: -1 }).limit(10);

    for (const ep of statusChangedEpisodes) {
      activities.push({
        type: 'status_change',
        episodeId: ep._id,
        episodeTitle: ep.title,
        episodeTitleEn: ep.titleEn || ep.title,
        coverImage: ep.coverImage,
        description: `${ep.title} 状态变更为：${ep.status === 'ongoing' ? '连载中' : ep.status === 'completed' ? '已完结' : '即将上映'}`,
        descriptionEn: `${ep.titleEn || ep.title} status changed to: ${ep.status}`,
        date: ep.updatedAt,
        metadata: { status: ep.status }
      });
    }

    activities.sort((a, b) => new Date(b.date) - new Date(a.date));
    const paged = activities.slice(0, limitNum);

    res.json({ activities: paged, total: Math.min(activities.length, limitNum) });
  } catch (error) {
    console.error('Public activity feed error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
