// 单元测试：utils/ipRegion
// mock https.get 测试本地 IP / 有效响应 / 错误 / 超时 / 缓存命中
const https = require('https');
jest.mock('https');

const { getIpRegion, getCachedIpRegion } = require('../../utils/ipRegion');

// 辅助：构造一个 mock 的 https.get 返回值（req 对象 + res 回调）
function mockHttpsGet(responseData) {
  https.get.mockImplementation((url, cb) => {
    const res = {
      on: (event, handler) => {
        if (event === 'data') handler(responseData);
        if (event === 'end') handler();
      }
    };
    cb(res);
    return { setTimeout: () => {}, destroy: () => {}, on: () => {} };
  });
}

describe('utils/ipRegion', () => {
  beforeEach(() => { https.get.mockReset(); });

  describe('getIpRegion - 本地 IP', () => {
    it('127.0.0.1 → 本地（不调用 https.get）', async () => {
      await expect(getIpRegion('127.0.0.1')).resolves.toBe('本地');
      expect(https.get).not.toHaveBeenCalled();
    });
    it('::1 → 本地', async () => {
      await expect(getIpRegion('::1')).resolves.toBe('本地');
    });
    it('::ffff:127.0.0.1 → 本地', async () => {
      await expect(getIpRegion('::ffff:127.0.0.1')).resolves.toBe('本地');
    });
    it('空/null → 本地', async () => {
      await expect(getIpRegion('')).resolves.toBe('本地');
      await expect(getIpRegion(null)).resolves.toBe('本地');
    });
  });

  describe('getIpRegion - 远程 IP', () => {
    it('有效响应 → 国家 · 地区 · 城市', async () => {
      mockHttpsGet(JSON.stringify({ country_name: '中国', region: '广东', city: '深圳' }));
      await expect(getIpRegion('8.8.8.8')).resolves.toBe('中国 · 广东 · 深圳');
    });

    it('只有 country → 国家', async () => {
      mockHttpsGet(JSON.stringify({ country_name: 'US' }));
      await expect(getIpRegion('1.1.1.1')).resolves.toBe('US');
    });

    it('空 JSON → 未知', async () => {
      mockHttpsGet(JSON.stringify({}));
      await expect(getIpRegion('2.2.2.2')).resolves.toBe('未知');
    });

    it('非法 JSON → 未知', async () => {
      mockHttpsGet('not json');
      await expect(getIpRegion('3.3.3.3')).resolves.toBe('未知');
    });

    it('网络错误 → 未知', async () => {
      let errorHandler;
      https.get.mockImplementation((url, cb) => ({
        setTimeout: () => {},
        destroy: () => {},
        on: (event, handler) => { if (event === 'error') errorHandler = handler; }
      }));
      const promise = getIpRegion('4.4.4.4');
      setImmediate(() => errorHandler(new Error('network')));
      await expect(promise).resolves.toBe('未知');
    });

    it('超时 → 未知', async () => {
      let timeoutHandler;
      https.get.mockImplementation((url, cb) => ({
        setTimeout: (ms, handler) => { timeoutHandler = handler; },
        destroy: () => {},
        on: () => {}
      }));
      const promise = getIpRegion('5.5.5.5');
      setImmediate(() => timeoutHandler());
      await expect(promise).resolves.toBe('未知');
    });
  });

  describe('getCachedIpRegion - 缓存', () => {
    it('同一 IP 第二次命中缓存不重复请求', async () => {
      let callCount = 0;
      https.get.mockImplementation((url, cb) => {
        callCount++;
        const res = {
          on: (event, handler) => {
            if (event === 'data') handler(JSON.stringify({ country_name: 'CacheLand' }));
            if (event === 'end') handler();
          }
        };
        cb(res);
        return { setTimeout: () => {}, destroy: () => {}, on: () => {} };
      });

      const ip = '10.20.30.40'; // 本测试专用 IP，避免跨用例缓存干扰
      const r1 = await getCachedIpRegion(ip);
      const r2 = await getCachedIpRegion(ip);
      expect(r1).toBe('CacheLand');
      expect(r2).toBe('CacheLand');
      expect(callCount).toBe(1);
    });

    it('本地 IP 缓存也返回 本地', async () => {
      const r = await getCachedIpRegion('127.0.0.1');
      expect(r).toBe('本地');
      expect(https.get).not.toHaveBeenCalled();
    });
  });
});
