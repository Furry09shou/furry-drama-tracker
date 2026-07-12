# 兽剧聚合平台 (Furry Drama Tracker)

兽剧 (Furry Drama) 内容聚合与追踪平台 —— 全栈 Web 应用，支持剧集发现、评分、收藏、日历追踪、多语言、PWA 离线访问等功能。

**技术栈：** React 19 + Vite 8 (前端) · Express 5 + MongoDB/Mongoose (后端) · JWT 认证 · PWA · i18n 中英双语

---

## 项目结构

```
├── backend/          Express 5 API (CommonJS, 端口 5000)
│   ├── routes/       路由处理器 (自动挂载到 /api/ 和 /api/v1/)
│   ├── models/       Mongoose 数据模型
│   ├── middlewares/  认证、审计、安全中间件
│   ├── utils/        工具函数 (分页、上传、加密、错误处理)
│   └── src/          入口、配置、定时任务、Swagger 文档
├── frontend/         React 19 SPA (ESM, 端口 3000)
│   └── src/
│       ├── components/  页面与 UI 组件 (Admin 前缀 = 管理后台)
│       ├── contexts/    Auth / Theme / I18n / SiteSettings
│       ├── locales/     中英双语文件 (zh.js / en.js)
│       └── utils/       axios 配置、API 端点、设备信息
├── scripts/          一次性工具脚本
├── docs/             设计与迁移文档
├── .claude/          Claude Code 集成 (skills, agent 指南)
└── AGENTS.md         项目级 AI agent 指南
```

---

## 快速开始 (本地开发)

### 前置要求

- **Node.js** >= 18
- **MongoDB** >= 7 (运行中并可连接)

### 1. 克隆与安装

```bash
git clone https://github.com/Furry09shou/furry-drama-tracker.git
cd furry-drama-tracker

# 安装依赖
cd backend && npm install
cd ../frontend && npm install
cd ..
```

### 2. 配置环境变量

```bash
cp .env.example backend/.env
```

编辑 `backend/.env`，至少设置以下变量：

```ini
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/furry_drama_tracker
JWT_SECRET=<至少32字符的随机字符串>
ENCRYPTION_KEY=<另一个至少32字符的随机字符串>
FRONTEND_URL=http://localhost:3000
SITE_URL=http://localhost:3000
SUPERADMIN_EMAIL=admin@example.com
SUPERADMIN_ACCOUNT_ID=admin
SUPERADMIN_PASSWORD=<你的管理员密码>
```

完整配置项见 `.env.example`。

### 3. 初始化数据库

```bash
cd backend
npm run seed-admin   # 创建超级管理员账户
npm run seed         # (可选) 填充示例数据
```

### 4. 启动

```bash
# 终端 1 — 后端 (端口 5000)
cd backend && npm run dev

# 终端 2 — 前端 (端口 3000)
cd frontend && npm run dev
```

浏览器打开 **http://localhost:3000**。

前端 Vite dev server 自动代理 `/api` 和 `/uploads` 到后端 `localhost:5000`。

---

## 生产环境部署

### 架构概览

生产环境使用**反向代理**将前后端统一到同一域名下。选择你喜欢的 Web 服务器：

```
浏览器 (HTTPS)
    │
    ▼
反向代理 — Caddy / Apache / Nginx (端口 443)
    ├── /api/*        → 后端 localhost:5000
    ├── /uploads/*    → 后端 localhost:5000
    └── /*            → 前端静态文件 (dist/)
```

### 步骤 1：构建前端

```bash
cd frontend
npm run build          # 输出到 dist/
```

### 步骤 2：配置后端环境变量

`backend/.env` 中修改以下变量为生产环境值：

```ini
NODE_ENV=production     # ★ 必须设为 production
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/furry_drama_tracker
JWT_SECRET=<生产环境随机密钥，至少 32 字符>
ENCRYPTION_KEY=<生产环境加密密钥，与 JWT_SECRET 不同>
ALTCHA_HMAC_KEY=<生产环境 altcha 签名密钥>
FRONTEND_URL=https://你的域名
SITE_URL=https://你的域名
ALLOWED_ORIGINS=        # 不需要额外设置
SUPERADMIN_EMAIL=admin@你的域名
SUPERADMIN_ACCOUNT_ID=admin
SUPERADMIN_PASSWORD=<强密码>
EMAIL_HOST=smtp.你的邮件服务商.com
EMAIL_PORT=465
EMAIL_USER=notify@你的域名
EMAIL_PASS=<邮件服务密码>
EMAIL_FROM_NAME=兽剧聚合平台
VAPID_PUBLIC_KEY=<Web Push 公钥>
VAPID_PRIVATE_KEY=<Web Push 私钥>
VAPID_SUBJECT=mailto:admin@你的域名
DEMO_EMAILS=            # ★ 生产环境留空
DEV_API_TOKEN=          # ★ 生产环境必须留空
```

