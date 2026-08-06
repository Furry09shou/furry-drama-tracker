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
  cachedAbout = null;
  aboutCacheTime = 0;
  cachedSettings = null;
  settingsCacheTime = 0;
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

const getSiteUrl = () => process.env.FRONTEND_URL || 'http://localhost:3000';

// 获取站点 about 信息（ICP、版本号、版权等），带缓存以避免每次发信都查库
let cachedAbout = null;
let aboutCacheTime = 0;
const ABOUT_CACHE_TTL = 5 * 60 * 1000;

// 获取站点导航栏设置（站名、logo），带缓存，让邮件品牌栏跟随导航栏数据
let cachedSettings = null;
let settingsCacheTime = 0;

const getSiteAboutInfo = async () => {
  if (cachedAbout && (Date.now() - aboutCacheTime) < ABOUT_CACHE_TTL) {
    return cachedAbout;
  }
  try {
    if (mongoose.connection.readyState === 1) {
      const SiteContent = mongoose.model('SiteContent');
      const doc = await SiteContent.findOne({ key: 'about' });
      if (doc) {
        const data = JSON.parse(doc.content);
        cachedAbout = {
          icp: data.icp || '',
          policeRecord: data.policeRecord || '',
          version: data.version || '',
          copyright: data.copyright || '',
          aiDisclaimer: data.aiDisclaimer || '',
        };
        aboutCacheTime = Date.now();
        return cachedAbout;
      }
    }
  } catch (e) {}
  return { icp: '', policeRecord: '', version: '', copyright: '', aiDisclaimer: '' };
};

// 获取站点导航栏设置（站名、logo），让邮件品牌栏与导航栏保持一致
const getSiteSettingsInfo = async () => {
  if (cachedSettings && (Date.now() - settingsCacheTime) < ABOUT_CACHE_TTL) {
    return cachedSettings;
  }
  try {
    if (mongoose.connection.readyState === 1) {
      const SiteContent = mongoose.model('SiteContent');
      const doc = await SiteContent.findOne({ key: 'settings' });
      if (doc) {
        const data = JSON.parse(doc.content);
        cachedSettings = {
          siteName: data.siteName || '',
          navLogo: data.navLogo || '',
        };
        settingsCacheTime = Date.now();
        return cachedSettings;
      }
    }
  } catch (e) {}
  return { siteName: '', navLogo: '' };
};

// ===== 统一邮件模板 =====
// 所有邮件共用同一套现代化布局：顶部品牌栏（logo + 站名）+ 内容卡片 + 页脚。
// 使用 table 布局 + 内联样式，确保 Outlook / Gmail / Apple Mail 等客户端兼容。

const emailButton = (text, url, variant = 'primary') => {
  const styles = {
    primary: 'background-color:#6366f1;color:#ffffff;',
    success: 'background-color:#10b981;color:#ffffff;',
    danger: 'background-color:#ef4444;color:#ffffff;',
    secondary: 'background-color:#f1f5f9;color:#475569;border:1px solid #e2e8f0;',
  };
  return `<a href="${url}" style="display:inline-block;padding:12px 28px;${styles[variant] || styles.primary}text-decoration:none;border-radius:10px;font-size:14px;font-weight:600;letter-spacing:0.01em;">${text}</a>`;
};

const emailInfoBox = (content, variant = 'info') => {
  const styles = {
    info: { bg: '#f0f4ff', border: '#6366f1', text: '#3730a3' },
    warning: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
    danger: { bg: '#fee2e2', border: '#ef4444', text: '#991b1b' },
    success: { bg: '#d1fae5', border: '#10b981', text: '#065f46' },
  };
  const s = styles[variant] || styles.info;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${s.bg};border-left:4px solid ${s.border};border-radius:8px;margin:16px 0;"><tr><td style="padding:14px 18px;color:${s.text};font-size:14px;line-height:1.6;">${content}</td></tr></table>`;
};

