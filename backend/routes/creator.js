const express = require('express');
const router = express.Router();
const Episode = require('../models/Episode');
const { creatorProtect } = require('../middlewares/authFactory');

router.get('/my-episodes', creatorProtect, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 100);
    const query = {
      $or: [{ createdBy: req.admin._id }, { allowedEditors: req.admin._id }]
    };
    const total = await Episode.countDocuments(query);
    const totalPages = Math.ceil(total / limitNum);
    const episodes = await Episode.find(query).sort({ updatedAt: -1 })
      .skip((pageNum - 1) * limitNum).limit(limitNum);
    res.json({ list: episodes, page: pageNum, limit: limitNum, total, totalPages });
  } catch (error) {
    console.error('Get creator episodes error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/editable', creatorProtect, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 100);
    const query = {
      $or: [{ createdBy: req.admin._id }, { allowedEditors: req.admin._id }],
      reviewStatus: 'approved'
    };
    const total = await Episode.countDocuments(query);
    const totalPages = Math.ceil(total / limitNum);
    const episodes = await Episode.find(query).sort({ updatedAt: -1 })
      .skip((pageNum - 1) * limitNum).limit(limitNum);
    res.json({ list: episodes, page: pageNum, limit: limitNum, total, totalPages });
  } catch (error) {
    console.error('Get editable episodes error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
