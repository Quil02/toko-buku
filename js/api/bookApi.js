const OPEN_LIBRARY_BASE_URL = 'https://openlibrary.org';
const OPEN_LIBRARY_COVERS_URL = 'https://covers.openlibrary.org/b/id';

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
export async function fetchBooks({ query = 'programming', category = '', maxResults = 20, page = null } = {}) {
  try {
    let searchParam = query.trim() || 'programming';

    // Jika page tidak diberikan, gunakan halaman acak agar hasil berubah tiap refresh
    const randomizedPage = page !== null ? page : getRandomPage(1, 10);

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

    // Acak urutan tampilan buku agar semakin bervariasi
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
