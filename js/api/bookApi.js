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

  // Normalisasi Penulis
  let authors = volumeInfo.authors;
  if (!Array.isArray(authors) || authors.length === 0) {
    authors = ['Penulis Tidak Diketahui'];
  }

  // Normalisasi Kategori
  let categories = volumeInfo.categories;
  if (!Array.isArray(categories) || categories.length === 0) {
    categories = ['Umum'];
  }

  // Harga: ambil dari listPrice jika ada, atau gunakan generator deterministik
  let price = 0;
  if (saleInfo.listPrice && typeof saleInfo.listPrice.amount === 'number' && saleInfo.listPrice.amount > 0) {
    price = saleInfo.listPrice.amount;
    const currency = saleInfo.listPrice.currencyCode || 'IDR';
    if (currency === 'USD') {
      price = Math.round(price * 15500);
    }
  } else {
    price = generatePriceFromId(item.id);
  }

  // Rating & Ratings Count
  const rating = volumeInfo.averageRating || 4.5;
  const ratingsCount = volumeInfo.ratingsCount || Math.floor((item.id.charCodeAt(0) || 5) % 15) + 3;

  return {
    id: item.id,
    title: volumeInfo.title || 'Judul Tidak Tersedia',
    subtitle: volumeInfo.subtitle || '',
    authors,
    publisher: volumeInfo.publisher || 'Penerbit Umum',
    publishedDate: volumeInfo.publishedDate || '-',
    description: volumeInfo.description || 'Deskripsi buku tidak tersedia.',
    thumbnail,
    categories,
    pageCount: volumeInfo.pageCount || 0,
    language: volumeInfo.language ? volumeInfo.language.toUpperCase() : 'ID',
    rating,
    ratingsCount,
    price,
    stock: generateStockFromId(item.id),
    previewLink: volumeInfo.previewLink || '#'
  };
}

/**
 * Mengambil daftar buku dari Google Books API
 * @param {Object} options 
 * @param {string} options.query
 * @param {string} options.category
 * @param {number} options.maxResults
 * @param {number} options.startIndex
 * @returns {Promise<Array>}
 */
export async function fetchBooks({ query = 'programming', category = '', maxResults = 20, startIndex = 0 } = {}) {
  try {
    let qParam = query.trim() || 'novel';
    if (category) {
      qParam += `+subject:${category}`;
    }

    const url = `${GOOGLE_BOOKS_BASE_URL}?q=${encodeURIComponent(qParam)}&maxResults=${maxResults}&startIndex=${startIndex}&projection=full`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Gagal memuat buku: Status ${response.status}`);
    }

    const data = await response.json();
    if (!data.items || !Array.isArray(data.items)) {
      return [];
    }

    return data.items.map(normalizeBookData).filter(Boolean);
  } catch (error) {
    console.error('Error fetching books:', error);
    throw error;
  }
}

/**
 * Mengambil detail satu buku berdasarkan ID
 * @param {string} id 
 * @returns {Promise<Object>}
 */
export async function fetchBookById(id) {
  if (!id) {
    throw new Error('ID buku diperlukan');
  }

  try {
    const url = `${GOOGLE_BOOKS_BASE_URL}/${encodeURIComponent(id)}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Gagal memuat detail buku: Status ${response.status}`);
    }

    const item = await response.json();
    return normalizeBookData(item);
  } catch (error) {
    console.error(`Error fetching book with ID ${id}:`, error);
    throw error;
  }
}
