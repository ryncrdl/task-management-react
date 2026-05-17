import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSocket } from './useSocket';
import { useToast } from '../context/ToastContext';
import { useNotifications } from '../context/NotificationContext';

export function useMentionNotifications(userId) {
  const { addToast } = useToast();
  const { addNotification, loadNotifications, resetNotifications } = useNotifications();
  const navigate = useNavigate();

  useEffect(() => {
    if (!userId) return;

    // Load persisted notifications from DB on first mount
    loadNotifications();

    const socket = getSocket();

    const join = () => {
      console.log('[Notifications] Joining user room:', `user:${userId}`);
      socket.emit('join:user', userId);
    };

    socket.on('connect', () => {
      console.log('[Notifications] Socket connected, id:', socket.id);
      join();
    });

    if (socket.connected) {
      join();
    } else {
      console.log('[Notifications] Socket not yet connected, waiting...');
    }

    socket.on('disconnect', (reason) => {
      console.log('[Notifications] Socket disconnected:', reason);
    });

    function onMentioned(data) {
      console.log('[Notifications] user:mentioned received', data);
      const msg = `${data.mentioned_by} mentioned you in "${data.task_title}"`;
      addNotification({ type: 'mention', message: msg, task_id: data.task_id });
      addToast(msg, 'info', {
        label: 'View task',
        onClick: () => navigate(`/tasks/${data.task_id}`),
      });
    }

    function onTaskCreated(data) {
      console.log('[Notifications] task:created received', data, 'userId:', userId);
      if (String(data.assigned_to) !== String(userId)) return;
      const msg = `You have been assigned a new task: "${data.title}"`;
      addNotification({ type: 'assigned', message: msg, task_id: data.task_id });
      addToast(msg, 'info', {
        label: 'View task',
        onClick: () => navigate(`/tasks/${data.task_id}`),
      });
    }

    function onTaskUpdated(data) {
      console.log('[Notifications] task:updated received', data, 'userId:', userId);
      if (String(data.assigned_to) !== String(userId)) return;
      const msg = `You have been assigned to task: "${data.title}"`;
      addNotification({ type: 'assigned', message: msg, task_id: data.task_id });
      addToast(msg, 'info', {
        label: 'View task',
        onClick: () => navigate(`/tasks/${data.task_id}`),
      });
    }

    socket.on('user:mentioned', onMentioned);
    socket.on('task:created',   onTaskCreated);
    socket.on('task:updated',   onTaskUpdated);

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('user:mentioned', onMentioned);
      socket.off('task:created',   onTaskCreated);
      socket.off('task:updated',   onTaskUpdated);
      socket.emit('leave:user', userId);
    };
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset when user logs out
  useEffect(() => {
    if (!userId) resetNotifications();
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps
}
