/**
 * Wishlist API Service
 * Mengelola data daftar keinginan pengguna via localStorage
 */

const WISHLIST_STORAGE_KEY = 'bookstore_user_wishlist';

function getStoredWishlist() {
  try {
    const raw = localStorage.getItem(WISHLIST_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error('Gagal mengambil wishlist dari localStorage:', error);
    return [];
  }
}

function saveStoredWishlist(items) {
  try {
    localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(items));
  } catch (error) {
    console.error('Gagal menyimpan wishlist ke localStorage:', error);
  }
}

/**
 * Mengambil semua item wishlist
 * @returns {Array} Daftar buku dalam wishlist
 */
export function getWishlist() {
  return getStoredWishlist();
}

/**
 * Menambahkan buku ke dalam wishlist jika belum ada
 * @param {Object} book Objek buku
 * @returns {boolean} Status berhasil atau sudah ada
 */
export function addToWishlist(book) {
  if (!book || !book.id) {
    throw new Error('Data buku tidak valid untuk ditambahkan ke wishlist.');
  }

  const wishlist = getStoredWishlist();
  const exists = wishlist.some((item) => item.id === book.id);

  if (exists) {
    return false;
  }

  const itemToSave = {
    id: book.id,
    title: book.title || 'Tanpa Judul',
    authors: book.authors || ['Anonim'],
    price: book.price || 0,
    stock: typeof book.stock === 'number' ? book.stock : 10,
    thumbnail: book.thumbnail || 'https://via.placeholder.com/150x220?text=No+Cover',
    category: book.category || 'Umum',
    addedAt: new Date().toISOString()
  };

  wishlist.unshift(itemToSave);
  saveStoredWishlist(wishlist);
  return true;
}

/**
 * Menghapus buku dari wishlist berdasarkan ID
 * @param {string} bookId ID buku
 * @returns {Array} Daftar wishlist terbaru
 */
export function removeFromWishlist(bookId) {
  if (!bookId) return getStoredWishlist();

  const wishlist = getStoredWishlist();
  const filtered = wishlist.filter((item) => item.id !== bookId);
  saveStoredWishlist(filtered);
  return filtered;
}

/**
 * Mengecek apakah buku dengan ID tertentu ada di wishlist
 * @param {string} bookId 
 * @returns {boolean}
 */
export function isInWishlist(bookId) {
  if (!bookId) return false;
  const wishlist = getStoredWishlist();
  return wishlist.some((item) => item.id === bookId);
}

export default {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  isInWishlist
};
