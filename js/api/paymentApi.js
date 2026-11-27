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
 * Katalog metode pembayaran — cerminan dari backend
 * (backend/controllers/transaction.py, PAYMENT_METHODS). Dipakai sebagai
 * cadangan kalau GET /api/payment-methods gagal, supaya halaman checkout
 * tetap bisa menampilkan pilihan. Sumber kebenaran tetap backend: server
 * menolak metode di luar katalog saat checkout disimpan.
 *
 * Mengikuti Gramedia.com: QRIS, Virtual Account (BCA, Mandiri, BRI, BNI,
 * Permata), Kartu Kredit/Debit (Visa/Mastercard), dan E-Wallet (GoPay,
 * OVO, DANA, ShopeePay).
 */
export const PAYMENT_METHODS_FALLBACK = [
  {
    id: 'qris',
    label: 'QRIS',
    short: 'QRIS',
    group: 'QRIS',
    kind: 'qris',
    brand: 'qris',
    description: 'Scan kode QR dengan GoPay, OVO, DANA, atau m-banking apa pun',
    expiryMinutes: 30,
  },
  {
    id: 'va_bca',
    label: 'BCA Virtual Account',
    short: 'BCA',
    group: 'Virtual Account',
    kind: 'va',
    brand: 'bca',
    description: 'Bayar via m-BCA, KlikBCA, atau ATM BCA',
    destination: { name: 'BCA Virtual Account', number: '1234567890', owner: 'TokoBuku Digital' },
    expiryMinutes: 60,
  },
  {
    id: 'va_mandiri',
    label: 'Mandiri Virtual Account',
    short: 'Mandiri',
    group: 'Virtual Account',
    kind: 'va',
    brand: 'mandiri',
    description: 'Bayar via Livin' by Mandiri atau ATM Mandiri',
    destination: { name: 'Mandiri Virtual Account', number: '1370012345678', owner: 'TokoBuku Digital' },
    expiryMinutes: 60,
  },
  {
    id: 'va_bri',
    label: 'BRI Virtual Account',
    short: 'BRI',
    group: 'Virtual Account',
    kind: 'va',
    brand: 'bri',
    description: 'Bayar via BRImo atau ATM BRI',
    destination: { name: 'BRI Virtual Account', number: '002001234567890', owner: 'TokoBuku Digital' },
    expiryMinutes: 60,
  },
  {
    id: 'va_bni',
    label: 'BNI Virtual Account',
    short: 'BNI',
    group: 'Virtual Account',
    kind: 'va',
    brand: 'bni',
    description: 'Bayar via wondr by BNI atau ATM BNI',
    destination: { name: 'BNI Virtual Account', number: '8810012345678901', owner: 'TokoBuku Digital' },
    expiryMinutes: 60,
  },
  {
    id: 'va_permata',
    label: 'Permata Virtual Account',
    short: 'Permata',
    group: 'Virtual Account',
    kind: 'va',
    brand: 'permata',
    description: 'Bayar via PermataMobile X atau ATM Permata',
    destination: { name: 'Permata Virtual Account', number: '0001234567890', owner: 'TokoBuku Digital' },
    expiryMinutes: 60,
  },
  {
    id: 'gopay',
    label: 'GoPay',
    short: 'GoPay',
    group: 'E-Wallet',
    kind: 'ewallet',
    brand: 'gopay',
    description: 'Bayar dengan saldo GoPay',
    destination: { name: 'GoPay', number: '0812-3456-7890' },
  },
  {
    id: 'ovo',
    label: 'OVO',
    short: 'OVO',
    group: 'E-Wallet',
    kind: 'ewallet',
    brand: 'ovo',
    description: 'Bayar dengan saldo OVO',
    destination: { name: 'OVO', number: '0812-3456-7891' },
  },
  {
    id: 'dana',
    label: 'DANA',
    short: 'DANA',
    group: 'E-Wallet',
    kind: 'ewallet',
    brand: 'dana',
    description: 'Bayar dengan saldo DANA',
    destination: { name: 'DANA', number: '0812-3456-7892' },
  },
  {
    id: 'shopeepay',
    label: 'ShopeePay',
    short: 'ShopeePay',
    group: 'E-Wallet',
    kind: 'ewallet',
    brand: 'shopeepay',
    description: 'Bayar dengan saldo ShopeePay',
    destination: { name: 'ShopeePay', number: '0812-3456-7893' },
  },
  {
    id: 'card',
    label: 'Kartu Kredit / Debit',
    short: 'Kartu',
    group: 'Kartu',
    kind: 'card',
    brand: 'card',
    description: 'Visa / Mastercard',
  },
];

/**
 * Label untuk ID metode lama (sebelum jadi Virtual Account), supaya
 * riwayat pembelian lama tetap tampil dengan nama yang benar.
 */
export const LEGACY_METHOD_LABELS = {
  bca: 'Transfer Bank BCA',
  mandiri: 'Transfer Bank Mandiri',
};

/**
 * Label tampilan untuk setiap metode pembayaran
 */
export const PAYMENT_METHOD_LABELS = Object.fromEntries([
  ...PAYMENT_METHODS_FALLBACK.map((method) => [method.id, method.label]),
  ...Object.entries(LEGACY_METHOD_LABELS),
]);

/**
 * Label tampilan untuk satu ID metode (tanpa fetch).
 * @param {string} methodId
 * @returns {string}
 */
export function getPaymentMethodLabel(methodId) {
  return PAYMENT_METHOD_LABELS[methodId] || methodId || '-';
}

let paymentMethodsCache = null;

/**
 * Ambil katalog metode pembayaran dari backend (sekali, lalu di-cache).
 * Kalau backend tidak menjawab, pakai salinan cadangan di atas.
 * @returns {Promise<Array>}
 */
export async function getPaymentMethods() {
  if (paymentMethodsCache) return paymentMethodsCache;
  try {
    const response = await fetch(`${API_URL}/api/payment-methods`);
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        paymentMethodsCache = data;
        return data;
      }
    }
  } catch (error) {
    console.error('Get payment methods error:', error);
  }
  paymentMethodsCache = PAYMENT_METHODS_FALLBACK;
  return paymentMethodsCache;
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

    // Label diambil dari katalog terbaru, supaya metode baru tampil benar.
    const methods = await getPaymentMethods();
    const labelsById = new Map(methods.map((method) => [method.id, method.label]));

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
        paymentMethodLabel: labelsById.get(paymentMethod)
          || LEGACY_METHOD_LABELS[paymentMethod]
          || paymentMethod
          || '-',
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
