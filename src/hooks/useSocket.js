import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const NODE_URL = import.meta.env.VITE_NODE_API_URL?.replace('/api', '') || 'http://localhost:3000';

let sharedSocket = null;
let refCount = 0;

export function getSocket() {
  if (!sharedSocket || sharedSocket.disconnected) {
    sharedSocket = io(NODE_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });
  }
  return sharedSocket;
}

/**
 * Hook that connects to the Socket.io server and subscribes to events.
 *
 * @param {Record<string, Function>} handlers  — map of event name → callback
 * @param {string[]} rooms                     — list of rooms to join (e.g. ["task:42"])
 */
export function useSocket(handlers = {}, rooms = []) {
  const socketRef = useRef(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const joinRooms = useCallback((socket) => {
    rooms.forEach((room) => {
      if (room.startsWith('team:'))      socket.emit('join:team',  room.replace('team:', ''));
      else if (room.startsWith('user:')) socket.emit('join:user',  room.replace('user:', ''));
      else                               socket.emit('join:task',  room.replace('task:', ''));
    });
  }, [rooms.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;
    refCount++;

    // Attach event handlers — always call the LATEST handler via ref
    const eventNames = Object.keys(handlersRef.current);
    const wrappers = {};
    eventNames.forEach((event) => {
      const wrapper = (...args) => handlersRef.current[event]?.(...args);
      wrappers[event] = wrapper;
      socket.on(event, wrapper);
    });

    if (socket.connected) {
      joinRooms(socket);
    } else {
      socket.once('connect', () => joinRooms(socket));
    }

    return () => {
      // Remove listeners
      Object.entries(wrappers).forEach(([event, fn]) => socket.off(event, fn));

      // Leave rooms
      rooms.forEach((room) => {
        if (room.startsWith('team:'))      socket.emit('leave:team', room.replace('team:', ''));
        else if (room.startsWith('user:')) socket.emit('leave:user', room.replace('user:', ''));
        else                               socket.emit('leave:task', room.replace('task:', ''));
      });

      // Do NOT disconnect — the socket is a shared singleton that must stay
      // alive for the full app session (useMentionNotifications depends on it).
      refCount--;
    };
  }, [joinRooms]);

  return socketRef.current;
}
