const nodemailer = require('nodemailer');
const mongoose = require('mongoose');

// === 目标邮箱限流（防止邮件炸弹） ===
const emailTargetTracker = new Map();
const EMAIL_TARGET_MAX_PER_HOUR = 10;
const EMAIL_TARGET_WINDOW_MS = 60 * 60 * 1000; // 1 小时

const checkEmailTargetLimit = (targetEmail) => {
  const key = targetEmail.toLowerCase();
  const now = Date.now();

  if (!emailTargetTracker.has(key)) {
    emailTargetTracker.set(key, []);
  }
  const timestamps = emailTargetTracker.get(key);
  const valid = timestamps.filter(t => now - t < EMAIL_TARGET_WINDOW_MS);

  if (valid.length >= EMAIL_TARGET_MAX_PER_HOUR) {
    return false;
  }
  valid.push(now);
  emailTargetTracker.set(key, valid);
  return true;
};

// 定期清理过期记录（每 10 分钟）
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of emailTargetTracker) {
    const valid = timestamps.filter(t => now - t < EMAIL_TARGET_WINDOW_MS);
    if (valid.length === 0) {
      emailTargetTracker.delete(key);
    } else {
      emailTargetTracker.set(key, valid);
    }
  }
}, 10 * 60 * 1000);

let cachedConfig = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

const getEmailConfig = async () => {
  if (cachedConfig && (Date.now() - cacheTime) < CACHE_TTL) {
    return cachedConfig;
  }
  try {
    if (mongoose.connection.readyState === 1) {
      const SiteContent = mongoose.model('SiteContent');
      const doc = await SiteContent.findOne({ key: 'email' });
      if (doc) {
        const data = JSON.parse(doc.content);
      if (data.pass && data.pass.startsWith('enc:')) {
        // Decrypt is handled by siteContent route, but just in case
        const crypto = require('crypto');
        try {
          const parts = data.pass.split(':');
          const iv = Buffer.from(parts[1], 'hex');
          const encrypted = parts[2];
          const key = crypto.createHash('sha256').update(process.env.JWT_SECRET).digest();
          const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
          let decrypted = decipher.update(encrypted, 'hex', 'utf8');
          decrypted += decipher.final('utf8');
          data.pass = decrypted;
        } catch {}
      }
      if (data.enabled && data.host && data.user && data.pass) {
          cachedConfig = data;
          cacheTime = Date.now();
          return data;
        }
      }
    }
  } catch (e) {}
  return null;
};

const clearEmailCache = () => {
  cachedConfig = null;
  cacheTime = 0;
};

const isLocalhost = (host) => host === '127.0.0.1' || host === 'localhost' || host === '::1';

const createTransporter = async () => {
  const dbConfig = await getEmailConfig();
  if (dbConfig) {
    const isLocal = isLocalhost(dbConfig.host);
    return nodemailer.createTransport({
      host: dbConfig.host,
      port: parseInt(dbConfig.port || '465'),
      secure: parseInt(dbConfig.port || '465') === 465,
      requireTLS: !isLocal,
      tls: isLocal ? undefined : { minVersion: 'TLSv1.2' },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
      auth: {
        user: dbConfig.user,
        pass: dbConfig.pass
      }
    });
  }
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return null;
  }
  const isLocal = isLocalhost(process.env.EMAIL_HOST);
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '465'),
    secure: parseInt(process.env.EMAIL_PORT || '465') === 465,
    requireTLS: !isLocal,
    tls: isLocal ? undefined : { minVersion: 'TLSv1.2' },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

const getFromName = async () => {
  const dbConfig = await getEmailConfig();
  if (dbConfig && dbConfig.fromName) return dbConfig.fromName;
  return process.env.EMAIL_FROM_NAME || '兽剧聚合平台';
};

const getFromUser = async () => {
  const dbConfig = await getEmailConfig();
  if (dbConfig && dbConfig.user) return dbConfig.user;
  return process.env.EMAIL_USER || '';
};

