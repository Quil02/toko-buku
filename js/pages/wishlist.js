/**
 * Logika Halaman Wishlist
 */
import { getWishlist, removeFromWishlist } from '../api/wishlistApi.js';
import { isAuthenticated, isGuest, getUser, clearAuth } from '../utils/authStorage.js';

// Guard: hanya user yang sudah login yang bisa mengakses wishlist
if (!isAuthenticated() || isGuest()) {
  const redirectTarget = encodeURIComponent(window.location.href);
  window.location.href = `login.html?redirect=${redirectTarget}`;
}

const wishlistGrid       = document.getElementById('wishlistGrid');
const wishlistTotalBadge = document.getElementById('wishlistTotalBadge');
const navWishlistCount   = document.getElementById('navWishlistCount');
const authNavContainer   = document.getElementById('authNavContainer');
const authWarning        = document.getElementById('authWarning');

function formatRupiah(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(amount || 0);
}

function buildCheckoutUrl(item) {
  const params = new URLSearchParams({
    id: item.id,
    title: item.title,
    author: Array.isArray(item.authors) ? item.authors[0] : (item.authors || 'Anonim'),
    thumbnail: item.thumbnail,
    price: item.price,
  });
  return `checkout.html?${params.toString()}`;
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

/**
 * Skeleton loading — meniru layout wishlist-card
 */
function renderWishlistLoading(count = 6) {
  wishlistGrid.innerHTML = Array.from({ length: count }).map(() => `
    <div class="wishlist-card" aria-hidden="true" style="overflow:hidden;">
      <div class="wishlist-card-cover-wrap">
        <div class="skeleton" style="width:100%; height:100%; border-radius:0;"></div>
      </div>
      <div class="wishlist-card-body" style="display:flex; flex-direction:column; gap:0.65rem;">
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
    const authors = Array.isArray(item.authors) ? item.authors.join(', ') : (item.authors || 'Anonim');
    const checkoutUrl = buildCheckoutUrl(item);

    return `
      <article class="wishlist-card" data-id="${item.id}" style="animation: fadeInUp 0.3s ease both;">
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
          </div>
          <div class="wishlist-card-actions">
            <a href="book-detail.html?id=${item.id}" class="btn btn-outline">Detail</a>
            <a href="${checkoutUrl}" class="btn btn-primary">🛒 Beli</a>
          </div>
        </div>
      </article>
    `;
  }).join('');

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
  renderWishlistLoading();
  // Data dari localStorage = synchronous, tapi skeleton memberi kesan loading yang natural
  setTimeout(() => renderWishlist(), 350);
});
