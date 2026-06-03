const express = require('express');
const router = express.Router();
const Series = require('../models/Series');
const { adminProtect, creatorProtect } = require('../middlewares/authFactory');

/**
 * @swagger
 * components:
 *   schemas:
 *     Series:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         episodes:
 *           type: array
 *           items:
 *             type: string
 *         createdBy:
 *           type: string
 */

/**
 * @swagger
 * /api/series:
 *   get:
 *     tags: [系列]
 *     summary: 获取所有系列
 *     responses:
 *       200:
 *         description: 系列列表
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Series'
 */
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const total = await Series.countDocuments();
    const series = await Series.find()
      .populate('episodes', 'title coverImage currentEpisodes totalEpisodes status averageRating')
      .sort({ updatedAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);
    res.json({ list: series, page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/series/{id}:
 *   get:
 *     tags: [系列]
 *     summary: 根据ID获取系列详情
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 系列ID
 *     responses:
 *       200:
 *         description: 系列详情
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Series'
 *       404:
 *         description: 未找到
 */
router.get('/:id', async (req, res) => {
  try {
    const series = await Series.findById(req.params.id).populate('episodes', 'title coverImage currentEpisodes totalEpisodes status averageRating description category tags views');
    if (!series) return res.status(404).json({ message: 'Not found' });
    res.json(series);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/series:
 *   post:
 *     tags: [系列]
 *     summary: 创建新系列（需要创作者/管理员权限）
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               episodes:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: 创建成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Series'
 *       400:
 *         description: 名称必填
 */
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

/**
 * @swagger
 * /api/series/{id}:
 *   put:
 *     tags: [系列]
 *     summary: 更新系列信息（需要创作者/管理员权限）
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               episodes:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: 更新成功
 *       403:
 *         description: 无权限
 *       404:
 *         description: 未找到
 */
router.put('/:id', creatorProtect, async (req, res) => {
  try {
    const existing = await Series.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Not found' });
    if (req.admin.role !== 'superadmin' && req.admin.role !== 'admin' && existing.createdBy && existing.createdBy.toString() !== req.admin._id.toString()) {
      return res.status(403).json({ message: '无权修改此系列' });
    }
    const { name, description, episodes } = req.body;
    const update = { updatedAt: Date.now() };
    if (name !== undefined) update.name = name;
    if (description !== undefined) update.description = description;
    if (episodes !== undefined) update.episodes = episodes;
    const series = await Series.findByIdAndUpdate(req.params.id, update, { new: true });
    res.json(series);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/series/{id}:
 *   delete:
 *     tags: [系列]
 *     summary: 删除系列（需要管理员权限）
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 删除成功
 *       403:
 *         description: 无权限
 *       404:
 *         description: 未找到
 */
router.delete('/:id', adminProtect, async (req, res) => {
  try {
    await Series.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
