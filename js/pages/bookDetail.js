import { initMobileNav } from '../utils/mobileNav.js';
import { fetchBookById } from '../api/bookApi.js';
import { addToWishlist, isInWishlist, removeFromWishlist } from '../api/wishlistApi.js';
import { addToCart, isInCart } from '../api/cartApi.js';
import { isPurchased } from '../api/paymentApi.js';
import { getUser, isAuthenticated, isGuest, clearAuth, redirectIfAdmin } from '../utils/authStorage.js';

// Admin tidak boleh di halaman ini
redirectIfAdmin();

const breadcrumbTitle   = document.getElementById('breadcrumbTitle');
const bookDetailWrapper = document.getElementById('bookDetailWrapper');
const authNavContainer  = document.getElementById('authNavContainer');

function formatRupiah(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(amount);
}

function buildCheckoutUrl(book) {
  const params = new URLSearchParams({
    id: book.id,
    title: book.title,
    author: Array.isArray(book.authors) ? book.authors[0] : book.authors,
    thumbnail: book.thumbnail,
    price: book.price,
  });
  return `checkout.html?${params.toString()}`;
}

function initNavbarAuth() {
  const navEl = document.querySelector('.navbar-nav');
  if (navEl) {
    if (isAuthenticated() && !isGuest()) {
      navEl.innerHTML = `
        <a href="index.html" class="nav-link">Katalog</a>
        <a href="cart.html" class="nav-link">Keranjang</a>
        <a href="library.html" class="nav-link">Perpustakaan</a>
        <a href="wishlist.html" class="nav-link">Wishlist</a>
        <a href="history.html" class="nav-link">Riwayat Pembelian</a>
      `;
    } else {
      navEl.innerHTML = `
        <a href="index.html" class="nav-link">Katalog</a>
      `;
    }
  }

  if (!authNavContainer) return;

  if (isAuthenticated() && !isGuest()) {
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

/**
 * Skeleton layout — meniru struktur book-detail-main
 */
function renderDetailSkeleton() {
  bookDetailWrapper.innerHTML = `
    <div class="book-detail-skeleton" aria-hidden="true">
      <div class="skeleton sk-cover-wrap"></div>
      <div class="sk-info">
        <div class="skeleton sk-badge"></div>
        <div class="skeleton sk-title"></div>
        <div class="skeleton sk-title-2"></div>
        <div class="skeleton sk-author"></div>
        <div class="skeleton sk-price"></div>
        <div class="skeleton sk-desc"></div>
        <div class="skeleton sk-desc-2"></div>
        <div class="skeleton sk-desc-3"></div>
        <div class="sk-actions">
          <div class="skeleton sk-action-btn"></div>
          <div class="skeleton sk-action-btn"></div>
          <div class="skeleton sk-action-btn"></div>
        </div>
      </div>
    </div>
  `;
}

async function loadBookDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const bookId = urlParams.get('id');

  if (!bookId) {
    breadcrumbTitle.textContent = 'Buku Tidak Ditemukan';
    bookDetailWrapper.innerHTML = `
      <div class="catalog-state">
        <div class="catalog-state-icon">⚠️</div>
        <h3 class="catalog-state-title">ID Buku Tidak Valid</h3>
        <p class="catalog-state-desc">Silakan kembali ke halaman <a href="index.html" style="color: var(--primary);">Katalog</a> dan pilih buku yang diinginkan.</p>
      </div>
    `;
    return;
  }

  renderDetailSkeleton();

  try {
    const book = await fetchBookById(bookId);
    try {
      const cached = JSON.parse(sessionStorage.getItem('tokobuku_cached_books') || '[]');
      const idx = cached.findIndex(b => b.id === book.id);
      if (idx >= 0) {
        cached[idx] = { ...cached[idx], ...book };
      } else {
        cached.push(book);
      }
      sessionStorage.setItem('tokobuku_cached_books', JSON.stringify(cached));
    } catch (e) {}

    breadcrumbTitle.textContent = book.title;
    document.title = `${book.title} - TokoBuku`;

    const isUserLoggedIn    = isAuthenticated() && !isGuest();
    const alreadyInWishlist = await isInWishlist(book.id);
    const alreadyInCart     = await isInCart(book.id);
    const alreadyPurchased  = isUserLoggedIn ? await isPurchased(book.id) : false;
    const checkoutUrl       = buildCheckoutUrl(book);

    // URL ke Open Library untuk baca buku yang sudah dibeli
    const cleanId  = String(book.id).replace(/^\/works\//, '').replace(/^\//, '');
    const readUrl  = `https://openlibrary.org/works/${encodeURIComponent(cleanId)}`;

    const cartBtnLabel = alreadyInCart ? '✅ Sudah di Keranjang' : '🛒 Tambah ke Keranjang';

    bookDetailWrapper.innerHTML = `
      <section class="book-detail-main" style="animation: fadeInUp 0.35s ease both;">
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
            ${isUserLoggedIn
              ? alreadyPurchased
                ? `<a href="${readUrl}" target="_blank" rel="noopener" class="btn btn-primary btn-action-buy">📖 Baca Buku</a>
                   <span class="purchased-badge">✅ Sudah Dibeli</span>
                   <button class="btn btn-outline btn-action-wishlist ${alreadyInWishlist ? 'in-wishlist' : ''}" id="btnWishlist">
                     ${alreadyInWishlist ? '❤️ Sudah di Wishlist' : '🤍 Tambah ke Wishlist'}
                   </button>`
                : `<a href="${checkoutUrl}" class="btn btn-primary btn-action-buy" id="btnBuyNow">⚡ Beli Langsung</a>
                   <button class="btn btn-outline btn-action-cart ${alreadyInCart ? 'in-cart' : ''}" id="btnAddToCart">
                     ${cartBtnLabel}
                   </button>
                   <button class="btn btn-outline btn-action-wishlist ${alreadyInWishlist ? 'in-wishlist' : ''}" id="btnWishlist">
                     ${alreadyInWishlist ? '❤️ Sudah di Wishlist' : '🤍 Tambah ke Wishlist'}
                   </button>`
              : `<a href="login.html?redirect=${encodeURIComponent(checkoutUrl)}" class="btn btn-primary btn-action-buy" id="btnBuyNow" title="Diperlukan login terlebih dahulu untuk menggunakan tombol ini">⚡ Beli Langsung</a>
                 <a href="login.html?redirect=${encodeURIComponent(window.location.href)}" class="btn btn-outline btn-action-cart" id="btnAddToCart" title="Diperlukan login terlebih dahulu untuk menggunakan tombol ini">🛒 Tambah ke Keranjang</a>
                 <a href="login.html?redirect=${encodeURIComponent(window.location.href)}" class="btn btn-outline btn-action-wishlist" id="btnWishlist" title="Diperlukan login terlebih dahulu untuk menggunakan tombol ini">🤍 Tambah ke Wishlist</a>`
            }
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
            <div class="metadata-item">
              <span class="metadata-label">ISBN</span>
              <span class="metadata-value">${book.isbn || 'N/A'}</span>
            </div>
          </div>

          <div class="book-synopsis">
            <h3 class="book-synopsis-title">Sinopsis Buku</h3>
            <div class="book-synopsis-text">${book.description}</div>
          </div>
        </div>
      </section>
    `;

    if (isUserLoggedIn) {
      let inCart = alreadyInCart;

      if (!alreadyPurchased) {
        const btnAddToCart = document.getElementById('btnAddToCart');
        btnAddToCart?.addEventListener('click', async () => {
          if (inCart) {
            window.location.href = 'cart.html';
            return;
          }

          btnAddToCart.disabled = true;
          try {
            const added = await addToCart(book);
            if (added) {
              inCart = true;
              btnAddToCart.textContent = '✅ Sudah di Keranjang';
              btnAddToCart.classList.add('in-cart');
            }
          } catch (error) {
            console.error('Gagal menambahkan ke keranjang:', error);
          } finally {
            btnAddToCart.disabled = false;
          }
        });
      }

      const btnWishlist = document.getElementById('btnWishlist');
      btnWishlist?.addEventListener('click', async () => {
        btnWishlist.disabled = true;
        try {
          const inWishlist = await isInWishlist(book.id);
          if (inWishlist) {
            await removeFromWishlist(book.id);
            btnWishlist.textContent = '🤍 Tambah ke Wishlist';
            btnWishlist.classList.remove('in-wishlist');
          } else {
            const added = await addToWishlist(book);
            if (added) {
              btnWishlist.textContent = '❤️ Sudah di Wishlist';
              btnWishlist.classList.add('in-wishlist');
            }
          }
        } catch (error) {
          console.error('Gagal memperbarui wishlist:', error);
        } finally {
          btnWishlist.disabled = false;
        }
      });
    }

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

initNavbarAuth();
initMobileNav();
loadBookDetail();
