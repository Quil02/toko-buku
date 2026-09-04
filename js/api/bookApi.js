const GOOGLE_BOOKS_BASE_URL = 'https://www.googleapis.com/books/v1/volumes';

/**
 * Menghasilkan harga deterministik realistis (Rp 65.000 - Rp 185.000) berdasarkan string ID
 * @param {string} id 
 * @returns {number}
 */
function generatePriceFromId(id = '') {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  const positiveHash = Math.abs(hash);
  const minPrice = 65000;
  const maxPrice = 185000;
  const step = 5000;
  const rangeSteps = (maxPrice - minPrice) / step;
  const price = minPrice + (positiveHash % (rangeSteps + 1)) * step;
  return price;
}

/**
 * Menghasilkan stok deterministik (5 - 35 unit) berdasarkan string ID
 * @param {string} id 
 * @returns {number}
 */
function generateStockFromId(id = '') {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 3) + id.charCodeAt(i);
  }
  return 5 + (Math.abs(hash) % 31);
}

/**
 * Normalisasi data buku dari format Google Books API ke format standar aplikasi
 * @param {Object} item 
 * @returns {Object}
 */
export function normalizeBookData(item) {
  if (!item || !item.id) {
    return null;
  }

  const volumeInfo = item.volumeInfo || {};
  const saleInfo = item.saleInfo || {};

  // Image link secure HTTPS conversion
  let thumbnail = volumeInfo.imageLinks?.thumbnail || volumeInfo.imageLinks?.smallThumbnail || '';
  if (thumbnail.startsWith('http://')) {
    thumbnail = thumbnail.replace('http://', 'https://');
  }
  if (!thumbnail) {
    thumbnail = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&auto=format&fit=crop&q=80';
  }

  // Harga: ambil dari listPrice jika tersedia, atau gunakan generator deterministik
  let price = 0;
  let currencyCode = 'IDR';

  if (saleInfo.listPrice && typeof saleInfo.listPrice.amount === 'number' && saleInfo.listPrice.amount > 0) {
    price = saleInfo.listPrice.amount;
    currencyCode = saleInfo.listPrice.currencyCode || 'IDR';
    // Jika Google Books memberikan harga non-IDR (misal USD), konversi sederhana ke IDR
    if (currencyCode === 'USD') {
      price = Math.round(price *