/**
 * Logika Panel Admin Inventaris Real-Time
 */
import { fetchBooks } from '../api/bookApi.js';
import { getAllStock, getStockById, updateStock } from '../api/inventoryApi.js';
import { connectSocket } from '../utils/realTimeSocket.js';

let inventoryBooks = [];
let toastTimeout = null;

const inventoryTableBody = document.getElementById('inventoryTableBody');
const searchInput = document.getElementById('inventorySearch');
const filterStatus = document.getElementById('inventoryFilterStatus');
const btnRefresh = document.getElementById('btnRefreshInventory');

const statTotalBooks = document.getElementById('statTotalBooks');
const statInStock = document.getElementById('statInStock');
const statLowStock = document.getElementById('statLowStock');
const statOutOfStock = document.getElementById('statOutOfStock');

const toastEl = document.getElementById('inventoryToast');
const toastMessageEl = document.getElementById('toastMessage');

function formatRupiah(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(amount || 0);
}

function showToast(message, icon = '🔔') {
  if (!toastEl) return;
  toastMessageEl.textContent = message;
  const iconEl = document.getElementById('toastIcon');
  if (iconEl) iconEl.textContent = icon;

  toastEl.classList.add('show');
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toastEl.classList.remove('show');
  }, 3500);
}

function updateStatsCards(books) {
  if (!books) return;
  const total = books.length;
  let inStock = 0;
  let lowStock = 0;
  let outOfStock = 0;

  books.forEach(b => {
    const stock = typeof b.currentStock === 'number' ? b.currentStock : 0;
    if (stock === 0) {
      outOfStock++;
    } else if (stock < 5) {
      lowStock++;
    } else {
      inStock++;
    }
  });

  if (statTotalBooks) statTotalBooks.textContent = total;
  if (statInStock) statInStock.textContent = inStock;
  if (statLowStock) statLowStock.textContent = lowStock;
  if (statOutOfStock) statOutOfStock.textContent = outOfStock;
}

function getFilteredBooks() {
  const query = (searchInput?.value || '').toLowerCase().trim();
  const status = filterStatus?.value || 'ALL';

  return inventoryBooks.filter(book => {
    const matchQuery = !query || 
      book.title.toLowerCase().includes(query) ||
      (book.authors && book.authors.some(a => a.toLowerCase().includes(query))) ||
      book.id.toLowerCase().includes(query);

    const stock = book.currentStock;
    let matchStatus = true;
    if (status === 'IN_STOCK') {
      matchStatus = stock >= 5;
    } else if (status === 'LOW_STOCK') {
      matchStatus = stock > 0 && stock < 5;
    } else if (status === 'OUT_OF_STOCK') {
      matchStatus = stock === 0;
    }

    return matchQuery && matchStatus;
  });
}

