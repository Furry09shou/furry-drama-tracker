// 单元测试：models/UsedToken
// markTokenUsed / isTokenUsed / 重复键忽略
const mongoose = require('mongoose');
const { UsedToken, markTokenUsed, isTokenUsed } = require('../../models/UsedToken');
const { connectDB, clearDB } = require('../helpers/db');

describe('models/UsedToken', () => {
  beforeAll(async () => { await connectDB(); });
  afterAll(async () => { await mongoose.connection.close(); });
  beforeEach(async () => { await clearDB(); });

  it('markTokenUsed 后 isTokenUsed → true', async () => {
    await markTokenUsed('hash-aaa', 'verify-email', 60000);
    await expect(isTokenUsed('hash-aaa')).resolves.toBe(true);
  });

  it('未标记的 token → isTokenUsed false', async () => {
    await expect(isTokenUsed('hash-unused')).resolves.toBe(false);
  });

  it('重复 markTokenUsed（同 tokenHash）静默忽略，不报错', async () => {
    await markTokenUsed('hash-bbb', 'verify-email', 60000);
    await expect(markTokenUsed('hash-bbb', 'verify-email', 60000)).resolves.toBeUndefined();
    await expect(isTokenUsed('hash-bbb')).resolves.toBe(true);
  });

  it('不同 tokenHash 互不干扰', async () => {
    await markTokenUsed('hash-ccc', 'verify-email', 60000);
    await markTokenUsed('hash-ddd', 'device-verify', 60000);
    await expect(isTokenUsed('hash-ccc')).resolves.toBe(true);
    await expect(isTokenUsed('hash-ddd')).resolves.toBe(true);
    await expect(isTokenUsed('hash-eee')).resolves.toBe(false);
  });

  it('UsedToken 模型有 TTL 索引（expiresAt + expireAfterSeconds:0）', () => {
    const indexes = UsedToken.schema.indexes();
    const ttlIndex = indexes.find(
      ([fields, opts]) => fields.expiresAt === 1 && opts && opts.expireAfterSeconds === 0
    );
    expect(ttlIndex).toBeDefined();
  });

  it('tokenHash 字段有 unique 约束', () => {
    const tokenHashPath = UsedToken.schema.path('tokenHash');
    expect(tokenHashPath.options.unique).toBe(true);
    expect(tokenHashPath.options.required).toBe(true);
  });
});
