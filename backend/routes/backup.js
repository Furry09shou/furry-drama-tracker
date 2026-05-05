const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const adminProtect = require('../middlewares/adminAuth');
const { logManual } = require('../middlewares/auditLog');

router.get('/export', adminProtect, async (req, res) => {
  try {
    const collections = ['episodes', 'users', 'categories', 'banners', 'ratings', 'follows', 'favorites', 'histories', 'notifications', 'reports', 'sitecontents', 'admins', 'singleepisodes', 'creatorprofiles'];
    const db = mongoose.connection.db;
    const backup = {};
    for (const col of collections) {
      try {
        backup[col] = await db.collection(col).find({}).toArray();
      } catch (e) {}
    }
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=backup_${new Date().toISOString().split('T')[0]}.json`);
    res.json(backup);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/import', adminProtect, async (req, res) => {
  try {
    const { data, overwrite } = req.body;
    if (!data || typeof data !== 'object') return res.status(400).json({ message: '无效的备份数据' });
    const db = mongoose.connection.db;
    const results = {};
    for (const [col, docs] of Object.entries(data)) {
      if (!Array.isArray(docs) || docs.length === 0) continue;
      try {
        if (overwrite) {
          await db.collection(col).deleteMany({});
        }
        const cleanDocs = docs.map(d => {
          const { _id, ...rest } = d;
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
