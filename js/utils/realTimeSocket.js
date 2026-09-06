/**
 * Utility helper WebSocket & BroadcastChannel untuk komunikasi real-time antar tab
 */
const CHANNEL_NAME = 'bookstore_inventory_channel';
let broadcastChannel = null;
let listeners = [];

function getBroadcastChannel() {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    if (!broadcastChannel) {
      broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
      broadcastChannel.onmessage = (event) => {
        listeners.forEach((callback) => {
          try {
            callback(event.data);
          } catch (err) {
            console.error('Error in BroadcastChannel listener:', err);
          }
        });
      };
    }
    return broadcastChannel;
  }
  return null;
}

/**
 * Mendaftarkan callback untuk menerima pesan perubahan real-time
 * @param {Function} onMessageCallback 
 */
export function connectSocket(onMessageCallback) {
  if (typeof onMessageCallback === 'function') {
    listeners.push(onMessageCallback);
  }
  getBroadcastChannel();

  // Fallback juga mendengarkan storage event untuk browser yang tidak mendukung BroadcastChannel
  const storageListener = (e) => {
    if (e.key === 'bookstore_inventory_stock' && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        if (typeof onMessageCallback === 'function') {
          onMessageCallback({ type: 'STOCK_STORAGE_SYNC', data: parsed });
        }
      } catch (err) {
        // ignore
      }
    }
  };
  window.addEventListener('storage', storageListener);

  return {
    disconnect: () => {
      listeners = listeners.filter((cb) => cb !== onMessageCallback);
      window.removeEventListener('storage', storageListener);
    }
  };
}

/**
 * Mengirim pesan / sinyal broadcast ke tab lain
 * @param {Object|string} data 
 */
export function sendSocketMessage(data) {
  const channel = getBroadcastChannel();
  const payload = typeof data === 'string' ? { message: data } : data;
  if (channel) {
    channel.postMessage(payload);
    return true;
  }
  return false;
}

/**
 * Menutup channel koneksi
 */
export function closeSocket() {
  if (broadcastChannel) {
    broadcastChannel.close();
    broadcastChannel = null;
  }
  listeners = [];
}

export default {
  connectSocket,
  sendSocketMessage,
  closeSocket
};
