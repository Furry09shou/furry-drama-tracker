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

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
