const requestLogger = (req, res, next) => {
  const start = Date.now();
  const oldJson = res.json;

  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const logData = {
      method: req.method,
      path: req.path,
      status,
      duration: `${duration}ms`,
      ip: req.ip || '',
      userId: req.user?._id || req.admin?._id || '',
    };

    // 只记录慢请求、错误请求和写操作
    if (duration > 1000 || status >= 400 || req.method !== 'GET') {
      const level = status >= 500 ? 'ERROR' : status >= 400 ? 'WARN' : duration > 1000 ? 'SLOW' : 'INFO';
      console.log(`[${level}] ${logData.method} ${logData.path} ${status} ${logData.duration}${logData.userId ? ` user:${logData.userId}` : ''}`);
    }
  });

  next();
};

module.exports = requestLogger;