function renderTable(highlightBookId = null) {
  const filtered = getFilteredBooks();
  updateStatsCards(inventoryBooks);

  if (filtered.length === 0) {
    inventoryTableBody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 2.5rem; color: #6b7280;">
          Tidak ada buku yang sesuai dengan kriteria pencarian/filter.
        </td>
      </tr>
    `;
    return;
  }

  inventoryTableBody.innerHTML = filtered.map(book => {
    const isHighlighted = highlightBookId === book.id;
    let badgeHtml = '<span class="stock-badge in-stock">Tersedia</span>';
    if (book.currentStock === 0) {
      badgeHtml = '<span class="stock-badge out-of-stock">Habis</span>';
    } else if (book.currentStock < 5) {
      badgeHtml = '<span class="stock-badge low-stock">Menipis</span>';
    }

    const authors = Array.isArray(book.authors) ? book.authors.join(', ') : (book.authors || 'Anonim');

    return `
      <tr class="${isHighlighted ? 'stock-updated-highlight' : ''}" data-id="${book.id}">
        <td>
          <code style="font-size: 0.8rem; background: #f3f4f6; padding: 0.2rem 0.4rem; border-radius: 4px; color: #4b5563;">${book.id}</code>
        </td>
        <td>
          <img src="${book.thumbnail}" alt="${book.title}" class="table-book-cover" onerror="this.src='https://via.placeholder.com/42x58?text=Cover';" />
        </td>
        <td>
          <div class="table-book-title" title="${book.title}">${book.title}</div>
          <div class="table-book-author">oleh ${authors}</div>
        </td>
        <td>
          <span style="font-size: 0.8rem; color: #4b5563;">${book.category || 'Umum'}</span>
        </td>
        <td style="font-weight: 600; color: #111827;">
          ${formatRupiah(book.price)}
        </td>
        <td style="text-align: center;">
          <div class="stock-control">
            <button class="stock-btn btn-stock-dec" data-id="${book.id}">-</button>
            <input type="number" min="0" max="999" class="stock-input" data-id="${book.id}" value="${book.currentStock}" />
            <button class="stock-btn btn-stock-inc" data-id="${book.id}">+</button>
          </div>
        </td>
        <td>
          ${badgeHtml}
        </td>
        <td style="text-align: right;">
          <a href="book-detail.html?id=${book.id}" target="_blank" class="btn btn-outline" style="padding: 0.35rem 0.65rem; font-size: 0.8rem;">
            Lihat Toko ↗
          </a>
        </td>
      </tr>
    `;
  }).join('');

  attachTableEventListeners();
}

function handleStockChange(bookId, newQty, shouldShowToast = true) {
  const updatedQty = updateStock(bookId, newQty);

  // Update data lokal
  const book = inventoryBooks.find(b => b.id === bookId);
  if (book) {
    book.currentStock = updatedQty;
  }

  renderTable(bookId);

  if (shouldShowToast) {
    showToast(`Stok "${book ? book.title.substring(0, 20) + '...' : bookId}" berhasil diubah menjadi ${updatedQty}`, '✅');
  }
}

function attachTableEventListeners() {
  // Tombol Kurang (-)
  document.querySelectorAll('.btn-stock-dec').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const book = inventoryBooks.find(b => b.id === id);
      if (book) {
        const nextVal = Math.max(0, (book.currentStock || 0) - 1);
        handleStockChange(id, nextVal);
      }
    });
  });

  // Tombol Tambah (+)
  document.querySelectorAll('.btn-stock-inc').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const book = inventoryBooks.find(b => b.id === id);
      if (book) {
        const nextVal = (book.currentStock || 0) + 1;
        handleStockChange(id, nextVal);
      }
    });
  });

  // Input Langsung (change / blur)
  document.querySelectorAll('.stock-input').forEach(input => {
    input.addEventListener('change', () => {
      const id = input.getAttribute('data-id');
      const val = parseInt(input.value, 10);
      handleStockChange(id, isNaN(val) ? 0 : val);
    });
  });
}

async function loadInventoryData() {
  inventoryTableBody.innerHTML = `
    <tr>
      <td colspan="8" style="text-align: center; padding: 3rem; color: #6b7280;">
        🔄 Mengambil data katalog buku dan stok inventaris...
      </td>
    </tr>
  `;

  try {
    const books = await fetchBooks({ query: 'programming', maxResults: 30 });
    const stockMap = getAllStock();

    inventoryBooks = books.map(book => ({
      ...book,
      currentStock: getStockById(book.id, book.stock)
    }));

    renderTable();
  } catch (error) {
    console.error('Gagal memuat inventaris:', error);
    inventoryTableBody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 3rem; color: #ef4444;">
          ⚠️ Terjadi kesalahan saat memuat data inventaris: ${error.message}
        </td>
      </tr>
    `;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadInventoryData();

  searchInput?.addEventListener('input', () => renderTable());
  filterStatus?.addEventListener('change', () => renderTable());
  btnRefresh?.addEventListener('click', () => loadInventoryData());

  // Real-time synchronization via BroadcastChannel / Custom Socket
  connectSocket((payload) => {
    if (payload?.type === 'STOCK_UPDATED') {
      const { bookId, newQuantity } = payload;
      const targetBook = inventoryBooks.find(b => b.id === bookId);
      if (targetBook && targetBook.currentStock !== newQuantity) {
        targetBook.currentStock = newQuantity;
        renderTable(bookId);
        showToast(`Stok "${targetBook.title.substring(0, 20)}..." diperbarui dari tab lain: ${newQuantity} unit`, '🔄');
      }
    } else if (payload?.type === 'STOCK_STORAGE_SYNC') {
      const map = payload.data || {};
      let changed = false;
      inventoryBooks.forEach(b => {
        if (map[b.id] !== undefined && b.currentStock !== map[b.id]) {
          b.currentStock = map[b.id];
          changed = true;
        }
      });
      if (changed) renderTable();
    }
  });
});
