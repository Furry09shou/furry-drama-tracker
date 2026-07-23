// 特征测试：注册 → 登录 → /me → 登出 主流程
// 锁定当前 auth.js 行为，作为后续拆分重构的安全网。
const request = require('supertest');
const mongoose = require('mongoose');
const User = require('../../models/User');
const UserSession = require('../../models/UserSession');
const { createApp } = require('../helpers/createApp');
const { connectDB, clearDB } = require('../helpers/db');

// 邮件/通知/审计为副作用模块，mock 掉以聚焦 auth 行为
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
const USER = { accountId: 'testuser1', username: 'tester', email: 'test1@example.com', password: 'Password1', altcha: 'x' };

// Phase B smoke test: 确认 Node 解析到 routes/auth/index.js（而非旧 auth.js 文件）
it('split auth router 标记存在', () => {
  expect(require('../../routes/auth').__isSplitAuthRouter).toBe(true);
});

describe('auth session flow: register/login/me/logout', () => {
  let app;
  beforeAll(async () => { await connectDB(); app = createApp(); });
  afterAll(async () => { await mongoose.connection.close(); });
  beforeEach(async () => { await clearDB(); });

  describe('POST /api/auth/register', () => {
    it('注册成功，返回 needVerification，用户未验证', async () => {
      const res = await request(app).post('/api/auth/register').set(DEV).send(USER);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        message: '注册成功，请验证邮箱后登录',
        email: 'test1@example.com',
        needVerification: true,
      });
      const user = await User.findOne({ email: 'test1@example.com' });
      expect(user).toBeTruthy();
      expect(user.isEmailVerified).toBe(false);
      expect(user.accountId).toBe('testuser1');
      expect(user.role).toBe('user');
    });

    it('无 dev token 时 altcha 校验失败 → 400', async () => {
      const res = await request(app).post('/api/auth/register').send(USER);
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('验证码错误或已过期');
    });

    it('邮箱格式不正确 → 400', async () => {
      const res = await request(app).post('/api/auth/register').set(DEV).send({ ...USER, email: 'bad-email' });
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('邮箱格式不正确');
    });

    it('accountId 过短 → 400', async () => {
      const res = await request(app).post('/api/auth/register').set(DEV).send({ ...USER, accountId: 'ab' });
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('账号ID长度需在3-20个字符之间');
    });

    it('密码强度不足 → 400', async () => {
      const res = await request(app).post('/api/auth/register').set(DEV).send({ ...USER, password: 'short1' });
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('密码长度至少8位');
    });

    it('重复邮箱 → 400', async () => {
      await request(app).post('/api/auth/register').set(DEV).send(USER);
      const res = await request(app).post('/api/auth/register').set(DEV).send({ ...USER, accountId: 'another1' });
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('该邮箱已被注册');
    });

    it('重复 accountId → 400', async () => {
      await request(app).post('/api/auth/register').set(DEV).send(USER);
      const res = await request(app).post('/api/auth/register').set(DEV).send({ ...USER, email: 'test2@example.com' });
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('该账号ID已被占用');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(app).post('/api/auth/register').set(DEV).send(USER);
    });

    it('未验证用户带 dev token 登录成功，设置双 cookie', async () => {
      const res = await request(app).post('/api/auth/login').set(DEV).send({ email: USER.email, password: USER.password });
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        accountId: 'testuser1',
        username: 'tester',
        email: 'test1@example.com',
        isEmailVerified: false,
        role: 'user',
        forceEmailChange: false,
      });
      // User schema 默认值：{ image:'', enabled:false, opacity:30, blur:0 }，login 返回 user.backgroundPrefs || {}
      expect(res.body.backgroundPrefs).toMatchObject({ image: '', enabled: false, opacity: 30, blur: 0 });
      expect(res.body.personalWallpapers).toEqual([]);
      const cookies = res.headers['set-cookie'] || [];
      expect(cookies.some(c => c.startsWith('accessToken='))).toBe(true);
      expect(cookies.some(c => c.startsWith('refreshToken='))).toBe(true);
      // 应创建一个活跃 session
      const sessions = await UserSession.countDocuments({ isActive: true });
      expect(sessions).toBe(1);
    });

    it('密码错误 → 400 用户名或密码错误', async () => {
      const res = await request(app).post('/api/auth/login').set(DEV).send({ email: USER.email, password: 'WrongPass1' });
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('用户名或密码错误');
    });

    it('用户不存在 → 400 用户名或密码错误', async () => {
      const res = await request(app).post('/api/auth/login').set(DEV).send({ email: 'nobody@example.com', password: 'Password1' });
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('用户名或密码错误');
    });

    // 注：login 路由 L395 先校验 altcha（无 dev token → 400 "验证码错误或已过期"），
    // 而 dev token 同时绕过 altcha(L177) 与邮箱验证(L431)。因此 needVerification 403 路径
    // 在测试环境不可达（要过 altcha 必带 dev token，带 dev token 就绕过邮箱验证）。
    // 该路径由生产环境真实 altcha 触发，不在此特征测试覆盖范围内。
  });

  describe('GET /api/auth/me', () => {
    it('带 access token 返回当前用户信息', async () => {
      const agent = request.agent(app);
      await agent.post('/api/auth/register').set(DEV).send(USER);
      await agent.post('/api/auth/login').set(DEV).send({ email: USER.email, password: USER.password });
      const res = await agent.get('/api/auth/me');
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        accountId: 'testuser1',
        username: 'tester',
        email: 'test1@example.com',
        isEmailVerified: false,
        role: 'user',
        avatar: '',
      });
      expect(res.body.emailNotificationPrefs).toBeDefined();
    });

    it('无 token → 401 auth.noToken', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.messageKey).toBe('auth.noToken');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('登出成功，session 失效，cookie 清除', async () => {
      const agent = request.agent(app);
      await agent.post('/api/auth/register').set(DEV).send(USER);
      await agent.post('/api/auth/login').set(DEV).send({ email: USER.email, password: USER.password });
      const res = await agent.post('/api/auth/logout');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: '退出成功' });
      // session 应全部失效
      const active = await UserSession.countDocuments({ isActive: true });
      expect(active).toBe(0);
      // cookie 应被清除（Set-Cookie 含空值过期）
      const cookies = res.headers['set-cookie'] || [];
      expect(cookies.some(c => c.startsWith('accessToken=;'))).toBe(true);
    });

    it('无 token → 401', async () => {
      const res = await request(app).post('/api/auth/logout');
      expect(res.status).toBe(401);
    });
  });
});
