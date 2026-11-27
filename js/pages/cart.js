/**
 * CONTROLLER: Cart Page
 * 
 * Peran MVC:
 * - Controller: event handlers (click, delete, checkout), guard authentication
 * - View: fungsi render* yang menghasilkan innerHTML (renderCart, renderCartItem, dll)
 * - Model: diakses via Service layer (js/api/cartApi.js) → backend API
 * 
 * Fitur:
 * - Guest / tidak login: redirect ke halaman login
 * - User login: lihat cart, hapus item, checkout
 */

import { initMobileNav } from '../utils/mobileNav.js';

import {
  getCart,
  removeFromCart,
  clearCart,
} from '../api/cartApi.js';
import { formatRupiah } from '../api/paymentApi.js';
import { getUser, isAuthenticated, clearAuth, redirectIfAdmin } from '../utils/authStorage.js';

// ---- Guard: hanya user login yang bisa akses cart ----
if (!isAuthenticated()) {
  window.location.href = `login.html?redirect=cart.html`;
}

// Admin tidak boleh di halaman ini
redirectIfAdmin();

// DOM
const authNavContainer = document.getElementById('authNavContainer');
const mainNavLinks     = document.getElementById('mainNavLinks');
const cartBody         = document.getElementById('cartBody');

// State
let cartData = [];
let isUpdating = false;

// ---------------------------------------------------------------
// Navbar Auth
// ---------------------------------------------------------------
function initNavbarAuth() {
  if (mainNavLinks) {
    mainNavLinks.innerHTML = `
      <a href="index.html" class="nav-link">Katalog</a>
      <a href="cart.html" class="nav-link active">Keranjang</a>
      <a href="library.html" class="nav-link">Perpustakaan</a>
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
// Helper
// ---------------------------------------------------------------
// Buku digital: setiap judul = 1 eksemplar, jadi total = jumlah judul.
function getTotalPrice() {
  return cartData.reduce((sum, item) => sum + item.price, 0);
}

// ---------------------------------------------------------------
// Render Cart
// ---------------------------------------------------------------
function renderCart() {
  const titleCount = cartData.length;
  const total      = getTotalPrice();

  if (titleCount === 0) {
    renderEmptyCart();
    return;
  }

  cartBody.innerHTML = `
    <div class="cart-layout" style="animation: fadeInUp 0.3s ease both;">

      <!-- Daftar Item -->
      <div class="cart-items-section">
        <div class="cart-items-header">
          <h2>Buku di Keranjang</h2>
          <button class="btn-clear-cart" id="btnClearCart">🗑 Kosongkan Keranjang</button>
        </div>
        <div id="cartItemsList">
          ${cartData.map(item => renderCartItem(item)).join('')}
        </div>
      </div>

      <!-- Ringkasan Pesanan -->
      <aside class="cart-summary">
        <div class="cart-summary-card">
          <div class="cart-summary-title">Ringkasan Pesanan</div>
          <div class="cart-summary-row">
            <span>Subtotal</span>
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

  bindCartEvents();
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
        loading="lazy"
        onerror="this.src='https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&auto=format&fit=crop&q=80'"
      />
      <div class="cart-item-info">
        <div class="cart-item-category">${item.category || 'Umum'}</div>
        <div class="cart-item-title" title="${item.title}">${item.title}</div>
        <div class="cart-item-author">${authors}</div>
      </div>
      <div class="cart-item-controls">
        <div class="cart-item-subtotal">${formatRupiah(item.price)}</div>
        <button class="btn-remove-cart" data-action="remove" data-id="${item.id}">Hapus</button>
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

// ---------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------
function bindCartEvents() {
  document.getElementById('btnClearCart')?.addEventListener('click', async () => {
    if (!confirm('Yakin ingin mengosongkan semua item dari keranjang?')) return;
    await clearCart();
    await loadCart();
  });

  document.getElementById('btnCheckout')?.addEventListener('click', (e) => {
    if (!cartData.length) return;

    const btn = e.currentTarget;
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner" style="width:16px;height:16px;border-width:2.5px;"></span> Mempersiapkan...`;

    sessionStorage.setItem('cart_checkout', JSON.stringify(cartData));
    window.location.href = 'checkout.html?source=cart';
  });

  document.getElementById('cartItemsList')?.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action="remove"]');
    if (!btn || isUpdating) return;

    const bookId = btn.dataset.id;
    if (!bookId) return;

    isUpdating = true;
    btn.disabled = true;

    try {
      await removeFromCart(bookId);
      await loadCart();
    } finally {
      isUpdating = false;
    }
  });
}

// ---------------------------------------------------------------
// Load dari API
// ---------------------------------------------------------------
async function loadCart() {
  try {
    cartData = await getCart();
  } catch (error) {
    console.error('Gagal memuat keranjang:', error);
    cartData = [];
  }
  renderCart();
}

// ---------------------------------------------------------------
// Init
// ---------------------------------------------------------------
initNavbarAuth();
initMobileNav();
renderCartLoading();
loadCart();
