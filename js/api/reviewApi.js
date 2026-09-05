import { CONFIG } from '../config.js';

const REVIEWS_STORAGE_KEY = CONFIG.REVIEWS_KEY || 'bookstore_reviews_storage';

/**
 * Ulasan default untuk buku ketika belum ada ulasan buatan pengguna
 */
const DEFAULT_REVIEWS = [
  {
    id: 'rev_default_1',
    userName: 'Rian Pratama',
    rating: 5,
    comment: 'Buku yang sangat menginspirasi dan informatif. Penjelasannya mudah dipahami bagi pembaca.',
    createdAt: '2024-02-10T08:30:00.000Z'
  },
  {
    id: 'rev_default_2',
    userName: 'Dewi Lestari',
    rating: 4,
    comment: 'Kualitas cetakan dan pembahasannya mantap. Pengiriman buku juga cepat.',
    createdAt: '2024-03-01T14:15:00.000Z'
  }
];

/**
 * Membaca seluruh database ulasan dari localStorage
 * @returns {Object}
 */
function getStoredReviewsMap() {
  try {
    const data = localStorage.getItem(REVIEWS_STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch (err) {
    console.error('Gagal membaca ulasan dari localStorage:', err);
    return {};
  }
}

/**
 * Menyimpan database ulasan ke localStorage
 * @param {Object} reviewsMap 
 */
function saveReviewsMap(reviewsMap) {
  try {
    localStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(reviewsMap));
  } catch (err) {
    console.error('Gagal menyimpan ulasan ke localStorage:', err);
  }
}

/**
 * Mengambil ulasan berdasarkan bookId
 * @param {string} bookId 
 * @returns {Array}
 */
export function getReviewsByBookId(bookId) {
  if (!bookId) return [];
  const map = getStoredReviewsMap();
  if (!map[bookId] || !Array.isArray(map[bookId])) {
    return [...DEFAULT_REVIEWS];
  }
  return [...map[bookId], ...DEFAULT_REVIEWS];
}

/**
 * Menambahkan ulasan baru untuk buku tertentu
 * @param {string} bookId 
 * @param {Object} reviewData { rating, comment, userName }
 * @returns {Object} ulasan baru
 */
export function submitReview(bookId, { rating, comment, userName }) {
  if (!bookId) {
    throw new Error('Book ID diperlukan untuk menambahkan ulasan');
  }

  const cleanRating = parseInt(rating, 10);
  if (isNaN(cleanRating) || cleanRating < 1 || cleanRating > 5) {
    throw new Error('Rating harus berupa angka antara 1 dan 5');
  }

  if (!comment || !comment.trim()) {
    throw new Error('Ulasan komentar tidak boleh kosong');
  }

  const map = getStoredReviewsMap();
  if (!map[bookId]) {
    map[bookId] = [];
  }

  const newReview = {
    id: `rev_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    userName: userName && userName.trim() ? userName.trim() : 'Pembaca Anonim',
    rating: cleanRating,
    comment: comment.trim(),
    createdAt: new Date().toISOString()
  };

  map[bookId].unshift(newReview);
  saveReviewsMap(map);

  return newReview;
}

export default {
  getReviewsByBookId,
  submitReview
};
