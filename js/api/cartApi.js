/**
 * Cart API Service
 * Mengelola data keranjang belanja via localStorage
 * - Guest: cart disimpan dengan key 'guest', hilang saat clear browser
 * - User login: cart disimpan per akun (by id/email), persisten
 */

import { getUser, isAuthenticated } from '../utils/authStorage.js';

function getCartKey() {
  if (isAuthenticated()) {
    const user = getUser();
    const uid = user?.id || user?.email || 'user';
    return `tokobuku_cart_${uid}`;
  }
  return 'tokobuku_cart_guest';
}

function getStoredCart() {
  try {
    const raw = localStorage.getItem(getCartKey());
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error('Gagal membaca cart dari localStorage:', error);
    return [];
  }
}

function saveStoredCart(items) {
  try {
    localStorage.setItem(getCartKey(), JSON.stringify(items));
  } catch (error) {
    console.error('Gagal menyimpan cart ke localStorage:', error);
  }
}

/**
 * Ambil semua item di cart
 * @returns {Array}
 */
export function getCart() {
  return getStoredCart();
}

/**
 * Tambah buku ke cart. Jika sudah ada, abaikan (produk digital = 1 judul per item).
 * @param {Object} book
 * @returns {boolean} true jika berhasil
 */
export function addToCart(book) {
  if (!book || !book.id) {
    throw new Error('Data buku tidak valid untuk ditambahkan ke cart.');
  }

  const cart = getStoredCart();
  const exists = cart.some(item => item.id === book.id);

  if (exists) {
    return false; // Produk digital: satu judul cukup satu item
  }

  cart.push({
    id: book.id,
    title: book.title || 'Tanpa Judul',
    authors: book.authors || ['Anonim'],
    price: book.price || 0,
    thumbnail: book.thumbnail || 'https://via.placeholder.com/150x220?text=No+Cover',
    category: book.category || (book.categories?.[0]) || 'Umum',
    addedAt: new Date().toISOString(),
  });

  saveStoredCart(cart);
  return true;
}

/**
 * Hapus item dari cart berdasarkan ID
 * @param {string} bookId
 */
export function removeFromCart(bookId) {
  if (!bookId) return;
  const cart = getStoredCart().filter(item => item.id !== bookId);
  saveStoredCart(cart);
}

/**
 * Kosongkan seluruh cart
 */
export function clearCart() {
  try {
    localStorage.removeItem(getCartKey());
  } catch (error) {
    console.error('Gagal mengosongkan cart:', error);
  }
}

/**
 * Cek apakah buku sudah ada di cart
 * @param {string} bookId
 * @returns {boolean}
 */
export function isInCart(bookId) {
  if (!bookId) return false;
  return getStoredCart().some(item => item.id === bookId);
}

/**
 * Hitung total harga semua item di cart
 * @returns {number}
 */
export function getCartTotal() {
  return getStoredCart().reduce((total, item) => total + item.price, 0);
}

/**
 * Hitung jumlah item unik di cart
 * @returns {number}
 */
export function getCartCount() {
  return getStoredCart().length;
}

export default {
  getCart,
  addToCart,
  removeFromCart,
  clearCart,
  isInCart,
  getCartTotal,
  getCartCount,
};
