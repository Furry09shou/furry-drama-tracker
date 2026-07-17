export const getDeviceInfo = () => {
  const ua = navigator.userAgent;
  let browser = '', browserVersion = '', os = '', osVersion = '', deviceType = 'desktop', deviceModel = '', carrier = '';

  if (/Mobile|Android|iPhone|iPad|iPod/i.test(ua)) deviceType = 'mobile';
  else if (/Tablet/i.test(ua)) deviceType = 'tablet';

  if (/Edg\/(\d+[\.\d]*)/.test(ua)) { browser = 'Microsoft Edge'; browserVersion = ua.match(/Edg\/(\d+[\.\d]*)/)?.[1] || ''; }
  else if (/Chrome\/(\d+[\.\d]*)/.test(ua) && !/Edg/.test(ua)) { browser = 'Google Chrome'; browserVersion = ua.match(/Chrome\/(\d+[\.\d]*)/)?.[1] || ''; }
  else if (/Firefox\/(\d+[\.\d]*)/.test(ua)) { browser = 'Mozilla Firefox'; browserVersion = ua.match(/Firefox\/(\d+[\.\d]*)/)?.[1] || ''; }
  else if (/Safari\/(\d+[\.\d]*)/.test(ua) && !/Chrome/.test(ua)) { browser = 'Apple Safari'; browserVersion = ua.match(/Version\/(\d+[\.\d]*)/)?.[1] || ''; }

  if (/Windows NT (\d+[\.\d]*)/.test(ua)) { os = 'Windows'; osVersion = ua.match(/Windows NT (\d+[\.\d]*)/)?.[1] || ''; }
  else if (/Mac OS X (\d+[._\d]*)/.test(ua)) { os = 'macOS'; osVersion = (ua.match(/Mac OS X (\d+[._\d]*)/)?.[1] || '').replace(/_/g, '.'); }
  else if (/Android (\d+[\.\d]*)/.test(ua)) {
    os = 'Android'; osVersion = ua.match(/Android (\d+[\.\d]*)/)?.[1] || '';
    const buildMatch = ua.match(/;\s*([^;)]+)\s*Build\//);
    if (buildMatch) deviceModel = buildMatch[1].trim();
  } else if (/iPhone OS (\d+[_\d]*)/.test(ua)) {
    os = 'iOS'; osVersion = (ua.match(/iPhone OS (\d+[_\d]*)/)?.[1] || '').replace(/_/g, '.');
    deviceModel = 'iPhone';
    // iOS 26+ 起 Safari 冻结 iPhone OS 版本号为 18_x，真实系统版本需从 Version/ 获取
    if (!/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua)) {
      const vMatch = ua.match(/Version\/(\d+[\.\d]*)/);
      if (vMatch && parseInt(vMatch[1], 10) >= 26) {
        osVersion = vMatch[1];
      }
    }
  } else if (/iPad/.test(ua)) {
    os = 'iPadOS'; osVersion = (ua.match(/CPU OS (\d+[_\d]*)/)?.[1] || '').replace(/_/g, '.');
    deviceModel = 'iPad';
    // iPadOS 26+ 同样冻结版本号，真实版本从 Version/ 获取
    if (!/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua)) {
      const vMatch = ua.match(/Version\/(\d+[\.\d]*)/);
      if (vMatch && parseInt(vMatch[1], 10) >= 26) {
        osVersion = vMatch[1];
      }
    }
  } else if (/Linux/.test(ua)) { os = 'Linux'; }

  if (navigator.connection && navigator.connection.effectiveType) {
    carrier = navigator.connection.effectiveType;
  }

  return {
    browser, browserVersion, os, osVersion, deviceType, deviceModel, carrier,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    language: navigator.language || ''
  };
};
