/**
 * Logika Halaman Wishlist
 */
import { getWishlist, removeFromWishlist } from '../api/wishlistApi.js';
import { isAuthenticated, getUser, clearAuth } from '../utils/authStorage.js';

const wishlistGrid = document.getElementById('wishlistGrid');
const wishlistTotalBadge = document.getElementById('wishlistTotalBadge');
const navWishlistCount = document.getElementById('navWishlistCount');
const authNavContainer = document.getElementById('authNavContainer');
const authWarning = document.getElementById('authWarning');

function formatRupiah(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(amount || 0);
}

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
    if (authWarning) authWarning.style.display = 'none';
  } else {
    authNavContainer.innerHTML = `
      <a href="login.html" class="btn btn-outline">Masuk</a>
      <a href="register.html" class="btn btn-primary">Daftar</a>
    `;
    if (authWarning) authWarning.style.display = 'flex';
  }
}

function updateWishlistCounter(count) {
  if (wishlistTotalBadge) {
    wishlistTotalBadge.textContent = `${count} item`;
  }
  if (navWishlistCount) {
    navWishlistCount.style.display = 'none';
  }
}

function renderWishlist() {
  const items = getWishlist();
  updateWishlistCounter(items.length);

  if (!items || items.length === 0) {
    wishlistGrid.innerHTML = `
      <div class="wishlist-empty-state" style="grid-column: 1 / -1;">
        <div class="wishlist-empty-icon">💔</div>
        <h3 class="wishlist-empty-title">Wishlist Anda Masih Kosong</h3>
        <p class="wishlist-empty-desc">Jelajahi koleksi buku kami dan klik ikon hati untuk menyimpan buku impian Anda.</p>
        <a href="index.html" class="btn btn-primary">Jelajahi Buku Sekarang</a>
      </div>
    `;
    return;
  }

  wishlistGrid.innerHTML = items.map(item => {
    const currentStock = typeof item.stock === 'number' ? item.stock : 10;
    let stockBadge = '<span class="stock-badge in-stock">Tersedia</span>';
    if (currentStock === 0) {
      stockBadge = '<span class="stock-badge out-of-stock">Habis</span>';
    } else if (currentStock < 5) {
      stockBadge = `<span class="stock-badge low-stock">Sisa ${currentStock}</span>`;
    }

    const authors = Array.isArray(item.authors) ? item.authors.join(', ') : (item.authors || 'Anonim');

    return `
      <article class="wishlist-card" data-id="${item.id}">
        <div class="wishlist-card-cover-wrap">
          <button class="btn-remove-wishlist" data-id="${item.id}" title="Hapus dari wishlist" aria-label="Hapus">
            ✕
          </button>
          <img src="${item.thumbnail}" alt="${item.title}" class="wishlist-card-cover" onerror="this.src='https://via.placeholder.com/150x220?text=No+Cover';" />
        </div>
        <div class="wishlist-card-body">
          <div class="wishlist-card-category">${item.category || 'Umum'}</div>
          <h3 class="wishlist-card-title">${item.title}</h3>
          <div class="wishlist-card-author">oleh ${authors}</div>
          <div class="wishlist-card-price-row">
            <div class="wishlist-card-price">${formatRupiah(item.price)}</div>
            <div>${stockBadge}</div>
          </div>
          <div class="wishlist-card-actions">
            <a href="book-detail.html?id=${item.id}" class="btn btn-outline">Detail</a>
            <a href="book-detail.html?id=${item.id}" class="btn btn-primary">Beli</a>
          </div>
        </div>
      </article>
    `;
  }).join('');

  // Event handler tombol hapus
  document.querySelectorAll('.btn-remove-wishlist').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const bookId = btn.getAttribute('data-id');
      if (bookId) {
        removeFromWishlist(bookId);
        renderWishlist();
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initNavbarAuth();
  renderWishlist();
});
