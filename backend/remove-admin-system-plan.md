# 方案 A: 砍掉管理员账户体系

## 目标

删除 `Admin` 和 `AdminSession` 两套独立 MongoDB Collection，权限体系统一到 `User` 模型。用 `role` 字段区分用户身份（`superadmin` / `admin` / `creator` / `user`），Session 统一用 `UserSession`，JWT cookie 统一用 `token`。

---

## Phase 1: 用户模型改造

### 1.1 `models/User.js` — 新增 role 字段

```diff
  adminAccess: {
    type: Boolean,
    default: false
  },
+ role: {
+   type: String,
+   enum: ['user', 'creator', 'admin', 'superadmin'],
+   default: 'user'
+ },
```

- 新增 `role` 字段，枚举值：`user` / `creator` / `admin` / `superadmin`
- 之后删除 `adminAccess` 字段（先保留做迁移）

---

## Phase 2: 数据模型引用迁移

所有 `ref: 'Admin'` 改为 `ref: 'User'`：

| # | 文件 | 字段 | 改动 |
|---|------|------|------|
| 2.1 | `models/AuditLog.js:6` | `adminId` | `ref: 'Admin'` → `ref: 'User'` |
| 2.2 | `models/CreatorProfile.js:4-6` | `adminId` | 字段名改为 `userId`，`ref: 'Admin'` → `ref: 'User'` |
| 2.3 | `models/Episode.js:77-79` | `createdBy` | `ref: 'Admin'` → `ref: 'User'` |
| 2.4 | `models/Episode.js:81-84` | `allowedEditors` | `ref: 'Admin'` → `ref: 'User'` |
| 2.5 | `models/EpisodeVersion.js:8` | `changedBy` | `ref: 'Admin'` → `ref: 'User'` |
| 2.6 | `models/Report.js:33-35` | `resolvedBy` | `ref: 'Admin'` → `ref: 'User'` |
| 2.7 | `models/Series.js:11` | `createdBy` | `ref: 'Admin'` → `ref: 'User'` |

---

## Phase 3: 认证中间件重写

### 3.1 `middlewares/authFactory.js` — 完全重写

当前逻辑：根据 `modelType` 选择 User 或 Admin 模型，设置 `req.user` 或 `req.admin`。

新逻辑：
- 只有 User 模型
- 根据 `allowedRoles` 校验 `user.role`
- 统一设置 `req.user`
- 统一使用 `token` cookie

```javascript
// 伪代码
const createAuthMiddleware = ({ allowedRoles = [] }) => {
  return async (req, res, next) => {
    // 从 header 或 cookie('token') 取 token
    // jwt.verify
    // User.findById
    // 如果 allowedRoles 非空，校验 user.role
    // 如果 user.role 不在 allowedRoles 中 → 403
    // 查询 UserSession 校验 session
    // req.user = user
    // next()
  };
};

module.exports = {
  protect:        createAuthMiddleware({ allowedRoles: [] }),
  adminProtect:   createAuthMiddleware({ allowedRoles: ['admin', 'superadmin', 'creator'] }),
  creatorProtect: createAuthMiddleware({ allowedRoles: ['creator', 'admin', 'superadmin'] }),
  superAdminProtect: createAuthMiddleware({ allowedRoles: ['superadmin'] }),
};
```

---

## Phase 4: 路由改造

### 4.1 `routes/admin.js` — 全面改造

| 端点 | 改动 |
|------|------|
| `POST /login` | 改为 `User.findOne({ email })` 验证（管理员登录统一用邮箱）；生成 jwt 时带 `role`；session 写入 `UserSession`；cookie 名改为 `token` |
| `GET /verify` | 返回 `{ valid: true, user: { _id, username, email, role } }` |
| `GET /list` | `Admin.find({})` → `User.find({ role: { $in: ['admin','superadmin','creator'] } })` |
| `POST /register` | `Admin.create({})` → `User.create({ role })`（或给已有 user 设 role） |
| `DELETE /:id` | `Admin.findByIdAndDelete` → 清除该 user 的 role 为 `'user'`（不删用户） |
| `GET /users` | 不变 |
| `DELETE /users/:id` | 清除关联的 creatorProfiles 等 |
| `PUT /role/:id` | 直接修改 `User.role`；superadmin 保护逻辑不变 |
| `GET /creators` | `Admin.find({ role:'creator' })` → `User.find({ role:'creator' })` |
| `POST /verify-password` | `Admin.findById` → `User.findById(req.user._id)` |
| `PUT /user-admin-access/:id` | **删除**（被 `PUT /role/:id` 取代） |

