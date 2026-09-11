const OPEN_LIBRARY_BASE_URL = 'https://openlibrary.org';
const OPEN_LIBRARY_COVERS_URL = 'https://covers.openlibrary.org/b/id';

/**
 * Menghasilkan harga deterministik realistis (Rp 7.000 - Rp 20.000) berdasarkan string ID
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
  const minPrice = 7000;
  const maxPrice = 20000;
  const step = 1000;
  const rangeSteps = (maxPrice - minPrice) / step;
  const price = minPrice + (positiveHash % (rangeSteps + 1)) * step;
  return price;
}

/**
 * Menghasilkan halaman acak untuk variasi hasil setiap refresh
 * @param {number} min 
 * @param {number} max 
 * @returns {number}
 */
function getRandomPage(min = 1, max = 10) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Ekstrak ID bersih dari Open Library key (misal '/works/OL45804W' -> 'OL45804W')
 * @param {string} key 
 * @returns {string}
 */
/**
 * Ekstrak ISBN dari data doc/item atau buat format ISBN-13 deterministik dari ID
 * @param {Array|string} isbnSource
 * @param {string} fallbackId
 * @returns {string}
 */
export function extractIsbn(isbnSource, fallbackId = '') {
  if (Array.isArray(isbnSource) && isbnSource.length > 0) {
    const raw = String(isbnSource[0]).trim();
    if (raw.length === 13) {
      return `${raw.slice(0, 3)}-${raw.slice(3, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}-${raw.slice(12)}`;
    } else if (raw.length === 10) {
      return `${raw.slice(0, 1)}-${raw.slice(1, 5)}-${raw.slice(5, 9)}-${raw.slice(9)}`;
    }
    return raw;
  }
  if (typeof isbnSource === 'string' && isbnSource.trim()) {
    return isbnSource.trim();
  }
  let hash = 0;
  for (let i = 0; i < fallbackId.length; i++) {
    hash = (hash * 31 + fallbackId.charCodeAt(i)) >>> 0;
  }
  const partA = String(1000 + (hash % 9000));
  const partB = String(10 + (Math.floor(hash / 9000) % 90));
  const checkDigit = (hash % 10);
  return `978-602-${partA}-${partB}-${checkDigit}`;
}

