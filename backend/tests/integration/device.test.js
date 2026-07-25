// 特征测试：新设备登录验证码流程（邮件直发码 / 旧链接取码）→ confirm-device-login

// 捕获 sendMail 调用以从邮件 HTML 提取验证码。
// 必须在所有 require 之前声明：jest.mock 工厂会被 hoist 到顶部，但变量声明不会；
// 而 require('../helpers/createApp') 会触发 email 模块加载 → 工厂执行 → 引用 mockSendMail。
// 变量名以 mock 开头是 jest 允许在工厂中引用外部变量的前置条件。
const mockSendMail = jest.fn().mockResolvedValue(true);
jest.mock('../../utils/email', () => ({
  sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
  sendVerificationEmail: jest.fn().mockResolvedValue(true),
  createTransporter: jest.fn().mockResolvedValue({ sendMail: mockSendMail }),
  getFromName: jest.fn().mockReturnValue('Test'),
  getFromUser: jest.fn().mockReturnValue('test@test.com'),
}));
jest.mock('../../utils/notifyHelper', () => ({ sendNotificationEmailToUser: jest.fn() }));
jest.mock('../../middlewares/auditLog', () => ({ logManual: jest.fn() }));
// mock altcha 通过，使无 dev token 的 login 请求能进入新设备验证分支
jest.mock('../../utils/altcha', () => ({
  ALTCHA_HMAC_KEY: 'test-altcha-hmac-key',
  DEV_API_TOKEN: 'test-dev-token',
  verifyAltcha: jest.fn().mockResolvedValue(true),
}));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../../models/User');
const { createApp } = require('../helpers/createApp');
const { connectDB, clearDB } = require('../helpers/db');

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

  // 注：现在 altcha 已被 mock 为恒通过，无 dev token 的 login 也能进入新设备验证分支，
  // 由下方"login 新设备检测"用例覆盖（邮件直发验证码 → confirm-device-login）。
  // 旧 verify-device 链接路径（向后兼容）由再下一个用例直接覆盖。

  it('login 新设备检测 → 邮件含验证码 → confirm-device-login 完成登录', async () => {
    await makeVerifiedUser(app);
    // 设备 A 登录建立首个 session（带 dev token 绕过 altcha 与设备验证）
    await request(app).post('/api/auth/login').set(DEV).set('User-Agent', UA_A).send({ email: USER.email, password: USER.password });

    // 设备 B 登录：不带 dev token，altcha mock 通过 → 触发新设备验证 → 邮件直发验证码
    mockSendMail.mockClear();
    const loginRes = await request(app).post('/api/auth/login')
      .set('User-Agent', UA_B)
      .send({ email: USER.email, password: USER.password, altcha: 'x' });
    expect(loginRes.status).toBe(403);
    expect(loginRes.body.needDeviceVerify).toBe(true);
    expect(loginRes.body.email).toBe(USER.email);

    // 从邮件 HTML 提取 6 位验证码（渐变框内 >\d{6}<）
    expect(mockSendMail).toHaveBeenCalledTimes(1);
    const emailHtml = mockSendMail.mock.calls[0][0].html;
    const match = emailHtml.match(/>(\d{6})</);
    expect(match).not.toBeNull();
    const code = match[1];

    // 用验证码在原浏览器完成登录
    const confirmRes = await request(app).post('/api/auth/confirm-device-login')
      .set('User-Agent', UA_B)
      .send({ loginCode: code });
    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body).toMatchObject({ email: USER.email, accountId: 'dev1' });
    const cookies = confirmRes.headers['set-cookie'] || [];
    expect(cookies.some((c) => c.startsWith('accessToken='))).toBe(true);
  });

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
