import { initMobileNav } from '../utils/mobileNav.js';
import {
  generatePaymentId,
  formatRupiah,
  savePayment,
  PAYMENT_METHOD_LABELS,
} from "../api/paymentApi.js";
import { clearCart } from "../api/cartApi.js";
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

// Detail pembayaran — bank
const paymentDetailCard  = document.getElementById("paymentDetailCard");
const bankFields         = document.getElementById("bankFields");
const ewalletFields      = document.getElementById("ewalletFields");
const bankAccountNumber  = document.getElementById("bankAccountNumber");
const bankCardExpiry     = document.getElementById("bankCardExpiry");
const bankCardCvc        = document.getElementById("bankCardCvc");
const bankAccountName    = document.getElementById("bankAccountName");
// Detail pembayaran — ewallet
const ewalletPhone       = document.getElementById("ewalletPhone");

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
  orderTotalEl.textContent = formatRupiah(getTotal());

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
        📱 Buku Digital — Akses langsung setelah pembayaran
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

// ---- Toggle form detail pembayaran ----
function isBankMethod(method) {
  return method === "bca" || method === "mandiri";
}

function isEwalletMethod(method) {
  return method === "gopay" || method === "ovo" || method === "dana";
}

function updatePaymentDetailForm(method) {
  if (!method) {
    paymentDetailCard.style.display = "none";
    return;
  }

  paymentDetailCard.style.display = "";

  if (isBankMethod(method)) {
    bankFields.style.display    = "";
    ewalletFields.style.display = "none";
  } else if (isEwalletMethod(method)) {
    bankFields.style.display    = "none";
    ewalletFields.style.display = "";
  }
}

// Format otomatis expiry date MM/YY
if (bankCardExpiry) {
  bankCardExpiry.addEventListener("input", (e) => {
    let val = e.target.value.replace(/\D/g, "");
    if (val.length > 2) {
      val = val.slice(0, 2) + "/" + val.slice(2, 4);
    }
    e.target.value = val;
  });
}

// Hanya angka untuk rekening dan CVC
if (bankAccountNumber) {
  bankAccountNumber.addEventListener("input", (e) => {
    e.target.value = e.target.value.replace(/\D/g, "");
  });
}

if (bankCardCvc) {
  bankCardCvc.addEventListener("input", (e) => {
    e.target.value = e.target.value.replace(/\D/g, "");
  });
}

if (ewalletPhone) {
  ewalletPhone.addEventListener("input", (e) => {
    e.target.value = e.target.value.replace(/\D/g, "");
  });
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

  const method = methodEl.value;

  // Validasi field detail sesuai metode
  if (isBankMethod(method)) {
    const accountNum = bankAccountNumber?.value.trim() || "";
    const expiry     = bankCardExpiry?.value.trim()    || "";
    const cvc        = bankCardCvc?.value.trim()       || "";
    const accName    = bankAccountName?.value.trim()   || "";

    if (!accountNum || accountNum.length < 6) {
      showAlert("Nomor rekening tidak valid. Minimal 6 digit.");
      bankAccountNumber?.focus();
      return null;
    }
    if (!/^\d{2}\/\d{2}$/.test(expiry)) {
      showAlert("Tanggal kadaluarsa tidak valid. Gunakan format MM/YY.");
      bankCardExpiry?.focus();
      return null;
    }
    if (!cvc || cvc.length < 3) {
      showAlert("CVV tidak valid. Harus 3 digit.");
      bankCardCvc?.focus();
      return null;
    }
    if (!accName) {
      showAlert("Nama pemilik rekening wajib diisi.");
      bankAccountName?.focus();
      return null;
    }

    return {
      name,
      email,
      method,
      paymentDetail: {
        type:          "bank",
        accountNumber: accountNum,
        expiry,
        cvv:           cvc,
        accountName:   accName,
      },
    };
  }

  if (isEwalletMethod(method)) {
    const phone = ewalletPhone?.value.trim() || "";
    if (!phone || phone.length < 8) {
      showAlert("Nomor telepon e-wallet tidak valid. Minimal 8 digit.");
      ewalletPhone?.focus();
      return null;
    }

    return {
      name,
      email,
      method,
      paymentDetail: {
        type:  "ewallet",
        phone: `+62${phone}`,
      },
    };
  }

  // Fallback jika ada metode baru
  return { name, email, method, paymentDetail: null };
}

// ---- Sensor data sensitif untuk disimpan ----
function maskAccountNumber(num) {
  if (!num || num.length < 4) return num;
  return "*".repeat(num.length - 4) + num.slice(-4);
}

function maskPhone(phone) {
  if (!phone || phone.length < 6) return phone;
  return phone.slice(0, 4) + "****" + phone.slice(-3);
}

// ---- Handle Bayar ----
btnPay.addEventListener("click", () => {
  hideAlert();

  const formData = validateForm();
  if (!formData) return;

  btnPay.disabled    = true;
  btnPay.innerHTML = `<span class="spinner" style="width:18px;height:18px;border-width:2.5px;vertical-align:middle;margin-right:6px;"></span> Memproses...`;

  setTimeout(() => {
    const total = getTotal();

    // Simpan hanya data tersamar untuk keamanan
    let paymentDetailSaved = null;
    if (formData.paymentDetail) {
      if (formData.paymentDetail.type === "bank") {
        paymentDetailSaved = {
          type:          "bank",
          accountNumber: maskAccountNumber(formData.paymentDetail.accountNumber),
          expiry:        formData.paymentDetail.expiry,
          cvv:           "***",
          accountName:   formData.paymentDetail.accountName,
        };
      } else if (formData.paymentDetail.type === "ewallet") {
        paymentDetailSaved = {
          type:  "ewallet",
          phone: maskPhone(formData.paymentDetail.phone),
        };
      }
    }

    let transaction;

    if (isCartMode) {
      transaction = {
        paymentId: currentPaymentId,
        paymentMethod: formData.method,
        paymentMethodLabel: PAYMENT_METHOD_LABELS[formData.method] || formData.method,
        items: cartItems.map(item => ({
          id:        item.id,
          title:     item.title,
          author:    Array.isArray(item.authors) ? item.authors[0] : (item.author || "Anonim"),
          thumbnail: item.thumbnail,
          price:     item.price,
        })),
        buyer: { name: formData.name, email: formData.email },
        paymentDetail: paymentDetailSaved,
        total,
        paidAt: new Date().toISOString(),
        type: "cart",
      };
    } else {
      transaction = {
        paymentId: currentPaymentId,
        paymentMethod: formData.method,
        paymentMethodLabel: PAYMENT_METHOD_LABELS[formData.method] || formData.method,
        book: {
          id:        bookData.id,
          title:     bookData.title,
          author:    bookData.author,
          thumbnail: bookData.thumbnail,
          price:     bookData.price,
        },
        buyer: { name: formData.name, email: formData.email },
        paymentDetail: paymentDetailSaved,
        total,
        date: new Date().toISOString(),
      };
    }

    const saved = savePayment(transaction);

    if (saved) {
      if (isCartMode) {
        clearCart();
        sessionStorage.removeItem("cart_checkout");
      }

      modalOrderId.textContent = currentPaymentId;
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
      modalTotal.textContent = formatRupiah(total);

      successModal.classList.remove("hidden");
    } else {
      showAlert("Terjadi kesalahan saat memproses pembayaran. Silakan coba lagi.");
      btnPay.disabled    = false;
      btnPay.innerHTML = "🔒 Bayar Sekarang";
    }
  }, 1500);
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

updateNavbar();
renderOrderSummary();
prefillUserData();

initMobileNav();
