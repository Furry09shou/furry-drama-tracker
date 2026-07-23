// 特征测试：新设备登录验证码流程 verify-device → confirm-device-login
const request = require('supertest');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../../models/User');
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
const USER = { accountId: 'dev1', username: 'd', email: 'dev1@example.com', password: 'Password1', altcha: 'x' };
const UA_A = 'Mozilla/5.0 (Windows NT 10.0) Chrome/120.0 Safari/537.36';
const UA_B = 'Mozilla/5.0 (X11; Linux x86_64) Firefox/121.0';

// 注册并直接置为已验证邮箱（绕过邮件验证环节，聚焦设备流程）
async function makeVerifiedUser(app) {
  await request(app).post('/api/auth/register').set(DEV).send(USER);
  await User.updateOne({ email: USER.email }, { $set: { isEmailVerified: true } });
}

describe('auth device verification flow', () => {
  let app;
  beforeAll(async () => { await connectDB(); app = createApp(); });
  afterAll(async () => { await mongoose.connection.close(); });
  beforeEach(async () => { await clearDB(); });

  it('已验证用户首次登录（带 dev token 绕过 altcha）成功', async () => {
    await makeVerifiedUser(app);
    const res = await request(app).post('/api/auth/login').set(DEV).set('User-Agent', UA_A).send({ email: USER.email, password: USER.password });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ accountId: 'dev1', email: USER.email, isEmailVerified: true });
  });

  // 注：login 路由 L395 先校验 altcha（无 dev token → 400），而 dev token 同时绕过
  // altcha(L177) 与新设备验证(L451)。因此 needDeviceVerify 403 路径在测试环境不可达
  // （要过 altcha 必带 dev token，带 dev token 就绕过设备验证）。该路径由生产环境真实
  // altcha 触发；设备流程的 verify-device + confirm-device-login 机制由下个用例直接覆盖。

  it('verify-device + confirm-device-login 完成新设备登录', async () => {
    await makeVerifiedUser(app);
    // 先用设备 A 登录建立 session（带 dev token 绕过 altcha）
    await request(app).post('/api/auth/login').set(DEV).set('User-Agent', UA_A).send({ email: USER.email, password: USER.password });

    // 构造 device-verify token（与 /login 内部签发格式一致：{id, purpose:'device-verify'}）
    const user = await User.findOne({ email: USER.email });
    const token = jwt.sign({ id: user._id.toString(), purpose: 'device-verify' }, process.env.JWT_SECRET, { expiresIn: '30m' });

    const verifyRes = await request(app).post('/api/auth/verify-device').send({ token });
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.verified).toBe(true);
    const code = verifyRes.body.loginCode;
    expect(code).toMatch(/^\d{6}$/);

    // 用验证码在原浏览器完成登录
    const confirmRes = await request(app).post('/api/auth/confirm-device-login').set('User-Agent', UA_B).send({ loginCode: code });
    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body).toMatchObject({ email: USER.email, accountId: 'dev1' });
    const cookies = confirmRes.headers['set-cookie'] || [];
    expect(cookies.some((c) => c.startsWith('accessToken='))).toBe(true);
  });

  it('verify-device 缺少 token → 400', async () => {
    const res = await request(app).post('/api/auth/verify-device').send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('缺少验证令牌');
  });

  it('verify-device token 用途错误 → 400', async () => {
    await makeVerifiedUser(app);
    const user = await User.findOne({ email: USER.email });
    const token = jwt.sign({ id: user._id.toString(), purpose: 'verify-email' }, process.env.JWT_SECRET, { expiresIn: '30m' });
    const res = await request(app).post('/api/auth/verify-device').send({ token });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('无效的验证令牌');
  });

  it('verify-device 重放已用 token → 400 该验证链接已被使用', async () => {
    await makeVerifiedUser(app);
    await request(app).post('/api/auth/login').set('User-Agent', UA_A).send({ email: USER.email, password: USER.password });
    const user = await User.findOne({ email: USER.email });
    const token = jwt.sign({ id: user._id.toString(), purpose: 'device-verify' }, process.env.JWT_SECRET, { expiresIn: '30m' });
    await request(app).post('/api/auth/verify-device').send({ token });
    const res = await request(app).post('/api/auth/verify-device').send({ token });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('该验证链接已被使用');
  });

  it('confirm-device-login 缺少验证码 → 400', async () => {
    const res = await request(app).post('/api/auth/confirm-device-login').send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('请输入验证码');
  });

  it('confirm-device-login 错误验证码 → 400 验证码无效或已过期', async () => {
    const res = await request(app).post('/api/auth/confirm-device-login').send({ loginCode: '000000' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('验证码无效或已过期，请重新验证');
  });
});
