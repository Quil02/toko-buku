import { initMobileNav } from '../utils/mobileNav.js';
import {
  generatePaymentId,
  formatRupiah,
  savePayment,
  getPaymentMethods,
  getPaymentMethodLabel,
} from "../api/paymentApi.js";
import { getUser, isAuthenticated, isGuest, clearAuth, redirectIfAdmin } from "../utils/authStorage.js";

// Admin tidak boleh di halaman ini
redirectIfAdmin();

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

// ---- Elemen DOM ----
const orderBookInfoEl    = document.getElementById("orderBookInfo");
const orderIdEl          = document.getElementById("orderId");
const orderTotalEl       = document.getElementById("orderTotal");
const btnPay             = document.getElementById("btnPay");
const checkoutAlert      = document.getElementById("checkoutAlert");
const successModal       = document.getElementById("successModal");
const modalOrderId       = document.getElementById("modalOrderId");
const modalBookTitle     = document.getElementById("modalBookTitle");
const modalPaymentMethod = document.getElementById("modalPaymentMethod");
const modalTotal         = document.getElementById("modalTotal");
const buyerNameEl        = document.getElementById("buyerName");
const buyerEmailEl       = document.getElementById("buyerEmail");

// Metode pembayaran (dirender dari katalog backend)
const paymentMethodsEl   = document.getElementById("paymentMethods");
const paymentDetailCard  = document.getElementById("paymentDetailCard");
const paymentDetailBody  = document.getElementById("paymentDetailBody");
const paymentAmountEl    = document.getElementById("paymentAmount");

// Urutan grup seperti di toko buku online (Gramedia): QRIS dulu,
// lalu Virtual Account, E-Wallet, terakhir Kartu.
const GROUP_ORDER = ["QRIS", "Virtual Account", "E-Wallet", "Kartu"];

// Katalog yang sedang dipakai (dari backend, atau cadangan lokal).
let paymentMethodsById = new Map();

// ---- Deteksi sumber: cart atau buku tunggal ----
const params     = new URLSearchParams(window.location.search);
const isCartMode = params.get("source") === "cart";

// Data untuk mode cart (multi-item dari sessionStorage)
let cartItems = [];

// Data untuk mode buku tunggal (dari URL params)
const bookData = {
  id:        params.get("id") || "",
  title:     params.get("title") || "Judul Tidak Tersedia",
  author:    params.get("author") || "Penulis Tidak Diketahui",
  thumbnail: params.get("thumbnail") ||
    "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&auto=format&fit=crop&q=80",
  price:     Number(params.get("price")) || 0,
};

const currentPaymentId = generatePaymentId();

// ---- Hitung total ----
// Buku digital: setiap judul dihitung 1 eksemplar.
function getTotal() {
  if (isCartMode) {
    return cartItems.reduce((sum, item) => sum + item.price, 0);
  }
  return bookData.price;
}

// ---- Isi form dari data user yang login ----
function prefillUserData() {
  if (!isAuthenticated() || isGuest()) {
    showAlert("Anda harus login terlebih dahulu untuk melakukan pembelian.", "danger");
    btnPay.disabled = true;
    setTimeout(() => {
      window.location.href = `login.html?redirect=${encodeURIComponent(window.location.href)}`;
    }, 2000);
    return;
  }

  const user = getUser();
  if (!user) {
    showAlert("Sesi login tidak ditemukan. Silakan login ulang.", "danger");
    btnPay.disabled = true;
    setTimeout(() => {
      window.location.href = `login.html?redirect=${encodeURIComponent(window.location.href)}`;
    }, 2000);
    return;
  }

  buyerNameEl.value     = user.fullName || "";
  buyerEmailEl.value    = user.email || "";
}

