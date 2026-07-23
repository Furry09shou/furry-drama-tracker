// IP 地理位置查询与缓存
// 通过 ipapi.co 查询 IP 归属地，本地 IP 直接返回"本地"，带 24h LRU 缓存

const https = require('https');

const getIpRegion = (ip) => {
  return new Promise((resolve) => {
    if (!ip || ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') {
      resolve('本地');
      return;
    }
    const url = `https://ipapi.co/${ip}/json/`;
    const req = https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const parts = [];
          if (json.country_name) parts.push(json.country_name);
          if (json.region) parts.push(json.region);
          if (json.city) parts.push(json.city);
          resolve(parts.length > 0 ? parts.join(' · ') : '未知');
        } catch {
          resolve('未知');
        }
      });
    });
    req.setTimeout(5000, () => {
      req.destroy();
      resolve('未知');
    });
    req.on('error', () => {
      resolve('未知');
    });
  });
};

const ipRegionCache = new Map();
const IP_REGION_CACHE_TTL = 24 * 60 * 60 * 1000;
const MAX_IP_REGION_CACHE = 1000;

const getCachedIpRegion = async (ip) => {
  const cached = ipRegionCache.get(ip);
  if (cached && Date.now() - cached.timestamp < IP_REGION_CACHE_TTL) {
    return cached.region;
  }
  const region = await getIpRegion(ip);
  if (ipRegionCache.size >= MAX_IP_REGION_CACHE) {
    const oldestKey = ipRegionCache.keys().next().value;
    ipRegionCache.delete(oldestKey);
  }
  ipRegionCache.set(ip, { region, timestamp: Date.now() });
  return region;
};

module.exports = { getIpRegion, getCachedIpRegion, IP_REGION_CACHE_TTL, MAX_IP_REGION_CACHE };
