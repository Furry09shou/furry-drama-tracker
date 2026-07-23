// 特征测试：refresh token 轮换 + 重用检测
const request = require('supertest');
const crypto = require('crypto');
const mongoose = require('mongoose');
const UserSession = require('../../models/UserSession');
const { createApp } = require('../helpers/createApp');
const { connectDB, clearDB } = require('../helpers/db');

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
const USER = { accountId: 'rfu1', username: 't', email: 'rfu1@example.com', password: 'Password1', altcha: 'x' };

const hash = (t) => crypto.createHash('sha256').update(t).digest('hex');
const extractRefresh = (res) => {
  const setCookie = res.headers['set-cookie'] || [];
  const c = setCookie.find((x) => x.startsWith('refreshToken='));
  return c ? c.split(';')[0].split('=')[1] : null;
};

async function registerAndLogin(app) {
  const agent = request.agent(app);
  await agent.post('/api/auth/register').set(DEV).send(USER);
  const loginRes = await agent.post('/api/auth/login').set(DEV).send({ email: USER.email, password: USER.password });
  return { agent, loginRes };
}

describe('auth refresh flow: rotation + reuse detection', () => {
  let app;
  beforeAll(async () => { await connectDB(); app = createApp(); });
  afterAll(async () => { await mongoose.connection.close(); });
  beforeEach(async () => { await clearDB(); });

  it('refresh 成功轮换：旧 session 失效、新 session 创建、返回用户信息、cookie 更新', async () => {
    const { agent, loginRes } = await registerAndLogin(app);
    const oldRefresh = extractRefresh(loginRes);
    expect(oldRefresh).toBeTruthy();

    const res = await agent.post('/api/auth/refresh');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ accountId: 'rfu1', email: 'rfu1@example.com', role: 'user' });

    const newRefresh = extractRefresh(res);
    expect(newRefresh).toBeTruthy();
    expect(newRefresh).not.toBe(oldRefresh);

    // 旧 refresh token 对应 session 已失效
    const oldSession = await UserSession.findOne({ refreshTokenHash: hash(oldRefresh) });
    expect(oldSession).toBeTruthy();
    expect(oldSession.isActive).toBe(false);

    // 仍有恰好 1 个活跃 session（新创建的）
    const active = await UserSession.countDocuments({ isActive: true });
    expect(active).toBe(1);
  });

  it('refresh token 重用：旧 token 再次使用 → 401 auth.refreshTokenReuse，吊销所有 session', async () => {
    const { agent, loginRes } = await registerAndLogin(app);
    const oldRefresh = extractRefresh(loginRes);

    // 第一次 refresh（轮换，agent cookie 更新为新 token）
    const r1 = await agent.post('/api/auth/refresh');
    expect(r1.status).toBe(200);

    // 用旧 token 再次 refresh（模拟重用攻击）—— 显式带旧 cookie，绕过 agent 的新 cookie
    const res = await request(app).post('/api/auth/refresh').set('Cookie', `refreshToken=${oldRefresh}`);
    expect(res.status).toBe(401);
    expect(res.body.messageKey).toBe('auth.refreshTokenReuse');

    // 所有 session 被吊销
    const active = await UserSession.countDocuments({ isActive: true });
    expect(active).toBe(0);
  });

  it('无 refresh token → 401 auth.noRefreshToken', async () => {
    const res = await request(app).post('/api/auth/refresh');
    expect(res.status).toBe(401);
    expect(res.body.messageKey).toBe('auth.noRefreshToken');
  });
});
