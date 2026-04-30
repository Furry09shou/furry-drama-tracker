const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const rateLimit = require('express-rate-limit');
const Episode = require('../models/Episode');
const SingleEpisode = require('../models/SingleEpisode');
const Follow = require('../models/Follow');
const Notification = require('../models/Notification');
const protect = require('../middlewares/auth');
const adminProtect = require('../middlewares/adminAuth');
const creatorProtect = require('../middlewares/creatorAuth');
const { setCache, getCache, clearCache, clearCacheByPrefix } = require('../middlewares/cache');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'cover-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('只支持图片文件(jpeg, jpg, png, gif, webp)'));
    }
  }
});

router.post('/upload', creatorProtect, upload.single('coverImage'), async (req, res) => {
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

router.get('/', async (req, res) => {
  try {
    const { category, sort, status, tag, search, minRating } = req.query;
    const cacheKey = `episodes_${category || 'all'}_${sort || 'latest'}_${status || ''}_${tag || ''}_${search || ''}_${minRating || ''}`;
    
    const cachedEpisodes = getCache(cacheKey);
    if (cachedEpisodes) {
      return res.json(cachedEpisodes);
    }
    
    let query = { $or: [{ reviewStatus: 'approved' }, { reviewStatus: { $exists: false } }] };
    
    if (category) {
      query.category = { $in: [category] };
    }
    if (status) {
      query.status = status;
    }
    if (tag) {
      query.tags = { $in: [tag] };
    }
    if (search) {
      query.$and = [
        query,
        {
          $or: [
            { title: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } }
          ]
        }
      ];
      delete query.$or;
    }
    if (minRating) {
      query.averageRating = { $gte: parseFloat(minRating) };
    }
    
    let sortOption = { updatedAt: -1 };
    if (sort === 'views') {
      sortOption = { views: -1 };
    } else if (sort === 'premiere') {
      sortOption = { createdAt: -1 };
    } else if (sort === 'rating') {
      sortOption = { averageRating: -1, ratingCount: -1 };
    }
    
    const episodes = await Episode.find(query).sort(sortOption)
      .populate('createdBy', 'username')
      .populate('allowedEditors', 'username');
    
    setCache(cacheKey, episodes);
    
    res.json(episodes);
  } catch (error) {
    console.error('Get episodes error:', error);
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
      .populate('createdBy', 'username')
      .populate('allowedEditors', 'username');
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
    if (req.body.duration !== undefined) updateData.duration = req.body.duration;
    if (req.body.platformLinks !== undefined) updateData.platformLinks = req.body.platformLinks;
    if (req.body.scheduledDate !== undefined) updateData.scheduledDate = req.body.scheduledDate;
    if (req.body.isScheduled !== undefined) updateData.isScheduled = req.body.isScheduled;
    
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
      description: req.body.description,
      coverImage: req.body.coverImage,
      totalEpisodes: req.body.totalEpisodes,
      currentEpisodes: req.body.currentEpisodes || 0,
      status: req.body.status,
      category: req.body.category || [],
      tags: req.body.tags || [],
      updateDay: req.body.updateDay || '',
      platformLinks: req.body.platformLinks || {},
      createdBy: req.admin._id,
      reviewStatus: isCreator ? 'pending' : 'approved'
    };
    
    const episode = await Episode.create(episodeData);
    clearCacheByPrefix('episodes_');
    res.status(201).json(episode);
  } catch (error) {
    console.error('Create episode error:', error);
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
      duration: req.body.duration || '',
      platformLinks: req.body.platformLinks || {},
      scheduledDate: req.body.scheduledDate || null,
      isScheduled: req.body.isScheduled || false
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
          type: 'new_episode',
          message: `《${updatedEpisode.title}》更新了第${req.body.episodeNumber}集`
        }));
        await Notification.insertMany(notifications);
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
    const allowedFields = ['title', 'description', 'coverImage', 'totalEpisodes', 'currentEpisodes', 'status', 'category', 'tags', 'updateDay', 'platformLinks'];
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
              type: 'new_episode',
              message: `《${updatedEpisode.title}》更新了第${epNum}集`
            });
          }
        }
        if (notifications.length > 0) {
          await Notification.insertMany(notifications);
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