// ---- Render Ringkasan Pesanan ----
function renderOrderSummary() {
  orderIdEl.textContent    = currentPaymentId;
  const total = getTotal();
  orderTotalEl.textContent = formatRupiah(total);
  if (paymentAmountEl) paymentAmountEl.value = formatRupiah(total);

  if (isCartMode) {
    orderBookInfoEl.style.cssText = "display:block; overflow:hidden;";
    orderBookInfoEl.innerHTML = `
      <div class="cart-order-list">
        ${cartItems.map(item => {
          const author = Array.isArray(item.authors)
            ? item.authors[0]
            : (item.author || item.authors || "Anonim");
          return `
            <div class="cart-order-item">
              <img
                src="${item.thumbnail}"
                alt="${item.title}"
                class="cart-order-img"
                loading="lazy"
                onerror="this.src='https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&auto=format&fit=crop&q=80'"
              />
              <div class="cart-order-meta">
                <div class="cart-order-title">${item.title}</div>
                <div class="cart-order-author">${author}</div>
                <div class="cart-order-price">${formatRupiah(item.price)}</div>
              </div>
            </div>
          `;
        }).join("")}
      </div>
      <div style="margin-top:0.6rem; font-size:0.78rem; color:var(--primary); font-weight:600;">
        📱 ${cartItems.length} buku digital — akses langsung setelah pembayaran
      </div>
    `;
  } else {
    orderBookInfoEl.innerHTML = `
      <img
        src="${bookData.thumbnail}"
        alt="${bookData.title}"
        onerror="this.src='https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&auto=format&fit=crop&q=80'"
      />
      <div class="order-book-meta">
        <div class="book-order-title">${bookData.title}</div>
        <div class="book-order-author">${bookData.author}</div>
        <div style="margin-top:0.5rem;font-size:0.85rem;color:var(--text-muted);">
          Harga: ${formatRupiah(bookData.price)}
        </div>
        <div style="margin-top:0.3rem;font-size:0.78rem;color:var(--primary);font-weight:600;">
          📱 Buku Digital — Akses langsung setelah pembayaran
        </div>
      </div>
    `;
  }
}

// ---- Alert ----
function showAlert(message, type = "danger") {
  checkoutAlert.textContent = message;
  checkoutAlert.className   = `checkout-alert alert-${type}`;
}

function hideAlert() {
  checkoutAlert.classList.add("hidden");
}

// ---- Simbol bank / wallet ----
// Logo digambar sebagai lencana warna khas tiap merek (bukan file gambar),
// supaya tetap tampil saat aplikasi dijalankan offline tanpa internet.
function brandBadgeHTML(method) {
  if (method.brand === "card") {
    return `<span class="brand-row">
      <span class="brand-badge brand-visa">VISA</span>
      <span class="brand-badge brand-mc"><span class="mc-circle mc-red"></span><span class="mc-circle mc-yellow"></span></span>
    </span>`;
  }
  return `<span class="brand-badge brand-${escapeHtml(method.brand)}">${escapeHtml(method.short || method.label)}</span>`;
}

// ---- Render pilihan metode pembayaran (dikelompokkan) ----
function renderPaymentMethods(methods) {
  paymentMethodsById = new Map(methods.map((method) => [method.id, method]));

  const groups = new Map();
  for (const method of methods) {
    if (!groups.has(method.group)) groups.set(method.group, []);
    groups.get(method.group).push(method);
  }

  const orderedGroups = [...groups.entries()].sort(([a], [b]) => {
    const ia = GROUP_ORDER.indexOf(a);
    const ib = GROUP_ORDER.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

  paymentMethodsEl.innerHTML = orderedGroups.map(([group, items]) => `
    <div class="payment-group-title">${escapeHtml(group)}</div>
    ${items.map((method) => `
      <label class="payment-option">
        <input type="radio" name="paymentMethod" value="${escapeHtml(method.id)}" />
        <div class="payment-option-content">
          ${brandBadgeHTML(method)}
          <div>
            <div class="payment-name">${escapeHtml(method.label)}</div>
            <div class="payment-desc">${escapeHtml(method.description || "")}</div>
          </div>
        </div>
      </label>
    `).join("")}
  `).join("");
}

// ---- Kode QR palsu untuk simulasi ----
// Pola tetap yang diturunkan dari ID pesanan — BUKAN kode QR asli dan
// tidak bisa dipakai bayar. Hanya hiasan supaya tampilan mirip toko asli.
function pseudoQrSvg(seed) {
  const size = 25;
  let hash = 0;
  for (const ch of String(seed)) hash = ((hash * 31) + ch.charCodeAt(0)) >>> 0;
  const rand = () => {
    hash = (hash * 1103515245 + 12345) >>> 0;
    return hash / 4294967296;
  };
  const inFinderZone = (x, y) => (x < 8 && y < 8) || (x >= size - 8 && y < 8) || (x < 8 && y >= size - 8);

  let cells = `<rect x="0" y="0" width="${size}" height="${size}" fill="#ffffff" />`;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (inFinderZone(x, y)) continue;
      if (rand() < 0.45) cells += `<rect x="${x}" y="${y}" width="1" height="1" />`;
    }
  }
  // Tiga kotak penanda sudut khas QR.
  const finder = (ox, oy) =>
    `<rect x="${ox}" y="${oy}" width="7" height="7" />` +
    `<rect x="${ox + 1}" y="${oy + 1}" width="5" height="5" fill="#ffffff" />` +
    `<rect x="${ox + 2}" y="${oy + 2}" width="3" height="3" />`;
  cells += finder(0, 0) + finder(size - 7, 0) + finder(0, size - 7);

  return `<svg viewBox="0 0 ${size} ${size}" role="img" aria-label="Kode QR simulasi">${cells}</svg>`;
}

