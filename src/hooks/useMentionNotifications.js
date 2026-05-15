import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSocket } from './useSocket';
import { useToast } from '../context/ToastContext';
import { useNotifications } from '../context/NotificationContext';

/**
 * Joins the user's personal Socket.io room and listens for mention notifications.
 * Call once in a top-level authenticated component.
 */
export function useMentionNotifications(userId) {
  const { addToast } = useToast();
  const { addNotification } = useNotifications();
  const navigate = useNavigate();

  useEffect(() => {
    if (!userId) return;

    const socket = getSocket();

    // Join (or re-join after reconnect)
    const join = () => socket.emit('join:user', userId);
    socket.on('connect', join);
    if (socket.connected) join();

    function onMentioned(data) {
      addNotification({
        message: `${data.mentioned_by} mentioned you in "${data.task_title}"`,
        task_id: data.task_id,
        task_title: data.task_title,
        mentioned_by: data.mentioned_by,
      });
      addToast(
        `${data.mentioned_by} mentioned you in "${data.task_title}"`,
        'info',
        {
          label: 'View task',
          onClick: () => navigate(`/tasks/${data.task_id}`),
        }
      );
    }

    socket.on('user:mentioned', onMentioned);

    return () => {
      socket.off('connect', join);
      socket.off('user:mentioned', onMentioned);
      socket.emit('leave:user', userId);
    };
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps
}
