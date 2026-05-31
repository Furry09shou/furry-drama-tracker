import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

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
        const token = localStorage.getItem('token');
        if (!token) return;

        const ticketRes = await axios.get('/api/auth/sse-ticket', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const ticket = ticketRes.data.ticket;
        const eventSource = new EventSource(`/api/notifications/stream?ticket=${ticket}`);
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
      const token = localStorage.getItem('token');
      if (!token) return;
      axios.get('/api/notifications/unread-count', {
        headers: { Authorization: `Bearer ${token}` }
      })
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

  const refreshNotifications = useCallback(() => {
    if (!user) return;
    setLoading(true);
    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }
    axios.get('/api/notifications/list', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        if (mountedRef.current) {
          setNotifications(res.data.list || res.data);
        }
      })
      .catch(() => {})
      .finally(() => { if (mountedRef.current) setLoading(false); });
  }, [user]);

  const markAllRead = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      await axios.put('/api/notifications/read-all', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (e) {}
  }, []);

  const markRead = useCallback(async (id) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      await axios.put(`/api/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) {}
  }, []);

  const clearRead = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      await axios.delete('/api/notifications/clear-read', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.filter(n => !n.isRead));
    } catch (e) {}
  }, []);

  const deleteNotification = useCallback(async (id) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      await axios.delete(`/api/notifications/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => {
        const target = prev.find(n => n._id === id);
        if (target && !target.isRead) {
          setUnreadCount(count => Math.max(0, count - 1));
        }
        return prev.filter(n => n._id !== id);
      });
    } catch (e) {}
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    markAllRead,
    markRead,
    clearRead,
    deleteNotification,
    refreshNotifications,
  };
};

export default useNotifications;
