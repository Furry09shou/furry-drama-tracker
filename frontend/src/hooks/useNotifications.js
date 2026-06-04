import { useState, useEffect, useRef, useCallback, useEffectEvent } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import API from '../utils/apiEndpoints';

const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const sseRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!user) {
      if (sseRef.current) {
        sseRef.current.close();
        sseRef.current = null;
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      reconnectAttemptsRef.current = 0;
      setUnreadCount(0);
      setNotifications([]);
      return;
    }

    const maxReconnectAttempts = 5;
    const getReconnectDelay = () => Math.min(5000 * Math.pow(1.5, reconnectAttemptsRef.current), 60000);

    const connectSSE = async () => {
      if (!mountedRef.current || !user) return;
      if (sseRef.current) {
        sseRef.current.close();
        sseRef.current = null;
      }

      try {
        const ticketRes = await axios.get('/api/auth/sse-ticket');
        const ticket = ticketRes.data.ticket;
        const eventSource = new EventSource(`${API.NOTIFICATIONS.STREAM}?ticket=${ticket}`);
        sseRef.current = eventSource;

        eventSource.addEventListener('notification', (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.unreadCount !== undefined) {
              setUnreadCount(data.unreadCount);
            }
            if (data.type === 'new') {
              setUnreadCount(prev => prev + 1);
            }
          } catch (e) {}
        });

        eventSource.onerror = () => {
          eventSource.close();
          sseRef.current = null;
          if (mountedRef.current && reconnectAttemptsRef.current < maxReconnectAttempts) {
            reconnectAttemptsRef.current++;
            reconnectTimerRef.current = setTimeout(connectSSE, getReconnectDelay());
          }
        };

        reconnectAttemptsRef.current = 0;
      } catch (e) {
        if (mountedRef.current && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          reconnectTimerRef.current = setTimeout(connectSSE, getReconnectDelay());
        }
      }
    };

    connectSSE();

    const fetchUnread = () => {
      if (!mountedRef.current || !user) return;
      axios.get(API.NOTIFICATIONS.UNREAD_COUNT)
        .then(res => { if (mountedRef.current) setUnreadCount(res.data.count); })
        .catch(() => {});
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 60000);

    return () => {
      clearInterval(interval);
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (sseRef.current) {
        sseRef.current.close();
        sseRef.current = null;
      }
    };
  }, [user]);

  const onRefresh = useEffectEvent(() => {
    if (!user) return;
    setLoading(true);
    axios.get(`${API.NOTIFICATIONS.LIST}/list`)
      .then(res => {
        if (mountedRef.current) {
          setNotifications(res.data.list || res.data);
        }
      })
      .catch(() => {})
      .finally(() => { if (mountedRef.current) setLoading(false); });
  });

  const refreshNotifications = useCallback(() => {
    onRefresh();
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await axios.put(API.NOTIFICATIONS.MARK_ALL_READ, {});
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (e) {}
  }, []);

  const markRead = useCallback(async (id) => {
    try {
      await axios.put(API.NOTIFICATIONS.MARK_READ(id), {});
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) {}
  }, []);

  const clearRead = useCallback(async () => {
    try {
      await axios.delete('/api/notifications/clear-read');
      setNotifications(prev => prev.filter(n => !n.isRead));
    } catch (e) {}
  }, []);

  const deleteNotification = useCallback(async (id) => {
    try {
      await axios.delete(API.NOTIFICATIONS.DELETE(id));
      setNotifications(prev => {
        const target = prev.find(n => n._id === id);
        if (target && !target.isRead) {
          setUnreadCount(count => Math.max(0, count - 1));
        }
        return prev.filter(n => n._id !== id);
      });
    } catch (e) {}
  }, []);

  const deleteAllRead = useCallback(async () => {
    try {
      const readNotifications = notifications.filter(n => n.isRead);
      await Promise.all(readNotifications.map(n =>
        axios.delete(API.NOTIFICATIONS.DELETE(n._id))
      ));
      setNotifications(prev => prev.filter(n => !n.isRead));
    } catch (err) {
      console.error('Failed to delete read notifications:', err);
    }
  }, [notifications]);

  // 更新 PWA 图标角标
  useEffect(() => {
    if ('setAppBadge' in navigator && unreadCount > 0) {
      navigator.setAppBadge(unreadCount).catch(() => {});
    } else if ('clearAppBadge' in navigator) {
      navigator.clearAppBadge().catch(() => {});
    }
  }, [unreadCount]);

  return {
    notifications,
    unreadCount,
    loading,
    markAllRead,
    markRead,
    clearRead,
    deleteNotification,
    deleteAllRead,
    refreshNotifications,
  };
};

export default useNotifications;
