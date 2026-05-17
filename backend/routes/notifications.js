const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { protect } = require('../middlewares/authFactory');
const jwt = require('jsonwebtoken');

// SSE连接的客户端管理
const sseClients = new Map();

// SSE推送端点
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

  // 设置SSE响应头
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });

  // 发送初始连接成功事件
  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

  // 注册客户端
  if (!sseClients.has(userId)) {
    sseClients.set(userId, []);
  }
  const userClients = sseClients.get(userId);
  if (userClients.length >= 5) {
    const oldest = userClients.shift();
    try { oldest.end(); } catch (e) {}
  }
  userClients.push(res);

  // 心跳保活
  const heartbeat = setInterval(() => {
    res.write(`:heartbeat\n\n`);
  }, 30000);

  // 清理连接
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

// 向指定用户推送通知
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

module.exports.pushNotificationToUser = pushNotificationToUser;

// 订阅提醒
router.post('/subscribe-reminder', protect, async (req, res) => {
  try {
    const { episodeId } = req.body;
    if (!episodeId) {
      return res.status(400).json({ message: '缺少剧集ID' });
    }
    // 创建一条提醒通知记录
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

module.exports = router;
