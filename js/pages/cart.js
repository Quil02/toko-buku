import { initMobileNav } from '../utils/mobileNav.js';
/**
 * Logika Halaman Keranjang Belanja (Cart)
 * - Guest / tidak login: redirect ke halaman login
 * - User login: bisa lihat cart, hapus item, dan checkout ke halaman checkout
 * - Tidak ada quantity (produk digital, setiap judul = 1 unit)
 */

import {
  getCart,
  removeFromCart,
  clearCart,
  getCartTotal,
  getCartCount,
} from '../api/cartApi.js';
import { formatRupiah } from '../api/paymentApi.js';
import { getUser, isAuthenticated, clearAuth } from '../utils/authStorage.js';

// ---- Guard: hanya user login yang bisa akses cart ----
if (!isAuthenticated()) {
  window.location.href = `login.html?redirect=cart.html`;
}

// DOM
const authNavContainer = document.getElementById('authNavContainer');
const mainNavLinks     = document.getElementById('mainNavLinks');
const cartCountBadge   = document.getElementById('cartCountBadge');
const cartBody         = document.getElementById('cartBody');

// ---------------------------------------------------------------
// Navbar Auth
// ---------------------------------------------------------------
function initNavbarAuth() {
  if (mainNavLinks) {
    mainNavLinks.innerHTML = `
      <a href="index.html" class="nav-link">Katalog</a>
      <a href="cart.html" class="nav-link active">Keranjang</a>
      <a href="wishlist.html" class="nav-link">Wishlist</a>
      <a href="history.html" class="nav-link">Riwayat Pembelian</a>
    `;
  }

  if (!authNavContainer) return;

  const user = getUser();
  const displayName = user?.fullName || user?.username || 'Akun Saya';
  authNavContainer.innerHTML = `
    <span style="font-size: 0.9rem; font-weight: 600; color: var(--text-muted);">Halo, ${displayName}</span>
    <button class="btn btn-outline" id="btnLogout" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;">Keluar</button>
  `;
  document.getElementById('btnLogout')?.addEventListener('click', () => {
    clearAuth();
    window.location.href = 'index.html';
  });
}

// ---------------------------------------------------------------
// Loading skeleton untuk cart items
// ---------------------------------------------------------------
function renderCartLoading() {
  cartBody.innerHTML = `
    <div class="cart-layout">
      <div class="cart-items-section">
        <div class="cart-items-header">
          <div class="skeleton" style="height:22px; width:200px; border-radius:6px;"></div>
          <div class="skeleton" style="height:32px; width:160px; border-radius:8px;"></div>
        </div>
        ${Array.from({ length: 3 }).map(() => `
          <div class="cart-item" style="gap:1rem; opacity:0.85;" aria-hidden="true">
            <div class="skeleton cart-item-cover" style="border-radius:8px; flex-shrink:0;"></div>
            <div class="cart-item-info" style="gap:0.55rem; display:flex; flex-direction:column;">
              <div class="skeleton" style="height:11px; width:55px; border-radius:4px;"></div>
              <div class="skeleton" style="height:15px; width:88%; border-radius:4px;"></div>
              <div class="skeleton" style="height:13px; width:60%; border-radius:4px;"></div>
              <div class="skeleton" style="height:16px; width:80px; border-radius:4px; margin-top:0.2rem;"></div>
            </div>
          </div>
        `).join('')}
      </div>
      <aside class="cart-summary">
        <div class="cart-summary-card" style="gap:1rem; display:flex; flex-direction:column;" aria-hidden="true">
          <div class="skeleton" style="height:20px; width:140px; border-radius:6px;"></div>
          <div class="skeleton" style="height:16px; width:100%; border-radius:4px;"></div>
          <div class="skeleton" style="height:16px; width:100%; border-radius:4px;"></div>
          <div class="skeleton" style="height:20px; width:100%; border-radius:4px;"></div>
          <div class="skeleton" style="height:46px; width:100%; border-radius:10px; margin-top:0.5rem;"></div>
        </div>
      </aside>
    </div>
  `;
}

