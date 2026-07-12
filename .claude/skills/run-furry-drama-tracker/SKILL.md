---
name: run-furry-drama-tracker
description: Run, start, build, screenshot, or smoke-test the Furry Drama Tracker full-stack web app (React frontend + Express backend + MongoDB).
---

兽剧聚合平台 (Furry Drama Tracker) — React 19 + Express 5 + MongoDB 全栈应用。
前后端分离：前端 Vite dev server (:3000) 代理 API 到后端 (:5000)。

驱动方式：Playwright 脚本 `.claude/skills/run-furry-drama-tracker/driver.mjs`
— API 登录用 curl + dev token 绕过 altcha，浏览器截图用 Playwright headless。

本文所有路径相对于仓库根目录。

## 前提条件

```bash
# 系统依赖 (Ubuntu/Debian)
sudo apt-get install -y mongodb-server curl

# Node.js >= 18
node --version  # v24.x 已测试

# Playwright 浏览器
cd frontend && npx playwright install chromium
```

## 构建

```bash
# 后端
cd backend && npm install

# 前端
cd frontend && npm install
```

## 启动服务

```bash
# 1. 启动 MongoDB
mongod --dbpath /tmp/mongodb-data --fork --logpath /tmp/mongodb.log

# 2. 配置环境变量
cp backend/.env.example backend/.env
# 编辑 backend/.env，至少设置:
#   MONGO_URI=mongodb://127.0.0.1:27017/furry_drama_tracker
#   JWT_SECRET=<至少32字符的随机字符串>
#   DEV_API_TOKEN=<自定义口令>  ← 用于 API 测试绕过 altcha

# 3. 创建管理员账户
cd backend && npm run seed-admin

# 4. 启动后端 (后台)
cd backend && npm run dev &

# 5. 启动前端 (后台)
cd frontend && npm run dev &
```

## 运行 (agent 路径)

驱动脚本 **`.claude/skills/run-furry-drama-tracker/driver.mjs`**。

```bash
# 从仓库根目录运行:
node .claude/skills/run-furry-drama-tracker/driver.mjs [command]
```

**命令：**

| 命令 | 说明 |
|---|---|
| `smoke` | API 登录 + Playwright 截图主要页面 → `/tmp/screenshots/` |
| `login` | API 登录 (dev token 绕过 altcha)，保存 token 到 `/tmp/fdt-token.txt` |
| `screenshot` | 仅截图首页 (未登录状态) |
| `health` | 检查前后端健康状态 |
| `api <method> <path> [body]` | 用 dev token 调用任意 API |

**smoke 截图列表：**
1. 首页 (已登录 — 显示个性化推荐)
2. 管理页面 (/admin)
3. 管理仪表盘 (/admin/dashboard)
4. 管理剧集 (/admin/episodes)
5. 日历页 (/calendar)
6. 时间线 (/timeline)

**原理：**
- 登录通过 `POST /api/auth/login` + `X-Dev-Token` 头绕过 altcha 验证码、邮箱验证、设备验证
- `backend/.env` 中的 `DEV_API_TOKEN` 需与脚本中的一致 (默认 `dev-token-for-automation`)
- JWT token 注入浏览器后，Playwright 截图各页面

## 直接 API 调用

无需浏览器，直接用 curl 调用 API（dev token 绕过 altcha）：

```bash
# 获取 CSRF token
CSRF=$(curl -s -c /tmp/c.txt http://localhost:5000/api/csrf-token | python3 -c "import sys,json;print(json.load(sys.stdin)['csrfToken'])")

# 登录
curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -H "X-Dev-Token: dev-token-for-automation" \
  -H "X-XSRF-TOKEN: $CSRF" -b /tmp/c.txt \
  -d '{"email":"admin@furry09.com","password":"admin123456","altcha":"bypassed","deviceInfo":{"ua":"curl","platform":"linux"}}'
```

## 运行 (人类路径)

```bash
# 终端 1
cd backend && npm run dev

# 终端 2
cd frontend && npm run dev
# → 浏览器打开 http://localhost:3000
```

无头环境下无法交互。使用上面的 agent 路径。

## 测试

两个包均无测试套件。用 `smoke` 命令代替端到端验证。

## 注意事项

- **altcha 验证码**：前端登录需要 altcha (PoW) 验证码，浏览器中计算需 2-5 秒。agent 路径用 `DEV_API_TOKEN` + `X-Dev-Token` 请求头绕过。
- **CSRF 保护**：所有非 GET API 调用需要 CSRF token。从 `GET /api/csrf-token` 获取，通过 `X-XSRF-TOKEN` 头和 cookie 发送。
- **networkidle 超时**：前端有 SSE 连接和 Service Worker 轮询，`networkidle` 永远不会触发。Playwright 脚本用 `domcontentloaded` 代替。
- **设备验证**：新设备登录会要求邮件验证。dev token 同时绕过此检查。
- **.env 位置**：环境变量从 `backend/.env` 加载，不是仓库根目录。
- **MongoDB 数据**：`mongod --dbpath /tmp` 的数据在重启后丢失。持久化部署需指定持久目录。

## 故障排除

| 症状 | 原因 | 解决方法 |
|---|---|---|
| `CSRF protection: missing XSRF-TOKEN cookie` | CSRF token 未正确传递 | 确保 `-c cookie.txt` 保存并 `-b cookie.txt` 使用 cookie jar |
| `需要邮箱验证` | 邮箱未验证且不在 DEMO_EMAILS 中 | 使用 dev token 或添加邮箱到 `DEMO_EMAILS` |
| `检测到新设备登录` | 设备变更触发验证 | 使用 dev token 绕过 |
| `page.goto: Timeout` | networkidle 永不触发 | 使用 `waitUntil: 'domcontentloaded'` |
| `ERR_MODULE_NOT_FOUND` (playwright) | playwright 未安装在执行目录 | 在仓库根或包含 driver.mjs 的目录安装 playwright |
| MongoDB 连接失败 | MongoDB 未运行 | `mongod --dbpath /tmp/mongodb-data --fork --logpath /tmp/mongodb.log` |
