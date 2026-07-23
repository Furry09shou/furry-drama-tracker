// 单元测试：utils/deviceLoginCodes
// 纯内存 Map API：set/get/delete + stopCleanup
const deviceLoginCodes = require('../../utils/deviceLoginCodes');

describe('utils/deviceLoginCodes', () => {
  afterAll(() => { deviceLoginCodes.stopCleanup(); });

  describe('set/get/delete 基本操作', () => {
    it('set + get 往返', () => {
      const entry = { userId: 'user1', expiresAt: Date.now() + 600000, need2FA: false };
      deviceLoginCodes.set('code123', entry);
      expect(deviceLoginCodes.get('code123')).toEqual(entry);
    });

    it('get 不存在的 code → undefined', () => {
      expect(deviceLoginCodes.get('nonexistent')).toBeUndefined();
    });

    it('delete 后 get → undefined', () => {
      const entry = { userId: 'user2', expiresAt: Date.now() + 600000 };
      deviceLoginCodes.set('code456', entry);
      expect(deviceLoginCodes.get('code456')).toBeDefined();
      deviceLoginCodes.delete('code456');
      expect(deviceLoginCodes.get('code456')).toBeUndefined();
    });

    it('delete 不存在的 code 不报错', () => {
      expect(() => deviceLoginCodes.delete('never-existed')).not.toThrow();
    });

    it('set 覆盖已有 code', () => {
      deviceLoginCodes.set('code789', { userId: 'a', expiresAt: 1 });
      deviceLoginCodes.set('code789', { userId: 'b', expiresAt: 2 });
      expect(deviceLoginCodes.get('code789').userId).toBe('b');
    });
  });

  describe('stopCleanup', () => {
    it('调用 stopCleanup 不抛异常', () => {
      expect(() => deviceLoginCodes.stopCleanup()).not.toThrow();
    });
  });
});
