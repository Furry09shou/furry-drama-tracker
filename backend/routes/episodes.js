const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const Episode = require('../models/Episode');
const EpisodeVersion = require('../models/EpisodeVersion');
const SingleEpisode = require('../models/SingleEpisode');
const Follow = require('../models/Follow');
const Notification = require('../models/Notification');
const { sendPushToUser } = require('./notifications');
const { protect, adminProtect, creatorProtect } = require('../middlewares/authFactory');
const { setCache, getCache, clearCache, clearCacheByPrefix } = require('../middlewares/cache');
const { escapeRegex } = require('../utils/helpers');
const { createUploadConfig } = require('../utils/upload');

const upload = createUploadConfig('cover', 5 * 1024 * 1024);

const viewTracker = new Map();
const VIEW_COOLDOWN = 10 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of viewTracker) {
    if (now - timestamp > VIEW_COOLDOWN) {
      viewTracker.delete(key);
    }
  }
  // 防止内存无限增长
  if (viewTracker.size > 10000) {
    const entries = [...viewTracker.entries()].sort((a, b) => a[1] - b[1]);
    const toDelete = entries.slice(0, viewTracker.size - 5000);
    toDelete.forEach(([key]) => viewTracker.delete(key));
  }
}, 5 * 60 * 1000);

router.post('/upload', creatorProtect, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '请选择要上传的图片' });
    }
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ url: imageUrl });
  } catch (error) {
    res.status(500).json({ message: '文件上传失败' });
  }
});

router.use((err, req, res, next) => {
  if (err instanceof require('multer').MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: '文件大小不能超过5MB' });
    }
    return res.status(400).json({ message: '文件上传错误' });
  }
  if (err) {
    return res.status(400).json({ message: err.message || '文件上传失败' });
  }
  next();
});

