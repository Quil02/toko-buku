import {
  getPaymentHistory,
  clearPaymentHistory,
  formatRupiah,
  formatDate,
} from "../api/paymentApi.js";
import { getUser, isAuthenticated, isGuest, clearAuth } from "../utils/authStorage.js";

// Guard: hanya user yang sudah login yang bisa mengakses riwayat
if (!isAuthenticated() || isGuest()) {
  const redirectTarget = encodeURIComponent(window.location.href);
  window.location.href = `login.html?redirect=${redirectTarget}`;
}

const historyListEl = document.getElementById("historyList");
const btnClearHistory = document.getElementById("btnClearHistory");
const authNavContainer = document.getElementById("authNavContainer");

/**
 * Inisialisasi navbar berdasarkan status autentikasi
 */
function initNavbarAuth() {
  if (!authNavContainer) return;

  if (isAuthenticated()) {
    const user = getUser();
    const displayName = user?.fullName || user?.username || user?.email || "Akun Saya";
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

/**
 * Render semua riwayat pembelian
 */
function renderHistory() {
  const history = getPaymentHistory();

  if (!history || history.length === 0) {
    historyListEl.innerHTML = `
      <div class="history-empty">
        <div class="history-empty-icon">📭</div>
        <h3>Belum ada riwayat pembelian</h3>
        <p>Yuk, mulai belanja buku favoritmu!</p>
        <a href="index.html" class="btn btn-primary" style="margin-top:1rem;">🛍️ Mulai Belanja</a>
      </div>
    `;

    btnClearHistory.style.display = "none";

    return;
  }

  btnClearHistory.style.display = "";

  historyListEl.innerHTML = history
    .map(
      (tx) => `
    <div class="history-card">
      <img
        src="${tx.book.thumbnail}"
        alt="${tx.book.title}"
        onerror="this.src='https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&auto=format&fit=crop&q=80'"
      />
      <div class="history-card-info">
        <div class="history-book-title">${tx.book.title}</div>
        <div class="history-book-author">${tx.book.author}</div>
        <div class="history-meta">
          <span>ID: <span class="history-payment-id">${tx.paymentId}</span></span>
          <span class="history-payment-method">${tx.paymentMethodLabel}</span>
          <span>Pembeli: ${tx.buyer.name}</span>
        </div>
      </div>
      <div class="history-card-price">
        <div class="history-price-value">${formatRupiah(tx.total)}</div>
        <div class="history-date">${formatDate(tx.date)}</div>
      </div>
    </div>
  `,
    )
    .join("");
}

/**
 * Handle hapus semua riwayat
 */
btnClearHistory.addEventListener("click", () => {
  if (confirm("Yakin ingin menghapus semua riwayat pembelian?")) {
    clearPaymentHistory();
    renderHistory();
  }
});

// ---- Init ----
initNavbarAuth();
renderHistory();
