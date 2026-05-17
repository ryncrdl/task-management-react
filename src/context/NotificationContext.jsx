import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { laravelApi } from '../api/axiosConfig';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const loadedRef = useRef(false);

  /**
   * Fetch persisted notifications from the DB.
   * Called once after the user authenticates (from useMentionNotifications).
   * loadedRef ensures we don't re-fetch during the same session, but resets
   * on page refresh (component remount) so we always load fresh data.
   */
  const loadNotifications = useCallback(async () => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    try {
      const { data } = await laravelApi.get('/notifications');
      const items = data.data ?? [];
      setNotifications(
        items.map((n) => ({
          id:      `db-${n.id}`,
          dbId:    n.id,
          type:    n.type,
          message: n.message,
          task_id: n.task_id,
          read:    n.read,
        }))
      );
    } catch (err) {
      // Allow retry on next navigation if the fetch failed
      loadedRef.current = false;
      console.error('[Notifications] Failed to load from DB:', err?.response?.status, err?.message);
    }
  }, []);

  /**
   * Add a real-time notification (from a socket event).
   * The backend already saved it to DB; this just shows it instantly
   * without waiting for the next page load.
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
