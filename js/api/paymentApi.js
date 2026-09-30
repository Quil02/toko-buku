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
 * Save payment transaction to backend
 * @param {Object} transaction
 * @returns {Promise<boolean>}
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
        items: transaction.items,
        total: transaction.total,
        paymentMethod: transaction.paymentMethod,
      }),
    });

    if (!response.ok) {
      console.error('Save payment failed');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Save payment error:', error);
    return false;
  }
}

/**
 * Get payment history from backend
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
    return data;
  } catch (error) {
    console.error('Get payment history error:', error);
    return [];
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
