const express = require('express');
const router = express.Router();
const Banner = require('../models/Banner');
const { adminProtect } = require('../middlewares/authFactory');

router.get('/', async (req, res) => {
  try {
    const banners = await Banner.find({ active: true }).sort({ order: 1, createdAt: -1 });
    res.json(banners);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/all', adminProtect, async (req, res) => {
  try {
    const banners = await Banner.find({}).sort({ order: 1, createdAt: -1 });
    res.json(banners);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', adminProtect, async (req, res) => {
  try {
    const { title, subtitle, image, link, order, active } = req.body;
    const banner = await Banner.create({ title, subtitle, image, link, order: order || 0, active: active !== undefined ? active : true });
    res.json(banner);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id', adminProtect, async (req, res) => {
  try {
    const { title, subtitle, image, link, order, active } = req.body;
    const banner = await Banner.findById(req.params.id);
    if (!banner) return res.status(404).json({ message: '轮播图不存在' });
    if (title !== undefined) banner.title = title;
    if (subtitle !== undefined) banner.subtitle = subtitle;
    if (image !== undefined) banner.image = image;
    if (link !== undefined) banner.link = link;
    if (order !== undefined) banner.order = order;
    if (active !== undefined) banner.active = active;
    await banner.save();
    res.json(banner);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', adminProtect, async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) return res.status(404).json({ message: '轮播图不存在' });
    await Banner.findByIdAndDelete(req.params.id);
    res.json({ message: '轮播图已删除' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
