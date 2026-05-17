# 兽剧聚合平台 — 前端

兽剧内容聚合平台的前端应用，基于 React + Vite 构建，提供剧集发现、追踪、评分、日历等核心功能，并包含完整的管理后台。

## 技术栈

| 类别 | 技术 |
|---|---|
| 框架 | React 18 |
| 构建工具 | Vite 5 |
| 路由 | react-router-dom v6 |
| HTTP 客户端 | axios |
| 样式 | CSS Variables（全局主题系统） |
| 实时推送 | SSE (Server-Sent Events) |
| Service Worker | 离线缓存与 PWA 支持 |

## 项目结构

```
frontend/
├── index.html                  # 入口 HTML
├── vite.config.js              # Vite 配置（含开发代理）
├── package.json
├── public/
│   ├── manifest.json           # PWA 描述文件
│   └── sw.js                   # Service Worker
└── src/
    ├── main.jsx                # React 入口
    ├── App.jsx                 # 根组件（导航栏、路由、全局布局）
    ├── index.css               # 全局样式 + CSS 变量
    │
    ├── contexts/
    │   ├── AuthContext.jsx      # 用户认证上下文
    │   └── ThemeContext.jsx     # 暗/亮/跟随系统 主题上下文
    │
    ├── components/
    │   ├── Home.jsx             # 首页 — 剧集列表/筛选/搜索
    │   ├── EpisodeDetail.jsx    # 剧集详情页
    │   ├── CreatorPage.jsx      # 创作者主页
    │   ├── UpdateCalendar.jsx   # 更新日历视图
    │   ├── Login.jsx            # 登录（含验证码、设备验证）
    │   ├── Register.jsx         # 注册
    │   ├── Profile.jsx          # 个人中心
    │   ├── ChangePassword.jsx   # 修改密码
    │   ├── ResetPassword.jsx    # 重置密码
    │   ├── VerifyEmail.jsx      # 邮件验证
    │   ├── UserDevices.jsx      # 设备管理
    │   ├── NotFound.jsx         # 404 页面
    │   ├── SitePage.jsx         # 静态页面（隐私政策/用户协议/关于/许可协议）
    │   ├── FriendLinks.jsx      # 友情链接页面
    │   ├── FeedbackModal.jsx    # 用户反馈弹窗
    │   ├── ReportModal.jsx      # 举报弹窗
    │   ├── ShareModal.jsx       # 分享弹窗
    │   ├── SearchInput.jsx      # 搜索输入组件
    │   ├── ImageUploader.jsx    # 图片上传组件
    │   ├── CustomSelect.jsx     # 自定义下拉选择
    │   ├── Skeleton.jsx         # 骨架屏占位组件
    │   ├── EpisodeList.jsx      # 剧集列表
    │   ├── EpisodeSearch.jsx    # 剧集高级搜索
    │   ├── EpisodeFormModal.jsx # 剧集创建/编辑弹窗
    │   ├── SingleEpisodeManager.jsx # 单集管理器
    │   ├── ConfirmModal.jsx     # 确认弹窗
    │   │
    │   ├── Admin.jsx            # 管理员登录页
    │   ├── AdminLayout.jsx      # 后台管理布局（侧边栏+内容区）
    │   ├── AdminDashboard.jsx   # 管理仪表盘
    │   ├── AdminEpisodes.jsx    # 剧集管理
    │   ├── AdminUsers.jsx       # 用户管理
    │   ├── AdminCategories.jsx  # 分类管理
    │   ├── AdminBanners.jsx     # 首页轮播图管理
    │   ├── AdminReview.jsx      # 内容审核
    │   ├── AdminReports.jsx     # 举报处理
    │   ├── AdminStats.jsx       # 数据统计
    │   ├── AdminCreatorProfile.jsx  # 创作者档案管理
    │   ├── AdminSiteContent.jsx # 站点内容配置（Logo、备案号等）
    │   ├── AdminEmailSettings.jsx   # 邮件设置
    │   ├── AdminAuditLogs.jsx   # 审计日志
    │   ├── AdminBackup.jsx      # 数据备份
    │   ├── AdminFeedback.jsx    # 反馈管理
    │   ├── AdminApiUsage.jsx    # API 调用量统计
    │   ├── AdminFriendLinks.jsx # 友情链接审核
    │   ├── AdminSessions.jsx    # 用户会话管理
    │   └── AdminAnalytics.jsx   # 访问分析
    │
    ├── hooks/
    │   ├── useAuth.js           # 认证 hooks
    │   ├── useEpisodes.js       # 剧集数据 hooks
    │   ├── useCategories.js     # 分类 hooks
    │   ├── useEpisodeForm.js    # 剧集表单 hooks
    │   └── useImageUpload.js    # 图片上传 hooks
    │
    └── utils/
        ├── axiosConfig.js       # axios 全局配置（401 拦截）
        └── deviceInfo.js        # 设备信息提取
```

