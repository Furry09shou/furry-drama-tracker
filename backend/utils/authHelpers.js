// 认证辅助：DEMO_EMAILS 与 skipVerification
// DEMO_EMAILS 仅在非生产环境生效，允许指定邮箱跳过邮箱验证/设备验证等流程（测试与演示用）

const DEMO_EMAILS = (process.env.DEMO_EMAILS || 'demo@furry09.com').split(',').map(e => e.trim().toLowerCase());

const skipVerification = (user) => {
  // DEMO_EMAILS 仅在非生产环境生效，允许已存在的账号跳过验证
  if (process.env.NODE_ENV !== 'production' && DEMO_EMAILS.includes(user.email.toLowerCase())) return true;
  return false;
};

module.exports = { DEMO_EMAILS, skipVerification };
