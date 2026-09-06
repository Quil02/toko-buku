import { fetchBookById } from '../api/bookApi.js';
import { addToWishlist, isInWishlist, removeFromWishlist } from '../api/wishlistApi.js';
import { getUser, isAuthenticated, clearAuth } from '../utils/authStorage.js';

const breadcrumbTitle = document.getElementById('breadcrumbTitle');
const bookDetailWrapper = document.getElementById('bookDetailWrapper');
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
 * Inisialisasi status navbar
 */
function initNavbarAuth() {
  if (!authNavContainer) return;

  if (isAuthenticated()) {
    const user = getUser();
    const displayName = user?.fullName || user?.email || 'Akun Saya';
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
 * Muat detail buku dari API
 */
async function loadBookDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const bookId = urlParams.get('id');

  if (!bookId) {
    breadcrumbTitle.textContent = 'Buku Tidak Ditemukan';
    bookDetailWrapper.innerHTML = `
      <div class="catalog-state">
        <div class="catalog-state-icon">⚠️</div>
        <h3 class="catalog-state-title">ID Buku Tidak Valid</h3>
        <p class="catalog-state-desc">Silakan kembali ke halaman <a href="index.html" style="color: #2563eb;">Katalog</a> dan pilih buku yang diinginkan.</p>
      </div>
    `;
    return;
  }

  try {
    const book = await fetchBookById(bookId);

    breadcrumbTitle.textContent = book.title;
    document.title = `${book.title} - TokoBuku`;

    const alreadyInWishlist = isInWishlist(book.id);

    bookDetailWrapper.innerHTML = `
      <section class="book-detail-main">
        <div class="book-detail-cover-area">
          <div class="book-detail-cover-wrap">
            <img src="${book.thumbnail}" alt="${book.title}" class="book-detail-cover" onerror="this.src='https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&auto=format&fit=crop&q=80'">
          </div>
        </div>

        <div class="book-detail-info">
          <span class="book-detail-category-badge">${book.categories.join(', ')}</span>
          <h1 class="book-detail-title">${book.title}</h1>
          <p class="book-detail-authors">Oleh: <strong>${book.authors.join(', ')}</strong></p>

          <div class="book-detail-price">
            ${formatRupiah(book.price)}
          </div>

          <div class="book-detail-actions">
            <button class="btn btn-primary" id="btnBuyNow">🛒 Beli Sekarang</button>
            <button class="btn btn-outline" id="btnWishlist">
              ${alreadyInWishlist ? '❤️ Sudah di Wishlist' : '🤍 Tambah ke Wishlist'}
            </button>
          </div>

          <div class="book-metadata-grid">
            <div class="metadata-item">
              <span class="metadata-label">Penerbit</span>
              <span class="metadata-value">${book.publisher}</span>
            </div>
            <div class="metadata-item">
              <span class="metadata-label">Tahun Terbit</span>
              <span class="metadata-value">${book.publishedDate}</span>
            </div>
            <div class="metadata-item">
              <span class="metadata-label">Halaman</span>
              <span class="metadata-value">${book.pageCount ? book.pageCount + ' Hlm' : 'N/A'}</span>
            </div>
          </div>

          <div class="book-synopsis">
            <h3 class="book-synopsis-title">Sinopsis Buku</h3>
            <div class="book-synopsis-text">${book.description}</div>
          </div>
        </div>
      </section>
    `;

    // Tombol aksi interaktif
    document.getElementById('btnBuyNow')?.addEventListener('click', () => {
      alert(`Buku "${book.title}" telah ditambahkan ke keranjang belanja.`);
    });

    const btnWishlist = document.getElementById('btnWishlist');
    btnWishlist?.addEventListener('click', () => {
      if (isInWishlist(book.id)) {
        removeFromWishlist(book.id);
        btnWishlist.textContent = '🤍 Tambah ke Wishlist';
      } else {
        addToWishlist(book);
        btnWishlist.textContent = '❤️ Sudah di Wishlist';
      }
    });

  } catch (error) {
    breadcrumbTitle.textContent = 'Kesalahan';
    bookDetailWrapper.innerHTML = `
      <div class="catalog-state">
        <div class="catalog-state-icon">⚠️</div>
        <h3 class="catalog-state-title">Gagal Memuat Buku</h3>
        <p class="catalog-state-desc">Tidak dapat mengambil data buku dari Open Library API.</p>
      </div>
    `;
  }
}

// Initial Setup
initNavbarAuth();
loadBookDetail();