// ---------------------------------------------------------------
// Render Cart
// ---------------------------------------------------------------
function renderCart() {
  const cart  = getCart();
  const count = getCartCount();
  const total = getCartTotal();

  cartCountBadge.textContent = `${count} item`;

  if (!cart.length) {
    renderEmptyCart();
    return;
  }

  cartBody.innerHTML = `
    <div class="cart-layout" style="animation: fadeInUp 0.3s ease both;">

      <!-- Daftar Item -->
      <div class="cart-items-section">
        <div class="cart-items-header">
          <h2>Item dalam Keranjang (${count})</h2>
          <button class="btn-clear-cart" id="btnClearCart">🗑 Kosongkan Keranjang</button>
        </div>
        <div id="cartItemsList">
          ${cart.map(item => renderCartItem(item)).join('')}
        </div>
      </div>

      <!-- Ringkasan Pesanan -->
      <aside class="cart-summary">
        <div class="cart-summary-card">
          <div class="cart-summary-title">Ringkasan Pesanan</div>
          <div class="cart-summary-row">
            <span>${count} judul buku</span>
            <span>${formatRupiah(total)}</span>
          </div>
          <div class="cart-summary-row">
            <span>Biaya Layanan</span>
            <span>Gratis</span>
          </div>
          <div class="cart-summary-row total">
            <span>Total</span>
            <span class="total-price">${formatRupiah(total)}</span>
          </div>

          <button class="btn-checkout-cart" id="btnCheckout">🛒 Checkout Sekarang</button>
          <p class="cart-summary-note">📱 Semua buku bersifat digital. Akses langsung setelah pembayaran.</p>
        </div>
      </aside>

    </div>
  `;

  document.getElementById('btnClearCart')?.addEventListener('click', () => {
    if (confirm('Yakin ingin mengosongkan semua item dari keranjang?')) {
      clearCart();
      renderCart();
    }
  });

  document.getElementById('btnCheckout')?.addEventListener('click', (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner" style="width:16px;height:16px;border-width:2.5px;"></span> Mempersiapkan...`;
    sessionStorage.setItem('cart_checkout', JSON.stringify(getCart()));
    setTimeout(() => {
      window.location.href = 'checkout.html?source=cart';
    }, 600);
  });

  bindRemoveEvents();
}

function renderCartItem(item) {
  const authors = Array.isArray(item.authors)
    ? item.authors.join(', ')
    : (item.authors || 'Anonim');

  return `
    <div class="cart-item" data-id="${item.id}">
      <img
        src="${item.thumbnail}"
        alt="${item.title}"
        class="cart-item-cover"
        onerror="this.src='https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&auto=format&fit=crop&q=80'"
      />
      <div class="cart-item-info">
        <div class="cart-item-category">${item.category || 'Umum'}</div>
        <div class="cart-item-title" title="${item.title}">${item.title}</div>
        <div class="cart-item-author">${authors}</div>
        <div class="cart-item-price-unit" style="font-weight:700; color:var(--success); margin-top:0.3rem;">${formatRupiah(item.price)}</div>
      </div>
      <div class="cart-item-controls">
        <button class="btn-remove-cart" data-id="${item.id}">Hapus</button>
      </div>
    </div>
  `;
}

function renderEmptyCart() {
  cartBody.innerHTML = `
    <div class="cart-empty-state">
      <div class="cart-empty-icon">🛒</div>
      <h3 class="cart-empty-title">Keranjang Kamu Masih Kosong</h3>
      <p class="cart-empty-desc">Temukan buku favoritmu dan tambahkan ke keranjang untuk mulai berbelanja.</p>
      <a href="index.html" class="btn btn-primary">Jelajahi Katalog Buku</a>
    </div>
  `;
}

function bindRemoveEvents() {
  document.querySelectorAll('.btn-remove-cart').forEach(btn => {
    btn.addEventListener('click', () => {
      removeFromCart(btn.dataset.id);
      renderCart();
    });
  });
}

// ---------------------------------------------------------------
// Init
// ---------------------------------------------------------------
initNavbarAuth();
initMobileNav();
renderCartLoading();
// Simulasi mikro-delay agar skeleton terasa natural (data dari localStorage = sync)
setTimeout(() => renderCart(), 350);