const sendPasswordResetEmail = async (email, resetToken) => {
  if (!checkEmailTargetLimit(email)) {
    console.log(`[Email] Rate limit exceeded for target ${email}`);
    return false;
  }
  const transporter = await createTransporter();
  if (!transporter) {
    console.log(`[Email] Password reset requested for ${email} (email service not configured)`);
    return false;
  }
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
  const fromName = await getFromName();
  const fromUser = await getFromUser();
  try {
    await transporter.sendMail({
      from: `"${fromName}" <${fromUser}>`,
      to: email,
      subject: '密码重置 - 兽剧聚合平台',
      html: `
        <div style="max-width:600px;margin:0 auto;font-family:sans-serif;padding:20px;">
          <h2 style="color:#6366f1;">密码重置</h2>
          <p>您收到此邮件是因为您（或其他人）请求重置您的账户密码。</p>
          <p>请点击以下链接重置密码（1小时内有效）：</p>
          <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#6366f1,#10b981);color:#fff;text-decoration:none;border-radius:8px;margin:16px 0;">重置密码</a>
          <p style="color:#94a3b8;font-size:13px;">如果您没有请求重置密码，请忽略此邮件。</p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;" />
          <p style="color:#94a3b8;font-size:12px;">此链接1小时后失效。如无法点击，请复制以下地址到浏览器：${resetUrl}</p>
        </div>
      `
    });
    return true;
  } catch (error) {
    console.error('Send email error:', error);
    return false;
  }
};

const sendVerificationEmail = async (email, verifyToken) => {
  if (!checkEmailTargetLimit(email)) {
    console.log(`[Email] Rate limit exceeded for target ${email}`);
    return false;
  }
  const transporter = await createTransporter();
  if (!transporter) {
    console.log(`[Email] Verification requested for ${email} (email service not configured)`);
    return false;
  }
  const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verifyToken}`;
  const fromName = await getFromName();
  const fromUser = await getFromUser();
  try {
    await transporter.sendMail({
      from: `"${fromName}" <${fromUser}>`,
      to: email,
      subject: '邮箱验证 - 兽剧聚合平台',
      html: `
        <div style="max-width:600px;margin:0 auto;font-family:sans-serif;padding:20px;">
          <h2 style="color:#6366f1;">邮箱验证</h2>
          <p>欢迎注册兽剧聚合平台！请点击以下链接验证您的邮箱地址（24小时内有效）：</p>
          <a href="${verifyUrl}" style="display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#6366f1,#10b981);color:#fff;text-decoration:none;border-radius:8px;margin:16px 0;">验证邮箱</a>
          <p style="color:#94a3b8;font-size:13px;">如果您没有注册此账号，请忽略此邮件。</p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;" />
          <p style="color:#94a3b8;font-size:12px;">如无法点击，请复制以下地址到浏览器：${verifyUrl}</p>
        </div>
      `
    });
    return true;
  } catch (error) {
    console.error('Send verification email error:', error);
    return false;
  }
};

// ===== 通知邮件 =====

const sendNotificationEmail = async (email, subject, htmlContent) => {
  const transporter = await createTransporter();
  if (!transporter) {
    return false;
  }
  const fromName = await getFromName();
  const fromUser = await getFromUser();
  try {
    await transporter.sendMail({
      from: `"${fromName}" <${fromUser}>`,
      to: email,
      subject,
      html: htmlContent
    });
    return true;
  } catch (error) {
    console.error('[Email] Notification send error:', error);
    return false;
  }
};

const sendEpisodeUpdateEmail = async (email, episodeTitle, episodeNumber) => {
  const url = `${process.env.FRONTEND_URL || 'http://localhost:3000'}`;
  return sendNotificationEmail(email, `《${episodeTitle}》更新了第${episodeNumber}集`, `
    <div style="max-width:600px;margin:0 auto;font-family:sans-serif;padding:20px;">
      <h2 style="color:#6366f1;">追番更新提醒</h2>
      <p>您关注的剧集有新更新：</p>
      <div style="background:#f0f4ff;padding:16px;border-radius:8px;margin:12px 0;">
        <p style="margin:4px 0;font-size:16px;"><strong>《${episodeTitle}》</strong></p>
        <p style="margin:4px 0;color:#64748b;">已更新至第 ${episodeNumber} 集</p>
      </div>
      <a href="${url}" style="display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#6366f1,#10b981);color:#fff;text-decoration:none;border-radius:8px;margin:16px 0;">前往观看</a>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;" />
      <p style="color:#94a3b8;font-size:12px;">您可以在账号设置中关闭此类邮件通知。</p>
    </div>
  `);
};

const sendNewDeviceLoginEmail = async (email, deviceInfo, ip, region, loginTime) => {
  const url = `${process.env.FRONTEND_URL || 'http://localhost:3000'}`;
  const timeStr = new Date(loginTime).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
  return sendNotificationEmail(email, '新设备登录提醒', `
    <div style="max-width:600px;margin:0 auto;font-family:sans-serif;padding:20px;">
      <h2 style="color:#f59e0b;">新设备登录提醒</h2>
      <p>您的账号于以下时间在新设备上登录：</p>
      <div style="background:#fef3c7;padding:16px;border-radius:8px;margin:12px 0;border:1px solid #fde68a;">
        <p style="margin:4px 0;"><strong>登录时间：</strong>${timeStr}</p>
        <p style="margin:4px 0;"><strong>浏览器：</strong>${deviceInfo.browser || '未知'} ${deviceInfo.browserVersion || ''}</p>
        <p style="margin:4px 0;"><strong>操作系统：</strong>${deviceInfo.os || '未知'} ${deviceInfo.osVersion || ''}</p>
        <p style="margin:4px 0;"><strong>设备类型：</strong>${deviceInfo.deviceType || '未知'}</p>
        <p style="margin:4px 0;"><strong>IP地址：</strong>${ip || '未知'}${region ? ' (' + region + ')' : ''}</p>
      </div>
      <p style="color:#ef4444;font-weight:600;">如非本人操作，请立即修改密码并检查账号安全设置。</p>
      <a href="${url}/account-security" style="display:inline-block;padding:12px 24px;background:#ef4444;color:#fff;text-decoration:none;border-radius:8px;margin:16px 0;">前往安全设置</a>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;" />
      <p style="color:#94a3b8;font-size:12px;">您可以在账号设置中关闭此类邮件通知。</p>
    </div>
  `);
};

const sendFeedbackReplyEmail = async (email, replyContent) => {
  const url = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/profile`;
  return sendNotificationEmail(email, '您的反馈已收到回复', `
    <div style="max-width:600px;margin:0 auto;font-family:sans-serif;padding:20px;">
      <h2 style="color:#6366f1;">反馈回复通知</h2>
      <p>您提交的反馈已收到管理员的回复：</p>
      <div style="background:#f0f4ff;padding:16px;border-radius:8px;margin:12px 0;border-left:4px solid #6366f1;">
        <p style="margin:0;">${replyContent}</p>
      </div>
      <a href="${url}" style="display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#6366f1,#10b981);color:#fff;text-decoration:none;border-radius:8px;margin:16px 0;">查看详情</a>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;" />
      <p style="color:#94a3b8;font-size:12px;">您可以在账号设置中关闭此类邮件通知。</p>
    </div>
  `);
};

