import { CONFIG } from '../config.js';

const API_URL = CONFIG.API_BASE_URL;

/**
 * Get authorization header with JWT token
 */
function getAuthHeader() {
  const token = localStorage.getItem(CONFIG.TOKEN_KEY);
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

/**
 * Label tampilan untuk setiap metode pembayaran
 */
export const PAYMENT_METHOD_LABELS = {
  bca: 'Transfer Bank BCA',
  mandiri: 'Transfer Bank Mandiri',
  gopay: 'GoPay',
  ovo: 'OVO',
  dana: 'DANA',
};

/**
 * Format angka ke format Rupiah
 * @param {number} amount
 * @returns {string}
 */
export function formatRupiah(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format tanggal ke format lokal Indonesia
 * @param {string|number} dateInput
 * @returns {string}
 */
export function formatDate(dateInput) {
  const date = new Date(dateInput);
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Buat ID pembayaran sementara untuk ditampilkan sebelum transaksi tersimpan.
 * ID final tetap berasal dari server.
 * @returns {string}
 */
export function generatePaymentId() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `TBK-${timestamp}-${random}`;
}

/**
 * Save payment transaction to backend
 * @param {Object} transaction
 * @returns {Promise<Object>} transaksi yang tersimpan
 */
export async function savePayment(transaction) {
  try {
    const response = await fetch(`${API_URL}/api/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({
        items: transaction.items || [],
        paymentMethod: transaction.paymentMethod,
        buyer: transaction.buyer,
        fromCart: Boolean(transaction.fromCart),
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.detail || 'Gagal menyimpan transaksi.');
    }

    return data;
  } catch (error) {
    console.error('Save payment error:', error);
    throw error;
  }
}

/**
 * Get payment history from backend, sudah disesuaikan untuk tampilan UI
 * @returns {Promise<Array>}
 */
export async function getPaymentHistory() {
  try {
    const response = await fetch(`${API_URL}/api/transactions`, {
      method: 'GET',
      headers: {
        ...getAuthHeader(),
      },
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    if (!Array.isArray(data)) return [];

    return data.map(tx => {
      // Buku digital: 1 judul = 1 eksemplar.
      const items = (tx.items || []).map(item => ({
        ...item,
        quantity: 1,
        author: item.author || (Array.isArray(item.authors) ? item.authors[0] : 'Anonim'),
        subtotal: item.price || 0,
      }));

      const firstItem = items[0];
      const paymentMethod = tx.paymentMethod || '';

      return {
        paymentId: tx.id,
        id: tx.id,
        paymentMethod,
        paymentMethodLabel: PAYMENT_METHOD_LABELS[paymentMethod] || paymentMethod || '-',
        items,
        book: firstItem ? {
          id: firstItem.id,
          title: firstItem.title,
          author: firstItem.author,
          thumbnail: firstItem.thumbnail,
          price: firstItem.price,
        } : undefined,
        buyer: tx.buyer || {},
        total: tx.total || 0,
        paidAt: tx.createdAt,
        createdAt: tx.createdAt,
        type: items.length > 1 ? 'cart' : 'single',
      };
    });
  } catch (error) {
    console.error('Get payment history error:', error);
    return [];
  }
}

/**
 * Cek apakah buku sudah pernah dibeli oleh user yang sedang login.
 * @param {string} bookId
 * @returns {Promise<boolean>}
 */
export async function isPurchased(bookId) {
  if (!bookId) return false;
  try {
    const response = await fetch(`${API_URL}/api/transactions/check/${encodeURIComponent(bookId)}`, {
      method: 'GET',
      headers: { ...getAuthHeader() },
    });
    if (!response.ok) return false;
    const data = await response.json();
    return Boolean(data.purchased);
  } catch (error) {
    console.error('isPurchased error:', error);
    return false;
  }
}

/**
 * Clear payment history from backend
 * @returns {Promise<boolean>}
 */
export async function clearPaymentHistory() {
  try {
    const response = await fetch(`${API_URL}/api/transactions`, {
      method: 'DELETE',
      headers: {
        ...getAuthHeader(),
      },
    });

    if (!response.ok) {
      console.error('Clear payment history failed');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Clear payment history error:', error);
    return false;
  }
}
