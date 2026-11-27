import { initMobileNav } from '../utils/mobileNav.js';
/**
 * Logika Halaman Wishlist
 */
import { getWishlist, removeFromWishlist } from '../api/wishlistApi.js';
import { isPurchased } from '../api/paymentApi.js';
import { isAuthenticated, isGuest, getUser, clearAuth, redirectIfAdmin } from '../utils/authStorage.js';

// Escape teks sebelum dimasukkan ke innerHTML (cegah XSS).
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);
}

// Guard: hanya user yang sudah login yang bisa mengakses wishlist
if (!isAuthenticated() || isGuest()) {
  const redirectTarget = encodeURIComponent(window.location.href);
  window.location.href = `login.html?redirect=${redirectTarget}`;
}

// Admin tidak boleh di halaman ini
redirectIfAdmin();

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
      <span style="font-size: 0.9rem; font-weight: 600; color: var(--text-muted);">Halo, ${escapeHtml(displayName)}</span>
      <button class="btn btn-outline" id="btnLogout" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;">Keluar</button>
    `;

    document.getElementById('btnLogout')?.addEventListener('click', () => {
      clearAuth();
      window.location.href = 'index.html';
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

function renderWishlist(items, purchasedSet = new Set()) {
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
    const owned = purchasedSet.has(item.id);

    // URL baca buku di Open Library
    const cleanId = String(item.id).replace(/^\/works\//, '').replace(/^\//, '');
    const readUrl = `https://openlibrary.org/works/${encodeURIComponent(cleanId)}`;

    const actionButtons = owned
      ? `<a href="book-detail.html?id=${encodeURIComponent(item.id)}" class="btn btn-outline">Detail</a>
         <a href="${readUrl}" target="_blank" rel="noopener" class="btn btn-primary">📖 Baca</a>`
      : `<a href="book-detail.html?id=${encodeURIComponent(item.id)}" class="btn btn-outline">Detail</a>
         <a href="${checkoutUrl}" class="btn btn-primary">🛒 Beli</a>`;

    return `
      <article class="wishlist-card${owned ? ' wishlist-card--owned' : ''}" data-id="${escapeHtml(item.id)}" style="animation: fadeInUp 0.3s ease both;">
        <div class="wishlist-card-cover-wrap">
          <button class="btn-remove-wishlist" data-id="${escapeHtml(item.id)}" title="Hapus dari wishlist" aria-label="Hapus">
            ✕
          </button>
          ${owned ? '<span class="wishlist-owned-badge">✅ Dimiliki</span>' : ''}
          <img src="${escapeHtml(item.thumbnail)}" alt="${escapeHtml(item.title)}" class="wishlist-card-cover" onerror="this.src='https://via.placeholder.com/150x220?text=No+Cover';" />
        </div>
        <div class="wishlist-card-body">
          <div class="wishlist-card-category">${escapeHtml(item.category || 'Umum')}</div>
          <h3 class="wishlist-card-title">${escapeHtml(item.title)}</h3>
          <div class="wishlist-card-author">oleh ${escapeHtml(authors)}</div>
          <div class="wishlist-card-price-row">
            ${owned
              ? '<div class="wishlist-card-price wishlist-card-price--owned">Sudah Dibeli</div>'
              : `<div class="wishlist-card-price">${formatRupiah(item.price)}</div>`
            }
          </div>
          <div class="wishlist-card-actions">
            ${actionButtons}
          </div>
        </div>
      </article>
    `;
  }).join('');

  document.querySelectorAll('.btn-remove-wishlist').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const bookId = btn.getAttribute('data-id');
      if (bookId) {
        btn.disabled = true;
        await removeFromWishlist(bookId);
        await loadWishlist();
      }
    });
  });
}

async function loadWishlist() {
  try {
    const items = await getWishlist();

    // Cek status "sudah dibeli" untuk setiap item secara paralel
    const purchasedResults = await Promise.all(
      items.map(item => isPurchased(item.id).catch(() => false))
    );
    const purchasedSet = new Set(
      items.filter((_, i) => purchasedResults[i]).map(item => item.id)
    );

    renderWishlist(items, purchasedSet);
  } catch (error) {
    console.error('Gagal memuat wishlist:', error);
    renderWishlist([]);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initNavbarAuth();
  initMobileNav();
  renderWishlistLoading();
  loadWishlist();
});
