const User = require('../models/User');
const UserSession = require('../models/UserSession');
const { hashToken, verifyJwt } = require('../utils/helpers');

// 双 Token 机制下的统一鉴权工厂：
// - Access Token: 15min, 存于 httpOnly cookie 'accessToken' 或 Authorization: Bearer
//   短命令牌不查 UserSession，仅校验 JWT + User 状态，性能高
// - 过期返回 419 + messageKey=auth.accessTokenExpired，触发前端调用 /api/auth/refresh
// - Refresh Token: 7d, 仅在 /api/auth/refresh 端点使用，独立校验逻辑
const createAuthMiddleware = ({ allowedRoles = [] }) => {
  return async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token && req.cookies) {
      token = req.cookies.accessToken;
      // 兼容旧客户端：仍接受 'token' cookie
      if (!token) token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ message: 'Not authorized, no token', messageKey: 'auth.noToken' });
    }

    try {
      const decoded = verifyJwt(token);

      // refresh/verify/2fa 等其它 purpose 令牌不可用于访问 API（防 token 误用）
      // 向后兼容：接受新签发的 purpose='access' 与历史无 purpose 令牌
      if (decoded.purpose && decoded.purpose !== 'access') {
        return res.status(401).json({ message: 'Invalid token type', messageKey: 'auth.invalidToken' });
      }

      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        return res.status(401).json({ message: 'Not authorized, user not found', messageKey: 'auth.userNotFound' });
      }

      if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        return res.status(403).json({ message: 'Not authorized', messageKey: 'auth.forbidden' });
      }

      req.user = user;
      req.authToken = token;
      // 异步更新 lastActiveAt，不阻塞请求
      UserSession.updateOne(
        { refreshTokenHash: { $exists: true }, userId: user._id, isActive: true },
        { lastActiveAt: new Date() }
      ).catch(() => {});
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        // Access token 过期：返回 419 让前端调用 /api/auth/refresh
        return res.status(419).json({ message: 'Access token expired', messageKey: 'auth.accessTokenExpired' });
      }
      return res.status(401).json({ message: 'Not authorized, token failed', messageKey: 'auth.invalidToken' });
    }
  };
};

// Refresh Token 校验：用于 /api/auth/refresh 端点
// 校验流程：
// 1. 从 refreshToken cookie 取 token
// 2. JWT verify (含 purpose=refresh)
// 3. 查 UserSession by refreshTokenHash
// 4. 若 session.isActive=false → refresh token 已被吊销，疑似重用，吊销该用户所有 session
// 5. 若 session 存在且 active → 校验通过
const verifyRefreshToken = async (req) => {
  const token = req.cookies?.refreshToken;
  if (!token) return { ok: false, code: 401, message: 'No refresh token', messageKey: 'auth.noRefreshToken' };

  let decoded;
  try {
    decoded = verifyJwt(token);
  } catch (e) {
    if (e.name === 'TokenExpiredError') {
      return { ok: false, code: 401, message: 'Refresh token expired', messageKey: 'auth.refreshTokenExpired' };
    }
    return { ok: false, code: 401, message: 'Invalid refresh token', messageKey: 'auth.invalidToken' };
  }

  if (decoded.purpose !== 'refresh') {
    return { ok: false, code: 401, message: 'Invalid token type', messageKey: 'auth.invalidToken' };
  }

  const refreshTokenHash = hashToken(token);
  const session = await UserSession.findOne({ refreshTokenHash });

  if (!session) {
    // 未知 refresh token：可能是被盗的已轮换 token，安全起见吊销该用户所有 session
    if (decoded.id) {
      await UserSession.updateMany(
        { userId: decoded.id, isActive: true },
        { isActive: false, logoutAt: new Date() }
      ).catch(() => {});
    }
    return { ok: false, code: 401, message: 'Refresh token reuse detected', messageKey: 'auth.refreshTokenReuse' };
  }

  if (!session.isActive) {
    // 已被吊销的 refresh token 被再次使用：重用攻击，全部吊销
    await UserSession.updateMany(
      { userId: session.userId, isActive: true },
      { isActive: false, logoutAt: new Date() }
    ).catch(() => {});
    return { ok: false, code: 401, message: 'Refresh token reuse detected', messageKey: 'auth.refreshTokenReuse' };
  }

  const user = await User.findById(session.userId).select('-password');
  if (!user) {
    return { ok: false, code: 401, message: 'User not found', messageKey: 'auth.userNotFound' };
  }

  return { ok: true, user, session };
};

module.exports = {
  createAuthMiddleware,
  verifyRefreshToken,
  // 普通登录用户
  protect: createAuthMiddleware({ allowedRoles: [] }),
  // 管理员（creator / admin / superadmin）
  adminProtect: createAuthMiddleware({ allowedRoles: ['creator', 'admin', 'superadmin'] }),
  // 创作者及以上（creator / admin / superadmin）
  creatorProtect: createAuthMiddleware({ allowedRoles: ['creator', 'admin', 'superadmin'] }),
  // 超级管理员
  superAdminProtect: createAuthMiddleware({ allowedRoles: ['superadmin'] }),
  // 超管未改邮箱时拦截写操作（GET / change-email / logout 放行）
  requireEmailChanged: (req, res, next) => {
    if (req.user && req.user.role === 'superadmin' && req.user.email === 'admin@furry09.com') {
      const path = req.path.toLowerCase();
      const method = req.method.toUpperCase();
      // 允许：GET 请求、修改邮箱、登出、获取自身信息
      if (method === 'GET' || path.includes('change-email') || path.includes('logout') || path.includes('verify')) {
        return next();
      }
      return res.status(403).json({ message: '请先修改管理员邮箱后再进行操作', forceEmailChange: true });
    }
    next();
  },
};