router.get('/', async (req, res) => {
  try {
    const { category, sort, status, tag, search, minRating, year, order, page, limit } = req.query;
    const usePagination = page && limit;
    const pageNum = usePagination ? parseInt(page) : 1;
    const limitNum = usePagination ? parseInt(limit) : 100;
    const cacheKey = `episodes_${category || 'all'}_${sort || 'latest'}_${order || 'desc'}_${status || ''}_${tag || ''}_${search || ''}_${minRating || ''}_${year || ''}_${pageNum}_${limitNum}`;

    const cachedEpisodes = getCache(cacheKey);
    if (cachedEpisodes) {
      return res.json(cachedEpisodes);
    }

    let baseQuery = { $or: [{ reviewStatus: 'approved' }, { reviewStatus: { $exists: false } }] };

    if (category) {
      baseQuery.category = { $in: [category] };
    }
    if (status) {
      baseQuery.status = status;
    }
    if (tag) {
      baseQuery.tags = { $in: [tag] };
    }
    if (minRating) {
      baseQuery.averageRating = { $gte: parseFloat(minRating) };
    }

    let query = { ...baseQuery };

    if (search) {
      const escapedSearch = escapeRegex(search);
      const searchCondition = {
        $or: [
          { title: { $regex: escapedSearch, $options: 'i' } },
          { description: { $regex: escapedSearch, $options: 'i' } }
        ]
      };
      query = { $and: [baseQuery, searchCondition] };
    }

    if (year) {
      let yearCondition;
      if (year === 'recent5') {
        const currentYear = new Date().getFullYear();
        const start = new Date(currentYear - 4, 0, 1);
        const end = new Date(currentYear + 1, 0, 1);
        yearCondition = {
          $or: [
            { premiereDate: { $gte: start, $lt: end } },
            { createdAt: { $gte: start, $lt: end } }
          ]
        };
      } else {
        const yearNum = parseInt(year);
        if (!isNaN(yearNum)) {
          const start = new Date(yearNum, 0, 1);
          const end = new Date(yearNum + 1, 0, 1);
          yearCondition = {
            $or: [
              { premiereDate: { $gte: start, $lt: end } },
              { createdAt: { $gte: start, $lt: end } }
            ]
          };
        }
      }
      if (yearCondition) {
        if (query.$and) {
          query.$and.push(yearCondition);
        } else {
          query = { $and: [baseQuery, yearCondition] };
        }
      }
    }

    const sortOrder = order === 'asc' ? 1 : -1;
    let sortOption = { updatedAt: sortOrder };
    if (sort === 'views') {
      sortOption = { views: sortOrder };
    } else if (sort === 'premiere') {
      sortOption = { premiereDate: sortOrder };
    } else if (sort === 'rating') {
      sortOption = { averageRating: sortOrder, ratingCount: sortOrder };
    }

    const total = await Episode.countDocuments(query);
    let episodesQuery = Episode.find(query).sort(sortOption)
      .populate('createdBy', 'accountId username')
      .populate('allowedEditors', 'accountId username');

    if (usePagination) {
      const totalPages = Math.ceil(total / limitNum);
      episodesQuery = episodesQuery.skip((pageNum - 1) * limitNum).limit(limitNum);
      const episodes = await episodesQuery;
      const result = { episodes, page: pageNum, limit: limitNum, total, totalPages };
      setCache(cacheKey, result);
      res.json(result);
    } else {
      episodesQuery = episodesQuery.limit(limitNum);
      const episodes = await episodesQuery;
      const result = { episodes, total };
      setCache(cacheKey, result);
      res.json(result);
    }
  } catch (error) {
    console.error('Get episodes error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/search-suggestions', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 1) {
      return res.json({ titles: [], tags: [] });
    }
    const escapedSearch = escapeRegex(q.trim());
    const episodes = await Episode.find({
      $and: [
        { $or: [{ reviewStatus: 'approved' }, { reviewStatus: { $exists: false } }] },
        {
          $or: [
            { title: { $regex: escapedSearch, $options: 'i' } },
            { titleEn: { $regex: escapedSearch, $options: 'i' } }
          ]
        }
      ]
    }).sort({ views: -1 }).limit(5).select('title titleEn');

    const titles = episodes.map(ep => ({
      title: ep.title,
      titleEn: ep.titleEn || ''
    }));

    const tagDocs = await Episode.find({
      $and: [
        { $or: [{ reviewStatus: 'approved' }, { reviewStatus: { $exists: false } }] },
        { tags: { $regex: escapedSearch, $options: 'i' } }
      ]
    }).limit(5).select('tags');

    const matchedTags = new Set();
    tagDocs.forEach(ep => {
      if (ep.tags) {
        ep.tags.forEach(tag => {
          if (new RegExp(escapedSearch, 'i').test(tag)) {
            matchedTags.add(tag);
          }
        });
      }
    });

    res.json({ titles, tags: Array.from(matchedTags).slice(0, 5) });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/popular-tags', async (req, res) => {
  try {
    const result = await Episode.aggregate([
      { $match: { $or: [{ reviewStatus: 'approved' }, { reviewStatus: { $exists: false } }] } },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 },
      { $project: { _id: 0, name: '$_id', count: 1 } }
    ]);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/search', async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;
    if (!q || !q.trim()) {
      return res.json([]);
    }
    const escapedSearch = escapeRegex(q.trim());
    const episodes = await Episode.find({
      $and: [
        { $or: [{ reviewStatus: 'approved' }, { reviewStatus: { $exists: false } }] },
        {
          $or: [
            { title: { $regex: escapedSearch, $options: 'i' } },
            { description: { $regex: escapedSearch, $options: 'i' } }
          ]
        }
      ]
    }).sort({ views: -1 }).limit(parseInt(limit)).select('title coverImage category rating averageRating');
    res.json(episodes);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:id/user-status', protect, async (req, res) => {
  try {
    const episodeId = req.params.id;
    const userId = req.user._id;
    const Follow = require('../models/Follow');
    const History = require('../models/History');
    const Rating = require('../models/Rating');
    const Favorite = require('../models/Favorite');
const { asyncHandler } = require('../utils/errorHandler');

    const [followDoc, historyDoc, ratingDoc, favoriteDoc] = await Promise.all([
      Follow.findOne({ userId, episodeId }),
      History.findOne({ userId, episodeId }),
      Rating.findOne({ userId, episodeId }),
      Favorite.findOne({ userId, episodeId })
    ]);

    res.json({
      isFollowing: !!followDoc,
      followedAtEpisodes: followDoc?.followedAtEpisodes ?? null,
      watchedEpisodes: historyDoc?.watchedEpisodes || [],
      score: ratingDoc?.score || 0,
      isFavorite: !!favoriteDoc
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const cacheKey = `episode_${req.params.id}`;

    const cachedEpisode = getCache(cacheKey);
    if (cachedEpisode) {
      return res.json(cachedEpisode);
    }

    const episode = await Episode.findById(req.params.id)
      .populate('createdBy', 'accountId username')
      .populate('allowedEditors', 'accountId username');
    if (!episode) {
      return res.status(404).json({ message: 'Episode not found' });
    }

    const singleEpisodes = await SingleEpisode.find({ episodeId: req.params.id }).sort({ episodeNumber: 1 });
    const episodeWithEpisodes = { ...episode.toObject(), episodes: singleEpisodes };

    setCache(cacheKey, episodeWithEpisodes);

    res.json(episodeWithEpisodes);
  } catch (error) {
    console.error('Get episode detail error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

const viewLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

router.put('/:id/view', viewLimiter, async (req, res) => {
  try {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.headers['x-real-ip'] || req.ip || '';
    const viewKey = `${req.params.id}_${ip}`;
    const now = Date.now();
    const lastView = viewTracker.get(viewKey);
    if (lastView && now - lastView < VIEW_COOLDOWN) {
      const episode = await Episode.findById(req.params.id);
      if (!episode) {
        return res.status(404).json({ message: 'Episode not found' });
      }
      return res.json(episode);
    }
    viewTracker.set(viewKey, now);

    const episode = await Episode.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    );

    if (!episode) {
      return res.status(404).json({ message: 'Episode not found' });
    }

    clearCache(`episode_${req.params.id}`);
    clearCacheByPrefix('episodes_');

    res.json(episode);
  } catch (error) {
    console.error('Update view error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/single/:id/view', viewLimiter, async (req, res) => {
  try {
    const singleEpisode = await SingleEpisode.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    );
    if (!singleEpisode) {
      return res.status(404).json({ message: 'Single episode not found' });
    }
    res.json(singleEpisode);
  } catch (error) {
    console.error('Update single view error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/single/:id', adminProtect, async (req, res) => {
  try {
    const updateData = {};
    if (req.body.episodeNumber !== undefined) updateData.episodeNumber = req.body.episodeNumber;
    if (req.body.title !== undefined) updateData.title = req.body.title;
    if (req.body.titleEn !== undefined) updateData.titleEn = req.body.titleEn;
    if (req.body.titleJa !== undefined) updateData.titleJa = req.body.titleJa;
    if (req.body.duration !== undefined) updateData.duration = req.body.duration;
    if (req.body.platformLinks !== undefined) updateData.platformLinks = req.body.platformLinks;
    if (req.body.scheduledDate !== undefined) updateData.scheduledDate = req.body.scheduledDate;
    if (req.body.isScheduled !== undefined) updateData.isScheduled = req.body.isScheduled;
    if (req.body.premiereDate !== undefined) updateData.premiereDate = req.body.premiereDate;
    if (req.body.isUpcoming !== undefined) updateData.isUpcoming = req.body.isUpcoming;

    const singleEpisode = await SingleEpisode.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!singleEpisode) {
      return res.status(404).json({ message: 'Single episode not found' });
    }

    clearCache(`episode_${singleEpisode.episodeId}`);

    res.json(singleEpisode);
  } catch (error) {
    console.error('Edit single episode error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/single/:id', adminProtect, async (req, res) => {
  try {
    const singleEpisode = await SingleEpisode.findByIdAndDelete(req.params.id);
    if (!singleEpisode) {
      return res.status(404).json({ message: 'Single episode not found' });
    }
    await Episode.findByIdAndUpdate(singleEpisode.episodeId, {
      $inc: { currentEpisodes: -1 }
    });
    clearCache(`episode_${singleEpisode.episodeId}`);
    res.json({ message: 'Single episode deleted' });
  } catch (error) {
    console.error('Delete single episode error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', creatorProtect, async (req, res) => {
  try {
    const isCreator = req.admin.role === 'creator';
    const episodeData = {
      title: req.body.title,
      titleEn: req.body.titleEn || '',
      titleJa: req.body.titleJa || '',
      description: req.body.description,
      descriptionEn: req.body.descriptionEn || '',
      descriptionJa: req.body.descriptionJa || '',
      coverImage: req.body.coverImage,
      totalEpisodes: req.body.totalEpisodes,
      currentEpisodes: req.body.currentEpisodes || 0,
      status: req.body.status,
      category: req.body.category || [],
      tags: req.body.tags || [],
      updateDay: req.body.updateDay || '',
      premiereDate: req.body.premiereDate || null,
      platformLinks: req.body.platformLinks || {},
      createdBy: req.admin._id,
      reviewStatus: isCreator ? 'pending' : 'approved'
    };

    const episode = await Episode.create(episodeData);
    clearCacheByPrefix('episodes_');
    res.status(201).json(episode);
  } catch (error) {
    console.error('Create episode error:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/:id/episodes', creatorProtect, async (req, res) => {
  try {
    const episode = await Episode.findById(req.params.id);
    if (!episode) {
      return res.status(404).json({ message: 'Episode not found' });
    }

    const isCreatorRole = req.admin.role === 'creator';
    if (isCreatorRole) {
      const isOwner = episode.createdBy && episode.createdBy.toString() === req.admin._id.toString();
      const isAllowed = episode.allowedEditors && episode.allowedEditors.some(e => e.toString() === req.admin._id.toString());
      if (!isOwner && !isAllowed) {
        return res.status(403).json({ message: 'No permission to add episodes' });
      }
    }

    const singleEpisodeData = {
      episodeId: req.params.id,
      episodeNumber: req.body.episodeNumber,
      title: req.body.title,
      titleEn: req.body.titleEn || '',
      titleJa: req.body.titleJa || '',
      duration: req.body.duration || '',
      platformLinks: req.body.platformLinks || {},
      scheduledDate: req.body.scheduledDate || null,
      isScheduled: req.body.isScheduled || false,
      premiereDate: req.body.premiereDate || null,
      isUpcoming: req.body.isUpcoming || false
    };

    const singleEpisode = await SingleEpisode.create(singleEpisodeData);

    await Episode.findByIdAndUpdate(req.params.id, {
      $inc: { currentEpisodes: 1 },
      updatedAt: Date.now()
    });

    clearCache(`episode_${req.params.id}`);

    const updatedEpisode = await Episode.findById(req.params.id);
    if (updatedEpisode) {
      const followers = await Follow.find({ episodeId: req.params.id });
      if (followers.length > 0) {
        const notifications = followers.map(f => ({
          userId: f.userId,
          episodeId: req.params.id,
          episodeTitle: updatedEpisode.title,
          episodeTitleEn: updatedEpisode.titleEn || '',
          type: 'new_episode',
          message: `《${updatedEpisode.title}》更新了第${req.body.episodeNumber}集`,
          metadata: { episodeNumber: req.body.episodeNumber }
        }));
        await Notification.insertMany(notifications);
        const uniqueUserIds = [...new Set(followers.map(f => String(f.userId)))];
        uniqueUserIds.forEach(uid => {
          sendPushToUser(uid, {
            title: `《${updatedEpisode.title}》更新了`,
            body: `第${req.body.episodeNumber}集已更新`,
            icon: '/vite.svg',
            data: { url: `/episode/${req.params.id}` }
          });
        });
      }
    }

    res.status(201).json(singleEpisode);
  } catch (error) {
    console.error('Create single episode error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id', creatorProtect, async (req, res) => {
  try {
    const episode = await Episode.findById(req.params.id);
    if (!episode) {
      return res.status(404).json({ message: 'Episode not found' });
    }

    const isCreatorRole = req.admin.role === 'creator';

    if (isCreatorRole) {
      const isOwner = episode.createdBy && episode.createdBy.toString() === req.admin._id.toString();
      const isAllowed = episode.allowedEditors && episode.allowedEditors.some(e => e.toString() === req.admin._id.toString());
      if (!isOwner && !isAllowed) {
        return res.status(403).json({ message: 'You do not have permission to edit this episode' });
      }
    }

    const oldCurrentEpisodes = episode.currentEpisodes;

    const lastVersion = await EpisodeVersion.findOne({ episodeId: req.params.id }).sort({ version: -1 });
    const newVersionNum = (lastVersion ? lastVersion.version : 0) + 1;
    await EpisodeVersion.create({
      episodeId: req.params.id,
      version: newVersionNum,
      data: episode.toObject(),
      changedBy: req.admin._id,
      changeSummary: req.body.changeSummary || ''
    });

    const allowedFields = ['title', 'titleEn', 'titleJa', 'description', 'descriptionEn', 'descriptionJa', 'coverImage', 'totalEpisodes', 'currentEpisodes', 'status', 'category', 'tags', 'updateDay', 'premiereDate', 'platformLinks'];
    const updateData = { updatedAt: Date.now() };
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    if (isCreatorRole) {
      updateData.reviewStatus = 'pending';
    }

    const updatedEpisode = await Episode.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (req.body.currentEpisodes && req.body.currentEpisodes > oldCurrentEpisodes) {
      const follows = await Follow.find({ episodeId: req.params.id });
      if (follows.length > 0) {
        const notifications = [];
        for (const follow of follows) {
          for (let epNum = oldCurrentEpisodes + 1; epNum <= req.body.currentEpisodes; epNum++) {
            notifications.push({
              userId: follow.userId,
              episodeId: req.params.id,
              episodeTitle: updatedEpisode.title,
              episodeTitleEn: updatedEpisode.titleEn || '',
              type: 'new_episode',
              message: `《${updatedEpisode.title}》更新了第${epNum}集`,
              metadata: { episodeNumber: epNum }
            });
          }
        }
        if (notifications.length > 0) {
          await Notification.insertMany(notifications);
          const uniqueUserIds = [...new Set(follows.map(f => String(f.userId)))];
          uniqueUserIds.forEach(uid => {
            sendPushToUser(uid, {
              title: `《${updatedEpisode.title}》更新了`,
              body: `更新至第${req.body.currentEpisodes}集`,
              icon: '/vite.svg',
              data: { url: `/episode/${req.params.id}` }
            });
          });
        }
      }
    }

    clearCache(`episode_${req.params.id}`);
    clearCacheByPrefix('episodes_');
    res.json(updatedEpisode);
  } catch (error) {
    console.error('Edit episode error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', adminProtect, async (req, res) => {
  try {
    const episode = await Episode.findById(req.params.id);
    if (!episode) {
      return res.status(404).json({ message: 'Episode not found' });
    }
    await Episode.findByIdAndDelete(req.params.id);
    await SingleEpisode.deleteMany({ episodeId: req.params.id });
    await Follow.deleteMany({ episodeId: req.params.id });
    await Notification.deleteMany({ episodeId: req.params.id });
    clearCache(`episode_${req.params.id}`);
    clearCacheByPrefix('episodes_');
    res.json({ message: 'Episode deleted' });
  } catch (error) {
    console.error('Delete episode error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
