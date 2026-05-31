const nodemailer = require('nodemailer');
const mongoose = require('mongoose');

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

const createTransporter = async () => {
  const dbConfig = await getEmailConfig();
  if (dbConfig) {
    return nodemailer.createTransport({
      host: dbConfig.host,
      port: parseInt(dbConfig.port || '465'),
      secure: parseInt(dbConfig.port || '465') === 465,
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
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '465'),
    secure: parseInt(process.env.EMAIL_PORT || '465') === 465,
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

module.exports = { sendPasswordResetEmail, sendVerificationEmail, clearEmailCache };