### 4.2 `routes/auth.js` — 小改

- 删除第 5 行 `const Admin = require('../models/Admin');`
- 删除 `PUT /admin/change-password`（第 765-788 行），管理员改密码统一走 `PUT /change-password`
- `/login` 响应增加 `role` 字段替代 `adminAccess`
- `/me` 响应增加 `role` 字段
- `PUT /change-password` 不再区分 user/admin

### 4.3 `routes/adminSessions.js` — 合并到 UserSession

- 删除 `routes/adminSessions.js`
- 超管功能 `/all`、`/admin/:adminId/all` 迁移到 `routes/userSessions.js`，增加 role 判断
- 前端心跳改用 `POST /api/user-sessions/heartbeat`

### 4.4 `routes/review.js` — 中间件适配

- 删除 `const Admin = require('../models/Admin');`
- `adminOnly` 中间件改为检查 `req.user.role`
- `populate('createdBy', 'accountId username email')` 不变（User 模型已有这些字段）

### 4.5 `routes/friendLinks.js` — 通知目标适配

- 第 88 行 `Admin.find({ role: 'superadmin' })` → `User.find({ role: 'superadmin' })`
- superadmin ID 用于 Notification 的 userId，轮询推送

### 4.6 其余路由全局替换

以下文件将 `req.admin` 替换为 `req.user`：

| 文件 | 涉及行数 |
|------|---------|
| `routes/creator.js` | `req.admin._id` / `req.admin.role` |
| `routes/creatorProfiles.js` | `req.admin._id` |
| `routes/episodes.js` | `req.admin._id` / `req.admin.role` |
| `routes/series.js` | `req.admin._id` |
| `routes/stats.js` | (无直接引用，但中间件变了) |
| `routes/versions.js` | `req.admin._id` |
| `routes/backup.js` | `req.admin._id` / `req.admin.username` / `req.admin.role` |
| `routes/siteContent.js` | 依赖中间件，需确认 `req.admin` → `req.user` |
| `routes/banners.js` | 依赖中间件 |
| `routes/categories.js` | 依赖中间件 |
| `routes/feedback.js` | 依赖中间件 |
| `routes/reports.js` | 依赖中间件 |
| `routes/auditLogs.js` | 依赖中间件 |
| `routes/rss.js` | 依赖中间件 |
| `routes/autoStatus.js` | 依赖中间件 |

---

## Phase 5: 入口与种子脚本

### 5.1 `src/index.js` — 清理 Admin 引用

- 删除 `adminAuthLimiter`（第 223-231 行），将 `/api/admin/login` 复用 `authLimiter`
- 删除 `/api/admin/login` 的单独限流挂载
- 删除 `routes/adminSessions` 的挂载（第 35、367 行）
- cron 清理只保留 UserSession（第 404-422 行删除 AdminSession 部分）
- 启动迁移：将 `adminAccess: true` 的 User 自动设 `role: 'admin'`

### 5.2 `src/seedAdmin.js` — 重写

```javascript
const User = require('../models/User');

const seedAdmin = async () => {
  // 查找已有 admin 用户
  const user = await User.findOne({ username: 'admin' });
  if (!user) {
    console.log('未找到 admin 用户，请先注册');
    process.exit(1);
  }
  user.role = 'superadmin';
  await user.save();
  console.log('已将 admin 用户设为超级管理员');
};
```

### 5.3 `src/updateAdminRole.js` — 删除

不再需要。

---

## Phase 6: 审计日志

### 6.1 `middlewares/auditLog.js` — 简化

`logAction` 不再区分 `req.admin` / `req.user`：