> **安全注意：** `NODE_ENV=production` 会触发以下安全措施：
> - Cookie 设置 `Secure` 标志 (仅 HTTPS 传输)
> - CSRF token cookie 设置 `SameSite: Strict` + `Secure`
> - CORS 拒绝无 Origin 头的请求
> - 信任反向代理 (`trust proxy`)
> - 隐藏错误详情和调用栈
> - JWT 密钥长度验证 (必须 >= 32 字符)

### 步骤 3：初始化数据库

```bash
cd backend
npm run seed-admin   # 创建管理员账户
```

### 步骤 4：启动后端

推荐使用 **PM2** 管理 Node.js 进程：

```bash
# 安装 PM2
npm install -g pm2

# 启动
cd backend
pm2 start src/index.js --name furry-drama-api
pm2 save
pm2 startup
```

或者使用 systemd：

```ini
# /etc/systemd/system/furry-drama-api.service
[Unit]
Description=Furry Drama Tracker API
After=network.target mongod.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/furry-drama-tracker/backend
Environment=NODE_ENV=production
ExecStart=/usr/bin/node src/index.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

### 步骤 5：配置 Web 服务器

选择以下任一方案。**推荐 Caddy** — 配置最简，自动 HTTPS。

#### 方案 A：Caddy (推荐)

Caddy 自动申请和续期 Let's Encrypt 证书，无需额外配置。

```caddyfile
# /etc/caddy/Caddyfile

