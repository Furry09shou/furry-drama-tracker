const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const PushSubscription = require('../models/PushSubscription');
const { protect } = require('../middlewares/authFactory');
const jwt = require('jsonwebtoken');
const webpush = require('web-push');

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:admin@furry-drama-tracker.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const sseClients = new Map();

router.get('/stream', async (req, res) => {
  const { ticket } = req.query;

  let userId;
  try {
    if (ticket) {
      const decoded = jwt.verify(ticket, process.env.JWT_SECRET);
      if (decoded.purpose !== 'sse-ticket') {
        return res.status(401).json({ message: '无效的ticket' });
      }
      userId = decoded.id || decoded._id;
    } else {
      return res.status(401).json({ message: '需要认证' });
    }
  } catch (e) {
    return res.status(401).json({ message: '认证信息无效' });
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });

  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

  if (!sseClients.has(userId)) {
    sseClients.set(userId, []);
  }
  const userClients = sseClients.get(userId);
  if (userClients.length >= 5) {
    const oldest = userClients.shift();
    try { oldest.end(); } catch (e) {}
  }
  userClients.push(res);

  const heartbeat = setInterval(() => {
    res.write(`:heartbeat\n\n`);
  }, 30000);

  req.on('close', () => {
    clearInterval(heartbeat);
    const clients = sseClients.get(userId);
    if (clients) {
      const idx = clients.indexOf(res);
      if (idx > -1) clients.splice(idx, 1);
      if (clients.length === 0) sseClients.delete(userId);
    }
  });
});

const pushNotificationToUser = async (userId) => {
  const clients = sseClients.get(String(userId));
  if (!clients || clients.length === 0) return;
  try {
    const count = await Notification.countDocuments({ userId, isRead: false });
    const data = JSON.stringify({ type: 'new', unreadCount: count });
    clients.forEach(client => {
      try {
        client.write(`event: notification\ndata: ${data}\n\n`);
      } catch (e) {}
    });
  } catch (e) {}
};

router.post('/subscribe-reminder', protect, async (req, res) => {
  try {
    const { episodeId } = req.body;
    if (!episodeId) {
      return res.status(400).json({ message: '缺少剧集ID' });
    }
    await Notification.create({
      userId: req.user._id,
      type: 'reminder',
      message: '您已订阅该剧集的更新提醒',
      episodeId
    });
    res.json({ message: '订阅提醒成功' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/list', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const total = await Notification.countDocuments({ userId: req.user._id });
    const totalPages = Math.ceil(total / limitNum);
    const list = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);
    res.json({ list, page: pageNum, limit: limitNum, total, totalPages });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/unread-count', protect, async (req, res) => {
  try {
    const count = await Notification.countDocuments({ userId: req.user._id, isRead: false });
    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/read-all', protect, async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.user._id, isRead: false }, { isRead: true });
    res.json({ message: 'All marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/read-episode/:episodeId', protect, async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user._id, episodeId: req.params.episodeId, isRead: false },
      { isRead: true }
    );
    res.json({ message: 'Episode notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/read/:id', protect, async (req, res) => {
  try {
    await Notification.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, { isRead: true });
    res.json({ message: 'Marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/clear-read', protect, async (req, res) => {
  try {
    await Notification.deleteMany({ userId: req.user._id, isRead: true });
    res.json({ message: 'Read notifications cleared' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', protect, async (req, res) => {
  try {
    await Notification.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    res.json({ message: 'Notification deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/vapid-public-key', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

router.post('/push/subscribe', protect, async (req, res) => {
  try {
    const { subscription } = req.body;
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ message: '无效的订阅信息' });
    }
    await PushSubscription.findOneAndUpdate(
      { userId: req.user._id, endpoint: subscription.endpoint },
      {
        userId: req.user._id,
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        userAgent: req.headers['user-agent'],
      },
      { upsert: true, new: true }
    );
    res.json({ message: '推送订阅成功' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/push/unsubscribe', protect, async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) {
      return res.status(400).json({ message: '缺少endpoint' });
    }
    await PushSubscription.deleteOne({ userId: req.user._id, endpoint });
    res.json({ message: '取消推送订阅成功' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

const sendPushToUser = async (userId, payload) => {
  try {
    const subs = await PushSubscription.find({ userId: String(userId) });
    const results = await Promise.allSettled(
      subs.map(sub =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          JSON.stringify(payload)
        )
      )
    );
    const invalidIndices = [];
    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        const statusCode = r.reason?.statusCode;
        if (statusCode === 410 || statusCode === 404) {
          invalidIndices.push(subs[i]._id);
        }
      }
    });
    if (invalidIndices.length > 0) {
      await PushSubscription.deleteMany({ _id: { $in: invalidIndices } });
    }
  } catch (e) {}
};

module.exports = router;
module.exports.pushNotificationToUser = pushNotificationToUser;
module.exports.sendPushToUser = sendPushToUser;
