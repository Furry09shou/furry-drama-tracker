// 特征测试：2FA 登录流程 login(+2FA) → login-2fa
const request = require('supertest');
const mongoose = require('mongoose');
const User = require('../../models/User');
const { createApp } = require('../helpers/createApp');
const { connectDB, clearDB } = require('../helpers/db');
const { generateTOTPSecret } = require('../../utils/helpers');
const { encryptField, encryptArray } = require('../../utils/crypto');
const { generateTOTPCode } = require('../helpers/totp');

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
const USER = { accountId: 'tfa1', username: 't', email: 'tfa1@example.com', password: 'Password1', altcha: 'x' };

// 注册并启用 2FA（直接写入加密 secret），返回明文 secret 供测试生成 TOTP
async function make2FAUser(app) {
  await request(app).post('/api/auth/register').set(DEV).send(USER);
  const secret = generateTOTPSecret();
  await User.updateOne(
    { email: USER.email },
    { $set: { isEmailVerified: true, twoFactorEnabled: true, twoFactorSecret: encryptField(secret) } }
  );
  return secret;
}

describe('auth 2FA login flow', () => {
  let app;
  let secret;
  beforeAll(async () => { await connectDB(); app = createApp(); });
  afterAll(async () => { await mongoose.connection.close(); });
  beforeEach(async () => { await clearDB(); });

  async function loginGet2FAChallenge() {
    const res = await request(app).post('/api/auth/login').set(DEV).send({ email: USER.email, password: USER.password });
    return res;
  }

  it('2FA 用户登录返回 need2FA + twoFactorChallenge，不设置 cookie', async () => {
    secret = await make2FAUser(app);
    const res = await loginGet2FAChallenge();
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ need2FA: true, email: USER.email });
    expect(res.body.twoFactorChallenge).toBeTruthy();
    // 2FA 未完成，不应设置 access cookie
    const cookies = res.headers['set-cookie'] || [];
    expect(cookies.some((c) => c.startsWith('accessToken='))).toBe(false);
  });

  it('login-2fa 凭有效 TOTP 完成登录，设置双 cookie', async () => {
    secret = await make2FAUser(app);
    const loginRes = await loginGet2FAChallenge();
    const challenge = loginRes.body.twoFactorChallenge;

    const res = await request(app).post('/api/auth/login-2fa').send({
      email: USER.email,
      twoFactorChallenge: challenge,
      twoFactorToken: generateTOTPCode(secret),
    });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ accountId: 'tfa1', email: USER.email, isEmailVerified: true, role: 'user' });
    const cookies = res.headers['set-cookie'] || [];
    expect(cookies.some((c) => c.startsWith('accessToken='))).toBe(true);
    expect(cookies.some((c) => c.startsWith('refreshToken='))).toBe(true);
  });

  it('login-2fa 缺少 challenge → 400', async () => {
    secret = await make2FAUser(app);
    const res = await request(app).post('/api/auth/login-2fa').send({ email: USER.email, twoFactorToken: '123456' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('缺少2FA挑战令牌，请重新登录');
  });

  it('login-2fa 无效 TOTP → 400 验证码无效', async () => {
    secret = await make2FAUser(app);
    const loginRes = await loginGet2FAChallenge();
    const res = await request(app).post('/api/auth/login-2fa').send({
      email: USER.email,
      twoFactorChallenge: loginRes.body.twoFactorChallenge,
      twoFactorToken: '000000',
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('验证码无效');
  });

  it('login-2fa 连续 5 次失败后账号锁定 → 423', async () => {
    secret = await make2FAUser(app);
    const loginRes = await loginGet2FAChallenge();
    const challenge = loginRes.body.twoFactorChallenge;
    // 前 4 次：400 验证码无效
    for (let i = 0; i < 4; i++) {
      // eslint-disable-next-line no-await-in-loop
      const r = await request(app).post('/api/auth/login-2fa').send({
        email: USER.email,
        twoFactorChallenge: challenge,
        twoFactorToken: '000000',
      });
      expect(r.status).toBe(400);
    }
    // 第 5 次：423 锁定
    const res = await request(app).post('/api/auth/login-2fa').send({
      email: USER.email,
      twoFactorChallenge: challenge,
      twoFactorToken: '000000',
    });
    expect(res.status).toBe(423);
  });

  it('login-2fa 用备份码登录成功并消耗该备份码', async () => {
    // 注册启用 2FA + 写入一个加密备份码
    await request(app).post('/api/auth/register').set(DEV).send(USER);
    const plainSecret = generateTOTPSecret();
    const backupCode = 'aa11bb22cc33dd44';
    await User.updateOne(
      { email: USER.email },
      {
        $set: {
          isEmailVerified: true,
          twoFactorEnabled: true,
          twoFactorSecret: encryptField(plainSecret),
          twoFactorBackupCodes: encryptArray([backupCode]),
        },
      }
    );
    secret = plainSecret;

    const loginRes = await loginGet2FAChallenge();
    const res = await request(app).post('/api/auth/login-2fa').send({
      email: USER.email,
      twoFactorChallenge: loginRes.body.twoFactorChallenge,
      twoFactorToken: backupCode,
    });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ accountId: 'tfa1' });

    // 备份码应被消耗：重新登录后用同一备份码应失败
    const loginRes2 = await loginGet2FAChallenge();
    const res2 = await request(app).post('/api/auth/login-2fa').send({
      email: USER.email,
      twoFactorChallenge: loginRes2.body.twoFactorChallenge,
      twoFactorToken: backupCode,
    });
    expect(res2.status).toBe(400);
    expect(res2.body.message).toBe('验证码无效');
  });
});
