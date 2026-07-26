---
name: deploy-furry-drama-tracker
description: Deploy Furry Drama Tracker updates — git pull, install deps, rebuild frontend, restart backend via PM2.
---

兽剧聚合平台 (Furry Drama Tracker) 生产环境部署更新流程。从 GitHub 拉取最新代码，安装依赖，构建前端，重启后端。

## 前提条件

- 仓库已 clone 到 `/var/www/furry-drama-tracker`
- 后端通过 PM2 管理，进程名为 `furry-drama-backend`
- Node.js >= 18，MongoDB 已在运行

## 部署步骤

从仓库根目录执行按顺序执行以下 4 步：

### 1. 拉取最新代码

```bash
git pull origin main
```

### 2. 安装依赖（并行）

```bash
# 后端
cd backend && npm install

# 前端
cd frontend && npm install
```

### 3. 构建前端

```bash
cd frontend && npm run build
```

构建产物输出到 `frontend/dist/`，由 Caddy 直接托管。

### 4. 重启后端

```bash
pm2 restart furry-drama-backend
```

PM2 进程会平滑重启，无停机时间。

## 完整一键流程

```bash
# 在仓库根目录执行:
git pull origin main \
  && (cd backend && npm install) \
  && (cd frontend && npm install && npm run build) \
  && pm2 restart furry-drama-backend
```

## 验证

```bash
# 检查 PM2 进程状态 (online, uptime)
pm2 status furry-drama-backend

# 检查后端健康
curl -s http://localhost:5000/api/health

# 检查前端可访问
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
```

## 注意事项

- 无需停止旧进程，PM2 的 `restart` 会优雅替换
- 若 `package.json` 无新依赖变更，`npm install` 会提示 `up to date`
- `git pull` 若遇本地变更冲突，需先 `git stash` 或 `git reset --hard`
- 前端 `dist/` 目录每次 `vite build` 会完全重建，旧文件自动覆盖
