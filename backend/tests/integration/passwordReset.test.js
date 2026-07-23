// P1 集成测试：密码重置流程 forgot-password + reset-password
const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const { createApp } = require('../helpers/createApp');
const { connectDB, clearDB } = require('../helpers/db');
const { sendPasswordResetEmail } = require('../../utils/email');

jest.mock('../../utils/email', () => ({
  sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
  sendVerificationEmail: jest.fn().mockResolvedValue(true),
  createTransporter: jest.fn().mockResolvedValue(null),
  getFromName: jest.fn().mockReturnValue('Test'),
  getFromUser: jest.fn().mockReturnValue('test@test.com'),
}));
jest.mock('../../utils/notifyHelper', () => ({ sendNotificationEmailToUser: jest.fn() }));
jest.mock('../../middlewares/auditLog', () => ({ logManual: jest.fn() }));

const DEV = { 'x-dev-token': 'test-dev-token' };
const USER = { accountId: 'pwtest1', username: 'pwtester', email: 'pw1@example.com', password: 'Password1', altcha: 'x' };

describe('auth password reset flow', () => {
  let app;
  beforeAll(async () => { await connectDB(); app = createApp(); });
  afterAll(async () => { await mongoose.connection.close(); });
  beforeEach(async () => {
    await clearDB();
    sendPasswordResetEmail.mockClear();
    await request(app).post('/api/auth/register').set(DEV).send(USER);
  });

  describe('POST /api/auth/forgot-password', () => {
    it('已注册邮箱 + dev token → 200 通用消息，触发邮件', async () => {
      const res = await request(app).post('/api/auth/forgot-password').set(DEV).send({ email: USER.email, altcha: 'x' });
      expect(res.status).toBe(200);
      expect(res.body.message).toContain('已发送至邮箱');
      expect(sendPasswordResetEmail).toHaveBeenCalled();
    });

    it('不存在的邮箱 → 200 相同消息（不泄露用户存在性）', async () => {
      const res = await request(app).post('/api/auth/forgot-password').set(DEV).send({ email: 'nonexistent@example.com', altcha: 'x' });
      expect(res.status).toBe(200);
      expect(res.body.message).toContain('已发送至邮箱');
      expect(sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('无 dev token → 400 验证码错误', async () => {
      const res = await request(app).post('/api/auth/forgot-password').send({ email: USER.email, altcha: 'x' });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('验证码');
    });
  });

  describe('POST /api/auth/reset-password', () => {
    it('有效 token + 合法新密码 → 200 密码重置成功', async () => {
      const user = await User.findOne({ email: USER.email });
      const token = jwt.sign({ id: String(user._id), purpose: 'reset-password' }, process.env.JWT_SECRET, { expiresIn: '1h' });
      const res = await request(app).post('/api/auth/reset-password').send({ token, newPassword: 'NewPassword2' });
      expect(res.status).toBe(200);
      expect(res.body.message).toContain('成功');
      const updated = await User.findById(user._id).select('+password');
      expect(await updated.matchPassword('NewPassword2')).toBe(true);
      expect(await updated.matchPassword(USER.password)).toBe(false);
    });

    it('重用已用 token → 400 该重置链接已使用', async () => {
      const user = await User.findOne({ email: USER.email });
      const token = jwt.sign({ id: String(user._id), purpose: 'reset-password' }, process.env.JWT_SECRET, { expiresIn: '1h' });
      await request(app).post('/api/auth/reset-password').send({ token, newPassword: 'NewPassword2' });
      const res = await request(app).post('/api/auth/reset-password').send({ token, newPassword: 'AnotherPass3' });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('已使用');
    });

    it('弱密码 → 400', async () => {
      const user = await User.findOne({ email: USER.email });
      const token = jwt.sign({ id: String(user._id), purpose: 'reset-password' }, process.env.JWT_SECRET, { expiresIn: '1h' });
      const res = await request(app).post('/api/auth/reset-password').send({ token, newPassword: '123' });
      expect(res.status).toBe(400);
    });

    it('无效 token → 400', async () => {
      const res = await request(app).post('/api/auth/reset-password').send({ token: 'invalid-token', newPassword: 'NewPassword2' });
      expect(res.status).toBe(400);
    });

    it('purpose 错误的 token → 400', async () => {
      const user = await User.findOne({ email: USER.email });
      const token = jwt.sign({ id: String(user._id), purpose: 'verify-email' }, process.env.JWT_SECRET, { expiresIn: '1h' });
      const res = await request(app).post('/api/auth/reset-password').send({ token, newPassword: 'NewPassword2' });
      expect(res.status).toBe(400);
    });
  });
});