```javascript
const logAction = (action, target, details) => {
  return async (req, res, next) => {
    // 只看 req.user，通过 role 判断身份
    const isAdmin = req.user && ['superadmin','admin','creator'].includes(req.user.role);
    AuditLog.create({
      adminId: isAdmin ? req.user._id : undefined,
      adminName: isAdmin ? req.user.username : undefined,
      userId: req.user._id,
      userName: req.user.username || req.user.accountId,
      ...
    });
  };
};
```

`logManual` 同样简化。

---

## Phase 7: 模型文件删除

| # | 文件 | 操作 |
|---|------|------|
| 7.1 | `models/Admin.js` | 删除 |
| 7.2 | `models/AdminSession.js` | 删除 |

---

## Phase 8: 前端适配

| # | 文件 | 改动 |
|---|------|------|
| 8.1 | `components/Admin.jsx` | 登录表单 username → email；`POST /api/admin/login` 发送 email；成功响应存 `adminToken` → 存 `token` |
| 8.2 | `components/AdminLayout.jsx` | `GET /api/admin/verify` 返回结构 `admin` → `user`（含 `role`）；心跳改 `/api/user-sessions/heartbeat` |
| 8.3 | `components/AdminDashboard.jsx` | `admin.role` → `user.role` |
| 8.4 | `components/AdminUsers.jsx` | 用户列表增加 role 列/筛选；新增管理员 = 给已有用户设 role；角色切换改 `role` 字段；删除 adminAccess toggle |
| 8.5 | `components/NavBar.jsx` | `user.adminAccess` → `user.role !== 'user'` |
| 8.6 | `components/ChangePassword.jsx` | 删除 `/admin` 路径判断分支，所有人统一走同一个改密接口 |
| 8.7 | `App.jsx` | `AdminGuard` 调用 `/api/admin/verify`，检查 `data.user.role` |
| 8.8 | `utils/axiosConfig.js` | 删除 admin 专用 401 拦截（第 401 行附近），不再区分 admin/user |
| 8.9 | `contexts/AuthContext.jsx` | 登录响应字段增加 `role`，state 中存储 `role` |
| 8.10 | `utils/apiEndpoints.js` | 可能需要调整 admin session 相关端点 |

---

## Phase 9: 数据迁移

### 9.1 启动时自动迁移（加到 `src/index.js` connectDB 之后）

```javascript
// 迁移 adminAccess → role
const usersWithAdminAccess = await User.find({ adminAccess: true, role: 'user' });
for (const user of usersWithAdminAccess) {
  user.role = 'admin';
  await user.save({ validateBeforeSave: false });
}

// 迁移 Admin collection → User（如果 Admin 表非空）
const admins = await Admin.find({});
for (const admin of admins) {
  let user = await User.findOne({ username: admin.username });
  if (!user) continue; // 无法自动匹配的跳过
  user.role = admin.role;
  await user.save({ validateBeforeSave: false });
}
```

### 9.2 手动步骤

1. 部署前通知所有管理员：旧 admin token 将失效，需用关联邮箱重新登录
2. 确保每个 Admin 账号有对应的 User 账号（可通过 username 或手动绑定）

---

## 文件总览

| 类型 | 数量 | 说明 |
|------|------|------|
| 删除 | 3 | `models/Admin.js`, `models/AdminSession.js`, `src/updateAdminRole.js` |
| 新建 | 0 | — |
| 修改后端 | ~20 | models × 8, middleware × 2, routes × 10+, src × 2 |
| 修改前端 | ~10 | components × 6, utils × 2, contexts × 1, App.jsx |

## 关键注意事项

1. **不向后兼容**：部署后所有现有 admin session 失效，需重新登录
2. **Admin collection 数据**：需确保映射到 User collection（可用 username 或 email 做匹配）
3. **CreatorProfile、Episode 等关联数据**：引用 `ref` 变更后，MongoDB 不自动校验外键，需保证迁移后数据一致性
4. **编辑器 (allowedEditors)**：当前存储的是 Admin ObjectId，迁移后必须替换为对应 User ObjectId
5. **不需要改 package.json**：`seed-admin` 脚本名和命令保持不变
