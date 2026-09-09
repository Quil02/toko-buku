import {
  generatePaymentId,
  formatRupiah,
  savePayment,
  PAYMENT_METHOD_LABELS,
} from "../api/paymentApi.js";

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

      <div
style="margin-top:0.5rem;font-size:0.85rem;color:#888;">Harga:${formatRupiah(bookData.price)}</div>

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
  const name = document.getElementById("buyerName").value.trim();

  const email = document.getElementById("buyerEmail").value.trim();

  const phone = document.getElementById("buyerPhone").value.trim();

  const address = document.getElementById("buyerAddress").value.trim();

  const method = document.querySelector('input[name="paymentMethod"]:checked');

  if (!name) {
    showAlert("Nama lengkap wajib diisi.");
    return null;
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showAlert("Email tidak valid.");
    return null;
  }

  if (!phone || !/^[0-9]{9,15}$/.test(phone.replace(/[-\s]/g, ""))) {
    showAlert("Nomor telepon tidak valid.");
    return null;
  }

  if (!address) {
    showAlert("Alamat pengiriman wajib diisi.");
    return null;
  }

  if (!method) {
    showAlert("Pilih metode pembayaran terlebih dahulu.");
    return null;
  }

  return { name, email, phone, address, method: method.value };
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

        phone: formData.phone,

        address: formData.address,
      },

      total: bookData.price,

      date: new Date().toISOString(),
    };

    const saved = savePayment(transaction);

    if (saved) {
      // Tampilkan modal sukses

      modalOrderId.textContent = currentPaymentId;

      modalBookTitle.textContent = bookData.title;

      modalPaymentMethod.textContent =
        PAYMENT_METHOD_LABELS[formData.method] || formData.method;

      modalTotal.textContent = formatRupiah(bookData.price);

      successModal.classList.remove("hidden");
    } else {
      showAlert(
        "Terjadi kesalahan saat memproses pembayaran. Silakan coba lagi.",
      );

      btnPay.disabled = false;

      btnPay.textContent = "🔒 Bayar Sekarang";
    }
  }, 1500);
});

// ---- Init ----

renderOrderSummary();
