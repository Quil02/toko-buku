import {
  generatePaymentId,
  formatRupiah,
  savePayment,
  PAYMENT_METHOD_LABELS,
} from "../api/paymentApi.js";
import { getUser, isAuthenticated, clearAuth } from "../utils/authStorage.js";

// ---- Elemen DOM ----
const orderBookInfoEl = document.getElementById("orderBookInfo");
const orderIdEl = document.getElementById("orderId");
const orderTotalEl = document.getElementById("orderTotal");
const btnPay = document.getElementById("btnPay");
const checkoutAlert = document.getElementById("checkoutAlert");
const successModal = document.getElementById("successModal");
const modalOrderId = document.getElementById("modalOrderId");
const modalBookTitle = document.getElementById("modalBookTitle");
const modalPaymentMethod = document.getElementById("modalPaymentMethod");
const modalTotal = document.getElementById("modalTotal");
const buyerNameEl = document.getElementById("buyerName");
const buyerEmailEl = document.getElementById("buyerEmail");

// ---- Ambil data buku dari URL params ----
const params = new URLSearchParams(window.location.search);
const bookData = {
  id: params.get("id") || "",
  title: params.get("title") || "Judul Tidak Tersedia",
  author: params.get("author") || "Penulis Tidak Diketahui",
  thumbnail:
    params.get("thumbnail") ||
    "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&auto=format&fit=crop&q=80",
  price: Number(params.get("price")) || 0,
};

// ---- Generate Payment ID unik setiap load ----
const currentPaymentId = generatePaymentId();

// ---- Isi form dari data user yang login ----
function prefillUserData() {
  if (!isAuthenticated()) {
    showAlert(
      "Anda harus login terlebih dahulu untuk melakukan pembelian.",
      "danger"
    );
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

  buyerNameEl.value = user.fullName || "";
  buyerEmailEl.value = user.email || "";

  // Kunci field agar tidak bisa diubah manual
  buyerNameEl.readOnly = true;
  buyerEmailEl.readOnly = true;
}

// ---- Render Ringkasan Pesanan ----
function renderOrderSummary() {
  orderIdEl.textContent = currentPaymentId;
  orderTotalEl.textContent = formatRupiah(bookData.price);

  orderBookInfoEl.innerHTML = `
    <img
      src="${bookData.thumbnail}"
      alt="${bookData.title}"
      onerror="this.src='https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&auto=format&fit=crop&q=80'"
    />
    <div class="order-book-meta">
      <div class="book-order-title">${bookData.title}</div>
      <div class="book-order-author">${bookData.author}</div>
      <div style="margin-top:0.5rem;font-size:0.85rem;color:#888;">
        Harga: ${formatRupiah(bookData.price)}
      </div>
      <div style="margin-top:0.3rem;font-size:0.78rem;color:#6c63ff;font-weight:600;">
        📱 Buku Digital — Akses langsung setelah pembayaran
      </div>
    </div>
  `;
}

// ---- Tampilkan alert ----
function showAlert(message, type = "danger") {
  checkoutAlert.textContent = message;
  checkoutAlert.className = `checkout-alert alert-${type}`;
  checkoutAlert.classList.remove("hidden");
}

function hideAlert() {
  checkoutAlert.classList.add("hidden");
}

// ---- Validasi form ----
function validateForm() {
  // Ambil dari field, fallback ke data user di localStorage
  const user = getUser();
  const name = buyerNameEl.value.trim() || user?.fullName || "";
  const email = buyerEmailEl.value.trim() || user?.email || "";
  const method = document.querySelector('input[name="paymentMethod"]:checked');

  if (!name) {
    showAlert("Nama lengkap tidak ditemukan. Silakan login ulang.");
    return null;
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showAlert("Email tidak valid. Silakan login ulang.");
    return null;
  }

  if (!method) {
    showAlert("Pilih metode pembayaran terlebih dahulu.");
    return null;
  }

  return { name, email, method: method.value };
}

// ---- Handle Bayar ----
btnPay.addEventListener("click", () => {
  hideAlert();

  const formData = validateForm();
  if (!formData) return;

  btnPay.disabled = true;
  btnPay.textContent = "⏳ Memproses...";

  // Simulasi proses pembayaran
  setTimeout(() => {
    const transaction = {
      paymentId: currentPaymentId,
      paymentMethod: formData.method,
      paymentMethodLabel:
        PAYMENT_METHOD_LABELS[formData.method] || formData.method,
      book: {
        id: bookData.id,
        title: bookData.title,
        author: bookData.author,
        thumbnail: bookData.thumbnail,
        price: bookData.price,
      },
      buyer: {
        name: formData.name,
        email: formData.email,
      },
      total: bookData.price,
      date: new Date().toISOString(),
    };

    const saved = savePayment(transaction);

    if (saved) {
      modalOrderId.textContent = currentPaymentId;
      modalBookTitle.textContent = bookData.title;
      modalPaymentMethod.textContent =
        PAYMENT_METHOD_LABELS[formData.method] || formData.method;
      modalTotal.textContent = formatRupiah(bookData.price);

      successModal.classList.remove("hidden");
    } else {
      showAlert(
        "Terjadi kesalahan saat memproses pembayaran. Silakan coba lagi."
      );
      btnPay.disabled = false;
      btnPay.textContent = "🔒 Bayar Sekarang";
    }
  }, 1500);
});

// ---- Init ----
renderOrderSummary();
prefillUserData();

// ---- Update Navbar sesuai status login ----
function updateNavbar() {
  const authNavContainer = document.getElementById("authNavContainer");
  if (!authNavContainer) return;

  if (isAuthenticated()) {
    const user = getUser();
    const displayName = user?.fullName || user?.username || "Akun Saya";
    authNavContainer.innerHTML = `
      <span style="font-size: 0.9rem; font-weight: 600; color: #4b5563;">Halo, ${displayName}</span>
      <button class="btn btn-outline" id="btnLogout" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;">Keluar</button>
    `;
    document.getElementById("btnLogout")?.addEventListener("click", () => {
      clearAuth();
      window.location.href = "index.html";
    });
  }
}

updateNavbar();
