import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const PUSH_ENABLED_KEY = 'push-notifications-enabled';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function usePushNotifications() {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState('default');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const swSupported = 'serviceWorker' in navigator && 'PushManager' in window;
    setSupported(swSupported);
    if (swSupported) {
      setPermission(Notification.permission);
      setSubscribed(localStorage.getItem(PUSH_ENABLED_KEY) === 'true');
    }
  }, []);

  const subscribe = useCallback(async () => {
    if (!supported) return false;
    setLoading(true);
    try {
      const permResult = await Notification.requestPermission();
      setPermission(permResult);
      if (permResult !== 'granted') {
        setLoading(false);
        return false;
      }

      const registration = await navigator.serviceWorker.ready;
      const { data } = await axios.get('/api/notifications/vapid-public-key');
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.publicKey),
      });

      await axios.post('/api/notifications/push/subscribe', {
        subscription: subscription.toJSON(),
      });

      localStorage.setItem(PUSH_ENABLED_KEY, 'true');
      setSubscribed(true);
      setLoading(false);
      return true;
    } catch (e) {
      setLoading(false);
      return false;
    }
  }, [supported]);

  const unsubscribe = useCallback(async () => {
    if (!supported) return false;
    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await axios.post('/api/notifications/push/unsubscribe', {
          endpoint: subscription.endpoint,
        });
        await subscription.unsubscribe();
      }
      localStorage.setItem(PUSH_ENABLED_KEY, 'false');
      setSubscribed(false);
      setLoading(false);
      return true;
    } catch (e) {
      setLoading(false);
      return false;
    }
  }, [supported]);

  const toggle = useCallback(async () => {
    if (subscribed) {
      return await unsubscribe();
    } else {
      return await subscribe();
    }
  }, [subscribed, subscribe, unsubscribe]);

  return { supported, permission, subscribed, loading, subscribe, unsubscribe, toggle };
}
