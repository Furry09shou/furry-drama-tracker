#!/usr/bin/env node
/**
 * 兽剧聚合平台 (Furry Drama Tracker) — 驱动脚本
 *
 * 用法:
 *   node driver.mjs [command]
 *
 * 命令:
 *   smoke        — API 登录 + Playwright 截图主要页面 → /tmp/screenshots/
 *   login        — API 登录 (dev token 绕过 altcha)，保存 token
 *   screenshot   — 仅打开首页截图 (未登录)
 *   health       — 检查前后端健康状态
 *   api <method> <path> [body] — 使用 dev token 调用 API
 *
 * 环境变量 (.env):
 *   DEV_API_TOKEN=dev-token-for-automation  ← 后端 .env 中也需设置相同值
 *
 * 需要后端 (:5000) 和前端 (:3000) 均已启动。
 * 需要 MongoDB 运行中。
 */

import { chromium } from 'playwright';
import { execSync } from 'child_process';
import { mkdirSync, writeFileSync, readFileSync } from 'fs';

const BASE = 'http://localhost:3000';
const API = 'http://localhost:5000/api';
const SCREENSHOT_DIR = '/tmp/screenshots';
const ADMIN = { email: 'admin@furry09.com', password: 'admin123456' };
const DEV_TOKEN = process.env.DEV_API_TOKEN || 'dev-token-for-automation';

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function ssName(label) {
  return `${SCREENSHOT_DIR}/${label}-${timestamp()}.png`;
}

/**
 * 使用 curl 调用后端 API (带 dev token 绕过 altcha)
 */
