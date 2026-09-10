import {
  getPaymentHistory,
  clearPaymentHistory,
  formatRupiah,
  formatDate,
} from "../api/paymentApi.js";
import { getUser, isAuthenticated, isGuest, clearAuth } from "../utils/authStorage.js";

// Guard: hanya user yang sudah login
if (!isAuthenticated() || isGuest()) {
  const redirectTarget = encodeURIComponent(window.location.href);
  window.location.href = `login.html?redirect=${redirectTarget}`;
}

const historyListEl   = document.getElementById("historyList");
const btnClearHistory = document.getElementById("btnClearHistory");
const authNavContainer = document.getElementById("authNavContainer");

const FALLBACK_IMG = "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&auto=format&fit=crop&q=80";

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

// ---------------------------------------------------------------
// Render info detail pembayaran
// ---------------------------------------------------------------
function renderPaymentDetail(detail) {
  if (!detail) return "";

  if (detail.type === "bank") {
    return `
      <div class="history-payment-detail">
        <span class="history-detail-label">🏦 Rekening:</span>
        <span class="history-detail-value">${detail.accountNumber || "-"}</span>
        <span class="history-detail-sep">·</span>
        <span class="history-detail-label">Exp:</span>
        <span class="history-detail-value">${detail.expiry || "-"}</span>
        <span class="history-detail-sep">·</span>
        <span class="history-detail-label">CVV:</span>
        <span class="history-detail-value">${detail.cvv || "***"}</span>
        <span class="history-detail-sep">·</span>
        <span class="history-detail-label">a.n.</span>
        <span class="history-detail-value">${detail.accountName || "-"}</span>
      </div>
    `;
  }

  if (detail.type === "ewallet") {
    return `
      <div class="history-payment-detail">
        <span class="history-detail-label">📱 No. HP:</span>
        <span class="history-detail-value">${detail.phone || "-"}</span>
      </div>
    `;
  }

  return "";
}

// ---------------------------------------------------------------
// Render satu card untuk transaksi buku tunggal
// ---------------------------------------------------------------
function renderSingleCard(tx) {
  const thumbnail = tx.book?.thumbnail || FALLBACK_IMG;
  const title     = tx.book?.title  || "Judul Tidak Diketahui";
  const author    = tx.book?.author || "";

  return `
    <div class="history-card">
      <img
        src="${thumbnail}"
        alt="${title}"
        onerror="this.src='${FALLBACK_IMG}'"
      />
      <div class="history-card-info">
        <div class="history-book-title">${title}</div>
        <div class="history-book-author">${author}</div>
        <div class="history-meta">
          <span>ID: <span class="history-payment-id">${tx.paymentId}</span></span>
          <span class="history-payment-method">${tx.paymentMethodLabel}</span>
          <span>Pembeli: ${tx.buyer?.name || "-"}</span>
        </div>
        ${renderPaymentDetail(tx.paymentDetail)}
      </div>
      <div class="history-card-price">
        <div class="history-price-value">${formatRupiah(tx.total)}</div>
        <div class="history-date">${formatDate(tx.paidAt || tx.date)}</div>
      </div>
    </div>
  `;
}

// ---------------------------------------------------------------
// Render grup card untuk transaksi cart (per item dipisah)
// ---------------------------------------------------------------
function renderCartGroup(tx) {
  const items     = tx.items || [];
  const itemCount = items.length;
  const dateStr   = formatDate(tx.paidAt || tx.date);

  const groupHeader = `
    <div class="history-cart-group-header">
      <div class="history-cart-group-left">
        <span class="history-cart-badge">🛒 Pembelian Keranjang</span>
        <span class="history-cart-group-id">ID: ${tx.paymentId}</span>
      </div>
      <div class="history-cart-group-right">
        <span class="history-cart-group-meta">${tx.paymentMethodLabel}</span>
        <span class="history-cart-group-meta">Pembeli: ${tx.buyer?.name || "-"}</span>
        <span class="history-cart-group-total">Total: ${formatRupiah(tx.total)}</span>
        <span class="history-cart-group-date">${dateStr}</span>
      </div>
    </div>
    ${tx.paymentDetail ? `<div class="history-cart-payment-detail">${renderPaymentDetail(tx.paymentDetail)}</div>` : ""}
  `;

  const itemCards = items.map((item, index) => {
    const thumbnail = item.thumbnail || FALLBACK_IMG;
    const title     = item.title  || "Judul Tidak Diketahui";
    const author    = item.author || "";

    return `
      <div class="history-card history-cart-item-card">
        <img
          src="${thumbnail}"
          alt="${title}"
          onerror="this.src='${FALLBACK_IMG}'"
        />
        <div class="history-card-info">
          <div class="history-book-title">${title}</div>
          <div class="history-book-author">${author}</div>
          <div class="history-meta">
            <span>Item ${index + 1} dari ${itemCount}</span>
          </div>
        </div>
        <div class="history-card-price">
          <div class="history-price-value">${formatRupiah(item.price)}</div>
        </div>
      </div>
    `;
  }).join("");

  return `
    <div class="history-cart-group">
      ${groupHeader}
      <div class="history-cart-items">
        ${itemCards}
      </div>
    </div>
  `;
}

// ---------------------------------------------------------------
// Render semua riwayat
// ---------------------------------------------------------------
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

  historyListEl.innerHTML = history.map(tx => {
    const isCartTx = tx.type === "cart" || Array.isArray(tx.items);
    return isCartTx ? renderCartGroup(tx) : renderSingleCard(tx);
  }).join("");
}

btnClearHistory.addEventListener("click", () => {
  if (confirm("Yakin ingin menghapus semua riwayat pembelian?")) {
    clearPaymentHistory();
    renderHistory();
  }
});

initNavbarAuth();
renderHistory();
