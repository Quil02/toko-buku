import { CONFIG } from '../config.js';

let socketInstance = null;
let reconnectTimer = null;
let isIntentionallyClosed = false;

export function connectSocket(onMessageCallback) {
  isIntentionallyClosed = false;

  if (socketInstance && (socketInstance.readyState === WebSocket.OPEN || socketInstance.readyState === WebSocket.CONNECTING)) {
    return socketInstance;
  }

  try {
    socketInstance = new WebSocket(CONFIG.WS_BASE_URL);

    socketInstance.onopen = () => {
      console.log('[WebSocket] Connection established:', CONFIG.WS_BASE_URL);
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };

    socketInstance.onmessage = (event) => {
      try {
        const parsedData = JSON.parse(event.data);
        if (typeof onMessageCallback === 'function') {
          onMessageCallback(parsedData);
        }
      } catch (err) {
        if (typeof onMessageCallback === 'function') {
          onMessageCallback(event.data);
        }
      }
    };

    socketInstance.onerror = (error) => {
      console.error('[WebSocket] Error occurred:', error);
    };

    socketInstance.onclose = (event) => {
      console.warn('[WebSocket] Connection closed:', event.reason || 'No reason provided');
      if (!isIntentionallyClosed) {
        scheduleReconnect(onMessageCallback);
      }
    };
  } catch (err) {
    console.error('[WebSocket] Initialization failed:', err);
    if (!isIntentionallyClosed) {
      scheduleReconnect(onMessageCallback);
    }
  }

  return socketInstance;
}

function scheduleReconnect(onMessageCallback) {
  if (reconnectTimer) return;
  console.log('[WebSocket] Attempting reconnection in 5 seconds...');
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectSocket(onMessageCallback);
  }, 5000);
}

export function sendSocketMessage(data) {
  if (socketInstance && socketInstance.readyState === WebSocket.OPEN) {
    const payload = typeof data === 'string' ? data : JSON.stringify(data);
    socketInstance.send(payload);
    return true;
  }
  console.warn('[WebSocket] Cannot send message, socket is not open');
  return false;
}

export function closeSocket() {
  isIntentionallyClosed = true;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
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
