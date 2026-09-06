import { fetchBooks } from '../api/bookApi.js';
import { getUser, isAuthenticated, clearAuth } from '../utils/authStorage.js';

let allBooks = [];
let debounceTimer = null;

// DOM Elements
const booksGrid = document.getElementById('booksGrid');
const searchInput = document.getElementById('searchInput');
const sortSelect = document.getElementById('sortSelect');
const minPriceInput = document.getElementById('minPriceInput');
const maxPriceInput = document.getElementById('maxPriceInput');
const applyPriceFilterBtn = document.getElementById('applyPriceFilterBtn');
const resetFilterBtn = document.getElementById('resetFilterBtn');
const categoryFilterGroup = document.getElementById('categoryFilterGroup');
const authNavContainer = document.getElementById('authNavContainer');

/**
 * Format angka ke mata uang Rupiah
 */
function formatRupiah(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * Inisialisasi navbar berdasarkan status autentikasi pengguna
 */
function initNavbarAuth() {
  if (!authNavContainer) return;

  if (isAuthenticated()) {
    const user = getUser();
    const displayName = user?.fullName || user?.username || 'Akun Saya';
    authNavContainer.innerHTML = `
      <span style="font-size: 0.9rem; font-weight: 600; color: #4b5563;">Halo, ${displayName}</span>
      <button class="btn btn-outline" id="btnLogout" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;">Keluar</button>
    `;

    document.getElementById('btnLogout')?.addEventListener('click', () => {
      clearAuth();
      window.location.reload();
    });
  }
}

/**
 * Menampilkan status loading pada grid
 */
function renderLoading() {
  booksGrid.innerHTML = `
    <div class="catalog-state">
      <div class="catalog-state-icon">🔄</div>
      <h3 class="catalog-state-title">Memuat Koleksi Buku...</h3>
      <p class="catalog-state-desc">Mengambil data buku langsung dari Open Library.</p>
    </div>
  `;
}

/**
 * Menampilkan pesan ketika buku tidak ditemukan
 */
function renderEmpty(message = 'Tidak ada buku yang sesuai dengan filter atau pencarian Anda.') {
  booksGrid.innerHTML = `
    <div class="catalog-state">
      <div class="catalog-state-icon">📖</div>
      <h3 class="catalog-state-title">Buku Tidak Ditemukan</h3>
      <p class="catalog-state-desc">${message}</p>
    </div>
  `;
}

/**
 * Render array data buku ke grid
 */
function renderBooks(books) {
  if (!books || books.length === 0) {
    renderEmpty();
    return;
  }

  booksGrid.innerHTML = books.map(book => `
    <article class="book-card">
      <div class="book-card-cover-wrap">
        <img src="${book.thumbnail}" alt="${book.title}" class="book-card-cover" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&auto=format&fit=crop&q=80'">
      </div>
      <div class="book-card-body">
        <span class="book-card-category">${book.categories[0] || 'Umum'}</span>
        <h3 class="book-card-title" title="${book.title}">${book.title}</h3>
        <p class="book-card-author">${book.authors.join(', ')}</p>
        <div class="book-card-footer">
          <span class="book-card-price">${formatRupiah(book.price)}</span>
          <a href="book-detail.html?id=${encodeURIComponent(book.id)}" class="btn btn-primary book-card-btn">Detail</a>
        </div>
      </div>
    </article>
  `).join('');
}

/**
 * Filter dan sortir data buku lokal yang sudah di-fetch
 */
function applyClientFilters() {
  let filtered = [...allBooks];

  // Filter Harga Minimal
  const minPrice = parseFloat(minPriceInput.value);
  if (!isNaN(minPrice) && minPrice >= 0) {
    filtered = filtered.filter(b => b.price >= minPrice);
  }

  // Filter Harga Maksimal
  const maxPrice = parseFloat(maxPriceInput.value);
  if (!isNaN(maxPrice) && maxPrice >= 0) {
    filtered = filtered.filter(b => b.price <= maxPrice);
  }

  // Sorting
  const sortMode = sortSelect.value;
  if (sortMode === 'price-asc') {
    filtered.sort((a, b) => a.price - b.price);
  } else if (sortMode === 'price-desc') {
    filtered.sort((a, b) => b.price - a.price);
  } else if (sortMode === 'title-asc') {
    filtered.sort((a, b) => a.title.localeCompare(b.title));
  }

  renderBooks(filtered);
}

/**
 * Melakukan pemanggilan Open Library API sesuai parameter search dan kategori
 */
async function loadBooksFromApi() {
  const query = searchInput.value.trim() || 'programming';
  const checkedCategory = document.querySelector('input[name="category"]:checked')?.value || '';

  renderLoading();

  try {
    const books = await fetchBooks({ query, category: checkedCategory, maxResults: 24 });
    allBooks = books;
    applyClientFilters();
  } catch (error) {
    booksGrid.innerHTML = `
      <div class="catalog-state">
        <div class="catalog-state-icon">⚠️</div>
        <h3 class="catalog-state-title">Gagal Mengambil Data</h3>
        <p class="catalog-state-desc">Terjadi kendala saat terhubung ke Open Library API. Silakan coba lagi.</p>
      </div>
    `;
  }
}

// Event Listeners
searchInput.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    loadBooksFromApi();
  }, 400);
});

categoryFilterGroup?.addEventListener('change', () => {
  loadBooksFromApi();
});

sortSelect?.addEventListener('change', () => {
  applyClientFilters();
});

applyPriceFilterBtn?.addEventListener('click', () => {
  applyClientFilters();
});

resetFilterBtn?.addEventListener('click', () => {
  minPriceInput.value = '';
  maxPriceInput.value = '';
  sortSelect.value = 'default';
  const defaultRadio = document.querySelector('input[name="category"][value=""]');
  if (defaultRadio) defaultRadio.checked = true;
  loadBooksFromApi();
});

// Initial Setup
initNavbarAuth();
loadBooksFromApi();
