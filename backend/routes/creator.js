const express = require('express');
const router = express.Router();
const Episode = require('../models/Episode');
const creatorProtect = require('../middlewares/creatorAuth');

router.get('/my-episodes', creatorProtect, async (req, res) => {
  try {
    const episodes = await Episode.find({
      $or: [
        { createdBy: req.admin._id },
        { allowedEditors: req.admin._id }
      ]
    }).sort({ updatedAt: -1 });
    res.json(episodes);
  } catch (error) {
    console.error('Get creator episodes error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/editable', creatorProtect, async (req, res) => {
  try {
    const episodes = await Episode.find({
      $or: [
        { createdBy: req.admin._id },
        { allowedEditors: req.admin._id }
      ],
      reviewStatus: 'approved'
    }).sort({ updatedAt: -1 });
    res.json(episodes);
  } catch (error) {
    console.error('Get editable episodes error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
