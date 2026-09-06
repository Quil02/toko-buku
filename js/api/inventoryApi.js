/**
 * Inventory API Service
 * Mengelola stok buku toko dengan sinkronisasi BroadcastChannel
 */
import { sendSocketMessage } from '../utils/realTimeSocket.js';

const INVENTORY_STORAGE_KEY = 'bookstore_inventory_stock';

function getStoredStockMap() {
  try {
    const data = localStorage.getItem(INVENTORY_STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch (err) {
    console.error('Gagal membaca inventory stock dari localStorage:', err);
    return {};
  }
}

function saveStockMap(map) {
  try {
    localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(map));
  } catch (err) {
    console.error('Gagal menyimpan inventory stock ke localStorage:', err);
  }
}

/**
 * Mengambil semua pemetaan stok { [bookId]: quantity }
 * @returns {Object}
 */
export function getAllStock() {
  return getStoredStockMap();
}

/**
 * Mengambil stok untuk satu buku berdasarkan ID (fallback hash generated jika belum ada)
 * @param {string} bookId 
 * @param {number} defaultStock 
 * @returns {number}
 */
export function getStockById(bookId, defaultStock = null) {
  if (!bookId) return 0;
  const map = getStoredStockMap();
  if (typeof map[bookId] === 'number') {
    return map[bookId];
  }

  if (defaultStock !== null && typeof defaultStock === 'number') {
    map[bookId] = defaultStock;
    saveStockMap(map);
    return defaultStock;
  }

  // Generate fallback deterministic stock jika belum ada
  let hash = 0;
  for (let i = 0; i < bookId.length; i++) {
    hash = (hash << 3) + bookId.charCodeAt(i);
  }
  const generated = 5 + (Math.abs(hash) % 31);
  map[bookId] = generated;
  saveStockMap(map);
  return generated;
}

/**
 * Memperbarui kuantitas stok buku dan mengirimkan event broadcast real-time
 * @param {string} bookId 
 * @param {number} newQuantity 
 * @returns {number} Kuantitas stok terbaru
 */
export function updateStock(bookId, newQuantity) {
  if (!bookId) {
    throw new Error('Book ID diperlukan untuk memperbarui stok.');
  }

  const cleanQty = Math.max(0, parseInt(newQuantity, 10) || 0);
  const map = getStoredStockMap();
  const oldQty = map[bookId] !== undefined ? map[bookId] : null;
  map[bookId] = cleanQty;
  saveStockMap(map);

  // Broadcast event ke tab browser lain
  sendSocketMessage({
    type: 'STOCK_UPDATED',
    bookId,
    oldQuantity: oldQty,
    newQuantity: cleanQty,
    timestamp: new Date().toISOString()
  });

  return cleanQty;
}

export default {
  getAllStock,
  getStockById,
  updateStock
};
