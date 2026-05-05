const express = require('express');
const router = express.Router();
const Episode = require('../models/Episode');
const SingleEpisode = require('../models/SingleEpisode');
const SiteContent = require('../models/SiteContent');
const ApiUsage = require('../models/ApiUsage');
const adminProtect = require('../middlewares/adminAuth');

router.get('/', async (req, res) => {
  try {
    let siteName = '兽剧聚合平台';
    let siteDesc = '兽剧内容聚合平台';
    try {
      const settingsDoc = await SiteContent.findOne({ key: 'settings' });
      if (settingsDoc) {
        const s = JSON.parse(settingsDoc.content);
        if (s.siteName) siteName = s.siteName;
      }
      const aboutDoc = await SiteContent.findOne({ key: 'about' });
      if (aboutDoc) {
        const a = JSON.parse(aboutDoc.content);
        if (a.description) siteDesc = a.description;
      }
    } catch (e) {}

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const episodes = await Episode.find({
      reviewStatus: 'approved',
      updatedAt: { $gte: sevenDaysAgo }
    }).sort({ updatedAt: -1 }).limit(20).select('title currentEpisodes totalEpisodes status updatedAt');

    const singleEpisodes = await SingleEpisode.find({
      createdAt: { $gte: sevenDaysAgo }
    }).populate('episodeId', 'title').sort({ createdAt: -1 }).limit(20);

    let items = '';
    episodes.forEach(ep => {
      items += `<item><title>${ep.title} - 更新至第${ep.currentEpisodes}集</title><link>https://example.com/episode/${ep._id}</link><description>状态：${ep.status === 'ongoing' ? '连载中' : ep.status === 'completed' ? '已完结' : '即将上映'}，共${ep.totalEpisodes}集</description><pubDate>${new Date(ep.updatedAt).toUTCString()}</pubDate></item>`;
    });
    singleEpisodes.forEach(se => {
      if (!se.episodeId) return;
      items += `<item><title>${se.episodeId.title} 第${se.episodeNumber}集更新</title><link>https://example.com/episode/${se.episodeId._id}</link><description>${se.title || ''}</description><pubDate>${new Date(se.createdAt).toUTCString()}</pubDate></item>`;
    });

    res.type('application/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${siteName} - 更新订阅</title><link>https://example.com</link><description>${siteDesc}</description><language>zh-CN</language>${items}</channel></rss>`);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/api-usage', adminProtect, async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const usage = await ApiUsage.find({ date: { $gte: since } }).sort({ date: -1, count: -1 });
    const dailyTotals = {};
    usage.forEach(u => {
      dailyTotals[u.date] = (dailyTotals[u.date] || 0) + u.count;
    });
    const topEndpoints = {};
    usage.forEach(u => {
      topEndpoints[u.endpoint] = (topEndpoints[u.endpoint] || 0) + u.count;
    });
    const sortedTop = Object.entries(topEndpoints).sort((a, b) => b[1] - a[1]).slice(0, 20);
    res.json({ dailyTotals, topEndpoints: sortedTop, raw: usage.slice(0, 100) });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
