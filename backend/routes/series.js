const express = require('express');
const router = express.Router();
const Series = require('../models/Series');
const adminProtect = require('../middlewares/adminAuth');
const creatorProtect = require('../middlewares/creatorAuth');

router.get('/', async (req, res) => {
  try {
    const series = await Series.find().populate('episodes', 'title coverImage currentEpisodes totalEpisodes status averageRating').sort({ updatedAt: -1 });
    res.json(series);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const series = await Series.findById(req.params.id).populate('episodes', 'title coverImage currentEpisodes totalEpisodes status averageRating description category tags views');
    if (!series) return res.status(404).json({ message: 'Not found' });
    res.json(series);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', creatorProtect, async (req, res) => {
  try {
    const { name, description, episodes } = req.body;
    if (!name) return res.status(400).json({ message: '名称必填' });
    const series = await Series.create({ name, description, episodes: episodes || [], createdBy: req.admin._id });
    res.status(201).json(series);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id', creatorProtect, async (req, res) => {
  try {
    const { name, description, episodes } = req.body;
    const update = { updatedAt: Date.now() };
    if (name !== undefined) update.name = name;
    if (description !== undefined) update.description = description;
    if (episodes !== undefined) update.episodes = episodes;
    const series = await Series.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!series) return res.status(404).json({ message: 'Not found' });
    res.json(series);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', adminProtect, async (req, res) => {
  try {
    await Series.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
