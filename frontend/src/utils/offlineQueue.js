const QUEUE_KEY = 'offline_queue';
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24小时过期
const MAX_RETRIES = 3; // 单个离线动作最多重试 3 次，超过则丢弃（避免 4xx 永久失败任务堆积）

const hashAction = (action) => {
  return `${action.method}:${action.url}:${JSON.stringify(action.data || {})}`;
};

export const addToOfflineQueue = (action) => {
  const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  const now = Date.now();
  // 清理已过期项
  const fresh = queue.filter(item => now - item.timestamp < MAX_AGE_MS);
  // 去重：相同请求不重复入队
  const newKey = hashAction(action);
  if (fresh.some(item => hashAction(item) === newKey)) return;
  fresh.push({ ...action, timestamp: now, retries: 0 });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(fresh));
};

export const getOfflineQueue = () => {
  const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  const now = Date.now();
  return queue.filter(item => now - item.timestamp < MAX_AGE_MS);
};

export const clearOfflineQueue = () => {
  localStorage.setItem(QUEUE_KEY, '[]');
};

export const processOfflineQueue = async (axios) => {
  const queue = getOfflineQueue();
  if (queue.length === 0) return;

  const results = [];
  const failedActions = [];
  for (const action of queue) {
    try {
      const res = await axios({ method: action.method, url: action.url, data: action.data });
      results.push({ success: true, action, response: res.data });
    } catch (err) {
      results.push({ success: false, action, error: err.message });
      const retries = (action.retries || 0) + 1;
      // 仅当未达重试上限时才回写队列，超过则丢弃防止永久失败任务堆积
      if (retries <= MAX_RETRIES) {
        failedActions.push({ ...action, retries });
      }
    }
  }

  localStorage.setItem(QUEUE_KEY, JSON.stringify(failedActions));

  return results;
};
