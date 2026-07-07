import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import './utils/axiosConfig'
import 'altcha'

if ('serviceWorker' in navigator) {
  import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({
      onOfflineReady() {
        console.log('[PWA] App is available offline');
      },
    });
  });
}

// 全局捕获 beforeinstallprompt 事件，防止 React 挂载前事件已触发导致丢失
window.__pwaDeferredPrompt = null;
window.__pwaPromptFired = false;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  window.__pwaDeferredPrompt = e;
  window.__pwaPromptFired = true;
  // 如果 React 组件已挂载，通过自定义事件通知
  window.dispatchEvent(new CustomEvent('pwa-install-available'));
});

// 全局拦截表单原生验证提示，替换为自定义 i18n 文案和红色边框样式
const VALIDATION_MSG_MAP = {
  valueMissing: { zh: '请填写此内容', en: 'Please fill in this field' },
  typeMismatch: {
    email: { zh: '请输入有效的邮箱地址', en: 'Please enter a valid email address' },
    url: { zh: '请输入有效的网址', en: 'Please enter a valid URL' },
    default: { zh: '格式不正确', en: 'Invalid format' },
  },
  tooShort: { zh: '内容太短', en: 'Input is too short' },
  patternMismatch: { zh: '格式不符合要求', en: 'Format does not match' },
};

function getValidationMsg(el) {
  const lang = (document.documentElement.lang || 'zh').startsWith('en') ? 'en' : 'zh';
  const v = el.validity;
  if (v.valueMissing) return VALIDATION_MSG_MAP.valueMissing[lang];
  if (v.typeMismatch) {
    const sub = VALIDATION_MSG_MAP.typeMismatch[el.type] || VALIDATION_MSG_MAP.typeMismatch.default;
    return sub[lang];
  }
  if (v.tooShort) return VALIDATION_MSG_MAP.tooShort[lang];
  if (v.patternMismatch) return VALIDATION_MSG_MAP.patternMismatch[lang];
  return VALIDATION_MSG_MAP.valueMissing[lang];
}

// 在 invalid 事件冒泡阶段拦截，阻止浏览器原生弹框
document.addEventListener('invalid', (e) => {
  e.preventDefault();
  const el = e.target;
  const msg = getValidationMsg(el);
  el.setCustomValidity(msg);
  // 在输入框下方插入提示文字（如果还没有）
  let hint = el.nextElementSibling;
  if (!hint || !hint.classList.contains('validation-msg')) {
    hint = document.createElement('span');
    hint.className = 'validation-msg';
    el.insertAdjacentElement('afterend', hint);
  }
  hint.textContent = msg;
}, true);

// 输入时清除验证错误状态
document.addEventListener('input', (e) => {
  const el = e.target;
  if (el.validity) {
    el.setCustomValidity('');
    const hint = el.nextElementSibling;
    if (hint && hint.classList.contains('validation-msg')) {
      hint.remove();
    }
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