export function extractWorkId(key = '') {
  if (!key) return '';
  return key.replace(/^\/works\//, '').replace(/^\//, '');
}

/**
 * Normalisasi data buku dari format Open Library Search API (/search.json)
 * @param {Object} doc 
 * @returns {Object|null}
 */
export function normalizeBookData(doc) {
  if (!doc) return null;

  const rawKey = doc.key || (doc.cover_edition_key ? `/works/${doc.cover_edition_key}` : '');
  const id = extractWorkId(rawKey) || (doc.cover_edition_key || Math.random().toString(36).substring(2, 9));

  // Thumbnail cover dari Open Library
  const hasRealCover = !!(doc.cover_i || doc.cover_id);
  let thumbnail = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&auto=format&fit=crop&q=80';
  if (doc.cover_i) {
    thumbnail = `${OPEN_LIBRARY_COVERS_URL}/${doc.cover_i}-L.jpg`;
  } else if (doc.cover_id) {
    thumbnail = `${OPEN_LIBRARY_COVERS_URL}/${doc.cover_id}-L.jpg`;
  }

  // Penulis
  let authors = doc.author_name;
  if (!Array.isArray(authors) || authors.length === 0) {
    authors = ['Penulis Tidak Diketahui'];
  }

  // Kategori / Subject
  let categories = doc.subject;
  if (!Array.isArray(categories) || categories.length === 0) {
    categories = ['Umum'];
  }

  // Penerbit & Tahun
  const publisher = Array.isArray(doc.publisher) && doc.publisher.length > 0 
    ? doc.publisher[0] 
    : 'Penerbit Terkemuka';
  const publishedDate = doc.first_publish_year ? String(doc.first_publish_year) : '-';

  // Rating & Jumlah Ulasan
  const rating = doc.ratings_average ? Number(doc.ratings_average.toFixed(1)) : 4.5;
  const ratingsCount = doc.ratings_count || (Math.floor((id.charCodeAt(0) || 5) % 15) + 3);

  const price = generatePriceFromId(id);
  const isbn = extractIsbn(doc.isbn, id);

  return {
    id,
    workKey: rawKey.startsWith('/works/') ? rawKey : `/works/${id}`,
    title: doc.title || 'Judul Tidak Tersedia',
    subtitle: doc.subtitle || '',
    authors,
    publisher,
    publishedDate,
    description: doc.first_sentence ? doc.first_sentence[0] : 'Deskripsi buku tersedia di halaman detail lengkap.',
    thumbnail,
    categories,
    category: categories[0] || 'Umum',
    pageCount: doc.number_of_pages_median || 0,
    isbn,
    language: Array.isArray(doc.language) && doc.language.length > 0 ? doc.language[0].toUpperCase() : 'ID',
    rating,
    ratingsCount,
    price,
    hasRealCover,
    previewLink: `https://openlibrary.org/works/${id}`
  };
}

/**
 * Normalisasi data detail buku dari endpoint Work Open Library (/works/{id}.json)
 * @param {Object} item 
 * @param {string} workId 
 * @param {Object} extraDoc 
 * @returns {Object}
 */
export function normalizeWorkDetail(item, workId, extraDoc = null) {
  const id = workId || extractWorkId(item.key);

  // Cover image
  let thumbnail = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&auto=format&fit=crop&q=80';
  if (Array.isArray(item.covers) && item.covers.length > 0 && item.covers[0] > 0) {
    thumbnail = `${OPEN_LIBRARY_COVERS_URL}/${item.covers[0]}-L.jpg`;
  } else if (extraDoc?.cover_i) {
    thumbnail = `${OPEN_LIBRARY_COVERS_URL}/${extraDoc.cover_i}-L.jpg`;
  }

  // Deskripsi (bisa berupa string atau object { type, value })
  let description = 'Deskripsi buku tidak tersedia.';
  if (typeof item.description === 'string') {
    description = item.description;
  } else if (item.description && typeof item.description.value === 'string') {
    description = item.description.value;
  } else if (extraDoc?.first_sentence) {
    description = extraDoc.first_sentence[0] || description;
  }

  // Categories / Subjects
  let categories = ['Umum'];
  if (Array.isArray(item.subjects) && item.subjects.length > 0) {
    categories = item.subjects.slice(0, 5);
  } else if (extraDoc?.subject && Array.isArray(extraDoc.subject)) {
    categories = extraDoc.subject.slice(0, 5);
  }

  // Authors
  let authors = extraDoc?.author_name || ['Penulis Buku'];

  const publishedDate = extraDoc?.first_publish_year 
    ? String(extraDoc.first_publish_year) 
    : (item.first_publish_date || item.created?.value?.substring(0, 4) || '-');

  const publisher = (extraDoc?.publisher && extraDoc.publisher[0]) || 'Penerbit Pustaka';
  const rating = extraDoc?.ratings_average ? Number(extraDoc.ratings_average.toFixed(1)) : 4.5;
  const ratingsCount = extraDoc?.ratings_count || (Math.floor((id.charCodeAt(0) || 5) % 15) + 3);

  return {
    id,
    workKey: item.key || `/works/${id}`,
    title: item.title || extraDoc?.title || 'Judul Tidak Tersedia',
    subtitle: item.subtitle || extraDoc?.subtitle || '',
    authors,
    publisher,
    publishedDate,
    description,
    thumbnail,
    categories,
    category: categories[0] || 'Umum',
    pageCount: extraDoc?.number_of_pages_median || 0,
    language: 'ID',
    rating,
    ratingsCount,
    isbn: extractIsbn(extraDoc?.isbn || item.isbn || item.isbn_13 || item.isbn_10, id),
    price: generatePriceFromId(id),
    previewLink: `https://openlibrary.org/works/${id}`
  };
}

/**
 * Mengambil daftar buku dari Open Library Search API
 * Setiap kali dipanggil tanpa page eksplisit, akan menggunakan halaman acak
 * sehingga hasil buku berbeda setiap refresh.
 * @param {Object} options 
 * @param {string} options.query
 * @param {string} options.category
 * @param {number} options.maxResults
 * @param {number|null} options.page - Jika null, akan diacak otomatis
 * @returns {Promise<Array>}
 */
// Kategori yang dipakai untuk mode "Semua Kategori"
const ALL_CATEGORIES = ['Computers', 'Fiction', 'Business', 'Science', 'History'];

/**
 * Fetch buku dari satu subject/kategori tertentu
 */
async function fetchBySubject({ subject, perPage, page }) {
  const url = `${OPEN_LIBRARY_BASE_URL}/search.json?q=${encodeURIComponent(subject)}&subject=${encodeURIComponent(subject)}&limit=${perPage}&page=${page}`;
  const response = await fetch(url);
  if (!response.ok) return [];
  const data = await response.json();
  if (!data.docs || !Array.isArray(data.docs)) return [];
  return data.docs.map(normalizeBookData).filter(b => b && b.hasRealCover);
}

export async function fetchBooks({ query = '', category = '', maxResults = 24, page = null } = {}) {
  try {
    // Mode "Semua Kategori" — tidak ada query pengguna & tidak ada kategori dipilih:
    // fetch dari setiap kategori secara paralel agar hasil merata
    if (!query && !category) {
      const perCategory = Math.ceil(maxResults / ALL_CATEGORIES.length);
      const results = await Promise.allSettled(
        ALL_CATEGORIES.map(subject =>
          fetchBySubject({ subject, perPage: perCategory, page: getRandomPage(1, 5) })
        )
      );

      // Gabungkan, hapus duplikat berdasarkan id, lalu acak urutan
      const seen = new Set();
      const merged = [];
      for (const result of results) {
        if (result.status === 'fulfilled') {
          for (const book of result.value) {
            if (!seen.has(book.id)) {
              seen.add(book.id);
              merged.push(book);
            }
          }
        }
      }
      return merged.sort(() => Math.random() - 0.5).slice(0, maxResults);
    }

    // Mode kategori spesifik atau pencarian — fetch normal
    const searchParam = query.trim() || category;
    const randomizedPage = page !== null ? page : 1;

    let url = `${OPEN_LIBRARY_BASE_URL}/search.json?q=${encodeURIComponent(searchParam)}&limit=${maxResults}&page=${randomizedPage}`;

    if (category) {
      url += `&subject=${encodeURIComponent(category)}`;
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Gagal memuat buku dari Open Library: Status ${response.status}`);
    }

    const data = await response.json();
    if (!data.docs || !Array.isArray(data.docs)) {
      return [];
    }

    const books = data.docs.map(normalizeBookData).filter(b => b && b.hasRealCover);
    return books.sort(() => Math.random() - 0.5);
  } catch (error) {
    console.error('Error fetching books from Open Library:', error);
    throw error;
  }
}

/**
 * Mengambil detail satu buku berdasarkan ID / Work Key dari Open Library
 * @param {string} id 
 * @returns {Promise<Object>}
 */
export async function fetchBookById(id) {
  if (!id) {
    throw new Error('ID buku diperlukan');
  }

  const cleanWorkId = extractWorkId(id);

  try {
    // 1. Ambil detail work JSON
    const workUrl = `${OPEN_LIBRARY_BASE_URL}/works/${cleanWorkId}.json`;
    const response = await fetch(workUrl);

    if (!response.ok) {
      // Fallback: coba cari via search query ID jika direct work gagal
      const searchFallback = await fetch(`${OPEN_LIBRARY_BASE_URL}/search.json?q=${encodeURIComponent(cleanWorkId)}&limit=1`);
      if (searchFallback.ok) {
        const searchData = await searchFallback.json();
        if (searchData.docs && searchData.docs.length > 0) {
          return normalizeBookData(searchData.docs[0]);
        }
      }
      throw new Error(`Gagal memuat detail buku: Status ${response.status}`);
    }

    const workData = await response.json();

    // 2. Ambil informasi metadata tambahan & nama author melalui search index
    let extraDoc = null;
    try {
      const searchRes = await fetch(`${OPEN_LIBRARY_BASE_URL}/search.json?q=${encodeURIComponent(workData.title || cleanWorkId)}&limit=1`);
      if (searchRes.ok) {
        const sData = await searchRes.json();
        if (sData.docs && sData.docs.length > 0) {
          extraDoc = sData.docs[0];
        }
      }
    } catch (e) {
      // Ignore fallback error
    }

    // Jika ada referensi authors di workData tapi belum ada di extraDoc
    if ((!extraDoc || !extraDoc.author_name) && Array.isArray(workData.authors) && workData.authors.length > 0) {
      try {
        const authorKey = workData.authors[0]?.author?.key;
        if (authorKey) {
          const authorRes = await fetch(`${OPEN_LIBRARY_BASE_URL}${authorKey}.json`);
          if (authorRes.ok) {
            const authorData = await authorRes.json();
            if (authorData.name) {
              if (!extraDoc) extraDoc = {};
              extraDoc.author_name = [authorData.name];
            }
          }
        }
      } catch (err) {
        // Ignore author fetch error
      }
    }

    return normalizeWorkDetail(workData, cleanWorkId, extraDoc);
  } catch (error) {
    console.error(`Error fetching book with ID ${id}:`, error);
    throw error;
  }
}

export default {
  extractWorkId,
  normalizeBookData,
  normalizeWorkDetail,
  fetchBooks,
  fetchBookById
};
