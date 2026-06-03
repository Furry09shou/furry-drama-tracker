const express = require('express');
const router = express.Router();
const CreatorProfile = require('../models/CreatorProfile');
const Episode = require('../models/Episode');
const { creatorProtect } = require('../middlewares/authFactory');

router.get('/my-profile', creatorProtect, async (req, res) => {
  try {
    let profile = await CreatorProfile.findOne({ adminId: req.admin._id });
    if (!profile) {
      profile = await CreatorProfile.create({
        adminId: req.admin._id,
        displayName: req.admin.username
      });
    }
    res.json(profile);
  } catch (error) {
    console.error('Get creator profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/my-profile', creatorProtect, async (req, res) => {
  try {
    const updateData = {
      displayName: req.body.displayName,
      avatar: req.body.avatar,
      bio: req.body.bio && req.body.bio.length > 500 ? req.body.bio.slice(0, 500) : req.body.bio,
      socialLinks: req.body.socialLinks || {},
      updatedAt: Date.now()
    };
    let profile = await CreatorProfile.findOneAndUpdate(
      { adminId: req.admin._id },
      updateData,
      { new: true, upsert: true, runValidators: true }
    );
    res.json(profile);
  } catch (error) {
    console.error('Update creator profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/public/:id', async (req, res) => {
  try {
    const profile = await CreatorProfile.findById(req.params.id);
    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }
    const episodes = await Episode.find({
      $or: [
        { createdBy: profile.adminId },
        { allowedEditors: profile.adminId }
      ],
      reviewStatus: 'approved'
    }).sort({ createdAt: -1 });
    res.json({ profile, episodes });
  } catch (error) {
    console.error('Get public profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/by-admin/:adminId', async (req, res) => {
  try {
    const profile = await CreatorProfile.findOne({ adminId: req.params.adminId });
    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }
    const episodes = await Episode.find({
      $or: [
        { createdBy: profile.adminId },
        { allowedEditors: profile.adminId }
      ],
      reviewStatus: 'approved'
    }).sort({ createdAt: -1 });
    res.json({ profile, episodes });
  } catch (error) {
    console.error('Get profile by admin error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
