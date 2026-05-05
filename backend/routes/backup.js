const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const adminProtect = require('../middlewares/adminAuth');
const { logManual } = require('../middlewares/auditLog');

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

function requireSuperAdmin(req, res, next) {
  if (req.admin && req.admin.role === 'superadmin') return next();
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
          backup[col] = docs.map(d => { const { password, ...rest } = d; return rest; });
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
    const db = mongoose.connection.db;
    const results = {};
    for (const [col, docs] of Object.entries(data)) {
      if (!ALLOWED_IMPORT_COLLECTIONS.includes(col)) {
        results[col] = 'skipped: not allowed';
        continue;
      }
      if (!Array.isArray(docs) || docs.length === 0) continue;
      try {
        if (overwrite) {
          await db.collection(col).deleteMany({});
        }
        const cleanDocs = docs.map(d => {
          const { _id, password, ...rest } = d;
          return rest;
        });
        if (cleanDocs.length > 0) {
          await db.collection(col).insertMany(cleanDocs, { ordered: false });
        }
        results[col] = cleanDocs.length;
      } catch (e) {
        results[col] = `error: ${e.message}`;
      }
    }
    await logManual(req.admin._id, req.admin.username, '数据恢复', '全库', JSON.stringify(results));
    res.json({ message: '数据恢复完成', results });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
