const mongoose = require('mongoose');
const User = require('../models/User');
const {
  sendEpisodeUpdateEmail,
  sendNewDeviceLoginEmail,
  sendFeedbackReplyEmail,
  sendFriendLinkStatusEmail,
  sendFriendLinkApplyEmail,
} = require('./email');

// 偏好键 -> 邮件函数 映射
const EMAIL_MAP = {
  episodeUpdate: sendEpisodeUpdateEmail,
  newDeviceLogin: sendNewDeviceLoginEmail,
  feedbackReply: sendFeedbackReplyEmail,
  friendLinkStatus: sendFriendLinkStatusEmail,
  friendLinkApply: sendFriendLinkApplyEmail,
};

/**
 * 批量发送通知邮件（自动检查用户偏好）
 * @param {Array<{userId, prefKey, args}>} items
 */
const sendBatchNotificationEmails = async (items) => {
  if (!items || items.length === 0) return;
  const userIds = [...new Set(items.map(i => String(i.userId)))];
  const users = await User.find({ _id: { $in: userIds } })
    .select('email isEmailVerified emailNotificationPrefs')
    .lean();
  const userMap = new Map(users.map(u => [String(u._id), u]));

  for (const item of items) {
    const user = userMap.get(String(item.userId));
    if (!user || !user.isEmailVerified) continue;
    const pref = user.emailNotificationPrefs || {};
    if (pref[item.prefKey] === false) continue; // 显式关闭
    const fn = EMAIL_MAP[item.prefKey];
    if (fn) {
      fn(user.email, ...item.args).catch(() => {});
    }
  }
};

/**
 * 发送单条通知邮件
 */
const sendNotificationEmailToUser = async (userId, prefKey, ...args) => {
  const user = await User.findById(userId).select('email isEmailVerified emailNotificationPrefs').lean();
  if (!user || !user.isEmailVerified) return;
  const pref = user.emailNotificationPrefs || {};
  if (pref[prefKey] === false) return;
  const fn = EMAIL_MAP[prefKey];
  if (fn) {
    fn(user.email, ...args).catch(() => {});
  }
};

module.exports = { sendBatchNotificationEmails, sendNotificationEmailToUser };
