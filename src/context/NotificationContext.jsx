import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { laravelApi } from '../api/axiosConfig';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const loadedRef = useRef(false);

  /**
   * Fetch persisted notifications from the DB.
   * Called once after the user authenticates (from useMentionNotifications).
   */
  const loadNotifications = useCallback(async () => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    try {
      const { data } = await laravelApi.get('/notifications');
      setNotifications(
        (data.data || []).map((n) => ({
          id:      `db-${n.id}`,
          dbId:    n.id,
          type:    n.type,
          message: n.message,
          task_id: n.task_id,
          read:    n.read,
        }))
      );
    } catch { /* silent fail — bell will just start empty */ }
  }, []);

  /**
   * Add a real-time notification (from a socket event).
   * It is already saved to DB by the backend; this just shows it instantly.
   */
  const addNotification = useCallback((notification) => {
    setNotifications((prev) => [
      { ...notification, id: `sock-${Date.now()}`, read: false },
      ...prev,
    ].slice(0, 50));
  }, []);

  /** Mark all as read locally + persist to DB. */
  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try { await laravelApi.post('/notifications/mark-all-read'); } catch { /* silent */ }
  }, []);

  /** Clear all locally + delete from DB. */
  const clearAll = useCallback(async () => {
    setNotifications([]);
    try { await laravelApi.delete('/notifications'); } catch { /* silent */ }
  }, []);

  /** Called on logout so the next user starts with a clean slate. */
  const resetNotifications = useCallback(() => {
    setNotifications([]);
    loadedRef.current = false;
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{ notifications, addNotification, markAllRead, clearAll, unreadCount, loadNotifications, resetNotifications }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used inside NotificationProvider');
  return ctx;
}
