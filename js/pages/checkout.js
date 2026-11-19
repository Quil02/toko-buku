import { initMobileNav } from '../utils/mobileNav.js';
import {
  generatePaymentId,
  formatRupiah,
  savePayment,
  PAYMENT_METHOD_LABELS,
} from "../api/paymentApi.js";
import { getUser, isAuthenticated, isGuest, clearAuth } from "../utils/authStorage.js";

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

// Instruksi pembayaran
const paymentDetailCard  = document.getElementById("paymentDetailCard");
const bankFields         = document.getElementById("bankFields");
const ewalletFields      = document.getElementById("ewalletFields");
const destinationName    = document.getElementById("paymentDestinationName");
const destinationNumber  = document.getElementById("paymentDestinationNumber");
const destinationOwner   = document.getElementById("paymentDestinationOwner");
const ewalletName        = document.getElementById("ewalletDestinationName");
const ewalletNumber      = document.getElementById("ewalletDestinationNumber");
const paymentAmountEl    = document.getElementById("paymentAmount");

// Tujuan pembayaran toko (disimulasikan untuk tugas)
const PAYMENT_DESTINATIONS = {
  bca:     { type: "bank",    name: "Bank BCA",   number: "1234567890",   owner: "TokoBuku Digital" },
  mandiri: { type: "bank",    name: "Bank Mandiri", number: "1370012345678", owner: "TokoBuku Digital" },
  gopay:   { type: "ewallet", name: "GoPay",      number: "0812-3456-7890" },
  ovo:     { type: "ewallet", name: "OVO",        number: "0812-3456-7890" },
  dana:    { type: "ewallet", name: "DANA",       number: "0812-3456-7890" },
};

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
  buyerNameEl.readOnly  = true;
  buyerEmailEl.readOnly = true;
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

// ---- Tampilkan instruksi pembayaran sesuai metode ----
function updatePaymentDetailForm(method) {
  const destination = PAYMENT_DESTINATIONS[method];

  if (!destination) {
    paymentDetailCard.style.display = "none";
    return;
  }

  paymentDetailCard.style.display = "";
  paymentAmountEl.value = formatRupiah(getTotal());

  if (destination.type === "bank") {
    bankFields.style.display    = "";
    ewalletFields.style.display = "none";
    destinationName.value   = destination.name;
    destinationNumber.value = destination.number;
    destinationOwner.value  = destination.owner;
  } else {
    bankFields.style.display    = "none";
    ewalletFields.style.display = "";
    ewalletName.value   = destination.name;
    ewalletNumber.value = destination.number;
  }
}

// Listener perubahan metode pembayaran
document.querySelectorAll('input[name="paymentMethod"]').forEach((radio) => {
  radio.addEventListener("change", (e) => {
    updatePaymentDetailForm(e.target.value);
  });
});

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
    modalPaymentMethod.textContent = PAYMENT_METHOD_LABELS[formData.method] || formData.method;
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

initMobileNav();
