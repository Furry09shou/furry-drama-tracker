// P1 集成测试：邮箱变更流程 request-email-change + verify-email-change
const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const UserSession = require('../../models/UserSession');
const { createApp } = require('../helpers/createApp');
const { connectDB, clearDB } = require('../helpers/db');

// createTransporter 返回假 transporter（非 null），否则 request-email-change 会 503
// sendMail 定义在 factory 内部并暴露为 __sendMail 供测试访问（jest.mock 会被提升到顶部，
// 外部 const 变量在 factory 执行时尚处 TDZ）
jest.mock('../../utils/email', () => {
  const sendMail = jest.fn().mockResolvedValue(true);
  return {
    sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
    sendVerificationEmail: jest.fn().mockResolvedValue(true),
    createTransporter: jest.fn().mockResolvedValue({ sendMail }),
    getFromName: jest.fn().mockReturnValue('Test'),
    getFromUser: jest.fn().mockReturnValue('test@test.com'),
    __sendMail: sendMail,
  };
});
jest.mock('../../utils/notifyHelper', () => ({ sendNotificationEmailToUser: jest.fn() }));
jest.mock('../../middlewares/auditLog', () => ({ logManual: jest.fn() }));

const email = require('../../utils/email');

const DEV = { 'x-dev-token': 'test-dev-token' };
const USER = { accountId: 'emailtest1', username: 'emailtester', email: 'ec1@example.com', password: 'Password1', altcha: 'x' };

async function loginAndGetCookie(app, email, password) {
  const res = await request(app).post('/api/auth/login').set(DEV).send({ email, password, altcha: 'x' });
  const cookies = res.headers['set-cookie'];
  const accessTokenCookie = cookies.find(c => c.startsWith('accessToken='));
  return accessTokenCookie;
}

describe('auth email change flow', () => {
  let app;
  beforeAll(async () => { await connectDB(); app = createApp(); });
  afterAll(async () => { await mongoose.connection.close(); });
  beforeEach(async () => {
    await clearDB();
    email.__sendMail.mockClear();
    await request(app).post('/api/auth/register').set(DEV).send(USER);
  });

  describe('POST /api/auth/request-email-change', () => {
    it('未登录 → 401', async () => {
      const res = await request(app).post('/api/auth/request-email-change').send({ password: USER.password, newEmail: 'new@example.com', altcha: 'x' });
      expect(res.status).toBe(401);
    });

    it('登录 + dev token + 正确密码 + 新邮箱 → 200，发送邮件', async () => {
      const cookie = await loginAndGetCookie(app, USER.email, USER.password);
      const res = await request(app).post('/api/auth/request-email-change')
        .set('Cookie', cookie).set(DEV)
        .send({ password: USER.password, newEmail: 'new@example.com', altcha: 'x' });
      expect(res.status).toBe(200);
      expect(res.body.message).toContain('验证邮件');
      expect(email.__sendMail).toHaveBeenCalled();
    });

    it('密码错误 → 400 密码不正确', async () => {
      const cookie = await loginAndGetCookie(app, USER.email, USER.password);
      const res = await request(app).post('/api/auth/request-email-change')
        .set('Cookie', cookie).set(DEV)
        .send({ password: 'WrongPassword1', newEmail: 'new@example.com', altcha: 'x' });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('密码不正确');
    });

    it('新邮箱与当前邮箱相同 → 400 新邮箱与当前邮箱相同', async () => {
      const cookie = await loginAndGetCookie(app, USER.email, USER.password);
      const res = await request(app).post('/api/auth/request-email-change')
        .set('Cookie', cookie).set(DEV)
        .send({ password: USER.password, newEmail: USER.email, altcha: 'x' });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('相同');
    });
  });

  describe('POST /api/auth/verify-email-change', () => {
    it('有效 token → 200 邮箱修改成功', async () => {
      const user = await User.findOne({ email: USER.email });
      const newEmail = 'changed@example.com';
      const token = jwt.sign({ id: String(user._id), newEmail, type: 'email-change' }, process.env.JWT_SECRET, { expiresIn: '1h' });
      const res = await request(app).post('/api/auth/verify-email-change').send({ token });
      expect(res.status).toBe(200);
      expect(res.body.message).toContain('成功');
      expect(res.body.email).toBe(newEmail);
      const updated = await User.findById(user._id);
      expect(updated.email).toBe(newEmail);
      expect(updated.isEmailVerified).toBe(true);
    });

    it('重用已用 token → 400 该验证链接已使用', async () => {
      const user = await User.findOne({ email: USER.email });
      const token = jwt.sign({ id: String(user._id), newEmail: 'changed2@example.com', type: 'email-change' }, process.env.JWT_SECRET, { expiresIn: '1h' });
      await request(app).post('/api/auth/verify-email-change').send({ token });
      const res = await request(app).post('/api/auth/verify-email-change').send({ token });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('已使用');
    });

    it('type 错误的 token → 400', async () => {
      const user = await User.findOne({ email: USER.email });
      const token = jwt.sign({ id: String(user._id), type: 'wrong' }, process.env.JWT_SECRET, { expiresIn: '1h' });
      const res = await request(app).post('/api/auth/verify-email-change').send({ token });
      expect(res.status).toBe(400);
    });

    it('缺少 token → 400', async () => {
      const res = await request(app).post('/api/auth/verify-email-change').send({});
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('令牌');
    });
  });
});