// ---- Tampilkan instruksi pembayaran sesuai metode ----
function updatePaymentDetailForm(methodId) {
  const method = paymentMethodsById.get(methodId);

  if (!method) {
    paymentDetailCard.style.display = "none";
    return;
  }

  paymentDetailCard.style.display = "";
  paymentAmountEl.value = formatRupiah(getTotal());

  const destination = method.destination || {};
  const expiryHint = method.expiryMinutes
    ? `<p class="payment-detail-hint">Bayar dalam ${method.expiryMinutes} menit setelah checkout, atau pesanan batal otomatis.</p>`
    : "";

  if (method.kind === "va") {
    paymentDetailBody.innerHTML = `
      <div class="payment-detail-info">
        <span class="payment-detail-badge">Virtual Account</span>
        <p class="payment-detail-hint">Transfer sesuai total pesanan ke nomor Virtual Account berikut.</p>
      </div>
      <div class="form-group">
        <label>Bank Tujuan</label>
        <input type="text" value="${escapeHtml(destination.name || method.label)}" readonly />
      </div>
      <div class="form-group">
        <label>Nomor Virtual Account</label>
        <input type="text" value="${escapeHtml(destination.number || "-")}" readonly />
      </div>
      <div class="form-group">
        <label>Atas Nama</label>
        <input type="text" value="${escapeHtml(destination.owner || "-")}" readonly />
      </div>
      ${expiryHint}
    `;
  } else if (method.kind === "ewallet") {
    paymentDetailBody.innerHTML = `
      <div class="payment-detail-info">
        <span class="payment-detail-badge ewallet">📱 E-Wallet</span>
        <p class="payment-detail-hint">Kirim pembayaran ke nomor e-wallet toko berikut.</p>
      </div>
      <div class="form-group">
        <label>E-Wallet Tujuan</label>
        <input type="text" value="${escapeHtml(destination.name || method.label)}" readonly />
      </div>
      <div class="form-group">
        <label>Nomor Tujuan</label>
        <input type="text" value="${escapeHtml(destination.number || "-")}" readonly />
      </div>
      ${expiryHint}
    `;
  } else if (method.kind === "qris") {
    paymentDetailBody.innerHTML = `
      <div class="payment-detail-info">
        <span class="payment-detail-badge qris">QRIS</span>
        <p class="payment-detail-hint">Scan dengan GoPay, OVO, DANA, atau m-banking apa pun.</p>
      </div>
      <div class="qris-box">
        ${pseudoQrSvg(currentPaymentId)}
        <div class="qris-caption">Kode QR simulasi — bukan kode bayar asli</div>
      </div>
      ${expiryHint}
    `;
  } else if (method.kind === "card") {
    paymentDetailBody.innerHTML = `
      <div class="payment-detail-info">
        <span class="payment-detail-badge">Kartu Kredit / Debit</span>
        <p class="payment-detail-hint">Visa / Mastercard. Pembayaran kartu disimulasikan.</p>
      </div>
      <div class="form-group">
        <span class="brand-row">
          <span class="brand-badge brand-visa">VISA</span>
          <span class="brand-badge brand-mc"><span class="mc-circle mc-red"></span><span class="mc-circle mc-yellow"></span></span>
        </span>
      </div>
      <p class="payment-detail-hint">Jangan masukkan nomor kartu asli — aplikasi ini tidak memproses pembayaran sungguhan.</p>
    `;
  } else {
    paymentDetailBody.innerHTML = "";
  }
}

// Listener perubahan metode pembayaran (delegasi: opsi dirender dinamis)
paymentMethodsEl.addEventListener("change", (e) => {
  if (e.target && e.target.name === "paymentMethod") {
    updatePaymentDetailForm(e.target.value);
  }
});

// Muat katalog dari backend lalu render pilihannya.
async function initPaymentMethods() {
  const methods = await getPaymentMethods();
  renderPaymentMethods(methods);
}

// ---- Validasi form ----
function validateForm() {
  const user   = getUser();
  const name   = buyerNameEl.value.trim()  || user?.fullName || "";
  const email  = buyerEmailEl.value.trim() || user?.email    || "";
  const methodEl = document.querySelector('input[name="paymentMethod"]:checked');

  if (!name) {
    showAlert("Nama lengkap tidak ditemukan. Silakan login ulang.");
    return null;
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showAlert("Email tidak valid. Silakan login ulang.");
    return null;
  }
  if (!methodEl) {
    showAlert("Pilih metode pembayaran terlebih dahulu.");
    return null;
  }

  return { name, email, method: methodEl.value };
}

