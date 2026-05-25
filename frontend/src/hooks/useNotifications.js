import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const useNotifications = () => {
  const { user, getAuthHeaders } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const sseRef = useRef(null);

  useEffect(() => {
    if (!user) return;

    let reconnectTimer = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 10;
    const getReconnectDelay = () => Math.min(3000 * Math.pow(1.5, reconnectAttempts), 30000);

    const connectSSE = async () => {
      if (sseRef.current) {
        sseRef.current.close();
      }
      try {
        const ticketRes = await axios.get('/api/auth/sse-ticket', { headers: getAuthHeaders() });
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
          if (reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            reconnectTimer = setTimeout(connectSSE, getReconnectDelay());
          }
        };

        reconnectAttempts = 0;
      } catch (e) {
        if (reconnectAttempts < maxReconnectAttempts) {
          reconnectAttempts++;
          reconnectTimer = setTimeout(connectSSE, getReconnectDelay());
        }
      }
    };

    connectSSE();

    const fetchUnread = () => {
      axios.get('/api/notifications/unread-count', { headers: getAuthHeaders() })
        .then(res => setUnreadCount(res.data.count))
        .catch(() => {});
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);

    return () => {
      clearInterval(interval);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (sseRef.current) {
        sseRef.current.close();
      }
    };
  }, [user, getAuthHeaders]);

  const refreshNotifications = useCallback(() => {
    if (!user) return;
    setLoading(true);
    axios.get('/api/notifications/list', { headers: getAuthHeaders() })
      .then(res => {
        setNotifications(res.data.list || res.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, getAuthHeaders]);

  const markAllRead = useCallback(async () => {
    try {
      await axios.put('/api/notifications/read-all', {}, { headers: getAuthHeaders() });
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (e) {}
  }, [getAuthHeaders]);

  const markRead = useCallback(async (id) => {
    try {
      await axios.put(`/api/notifications/${id}/read`, {}, { headers: getAuthHeaders() });
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) {}
  }, [getAuthHeaders]);

  const clearRead = useCallback(async () => {
    try {
      await axios.delete('/api/notifications/clear-read', { headers: getAuthHeaders() });
      setNotifications(prev => prev.filter(n => !n.isRead));
    } catch (e) {}
  }, [getAuthHeaders]);

  const deleteNotification = useCallback(async (id) => {
    try {
      await axios.delete(`/api/notifications/${id}`, { headers: getAuthHeaders() });
      setNotifications(prev => {
        const target = prev.find(n => n._id === id);
        if (target && !target.isRead) {
          setUnreadCount(count => Math.max(0, count - 1));
        }
        return prev.filter(n => n._id !== id);
      });
    } catch (e) {}
  }, [getAuthHeaders]);

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