你的域名 {
    root * /opt/furry-drama-tracker/frontend/dist

    # SPA 回退 — 所有非文件请求返回 index.html
    try_files {path} /index.html

    # API 反向代理
    handle_path /api/* {
        reverse_proxy localhost:5000 {
            header_up Host {host}
            header_up X-Real-IP {remote_host}
            header_up X-Forwarded-For {remote_host}
            header_up X-Forwarded-Proto {scheme}
        }
    }

    # 上传文件代理 (带缓存)
    handle_path /uploads/* {
        reverse_proxy localhost:5000
        header Cache-Control "public, max-age=604800, immutable"
    }

    # 静态资源长缓存
    @assets path /assets/*
    header @assets Cache-Control "public, max-age=31536000, immutable"

    # 编码压缩
    encode gzip zstd

    # 日志 (可选)
    log {
        output file /var/log/caddy/furry-drama.log
    }
}
```

启动：

```bash
sudo systemctl enable --now caddy
# 修改配置后重载
sudo systemctl reload caddy
```

> Caddy 自动处理 HTTP→HTTPS 重定向和证书，不需要额外配置 80 端口。

#### 方案 B：Apache

需要启用以下模块：

```bash
sudo a2enmod proxy proxy_http rewrite headers ssl
sudo systemctl restart apache2
```

```apache
# /etc/apache2/sites-available/furry-drama.conf

<VirtualHost *:443>
    ServerName 你的域名

    SSLEngine on
    SSLCertificateFile     /etc/ssl/你的域名.crt
    SSLCertificateKeyFile  /etc/ssl/你的域名.key

    DocumentRoot /opt/furry-drama-tracker/frontend/dist

    # 静态资源长缓存
    <Location /assets/>
        Header set Cache-Control "public, max-age=31536000, immutable"
    </Location>

    # PWA 图标
    <FilesMatch "\.(png|svg|ico|woff2)$">
        Header set Cache-Control "public, max-age=2592000"
    </FilesMatch>

    # API 反向代理
    ProxyPass /api/ http://127.0.0.1:5000/api/
    ProxyPassReverse /api/ http://127.0.0.1:5000/api/

    # 上传文件代理
    ProxyPass /uploads/ http://127.0.0.1:5000/uploads/
    ProxyPassReverse /uploads/ http://127.0.0.1:5000/uploads/
    <Location /uploads/>
        Header set Cache-Control "public, max-age=604800, immutable"
    </Location>

    # SPA 回退 — 所有非文件请求返回 index.html
    <Directory /opt/furry-drama-tracker/frontend/dist>
        Options -Indexes
        RewriteEngine On
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteCond %{REQUEST_URI} !^/api/
        RewriteCond %{REQUEST_URI} !^/uploads/
        RewriteRule ^ index.html [L]
    </Directory>

    ErrorLog ${APACHE_LOG_DIR}/furry-drama-error.log
    CustomLog ${APACHE_LOG_DIR}/furry-drama-access.log combined
</VirtualHost>

# HTTP → HTTPS 重定向
<VirtualHost *:80>
    ServerName 你的域名
    Redirect permanent / https://你的域名/
</VirtualHost>
```

启用站点：

```bash
sudo a2ensite furry-drama.conf
sudo systemctl reload apache2
```

#### 方案 C：Nginx

```nginx
server {
    listen 443 ssl http2;
    server_name 你的域名;

    ssl_certificate     /etc/ssl/你的域名.crt;
    ssl_certificate_key /etc/ssl/你的域名.key;

    root /opt/furry-drama-tracker/frontend/dist;
    index index.html;

    # 前端 SPA — 所有非 API/非静态文件路由回退到 index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API 反向代理
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 30s;
    }

    # 上传文件
    location /uploads/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        expires 7d;
        add_header Cache-Control "public, max-age=604800, immutable";
    }

    # 静态资源长缓存 (Vite 构建产物带 hash)
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # PWA 图标
    location ~ \.(png|svg|ico|woff2)$ {
        expires 30d;
        add_header Cache-Control "public";
    }
}

# HTTP → HTTPS 重定向
server {
    listen 80;
    server_name 你的域名;
    return 301 https://$host$request_uri;
}
```

### 步骤 6：MongoDB

确保 MongoDB 在生产环境中：

- 启用访问控制 (`security.authorization: enabled`)
- 绑定到 `127.0.0.1` (不暴露到公网)
- 配置定期备份

```bash
# MongoDB 备份脚本示例 (配合 cron)
mongodump --uri="mongodb://127.0.0.1:27017/furry_drama_tracker" \
  --out="/backup/mongodb-$(date +%Y%m%d)"
```

### 步骤 7：验证

```bash
# 检查后端健康状态
curl https://你的域名/api/health
# → {"status":"ok","db":"connected",...}

# 确认 CSRF token 正常工作
curl -c /tmp/c.txt https://你的域名/api/csrf-token
# → {"csrfToken":"..."}
```

---

## 功能特性

- **剧集聚合** — 搜索、筛选 (分类/状态/评分/年份/排序)、详情页、关联剧集
- **用户系统** — 注册/登录、角色权限 (user/creator/admin/superadmin)、邮箱验证、设备验证、两步验证 (2FA)
- **管理后台** — 剧集管理、用户管理、分类管理、轮播图、友链、数据备份、操作日志、分析统计
- **日历追踪** — 剧集更新时间线、首播提醒、RSS 输出
- **国际化** — 中英双语，支持扩展更多语言
- **PWA** — 可安装到桌面、离线缓存、推送通知 (Web Push)
- **安全** — JWT 双通道认证、CSRF 保护、XSS/NoSQL 注入防护、速率限制、altcha PoW 验证码

---

## 角色权限

| 角色 | 权限 |
|---|---|
| `user` | 浏览、搜索、评分、收藏、个人主页 |
| `creator` | user 权限 + 创作者页面、自定义资料 |
| `admin` | creator 权限 + 管理后台 (剧集/用户/分类等) |
| `superadmin` | admin 权限 + 系统配置、操作日志、数据备份、管理员账户管理 |

---

## API 文档

开发环境下访问 **http://localhost:5000/api/docs** 查看 Swagger 文档（生产环境禁用）。

所有 API 路由自动双版本挂载：`/api/<name>` 和 `/api/v1/<name>`。在路由开发中**不需要**手动添加 `/v1/` 前缀。

---

## 许可证

- **前端** (React SPA): [GPL v3.0](https://www.gnu.org/licenses/gpl-3.0.html) 或更新版本
- **后端** (Express API): [AGPL v3.0](https://www.gnu.org/licenses/agpl-3.0.html) 或更新版本

详见项目中的 LICENSE 文件和 GitHub 仓库。
