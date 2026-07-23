// 单元测试：utils/altcha
// DEV_API_TOKEN 旁路 + 无效 payload 返回 false
// 测试环境 jest.setup.js 已设 DEV_API_TOKEN='test-dev-token'
const { DEV_API_TOKEN, verifyAltcha } = require('../../utils/altcha');

describe('utils/altcha', () => {
  describe('DEV_API_TOKEN', () => {
    it('测试环境已设置 DEV_API_TOKEN', () => {
      expect(DEV_API_TOKEN).toBe('test-dev-token');
    });
  });

  describe('verifyAltcha - 开发口令旁路', () => {
    it('匹配 x-dev-token → true', async () => {
      const req = { headers: { 'x-dev-token': 'test-dev-token' } };
      await expect(verifyAltcha(undefined, req)).resolves.toBe(true);
    });

    it('不匹配的 x-dev-token → false（无 payload）', async () => {
      const req = { headers: { 'x-dev-token': 'wrong-token' } };
      await expect(verifyAltcha(undefined, req)).resolves.toBe(false);
    });

    it('无 req 对象 → false（无 payload）', async () => {
      await expect(verifyAltcha(undefined, null)).resolves.toBe(false);
    });

    it('req 无 headers → false（无 payload）', async () => {
      await expect(verifyAltcha(undefined, {})).resolves.toBe(false);
    });
  });

  describe('verifyAltcha - 无效 payload', () => {
    it('无 payload 且无 dev token → false', async () => {
      await expect(verifyAltcha(null, { headers: {} })).resolves.toBe(false);
    });

    it('非法 base64 payload → false', async () => {
      await expect(verifyAltcha('!!!not-base64!!!', { headers: {} })).resolves.toBe(false);
    });

    it('payload 缺少 challenge → false', async () => {
      const payload = Buffer.from(JSON.stringify({ solution: 'x' })).toString('base64');
      await expect(verifyAltcha(payload, { headers: {} })).resolves.toBe(false);
    });

    it('payload 缺少 solution → false', async () => {
      const payload = Buffer.from(JSON.stringify({ challenge: 'x' })).toString('base64');
      await expect(verifyAltcha(payload, { headers: {} })).resolves.toBe(false);
    });
  });
});
