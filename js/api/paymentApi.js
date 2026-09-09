/**
 * paymentApi.js
 * Menangani semua logic terkait pembayaran dan history pembelian
 * Data dipisah per akun menggunakan identifier unik user
 */

import { getUser } from '../utils/authStorage.js';

function getPaymentHistoryKey() {
  const user = getUser();
  const uid = user?.id || user?.email || 'guest';
  return `tokobuku_payment_history_${uid}`;
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
 * Generate ID pembayaran unik
 * Format: TBK-<timestamp_base36>-<random_4char>
 * @returns {string}
 */
export function generatePaymentId() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TBK-${timestamp}-${random}`;
}

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
 * Simpan transaksi pembayaran baru ke localStorage (per user)
 * @param {Object} transaction
 */
export function savePayment(transaction) {
  try {
    const history = getPaymentHistory();
    history.unshift(transaction);
    localStorage.setItem(getPaymentHistoryKey(), JSON.stringify(history));
    return true;
  } catch (err) {
    console.error('Gagal menyimpan transaksi ke localStorage:', err);
    return false;
  }
}

/**
 * Ambil semua riwayat pembayaran milik user yang sedang login
 * @returns {Array}
 */
export function getPaymentHistory() {
  try {
    const raw = localStorage.getItem(getPaymentHistoryKey());
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Gagal membaca riwayat pembayaran:', err);
    return [];
  }
}

/**
 * Hapus semua riwayat pembayaran milik user yang sedang login
 */
export function clearPaymentHistory() {
  try {
    localStorage.removeItem(getPaymentHistoryKey());
    return true;
  } catch (err) {
    console.error('Gagal menghapus riwayat pembayaran:', err);
    return false;
  }
}