const buildEmailHTML = async (siteName, siteUrl, bodyContent, options = {}) => {
  const { preheader = '' } = options;
  // 优先使用导航栏设置的站名和 logo，回退到传入参数 / 默认 icon
  const settings = await getSiteSettingsInfo();
  const displayName = settings.siteName || siteName;
  // navLogo 可能是相对路径（/uploads/xxx），邮件中需拼接完整 URL
  let logoUrl = settings.navLogo || `${siteUrl}/icon-192x192.png`;
  if (logoUrl && !logoUrl.startsWith('http') && !logoUrl.startsWith('data:')) {
    logoUrl = `${siteUrl}${logoUrl}`;
  }
  const year = new Date().getFullYear();
  const about = await getSiteAboutInfo();

  // 构建页脚附加信息：ICP 号、开源项目提示、版本号
  const footerExtraRows = [];

  // ICP 备案号
  if (about.icp) {
    footerExtraRows.push(
      `<p style="margin:2px 0;color:#94a3b8;font-size:11px;text-align:center;"><a href="https://beian.miit.gov.cn/#/Integrated/index" target="_blank" rel="noopener noreferrer" style="color:#94a3b8;text-decoration:none;">${about.icp}</a></p>`
    );
  }
  // 公安备案号
  if (about.policeRecord) {
    footerExtraRows.push(
      `<p style="margin:2px 0;color:#94a3b8;font-size:11px;text-align:center;"><a href="https://beian.mps.gov.cn/#/query/webSearch" target="_blank" rel="noopener noreferrer" style="color:#94a3b8;text-decoration:none;">${about.policeRecord}</a></p>`
    );
  }
  // 开源项目提示 + 版本号（与网站页脚同步，GitHub 开源项目与许可协议分两行）
  const versionPart = about.version ? ` · v${about.version}` : '';
  footerExtraRows.push(
    `<p style="margin:2px 0;color:#94a3b8;font-size:11px;text-align:center;"><a href="https://github.com/Furry09shou/furry-drama-tracker" target="_blank" rel="noopener noreferrer" style="color:#94a3b8;text-decoration:none;">GitHub 开源项目</a></p>`
  );
  footerExtraRows.push(
    `<p style="margin:2px 0;color:#94a3b8;font-size:11px;text-align:center;"><span style="color:#94a3b8;">GPL v3.0 / AGPL v3.0 许可协议</span>${versionPart}</p>`
  );

  const footerExtra = footerExtraRows.join('');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light only">
  <title>${displayName}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:'Segoe UI','Microsoft YaHei','PingFang SC','Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;line-height:1.6;">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${preheader}</div>` : ''}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;">
    <tr>
      <td align="center" style="padding:28px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(99,102,241,0.10),0 1px 3px rgba(0,0,0,0.04);">
          <tr>
            <td style="background-color:#6366f1;padding:20px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;">
                    <img src="${logoUrl}" alt="${displayName}" width="36" height="36" style="display:inline-block;vertical-align:middle;margin-right:12px;border-radius:9px;">
                    <span style="display:inline-block;vertical-align:middle;color:#ffffff;font-size:19px;font-weight:700;letter-spacing:-0.02em;">${displayName}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px 12px;">
              ${bodyContent}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 28px;background-color:#f8fafc;border-top:1px solid #e2e8f0;">
              <p style="margin:0 0 4px;color:#64748b;font-size:12px;text-align:center;">&copy; ${year} ${displayName}</p>
              <p style="margin:0;color:#94a3b8;font-size:11px;text-align:center;">此邮件由系统自动发送，请勿直接回复</p>
              ${footerExtra}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
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
  const siteUrl = getSiteUrl();
  const resetUrl = `${siteUrl}/reset-password?token=${resetToken}`;
  const fromName = await getFromName();
  const fromUser = await getFromUser();
  try {
    await transporter.sendMail({
      from: `"${fromName}" <${fromUser}>`,
      to: email,
      subject: '密码重置 - 兽剧聚合平台',
      html: await buildEmailHTML(fromName, siteUrl, `
        <h2 style="margin:0 0 16px;color:#1e293b;font-size:22px;font-weight:700;">密码重置</h2>
        <p style="margin:0 0 16px;color:#475569;font-size:14px;">您收到此邮件是因为您（或其他人）请求重置账户密码。请点击下方按钮完成重置：</p>
        <p style="margin:20px 0;">${emailButton('重置密码', resetUrl, 'primary')}</p>
        ${emailInfoBox('如果您没有请求重置密码，请忽略此邮件，您的密码不会被更改。<br><br>此链接 1 小时后失效。如无法点击按钮，请复制以下地址到浏览器：<br><span style="color:#6366f1;word-break:break-all;">' + resetUrl + '</span>', 'info')}
      `, { preheader: '您请求了密码重置' })
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
  const siteUrl = getSiteUrl();
  const verifyUrl = `${siteUrl}/verify-email?token=${verifyToken}`;
  const fromName = await getFromName();
  const fromUser = await getFromUser();
  try {
    await transporter.sendMail({
      from: `"${fromName}" <${fromUser}>`,
      to: email,
      subject: '邮箱验证 - 兽剧聚合平台',
      html: await buildEmailHTML(fromName, siteUrl, `
        <h2 style="margin:0 0 16px;color:#1e293b;font-size:22px;font-weight:700;">欢迎注册，请验证邮箱</h2>
        <p style="margin:0 0 16px;color:#475569;font-size:14px;">感谢您注册${fromName}！请点击下方按钮验证您的邮箱地址，完成注册流程：</p>
        <p style="margin:20px 0;">${emailButton('验证邮箱', verifyUrl, 'primary')}</p>
        ${emailInfoBox('如果您没有注册此账号，请忽略此邮件。<br><br>验证链接 24 小时内有效。如无法点击按钮，请复制以下地址到浏览器：<br><span style="color:#6366f1;word-break:break-all;">' + verifyUrl + '</span>', 'info')}
      `, { preheader: '请验证您的邮箱地址以完成注册' })
    });
    return true;
  } catch (error) {
    console.error('Send verification email error:', error);
    return false;
  }
};

// ===== 通知邮件 =====

const sendNotificationEmail = async (email, subject, htmlContent, preheader) => {
  const transporter = await createTransporter();
  if (!transporter) {
    return false;
  }
  const fromName = await getFromName();
  const fromUser = await getFromUser();
  const siteUrl = getSiteUrl();
  try {
    await transporter.sendMail({
      from: `"${fromName}" <${fromUser}>`,
      to: email,
      subject,
      html: await buildEmailHTML(fromName, siteUrl, htmlContent, { preheader })
    });
    return true;
  } catch (error) {
    console.error('[Email] Notification send error:', error);
    return false;
  }
};

// eventType: 'available'（可观看，默认）/ 'preview'（新预告）/ 'preview_video'（预告视频更新）/ 'preview_info'（预告信息更新）
const sendEpisodeUpdateEmail = async (email, episodeTitle, episodeNumber, eventType = 'available') => {
  const url = getSiteUrl();
  if (eventType === 'preview') {
    return sendNotificationEmail(email, `《${episodeTitle}》发布了第${episodeNumber}集预告`, `
      <h2 style="margin:0 0 16px;color:#1e293b;font-size:22px;font-weight:700;">追番预告提醒</h2>
      <p style="margin:0 0 16px;color:#475569;font-size:14px;">您关注的剧集发布了新预告！</p>
      ${emailInfoBox('<p style="margin:0 0 4px;font-size:16px;font-weight:600;">《' + episodeTitle + '》</p><p style="margin:0;color:#64748b;">发布了第 ' + episodeNumber + ' 集预告</p>', 'info')}
      <p style="margin:20px 0;">${emailButton('前往查看', url, 'primary')}</p>
      <p style="margin:0;color:#94a3b8;font-size:12px;">您可以在账号设置中关闭此类邮件通知。</p>
    `, '您关注的剧集发布了新预告');
  }
  if (eventType === 'preview_video') {
    return sendNotificationEmail(email, `《${episodeTitle}》第${episodeNumber}集预告视频已更新`, `
      <h2 style="margin:0 0 16px;color:#1e293b;font-size:22px;font-weight:700;">预告视频更新</h2>
      <p style="margin:0 0 16px;color:#475569;font-size:14px;">您关注的剧集预告视频有更新！</p>
      ${emailInfoBox('<p style="margin:0 0 4px;font-size:16px;font-weight:600;">《' + episodeTitle + '》</p><p style="margin:0;color:#64748b;">第 ' + episodeNumber + ' 集预告视频已更新</p>', 'info')}
      <p style="margin:20px 0;">${emailButton('前往查看', url, 'primary')}</p>
      <p style="margin:0;color:#94a3b8;font-size:12px;">您可以在账号设置中关闭此类邮件通知。</p>
    `, '您关注的剧集预告视频已更新');
  }
  if (eventType === 'preview_info') {
    return sendNotificationEmail(email, `《${episodeTitle}》第${episodeNumber}集预告信息已更新`, `
      <h2 style="margin:0 0 16px;color:#1e293b;font-size:22px;font-weight:700;">预告信息更新</h2>
      <p style="margin:0 0 16px;color:#475569;font-size:14px;">您关注的剧集预告信息有更新！</p>
      ${emailInfoBox('<p style="margin:0 0 4px;font-size:16px;font-weight:600;">《' + episodeTitle + '》</p><p style="margin:0;color:#64748b;">第 ' + episodeNumber + ' 集预告信息已更新</p>', 'info')}
      <p style="margin:20px 0;">${emailButton('前往查看', url, 'primary')}</p>
      <p style="margin:0;color:#94a3b8;font-size:12px;">您可以在账号设置中关闭此类邮件通知。</p>
    `, '您关注的剧集预告信息已更新');
  }
  if (eventType === 'completed') {
    return sendNotificationEmail(email, `《${episodeTitle}》已完结`, `
      <h2 style="margin:0 0 16px;color:#1e293b;font-size:22px;font-weight:700;">剧集完结提醒</h2>
      <p style="margin:0 0 16px;color:#475569;font-size:14px;">您追番的剧集已完结！</p>
      ${emailInfoBox('<p style="margin:0 0 4px;font-size:16px;font-weight:600;">《' + episodeTitle + '》</p><p style="margin:0;color:#64748b;">已完结，共 ' + episodeNumber + ' 集</p>', 'info')}
      <p style="margin:20px 0;">${emailButton('前往查看', url, 'primary')}</p>
      <p style="margin:0;color:#94a3b8;font-size:12px;">您可以在账号设置中关闭此类邮件通知。</p>
    `, '您追番的剧集已完结');
  }
  return sendNotificationEmail(email, `《${episodeTitle}》更新了第${episodeNumber}集`, `
    <h2 style="margin:0 0 16px;color:#1e293b;font-size:22px;font-weight:700;">追番更新提醒</h2>
    <p style="margin:0 0 16px;color:#475569;font-size:14px;">您关注的剧集有新更新啦！</p>
    ${emailInfoBox('<p style="margin:0 0 4px;font-size:16px;font-weight:600;">《' + episodeTitle + '》</p><p style="margin:0;color:#64748b;">已更新至第 ' + episodeNumber + ' 集</p>', 'info')}
    <p style="margin:20px 0;">${emailButton('前往观看', url, 'primary')}</p>
    <p style="margin:0;color:#94a3b8;font-size:12px;">您可以在账号设置中关闭此类邮件通知。</p>
  `, '您关注的剧集有新更新');
};

const sendNewDeviceLoginEmail = async (email, deviceInfo, ip, region, loginTime) => {
  const url = getSiteUrl();
  const timeStr = new Date(loginTime).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
  const appleNote = (deviceInfo.os === 'iOS' || deviceInfo.os === 'iPadOS' || deviceInfo.os === 'macOS')
    ? '<p style="margin:8px 0 0;color:#94a3b8;font-size:12px;">* 因为 Apple 隐私策略，版本号可能不准确</p>'
    : '';
  return sendNotificationEmail(email, '新设备登录提醒', `
    <h2 style="margin:0 0 16px;color:#1e293b;font-size:22px;font-weight:700;">⚠️ 新设备登录提醒</h2>
    <p style="margin:0 0 16px;color:#475569;font-size:14px;">您的账号于以下时间在新设备上登录：</p>
    ${emailInfoBox(
      '<p style="margin:4px 0;"><strong>登录时间：</strong>' + timeStr + '</p>' +
      '<p style="margin:4px 0;"><strong>浏览器：</strong>' + (deviceInfo.browser || '未知') + ' ' + (deviceInfo.browserVersion || '') + '</p>' +
      '<p style="margin:4px 0;"><strong>操作系统：</strong>' + (deviceInfo.os || '未知') + ' ' + (deviceInfo.osVersion || '') + '</p>' +
      '<p style="margin:4px 0;"><strong>设备类型：</strong>' + (deviceInfo.deviceType || '未知') + '</p>' +
      '<p style="margin:4px 0;"><strong>IP 地址：</strong>' + (ip || '未知') + (region ? ' (' + region + ')' : '') + '</p>' +
      appleNote,
      'warning'
    )}
    <p style="margin:16px 0;color:#ef4444;font-weight:600;font-size:14px;">如非本人操作，请立即修改密码并检查账号安全设置。</p>
    <p style="margin:20px 0;">${emailButton('前往安全设置', url + '/account-security', 'danger')}</p>
    <p style="margin:0;color:#94a3b8;font-size:12px;">您可以在账号设置中关闭此类邮件通知。</p>
  `, '您的账号在新设备上登录');
};

const sendFeedbackReplyEmail = async (email, replyContent) => {
  const url = getSiteUrl() + '/profile';
  return sendNotificationEmail(email, '您的反馈已收到回复', `
    <h2 style="margin:0 0 16px;color:#1e293b;font-size:22px;font-weight:700;">反馈回复通知</h2>
    <p style="margin:0 0 16px;color:#475569;font-size:14px;">您提交的反馈已收到管理员的回复：</p>
    ${emailInfoBox('<p style="margin:0;">' + replyContent + '</p>', 'info')}
    <p style="margin:20px 0;">${emailButton('查看详情', url, 'primary')}</p>
    <p style="margin:0;color:#94a3b8;font-size:12px;">您可以在账号设置中关闭此类邮件通知。</p>
  `, '您的反馈已收到回复');
};

const sendFriendLinkStatusEmail = async (email, linkName, statusLabel) => {
  const url = getSiteUrl() + '/profile';
  return sendNotificationEmail(email, `友链申请${statusLabel}`, `
    <h2 style="margin:0 0 16px;color:#1e293b;font-size:22px;font-weight:700;">友链审核结果</h2>
    <p style="margin:0 0 16px;color:#475569;font-size:14px;">您申请的友链「<strong>${linkName}</strong>」审核结果：</p>
    ${emailInfoBox('<p style="margin:0;font-size:18px;font-weight:600;">' + statusLabel + '</p>', 'success')}
    <p style="margin:20px 0;">${emailButton('查看详情', url, 'primary')}</p>
    <p style="margin:0;color:#94a3b8;font-size:12px;">您可以在账号设置中关闭此类邮件通知。</p>
  `, '友链审核结果：' + statusLabel);
};

const sendFriendLinkApplyEmail = async (email, applicantName) => {
  const url = getSiteUrl() + '/admin/friend-links';
  return sendNotificationEmail(email, '新友链申请', `
    <h2 style="margin:0 0 16px;color:#1e293b;font-size:22px;font-weight:700;">新友链申请</h2>
    <p style="margin:0 0 16px;color:#475569;font-size:14px;">收到来自「<strong>${applicantName}</strong>」的友链申请，请前往管理后台审核。</p>
    <p style="margin:20px 0;">${emailButton('前往审核', url, 'primary')}</p>
    <p style="margin:0;color:#94a3b8;font-size:12px;">您可以在账号设置中关闭此类邮件通知。</p>
  `, '收到新的友链申请');
};

// 剧集审核结果通知邮件（发给创作者）
// status: 'approved' | 'rejected'
const sendReviewResultEmail = async (email, episodeTitle, status, note = '') => {
  const isApproved = status === 'approved';
  const url = getSiteUrl() + '/admin/episodes';
  const subject = isApproved ? `您的剧集《${episodeTitle}》已通过审核` : `您的剧集《${episodeTitle}》未通过审核`;
  const statusLabel = isApproved ? '已通过审核' : '未通过审核';
  const boxType = isApproved ? 'success' : 'warning';
  let noteBlock = '';
  if (note) {
    noteBlock = `<p style="margin:12px 0 0;color:#475569;font-size:14px;">审核备注：</p>${emailInfoBox('<p style="margin:0;">' + note + '</p>', boxType)}`;
  }
  return sendNotificationEmail(email, subject, `
    <h2 style="margin:0 0 16px;color:#1e293b;font-size:22px;font-weight:700;">剧集审核结果</h2>
    <p style="margin:0 0 16px;color:#475569;font-size:14px;">您提交的剧集「<strong>${episodeTitle}</strong>」审核结果：</p>
    ${emailInfoBox('<p style="margin:0;font-size:18px;font-weight:600;">' + statusLabel + '</p>', boxType)}
    ${noteBlock}
    <p style="margin:20px 0;">${emailButton('前往管理', url, 'primary')}</p>
    <p style="margin:0;color:#94a3b8;font-size:12px;">您可以在账号设置中关闭此类邮件通知。</p>
  `, subject);
};

module.exports = {
  sendPasswordResetEmail,
  sendVerificationEmail,
  clearEmailCache,
  createTransporter,
  getFromName,
  getFromUser,
  getSiteUrl,
  buildEmailHTML,
  emailButton,
  emailInfoBox,
  sendEpisodeUpdateEmail,
  sendNewDeviceLoginEmail,
  sendFeedbackReplyEmail,
  sendFriendLinkStatusEmail,
  sendFriendLinkApplyEmail,
  sendReviewResultEmail,
  sendNotificationEmail,
};