## 快速开始

### 环境要求

- Node.js >= 18
- npm >= 9

### 安装与运行

```bash
# 安装依赖
npm install

# 启动开发服务器（默认 http://localhost:3000）
npm run dev

# 构建生产版本
npm run build

# 预览构建产物
npm run preview
```

### 开发环境代理

开发时前端运行在 `localhost:3000`，通过 Vite 代理将 `/api` 和 `/uploads` 请求转发到后端（默认 `http://localhost:5000`）。

可在 [vite.config.js](vite.config.js) 中修改后端地址：

```js
server: {
  port: 3000,
  proxy: {
    '/api': {
      target: 'http://localhost:5000',  // 修改为你的后端地址
      changeOrigin: true,
    },
    '/uploads': {
      target: 'http://localhost:5000',
      changeOrigin: true,
    }
  }
}
```

## 部署到生产环境

### 同域部署（推荐）

通过 nginx/Caddy 将前端静态文件与后端 API 部署在同一域名下，无需修改任何前端代码。

**nginx 示例：**

```nginx
server {
    listen 80;
    server_name example.com;

    # 前端静态文件
    root /var/www/frontend/dist;
    index index.html;

    # SPA 路由回退
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 代理 API 到后端
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # 代理上传文件
    location /uploads/ {
        proxy_pass http://127.0.0.1:5000;
    }
}
```

### 跨域部署

如果前后端部署在不同域名，需设置环境变量：

1. 在项目根目录创建 `.env.production`：

```
VITE_API_BASE_URL=https://your-backend-api.example.com
```

2. 修改 [src/utils/axiosConfig.js](src/utils/axiosConfig.js)，设置 axios 基础 URL：

```js
axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL || '';
```

3. 确保后端已配置 CORS，允许前端域名访问。

## 环境变量

Vite 使用 `.env` 文件管理环境变量。只有 `VITE_` 前缀的变量会暴露给客户端代码。

| 变量 | 说明 | 必填 |
|---|---|---|
| `VITE_API_BASE_URL` | 后端 API 基础地址（跨域部署时使用） | 否 |

## 功能特性

### 用户端
- **剧集发现** — 按状态、评分、年份筛选，多维度排序
- **剧集详情** — 查看剧集信息、分集列表、评分评论
- **更新日历** — 日历视图追踪每周更新
- **创作者页面** — 按创作者聚合展示作品
- **用户系统** — 注册（含 captcha）、登录（含设备验证）、个人中心
- **通知系统** — 实时 SSE 推送，支持降级轮询
- **暗色/亮色/跟随系统** — 三档主题切换
- **友情链接** — 合作站点展示
- **RSS 订阅** — 剧集更新通过 API 提供 RSS feed
- **PWA 支持** — Service Worker 离线缓存

### 管理后台
- **仪表盘** — 关键数据一览，待处理事项红色徽章
- **剧集管理** — CRUD + 批量操作 + 单集管理
- **用户管理** — 账号状态、角色管理
- **内容审核** — 剧集与评论审核工作流
- **分类管理** — 灵活分类体系
- **轮播图管理** — 首页 banner 配置
- **站点配置** — 站点名称、Logo、备案号、版权信息等
- **数据统计** — 访问量、增长率、热门内容
- **审计日志** — 管理员操作记录
- **数据备份** — 数据库导出
- **反馈管理** — 用户反馈处理
- **会话管理** — 在线用户和设备管理
- **API 用量** — 接口调用统计
- **邮件设置** — 邮件模板配置

## 相关项目

- **后端**：[furry-drama-be](https://github.com/Furry09shou/furry-drama-be) — Node.js/Express 后端 API
- **前端**：本项目 — React 前端 SPA

## 许可协议

[GNU General Public License v3.0](https://www.gnu.org/licenses/gpl-3.0.html)

本程序是自由软件：你可以根据自由软件基金会发布的 GNU 通用公共许可证（版本 3 或更高版本）的条款重新发布或修改它。
