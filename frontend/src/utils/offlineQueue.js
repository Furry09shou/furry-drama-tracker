const QUEUE_KEY = 'offline_queue';

export const addToOfflineQueue = (action) => {
  const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  queue.push({ ...action, timestamp: Date.now() });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
};

export const getOfflineQueue = () => {
  return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
};

export const clearOfflineQueue = () => {
  localStorage.setItem(QUEUE_KEY, '[]');
};

export const processOfflineQueue = async (axios) => {
  const queue = getOfflineQueue();
  if (queue.length === 0) return;

  const results = [];
  for (const action of queue) {
    try {
      const res = await axios({ method: action.method, url: action.url, data: action.data });
      results.push({ success: true, action, response: res.data });
    } catch (err) {
      results.push({ success: false, action, error: err.message });
    }
  }

  // Only remove successful actions from queue
  const failedActions = queue.filter((_, i) => !results[i].success);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(failedActions));

  return results;
};
