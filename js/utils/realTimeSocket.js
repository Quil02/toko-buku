/**
 * Utility stub helper WebSocket
 */
let socketInstance = null;

export function connectSocket(onMessageCallback) {
  // Safe fallback stub when WebSocket server is not configured
  return socketInstance;
}

export function sendSocketMessage(data) {
  if (socketInstance && socketInstance.readyState === WebSocket.OPEN) {
    const payload = typeof data === 'string' ? data : JSON.stringify(data);
    socketInstance.send(payload);
    return true;
  }
  return false;
}

export function closeSocket() {
  if (socketInstance) {
    socketInstance.close();
    socketInstance = null;
  }
}

export default {
  connectSocket,
  sendSocketMessage,
  closeSocket
};
