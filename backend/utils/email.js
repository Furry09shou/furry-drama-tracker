const nodemailer = require('nodemailer');

const createTransporter = () => {
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return null;
  }
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '465'),
    secure: parseInt(process.env.EMAIL_PORT || '465') === 465,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

const sendPasswordResetEmail = async (email, resetToken) => {
  const transporter = createTransporter();
  if (!transporter) {
    console.log(`[Email] Password reset token for ${email}: ${resetToken} (email not configured)`);
    return false;
  }
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
  try {
    await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME || '兽剧聚合平台'}" <${process.env.EMAIL_USER}>`,
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

module.exports = { sendPasswordResetEmail };
