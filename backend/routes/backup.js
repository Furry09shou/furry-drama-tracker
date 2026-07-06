const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { adminProtect } = require('../middlewares/authFactory');
const { logManual } = require('../middlewares/auditLog');
const { asyncHandler } = require('../utils/errorHandler');

const ALLOWED_EXPORT_COLLECTIONS = [
  'episodes', 'users', 'categories', 'banners', 'ratings',
  'follows', 'favorites', 'histories', 'notifications', 'reports',
  'sitecontents', 'singleepisodes', 'creatorprofiles'
];

const ALLOWED_IMPORT_COLLECTIONS = [
  'episodes', 'users', 'categories', 'banners', 'ratings',
  'follows', 'favorites', 'histories', 'notifications', 'reports',
  'sitecontents', 'singleepisodes', 'creatorprofiles'
];

const COLLECTION_FIELDS = {
  episodes: ['title', 'titleEn', 'titleJa', 'description', 'descriptionEn', 'descriptionJa', 'coverImage', 'totalEpisodes', 'currentEpisodes', 'status', 'category', 'tags', 'updateDay', 'premiereDate', 'platformLinks', 'views', 'averageRating', 'ratingCount', 'reviewStatus', 'reviewNote', 'createdBy', 'allowedEditors', 'createdAt', 'updatedAt'],
  users: ['accountId', 'username', 'email', 'isEmailVerified', 'adminAccess', 'avatar', 'deletionRequestedAt', 'createdAt', 'updatedAt'],
  categories: ['name', 'nameEn', 'nameJa', 'description', 'descriptionEn', 'descriptionJa', 'icon', 'order', 'createdAt'],
  banners: ['title', 'titleEn', 'titleJa', 'subtitle', 'subtitleEn', 'subtitleJa', 'image', 'link', 'order', 'active', 'createdAt'],
  ratings: ['userId', 'episodeId', 'score', 'createdAt', 'updatedAt'],
  follows: ['userId', 'episodeId', 'folderId', 'followedAtEpisodes', 'createdAt'],
  favorites: ['userId', 'episodeId', 'folderId', 'createdAt', 'updatedAt'],
  histories: ['userId', 'episodeId', 'watchedEpisodes', 'lastWatched', 'createdAt', 'updatedAt'],
  notifications: ['userId', 'episodeId', 'episodeTitle', 'episodeTitleEn', 'type', 'message', 'isRead', 'metadata', 'createdAt'],
  reports: ['reporterId', 'targetType', 'targetId', 'reason', 'description', 'status', 'resolveNote', 'resolvedBy', 'createdAt', 'updatedAt'],
  sitecontents: ['key', 'title', 'content', 'createdAt', 'updatedAt'],
  singleepisodes: ['episodeId', 'episodeNumber', 'title', 'titleEn', 'titleJa', 'duration', 'platformLinks', 'views', 'scheduledDate', 'isScheduled', 'releaseDate', 'premiereDate', 'isUpcoming', 'createdAt', 'updatedAt'],
  creatorprofiles: ['adminId', 'displayName', 'displayNameEn', 'bio', 'bioEn', 'avatar', 'socialLinks', 'createdAt', 'updatedAt']
};

function requireSuperAdmin(req, res, next) {
  if (req.user && req.user.role === 'superadmin') return next();
  return res.status(403).json({ message: '需要超级管理员权限' });
}

router.get('/export', adminProtect, requireSuperAdmin, async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const backup = {};
    for (const col of ALLOWED_EXPORT_COLLECTIONS) {
      try {
        const docs = await db.collection(col).find({}).toArray();
        if (col === 'users') {
          backup[col] = docs.map(d => { const { password, lastLoginIp, lastLoginRegion, deviceInfo, ...rest } = d; return rest; });
        } else {
          backup[col] = docs;
        }
      } catch (e) {}
    }
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=backup_${new Date().toISOString().split('T')[0]}.json`);
    res.json(backup);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/import', adminProtect, requireSuperAdmin, async (req, res) => {
  try {
    const { data, overwrite } = req.body;
    if (!data || typeof data !== 'object') return res.status(400).json({ message: '无效的备份数据' });
    const dataStr = JSON.stringify(data);
    if (dataStr.length > 50 * 1024 * 1024) {
      return res.status(400).json({ message: '备份数据过大，最大支持50MB' });
    }
    const db = mongoose.connection.db;
    const results = {};
    for (const [col, docs] of Object.entries(data)) {
      if (!ALLOWED_IMPORT_COLLECTIONS.includes(col)) {
        results[col] = 'skipped: not allowed';
        continue;
      }
      if (!Array.isArray(docs) || docs.length === 0) continue;
      try {
        const cleanDocs = docs.map(d => {
          const { _id, password, ...rest } = d;
          const allowedFields = COLLECTION_FIELDS[col];
          if (allowedFields) {
            const filtered = {};
            for (const key of Object.keys(rest)) {
              if (allowedFields.includes(key)) {
                filtered[key] = rest[key];
              }
            }
            return filtered;
          }
          return rest;
        });
        if (cleanDocs.length === 0) continue;
        // 限制单次导入数量
        if (cleanDocs.length > 10000) {
          results[col] = 'skipped: too many documents (max 10000)';
          continue;
        }

        if (overwrite) {
          const session = await mongoose.startSession();
          session.startTransaction();
          try {
            await db.collection(col).deleteMany({}, { session });
            await db.collection(col).insertMany(cleanDocs, { ordered: false, session });
            await session.commitTransaction();
            results[col] = cleanDocs.length;
          } catch (e) {
            await session.abortTransaction();
            results[col] = `error: 导入失败`;
          } finally {
            session.endSession();
          }
        } else {
          await db.collection(col).insertMany(cleanDocs, { ordered: false });
          results[col] = cleanDocs.length;
        }
      } catch (e) {
        results[col] = `error: 导入失败`;
      }
    }
    await logManual(req.user._id, req.user.username, '数据恢复', '全库', JSON.stringify(results));
    res.json({ message: '数据恢复完成', results });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
