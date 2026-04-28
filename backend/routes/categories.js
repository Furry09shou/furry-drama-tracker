const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const adminProtect = require('../middlewares/adminAuth');

router.get('/', async (req, res) => {
  try {
    const categories = await Category.find({}).sort({ order: 1, createdAt: 1 });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', adminProtect, async (req, res) => {
  try {
    const { name, order } = req.body;
    const existing = await Category.findOne({ name });
    if (existing) {
      return res.status(400).json({ message: '该分类已存在' });
    }
    const category = await Category.create({ name, order: order || 0 });
    res.json(category);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id', adminProtect, async (req, res) => {
  try {
    const { name, order } = req.body;
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: '分类不存在' });
    }
    if (name) category.name = name;
    if (order !== undefined) category.order = order;
    await category.save();
    res.json(category);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', adminProtect, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: '分类不存在' });
    }
    await Category.findByIdAndDelete(req.params.id);
    res.json({ message: '分类已删除' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
