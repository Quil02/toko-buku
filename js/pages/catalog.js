import { fetchBooks } from '../api/bookApi.js';
import { getUser, isAuthenticated, isGuest, clearAuth } from '../utils/authStorage.js';

let allBooks = [];
let masterBooks = [];
let debounceTimer = null;

try {
  const cached = sessionStorage.getItem('tokobuku_cached_books');
  if (cached) {
    masterBooks = JSON.parse(cached);
    allBooks = [...masterBooks];
  }
} catch (e) {}

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

function formatRupiah(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(amount);
}

function initNavbarAuth() {
  const navEl = document.querySelector('.navbar-nav');
  if (navEl) {
    if (isAuthenticated() && !isGuest()) {
      navEl.innerHTML = `
        <a href="index.html" class="nav-link active">Katalog</a>
        <a href="cart.html" class="nav-link">Keranjang</a>
        <a href="wishlist.html" class="nav-link">Wishlist</a>
        <a href="history.html" class="nav-link">Riwayat Pembelian</a>
      `;
    } else {
      navEl.innerHTML = `
        <a href="index.html" class="nav-link active">Katalog</a>
      `;
    }
  }

  if (!authNavContainer) return;

  if (isAuthenticated() && !isGuest()) {
    const user = getUser();
    const displayName = user?.fullName || user?.username || 'Akun Saya';
    authNavContainer.innerHTML = `
      <span style="font-size: 0.9rem; font-weight: 600; color: var(--text-muted);">Halo, ${displayName}</span>
      <button class="btn btn-outline" id="btnLogout" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;">Keluar</button>
    `;
    document.getElementById('btnLogout')?.addEventListener('click', () => {
      clearAuth();
      window.location.reload();
    });
  } else {
    authNavContainer.innerHTML = `
      <a href="login.html" class="btn btn-outline">Masuk</a>
      <a href="register.html" class="btn btn-primary">Daftar</a>
    `;
  }
}

/**
 * Render skeleton cards — meniru layout book-card
 */
function renderLoading(count = 8) {
  booksGrid.innerHTML = Array.from({ length: count }).map(() => `
    <div class="book-card-skeleton" aria-hidden="true">
      <div class="skeleton sk-cover"></div>
      <div class="sk-body">
        <div class="skeleton sk-tag"></div>
        <div class="skeleton sk-title"></div>
        <div class="skeleton sk-title-2"></div>
        <div class="skeleton sk-author"></div>
        <div class="sk-footer">
          <div class="skeleton sk-price"></div>
          <div class="skeleton sk-btn"></div>
        </div>
      </div>
    </div>
  `).join('');
}

function renderEmpty(message = 'Tidak ada buku yang sesuai dengan filter atau pencarian Anda.') {
  booksGrid.innerHTML = `
    <div class="catalog-state">
      <div class="catalog-state-icon">📖</div>
      <h3 class="catalog-state-title">Buku Tidak Ditemukan</h3>
      <p class="catalog-state-desc">${message}</p>
    </div>
  `;
}

function renderBooks(books) {
  if (!books || books.length === 0) {
    renderEmpty();
    return;
  }

  booksGrid.innerHTML = books.map(book => `
    <article class="book-card" style="animation: fadeInUp 0.3s ease both;">
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
 * Memeriksa apakah buku cocok dengan kata kunci pencarian.
 * - Judul buku: case sensitive
 * - Penulis: case sensitive
 */
function matchesSearch(book, searchTerm) {
  if (!searchTerm) return true;

  // 1. Judul buku — Case Sensitive
  const matchTitle = (typeof book.title === "string" && book.title.includes(searchTerm)) ||
                     (typeof book.subtitle === "string" && book.subtitle.includes(searchTerm));

  // 2. Penulis — Case Sensitive
  const matchAuthor = Array.isArray(book.authors)
    ? book.authors.some(author => typeof author === "string" && author.includes(searchTerm))
    : (typeof book.authors === "string" && book.authors.includes(searchTerm));

  return matchTitle || matchAuthor;
}

function applyClientFilters() {
  let filtered = [...allBooks];

  const searchTerm = searchInput.value.trim();
  if (searchTerm) {
    filtered = filtered.filter(b => matchesSearch(b, searchTerm));
  }

  const minPrice = parseFloat(minPriceInput.value);
  if (!isNaN(minPrice) && minPrice >= 0) {
    filtered = filtered.filter(b => b.price >= minPrice);
  }

  const maxPrice = parseFloat(maxPriceInput.value);
  if (!isNaN(maxPrice) && maxPrice >= 0) {
    filtered = filtered.filter(b => b.price <= maxPrice);
  }

  const sortMode = sortSelect.value;
  if (sortMode === 'price-asc') {
    filtered.sort((a, b) => a.price - b.price);
  } else if (sortMode === 'price-desc') {
    filtered.sort((a, b) => b.price - a.price);
  } else if (sortMode === 'title-asc') {
    filtered.sort((a, b) => a.title.localeCompare(b.title));
  }

  if (filtered.length === 0 && searchTerm) {
    renderEmpty(`Tidak ada buku yang sesuai dengan pencarian "${searchTerm}". Catatan: pencarian judul buku dan nama penulis bersifat case-sensitive.`);
    return;
  }

  renderBooks(filtered);
}

async function loadBooksFromApi() {
  const searchTerm = searchInput.value.trim();
  const query = searchTerm || 'programming';
  const checkedCategory = document.querySelector('input[name="category"]:checked')?.value || '';

  if (allBooks.length === 0) {
    renderLoading();
  }

  try {
    const books = await fetchBooks({ query, category: checkedCategory, maxResults: 24 });
    if (books && books.length > 0) {
      if (!searchTerm && !checkedCategory) {
        masterBooks = books;
      } else {
        const newIds = new Set(books.map(b => b.id));
        masterBooks = [...books, ...masterBooks.filter(b => !newIds.has(b.id))];
      }
      allBooks = books;
      try { sessionStorage.setItem('tokobuku_cached_books', JSON.stringify(masterBooks)); } catch (e) {}
    } else {
      // Jika API Open Library tidak menemukan buku,
      // gunakan masterBooks agar pencarian tetap mencocokkan buku yang ada
      allBooks = [...masterBooks];
    }
    applyClientFilters();
  } catch (error) {
    if (allBooks.length > 0 || masterBooks.length > 0) {
      if (allBooks.length === 0) allBooks = [...masterBooks];
      applyClientFilters();
    } else {
      booksGrid.innerHTML = `
        <div class="catalog-state">
          <div class="catalog-state-icon">⚠️</div>
          <h3 class="catalog-state-title">Gagal Mengambil Data</h3>
          <p class="catalog-state-desc">Terjadi kendala saat terhubung ke Open Library API. Silakan coba lagi.</p>
        </div>
      `;
    }
  }
}

// Event Listeners
searchInput.addEventListener('input', () => {
  if (allBooks.length === 0 && masterBooks.length > 0) {
    allBooks = [...masterBooks];
  }
  applyClientFilters();
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
  searchInput.value = '';
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