function apiCall(method, path, body) {
  // 获取 CSRF token
  const csrfRes = execSync(
    `curl -s -c /tmp/fdt-cookies.txt ${API}/csrf-token`,
    { encoding: 'utf8' }
  );
  const csrfToken = JSON.parse(csrfRes).csrfToken;

  let cmd = `curl -s -X ${method} "${API}${path}"`;
  cmd += ` -H "Content-Type: application/json"`;
  cmd += ` -H "X-Dev-Token: ${DEV_TOKEN}"`;
  cmd += ` -H "X-XSRF-TOKEN: ${csrfToken}"`;
  cmd += ` -b /tmp/fdt-cookies.txt`;
  if (body) {
    cmd += ` -d '${JSON.stringify(body)}'`;
  }
  cmd += ` -D /tmp/fdt-headers.txt`;

  const result = execSync(cmd, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  return result;
}

/**
 * API 登录 — 使用 dev token 绕过 altcha、邮箱验证、设备验证。
 * 将 JWT token 保存到 /tmp/fdt-token.txt
 */
async function apiLogin() {
  console.log('=== API 登录 (dev token 绕过) ===');

  // 获取 CSRF token
  const csrfRes = execSync(
    `curl -s -c /tmp/fdt-cookies.txt ${API}/csrf-token`,
    { encoding: 'utf8' }
  );
  const csrfToken = JSON.parse(csrfRes).csrfToken;
  console.log('CSRF token: acquired');

  // 登录 (带 dev token)
  const result = execSync(
    `curl -s -X POST "${API}/auth/login"` +
    ` -H "Content-Type: application/json"` +
    ` -H "X-Dev-Token: ${DEV_TOKEN}"` +
    ` -H "X-XSRF-TOKEN: ${csrfToken}"` +
    ` -b /tmp/fdt-cookies.txt` +
    ` -D /tmp/fdt-headers.txt` +
    ` -d '${JSON.stringify({
      email: ADMIN.email,
      password: ADMIN.password,
      altcha: 'bypassed',
      deviceInfo: { userAgent: 'fdt-driver', platform: 'linux' },
    })}'`,
    { encoding: 'utf8' }
  );

  const user = JSON.parse(result);
  console.log('User:', user.email, '| Role:', user.role);
  console.log('Email verified:', user.isEmailVerified);

  // 从响应头提取 token
  const headers = readFileSync('/tmp/fdt-headers.txt', 'utf8');
  const tokenMatch = headers.match(/token=([^;]+)/);
  if (tokenMatch) {
    writeFileSync('/tmp/fdt-token.txt', tokenMatch[1]);
    console.log('✓ Token saved to /tmp/fdt-token.txt');
    return tokenMatch[1];
  } else {
    // token 可能只在 Set-Cookie 中
    const setCookie = headers.match(/Set-Cookie: token=([^;]+)/);
    if (setCookie) {
      writeFileSync('/tmp/fdt-token.txt', setCookie[1]);
      console.log('✓ Token saved to /tmp/fdt-token.txt');
      return setCookie[1];
    }
    console.error('Failed to extract token from response');
    console.error('Headers:', headers.substring(0, 500));
    process.exit(1);
  }
}

/**
 * 健康检查
 */
async function healthCheck() {
  console.log('=== 健康检查 ===');
  try {
    const api = execSync(`curl -s ${API}/health`, { encoding: 'utf8' });
    const data = JSON.parse(api);
    console.log('Backend:', data.status, '- DB:', data.db);
  } catch (e) {
    console.error('Backend DOWN:', e.message);
    process.exit(1);
  }
  try {
    const front = execSync(`curl -s -o /dev/null -w "%{http_code}" ${BASE}`, { encoding: 'utf8' });
    console.log('Frontend HTTP:', front.trim());
  } catch (e) {
    console.error('Frontend DOWN:', e.message);
    process.exit(1);
  }
}

async function takeScreenshot(page, label) {
  const path = ssName(label);
  await page.screenshot({ path, fullPage: false });
  console.log(`  ✓ Screenshot: ${path}`);
  return path;
}

/**
 * 完整 smoke 测试: API 登录 + Playwright 截图各页面
 */
async function smoke() {
  mkdirSync(SCREENSHOT_DIR, { recursive: true });
  await healthCheck();

  // Step 1: API 登录
  const token = await apiLogin();

  // Step 2: 浏览器截图 (注入 token)
  console.log('\n=== 浏览器截图 ===');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    locale: 'zh-CN',
  });
  const page = await context.newPage();

  // 注入 auth token
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.evaluate((t) => {
    localStorage.setItem('token', t);
    document.cookie = `token=${t}; path=/`;
  }, token);

  try {
    // 1. 首页 (已登录)
    console.log('\n--- 首页 (已登录) ---');
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);
    await takeScreenshot(page, '01-homepage-loggedin');

    // 2. 管理页面
    console.log('\n--- 管理页面 ---');
    await page.goto(`${BASE}/admin`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2500);
    await takeScreenshot(page, '02-admin');

    // 3. 管理仪表盘
    console.log('\n--- 管理仪表盘 ---');
    await page.goto(`${BASE}/admin/dashboard`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2500);
    await takeScreenshot(page, '03-admin-dashboard');

    // 4. 管理剧集
    console.log('\n--- 管理剧集 ---');
    await page.goto(`${BASE}/admin/episodes`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2500);
    await takeScreenshot(page, '04-admin-episodes');

    // 5. 日历页
    console.log('\n--- 日历页 ---');
    await page.goto(`${BASE}/calendar`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2500);
    await takeScreenshot(page, '05-calendar');

    // 6. 时间线
    console.log('\n--- 时间线 ---');
    await page.goto(`${BASE}/timeline`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2500);
    await takeScreenshot(page, '06-timeline');

    console.log('\n=== 全部截图完成 ===');
    console.log(`截图目录: ${SCREENSHOT_DIR}`);
    execSync(`ls -la ${SCREENSHOT_DIR}/`, { stdio: 'inherit' });

  } finally {
    await browser.close();
  }
}

/**
 * 仅截图首页 (未登录状态)
 */
async function screenshotOnly() {
  mkdirSync(SCREENSHOT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    locale: 'zh-CN',
  });
  const page = await context.newPage();

  try {
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);
    await takeScreenshot(page, 'homepage');
    console.log('页面标题:', await page.title());
  } finally {
    await browser.close();
  }
}

// Main
const cmd = process.argv[2] || 'smoke';

switch (cmd) {
  case 'health':
    await healthCheck();
    break;
  case 'login':
    await apiLogin();
    break;
  case 'screenshot':
    await screenshotOnly();
    break;
  case 'api':
    {
      const method = process.argv[3] || 'GET';
      const path = process.argv[4] || '/health';
      const body = process.argv[5];
      const result = apiCall(method, path, body ? JSON.parse(body) : undefined);
      console.log(result);
    }
    break;
  case 'smoke':
  default:
    await smoke();
    break;
}
