const express = require('express');
const router = express.Router();
const Announcement = require('../models/Announcement');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { superAdminProtect, requireEmailChanged } = require('../middlewares/authFactory');
const { sendNotificationEmail } = require('../utils/email');

// 公开：获取生效中的公告（用于弹窗/横幅/通知展示）
// 查询参数 ?channel=popup|banner 可按渠道过滤
router.get('/active', async (req, res) => {
  try {
    const now = new Date();
    const query = {
      active: true,
      publishAt: { $lte: now },
      $or: [{ expireAt: null }, { expireAt: { $gt: now } }]
    };
    if (req.query.channel === 'popup') query.showPopup = true;
    if (req.query.channel === 'banner') query.showBanner = true;

    const list = await Announcement.find(query)
      .sort({ pinned: -1, publishAt: -1, createdAt: -1 })
      .limit(20)
      .lean();
    res.json(list);
  } catch (error) {
    console.error('Get active announcements error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// 公开：获取单条公告详情
router.get('/:id', async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id).lean();
    if (!announcement) return res.status(404).json({ message: 'Announcement not found' });
    res.json(announcement);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ===== 超管后台 CRUD =====
router.use(superAdminProtect);
router.use(requireEmailChanged);

// 列表
router.get('/', async (req, res) => {
  try {
    const list = await Announcement.find()
      .sort({ createdAt: -1 })
      .lean();
    res.json(list);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// 创建
router.post('/', async (req, res) => {
  try {
    const {
      title, titleEn, content, contentEn, type,
      showPopup, showBanner, sendNotification, sendEmail,
      dismissible, active, pinned, publishAt, expireAt, link
    } = req.body;

    if (!title || !content) {
      return res.status(400).json({ message: '标题和内容不能为空' });
    }

    const data = {
      title, titleEn: titleEn || '', content, contentEn: contentEn || '',
      type: type || 'info',
      showPopup: !!showPopup, showBanner: !!showBanner,
      sendNotification: !!sendNotification, sendEmail: !!sendEmail,
      dismissible: dismissible !== false, active: active !== false, pinned: !!pinned,
      publishAt: publishAt || Date.now(),
      expireAt: expireAt || null,
      link: link || '',
      createdBy: req.user._id
    };

    const announcement = await Announcement.create(data);

    // 发布时自动推送通知与邮件（仅在 active 且已到发布时间）
    const isPublished = announcement.active && new Date(announcement.publishAt).getTime() <= Date.now();
    if (isPublished) {
      await broadcastAnnouncement(announcement);
    }

    res.json(announcement);
  } catch (error) {
    console.error('Create announcement error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// 更新
router.put('/:id', async (req, res) => {
  try {
    const allowedFields = [
      'title', 'titleEn', 'content', 'contentEn', 'type',
      'showPopup', 'showBanner', 'sendNotification', 'sendEmail',
      'dismissible', 'active', 'pinned', 'publishAt', 'expireAt', 'link'
    ];
    const updateData = {};
    allowedFields.forEach(f => {
      if (req.body[f] !== undefined) updateData[f] = req.body[f];
    });
    updateData.updatedAt = Date.now();

    const announcement = await Announcement.findByIdAndUpdate(
      req.params.id, updateData, { new: true, runValidators: true }
    );
    if (!announcement) return res.status(404).json({ message: 'Announcement not found' });

    res.json(announcement);
  } catch (error) {
    console.error('Update announcement error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// 删除
router.delete('/:id', async (req, res) => {
  try {
    const announcement = await Announcement.findByIdAndDelete(req.params.id);
    if (!announcement) return res.status(404).json({ message: 'Announcement not found' });
    // 同步清理通知中心中相关条目
    await Notification.deleteMany({ type: 'announcement', 'metadata.announcementId': announcement._id });
    res.json({ message: '已删除' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// 手动触发邮件推送（用于已创建但未发送邮件的公告）
router.post('/:id/send-email', async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) return res.status(404).json({ message: 'Announcement not found' });
    if (!announcement.sendEmail) {
      return res.status(400).json({ message: '该公告未启用邮件推送' });
    }
    const result = await sendAnnouncementEmails(announcement);
    announcement.emailSent = true;
    announcement.emailSentAt = new Date();
    announcement.emailSentCount = result.sent;
    await announcement.save();
    res.json({ message: `邮件推送完成，成功发送 ${result.sent} 封`, sent: result.sent });
  } catch (error) {
    console.error('Send announcement email error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// 手动触发通知中心推送（用于已创建但未发送通知的公告）
router.post('/:id/send-notification', async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) return res.status(404).json({ message: 'Announcement not found' });
    if (!announcement.sendNotification) {
      return res.status(400).json({ message: '该公告未启用通知推送' });
    }
    const result = await sendAnnouncementNotifications(announcement);
    announcement.notificationSent = true;
    await announcement.save();
    res.json({ message: `通知推送完成，发送 ${result.count} 条`, count: result.count });
  } catch (error) {
    console.error('Send announcement notification error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ===== 工具函数 =====

// 发布时综合推送：按开关发送通知 + 邮件
async function broadcastAnnouncement(announcement) {
  try {
    if (announcement.sendNotification && !announcement.notificationSent) {
      const result = await sendAnnouncementNotifications(announcement);
      announcement.notificationSent = true;
    }
    if (announcement.sendEmail && !announcement.emailSent) {
      const result = await sendAnnouncementEmails(announcement);
      announcement.emailSent = true;
      announcement.emailSentAt = new Date();
      announcement.emailSentCount = result.sent;
    }
    await announcement.save();
  } catch (e) {
    console.error('Broadcast announcement error:', e);
  }
}

// 给所有用户推送通知中心条目（分批 insertMany）
async function sendAnnouncementNotifications(announcement) {
  const batchSize = 1000;
  let total = 0;
  let skip = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const users = await User.find({}, '_id')
      .skip(skip)
      .limit(batchSize)
      .lean();
    if (users.length === 0) break;
    const docs = users.map(u => ({
      userId: u._id,
      type: 'announcement',
      message: announcement.title,
      link: announcement.link || '',
      metadata: {
        announcementId: announcement._id,
        type: announcement.type,
        content: announcement.content
      },
      isRead: false
    }));
    await Notification.insertMany(docs, { ordered: false });
    total += users.length;
    skip += batchSize;
    if (users.length < batchSize) break;
  }
  return { count: total };
}

// 给所有已验证邮箱且未关闭公告偏好的用户发邮件（限流分批）
async function sendAnnouncementEmails(announcement) {
  const batchSize = 50;
  let sent = 0;
  let skip = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const users = await User.find({
      isEmailVerified: true,
      'emailNotificationPrefs.announcement': { $ne: false }
    }, 'email emailNotificationPrefs')
      .skip(skip)
      .limit(batchSize)
      .lean();
    if (users.length === 0) break;
    for (const u of users) {
      const htmlContent = buildAnnouncementHtml(announcement);
      sendNotificationEmail(u.email, `[公告] ${announcement.title}`, htmlContent).then(ok => {
        if (ok) sent += 1;
      }).catch(() => {});
    }
    // 等待本批次发出，避免瞬时连接过多
    await new Promise(r => setTimeout(r, 200));
    skip += batchSize;
    if (users.length < batchSize) break;
  }
  return { sent };
}

function buildAnnouncementHtml(announcement) {
  const typeLabels = {
    info: '📢 站点公告',
    warning: '⚠️ 重要提醒',
    maintenance: '🔧 维护通知',
    update: '✨ 更新公告'
  };
  const label = typeLabels[announcement.type] || '📢 站点公告';
  const url = process.env.FRONTEND_URL || 'http://localhost:3000';
  return `
    <div style="max-width:600px;margin:0 auto;font-family:sans-serif;padding:20px;">
      <h2 style="color:#6366f1;">${label}</h2>
      <div style="background:#f0f4ff;padding:16px;border-radius:8px;margin:12px 0;">
        <p style="margin:4px 0;font-size:16px;font-weight:600;">${announcement.title}</p>
      </div>
      <div style="white-space:pre-wrap;line-height:1.7;color:#334155;">${announcement.content}</div>
      ${announcement.link ? `<a href="${announcement.link}" style="display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#6366f1,#10b981);color:#fff;text-decoration:none;border-radius:8px;margin:16px 0;">查看详情</a>` : ''}
      <a href="${url}" style="display:inline-block;padding:10px 20px;background:#64748b;color:#fff;text-decoration:none;border-radius:8px;margin-left:8px;">访问站点</a>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;" />
      <p style="font-size:12px;color:#94a3b8;">这是一封来自站点的公告通知邮件，如不希望接收此类邮件可在账户设置中关闭公告邮件偏好。</p>
    </div>
  `;
}

module.exports = router;
