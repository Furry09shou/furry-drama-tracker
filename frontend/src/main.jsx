import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import './utils/axiosConfig'

if ('serviceWorker' in navigator) {
  const { registerSW } = await import('virtual:pwa-register');
  registerSW({
    onOfflineReady() {
      console.log('[PWA] App is available offline');
    },
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
