const User = require('../models/User');
const UserSession = require('../models/UserSession');
const { hashToken, verifyJwt } = require('../utils/helpers');

// 并发刷新宽限期：refresh token 轮换后 30s 内再次出现视为同一用户多标签页/多设备并发刷新，
// 不判为重放攻击（避免误吊销所有会话）；超期仍按真实重用处理
const CONCURRENT_REFRESH_GRACE_MS = 30 * 1000;

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
// 3. 原子"取用并作废"：findOneAndUpdate 抢到 active session 即完成轮换
// 4. 未抢到：若 session 在并发宽限期内刚被轮换 → 并发刷新(409, 不吊销)；否则判重用 → 吊销该用户所有 session
// 5. 抢到且用户存在 → 校验通过
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
  // 原子"取用并作废"：并发刷新时只有一个请求能抢到 active session，
  // 另一个 findOneAndUpdate 返回 null，进入下方并发宽限期判定。
  // 轮换作废需设置 rotatedAt，供并发宽限期判断区分"轮换"与"吊销"
  const session = await UserSession.findOneAndUpdate(
    { refreshTokenHash, isActive: true },
    { isActive: false, logoutAt: new Date(), rotatedAt: new Date() },
    { new: true }
  );

  if (!session) {
    const existing = await UserSession.findOne({ refreshTokenHash });
    // 仅"轮换"作废（rotatedAt）计入并发宽限期；吊销/登出作废（无 rotatedAt）一律按真实重用处理
    const recentlyRotated = existing?.rotatedAt
      && (Date.now() - new Date(existing.rotatedAt).getTime()) < CONCURRENT_REFRESH_GRACE_MS;
    if (recentlyRotated) {
      // 并发刷新：同一 refresh token 刚被另一个请求轮换（宽限期内），非重用攻击。
      // 返回 409，前端重试原请求（同浏览器 cookie 已被并发方更新为新值），不吊销任何 session
      return { ok: false, code: 409, message: 'Concurrent refresh', messageKey: 'auth.concurrentRefresh' };
    }
    // 真实重用：未知或已吊销的 refresh token 被再次使用，安全起见吊销该用户所有 session
    const userId = existing?.userId || decoded.id;
    if (userId) {
      await UserSession.updateMany(
        { userId, isActive: true },
        { isActive: false, logoutAt: new Date() }
      ).catch(() => {});
    }
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
  // 后台访问权限（creator / admin / superadmin）—— 创作者可进入管理后台管理内容，
  // 但敏感管理操作需叠加 adminOnlyProtect
  adminProtect: createAuthMiddleware({ allowedRoles: ['creator', 'admin', 'superadmin'] }),
  // 真正管理员（admin / superadmin）—— 用于审核、分类、横幅、统计等敏感管理接口，
  // 创作者不可越权访问
  adminOnlyProtect: createAuthMiddleware({ allowedRoles: ['admin', 'superadmin'] }),
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
