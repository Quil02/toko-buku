import { initMobileNav } from '../utils/mobileNav.js';
/**
 * Logika Halaman Perpustakaan Saya
 * Menampilkan semua buku yang sudah dibeli user
 */
import { getPaymentHistory, formatRupiah, formatDate } from '../api/paymentApi.js';
import { isAuthenticated, isGuest, getUser, clearAuth, redirectIfAdmin } from '../utils/authStorage.js';

// Guard: hanya user yang sudah login yang bisa mengakses perpustakaan
if (!isAuthenticated() || isGuest()) {
  const redirectTarget = encodeURIComponent(window.location.href);
  window.location.href = `login.html?redirect=${redirectTarget}`;
}

// Admin tidak boleh di halaman ini
redirectIfAdmin();

const libraryGrid       = document.getElementById('libraryGrid');
const libraryTotalBadge = document.getElementById('libraryTotalBadge');
const authNavContainer  = document.getElementById('authNavContainer');

function buildReadUrl(bookId) {
  if (!bookId) return '#';
  const cleanId = String(bookId).replace(/^\/works\//, '').replace(/^\//, '');
  return `https://openlibrary.org/works/${encodeURIComponent(cleanId)}`;
}

function initNavbarAuth() {
  if (!authNavContainer) return;

  if (isAuthenticated()) {
    const user = getUser();
    const displayName = user?.fullName || user?.email || 'Akun Saya';
    authNavContainer.innerHTML = `
      <span style="font-size: 0.9rem; font-weight: 600; color: var(--text-muted);">Halo, ${displayName}</span>
      <button class="btn btn-outline" id="btnLogout" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;">Keluar</button>
    `;

    document.getElementById('btnLogout')?.addEventListener('click', () => {
      clearAuth();
      window.location.href = 'index.html';
    });
  } else {
    authNavContainer.innerHTML = `
      <a href="login.html" class="btn btn-outline">Masuk</a>
      <a href="register.html" class="btn btn-primary">Daftar</a>
    `;
  }
}

function updateLibraryCounter(count) {
  if (libraryTotalBadge) {
    libraryTotalBadge.textContent = `${count} buku`;
  }
}

/**
 * Skeleton loading — meniru layout library-card
 */
function renderLibraryLoading(count = 6) {
  libraryGrid.innerHTML = Array.from({ length: count }).map(() => `
    <div class="library-card" aria-hidden="true" style="overflow:hidden;">
      <div class="library-card-cover-wrap">
        <div class="skeleton" style="width:100%; height:100%; border-radius:0;"></div>
      </div>
      <div class="library-card-body" style="display:flex; flex-direction:column; gap:0.65rem;">
        <div class="skeleton" style="height:11px; width:50%; border-radius:4px;"></div>
        <div class="skeleton" style="height:15px; width:90%; border-radius:4px;"></div>
        <div class="skeleton" style="height:13px; width:65%; border-radius:4px;"></div>
        <div class="skeleton" style="height:20px; width:80px; border-radius:6px; margin-top:0.3rem;"></div>
        <div style="display:flex; gap:0.5rem; margin-top:0.5rem;">
          <div class="skeleton" style="height:34px; flex:1; border-radius:8px;"></div>
          <div class="skeleton" style="height:34px; flex:1; border-radius:8px;"></div>
        </div>
      </div>
    </div>
  `).join('');
}

/**
 * Ekstrak semua buku unik dari semua transaksi
 * (buku bisa dibeli berkali-kali, tampilkan 1x per judul/ID)
 */
function extractUniqueBooks(history) {
  const seen = new Map();

  for (const tx of history) {
    // Transaksi multi-item (cart)
    if (tx.items && tx.items.length > 0) {
      for (const item of tx.items) {
        if (item.id && !seen.has(item.id)) {
          seen.set(item.id, {
            id: item.id,
            title: item.title || 'Judul Tidak Diketahui',
            authors: Array.isArray(item.authors) ? item.authors : [item.author || 'Anonim'],
            author: item.author || (Array.isArray(item.authors) ? item.authors[0] : 'Anonim'),
            thumbnail: item.thumbnail || '',
            price: item.price || item.subtotal || 0,
            category: item.category || '',
            paidAt: tx.paidAt || tx.createdAt,
          });
        }
      }
    }
    // Transaksi buku tunggal (via tx.book)
    if (tx.book && tx.book.id && !seen.has(tx.book.id)) {
      seen.set(tx.book.id, {
        id: tx.book.id,
        title: tx.book.title || 'Judul Tidak Diketahui',
        authors: [tx.book.author || 'Anonim'],
        author: tx.book.author || 'Anonim',
        thumbnail: tx.book.thumbnail || '',
        price: tx.book.price || tx.total || 0,
        category: tx.book.category || '',
        paidAt: tx.paidAt || tx.createdAt,
      });
    }
  }

  return Array.from(seen.values());
}

function renderLibrary(books) {
  updateLibraryCounter(books.length);

  if (!books || books.length === 0) {
    libraryGrid.innerHTML = `
      <div class="library-empty-state" style="grid-column: 1 / -1;">
        <div class="library-empty-icon">📭</div>
        <h3 class="library-empty-title">Perpustakaan Anda Masih Kosong</h3>
        <p class="library-empty-desc">Anda belum membeli buku apapun. Jelajahi katalog kami dan mulai membangun koleksi digital Anda!</p>
        <a href="index.html" class="btn btn-primary">🛍️ Mulai Belanja Buku</a>
      </div>
    `;
    return;
  }

  libraryGrid.innerHTML = books.map(book => {
    const authors = Array.isArray(book.authors) ? book.authors.join(', ') : (book.author || 'Anonim');
    const readUrl = buildReadUrl(book.id);
    const detailUrl = `book-detail.html?id=${encodeURIComponent(book.id)}`;
    const paidDate = book.paidAt ? formatDate(book.paidAt) : '';

    return `
      <article class="library-card" data-id="${book.id}" style="animation: fadeInUp 0.3s ease both;">
        <div class="library-card-cover-wrap">
          <span class="library-owned-badge">📖 Tersedia</span>
          <img src="${book.thumbnail}" alt="${book.title}" class="library-card-cover" onerror="this.src='https://via.placeholder.com/150x220?text=No+Cover';" />
        </div>
        <div class="library-card-body">
          <div class="library-card-category">${book.category || 'Umum'}</div>
          <h3 class="library-card-title">${book.title}</h3>
          <div class="library-card-author">oleh ${authors}</div>
          <div class="library-card-price-row">
            <div class="library-card-price">${formatRupiah(book.price)}</div>
            ${paidDate ? `<div class="library-card-date">${paidDate}</div>` : ''}
          </div>
          <div class="library-card-actions">
            <a href="${detailUrl}" class="btn btn-outline">Detail</a>
            <a href="${readUrl}" target="_blank" rel="noopener" class="btn btn-primary">📖 Baca Buku</a>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

async function loadLibrary() {
  try {
    const history = await getPaymentHistory();
    const books = extractUniqueBooks(history);
    renderLibrary(books);
  } catch (error) {
    console.error('Gagal memuat perpustakaan:', error);
    renderLibrary([]);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initNavbarAuth();
  initMobileNav();
  renderLibraryLoading();
  loadLibrary();
});