// ---- Handle Bayar ----
btnPay.addEventListener("click", async () => {
  hideAlert();

  const formData = validateForm();
  if (!formData) return;

  btnPay.disabled    = true;
  btnPay.innerHTML = `<span class="spinner" style="width:18px;height:18px;border-width:2.5px;vertical-align:middle;margin-right:6px;"></span> Memproses...`;

  try {
    const items = isCartMode
      ? cartItems.map(item => ({
          id:        item.id,
          title:     item.title,
          author:    Array.isArray(item.authors) ? item.authors[0] : (item.author || "Anonim"),
          authors:   Array.isArray(item.authors) ? item.authors : [item.author || "Anonim"],
          thumbnail: item.thumbnail,
          price:     item.price,
        }))
      : [{
          id:        bookData.id,
          title:     bookData.title,
          author:    bookData.author,
          authors:   [bookData.author],
          thumbnail: bookData.thumbnail,
          price:     bookData.price,
        }];

    if (!isCartMode && !bookData.id) {
      throw new Error("ID buku tidak valid. Silakan kembali ke halaman detail buku.");
    }

    // Harga dan total final dihitung ulang oleh server.
    const saved = await savePayment({
      items,
      paymentMethod: formData.method,
      buyer: { name: formData.name, email: formData.email },
      fromCart: isCartMode,
    });

    if (isCartMode) {
      sessionStorage.removeItem("cart_checkout");
    }

    const finalId    = saved.id || currentPaymentId;
    const finalTotal = typeof saved.total === "number" ? saved.total : getTotal();

    orderIdEl.textContent    = finalId;
    orderTotalEl.textContent = formatRupiah(finalTotal);

    modalOrderId.textContent = finalId;
    if (isCartMode) {
      modalBookTitle.textContent = cartItems.map(i => i.title).join(", ");
      const modalQtyRow = document.getElementById("modalQtyRow");
      if (modalQtyRow) modalQtyRow.style.display = "";
      const modalQtyEl = document.getElementById("modalQty");
      if (modalQtyEl) modalQtyEl.textContent = `${cartItems.length} judul`;
    } else {
      modalBookTitle.textContent = bookData.title;
      const modalQtyRow = document.getElementById("modalQtyRow");
      if (modalQtyRow) modalQtyRow.style.display = "none";
    }
    modalPaymentMethod.textContent = getPaymentMethodLabel(formData.method);
    modalTotal.textContent = formatRupiah(finalTotal);

    successModal.classList.remove("hidden");
  } catch (error) {
    showAlert(error.message || "Terjadi kesalahan saat memproses pembayaran. Silakan coba lagi.");
    btnPay.disabled    = false;
    btnPay.innerHTML = "🔒 Bayar Sekarang";
  }
});

// ---- Navbar ----
function updateNavbar() {
  const authNavContainer = document.getElementById("authNavContainer");
  const navEl = document.querySelector(".navbar-nav");

  if (navEl) {
    navEl.innerHTML = `
      <a href="index.html" class="nav-link">Katalog</a>
      <a href="cart.html" class="nav-link">Keranjang</a>
      <a href="library.html" class="nav-link">Perpustakaan</a>
      <a href="wishlist.html" class="nav-link">Wishlist</a>
      <a href="history.html" class="nav-link">Riwayat Pembelian</a>
    `;
  }

  if (!authNavContainer) return;
  if (isAuthenticated()) {
    const user = getUser();
    const displayName = user?.fullName || user?.username || "Akun Saya";
    authNavContainer.innerHTML = `
      <span style="font-size: 0.9rem; font-weight: 600; color: var(--text-muted);">Halo, ${displayName}</span>
      <button class="btn btn-outline" id="btnLogout" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;">Keluar</button>
    `;
    document.getElementById("btnLogout")?.addEventListener("click", () => {
      clearAuth();
      window.location.href = "index.html";
    });
  }
}

// ---- Init ----
if (isCartMode) {
  try {
    const raw = sessionStorage.getItem("cart_checkout");
    cartItems = raw ? JSON.parse(raw) : [];
  } catch { cartItems = []; }

  if (!cartItems.length) {
    window.location.href = "cart.html";
  }
}

// Mode buku tunggal tanpa ID (mis. halaman dibuka langsung) tidak bisa checkout.
if (!isCartMode && !bookData.id) {
  window.location.href = "index.html";
}

updateNavbar();
renderOrderSummary();
prefillUserData();
initPaymentMethods();

initMobileNav();