const sendFriendLinkStatusEmail = async (email, linkName, statusLabel) => {
  const url = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/profile`;
  return sendNotificationEmail(email, `友链申请${statusLabel}`, `
    <div style="max-width:600px;margin:0 auto;font-family:sans-serif;padding:20px;">
      <h2 style="color:#6366f1;">友链审核结果</h2>
      <p>您申请的友链「<strong>${linkName}</strong>」审核结果：</p>
      <div style="background:#f0f4ff;padding:16px;border-radius:8px;margin:12px 0;">
        <p style="margin:0;font-size:18px;">${statusLabel}</p>
      </div>
      <a href="${url}" style="display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#6366f1,#10b981);color:#fff;text-decoration:none;border-radius:8px;margin:16px 0;">查看详情</a>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;" />
      <p style="color:#94a3b8;font-size:12px;">您可以在账号设置中关闭此类邮件通知。</p>
    </div>
  `);
};

const sendFriendLinkApplyEmail = async (email, applicantName) => {
  const url = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/friend-links`;
  return sendNotificationEmail(email, '新友链申请', `
    <div style="max-width:600px;margin:0 auto;font-family:sans-serif;padding:20px;">
      <h2 style="color:#6366f1;">新友链申请</h2>
      <p>收到来自「<strong>${applicantName}</strong>」的友链申请，请前往管理后台审核。</p>
      <a href="${url}" style="display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#6366f1,#10b981);color:#fff;text-decoration:none;border-radius:8px;margin:16px 0;">前往审核</a>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;" />
      <p style="color:#94a3b8;font-size:12px;">您可以在账号设置中关闭此类邮件通知。</p>
    </div>
  `);
};

module.exports = {
  sendPasswordResetEmail,
  sendVerificationEmail,
  clearEmailCache,
  createTransporter,
  getFromName,
  getFromUser,
  sendEpisodeUpdateEmail,
  sendNewDeviceLoginEmail,
  sendFeedbackReplyEmail,
  sendFriendLinkStatusEmail,
  sendFriendLinkApplyEmail,
  sendNotificationEmail,
};
