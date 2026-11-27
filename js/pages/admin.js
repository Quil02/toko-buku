import { getUser, isAuthenticated, isGuest, clearAuth } from '../utils/authStorage.js';
import { initMobileNav } from '../utils/mobileNav.js';
import { getAdminStats, getAllTransactions, getAllUsers, banUser, unbanUser } from '../api/adminApi.js';

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------
function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[char]);
}

function formatRupiah(amount) {
    return 'Rp ' + Number(amount || 0).toLocaleString('id-ID');
}

function formatDate(isoString) {
    if (!isoString) return '-';
    try {
        return new Date(isoString).toLocaleDateString('id-ID', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    } catch {
        return escapeHtml(isoString);
    }
}

function formatPaymentMethod(method) {
    const map = {
        'bank_transfer': 'Transfer Bank',
        'e_wallet': 'E-Wallet',
        'virtual_account': 'Virtual Account',
        'credit_card': 'Kartu Kredit',
    };
    return map[method] || method || '-';
}

// ----------------------------------------------------------------
// Navbar auth (pola sama seperti halaman lain)
// ----------------------------------------------------------------
const authNavContainer = document.getElementById('authNavContainer');

function initNavbarAuth() {
    if (!authNavContainer) return;

    if (isAuthenticated()) {
        const user = getUser();
        const displayName = escapeHtml(user?.fullName || user?.email || 'Admin');
        authNavContainer.innerHTML = `
            <span style="font-size: 0.85rem; font-weight: 600; color: var(--primary); background: var(--primary-subtle); padding: 0.2rem 0.6rem; border-radius: 20px;">🛡️ Admin</span>
            <span style="font-size: 0.9rem; font-weight: 600; color: var(--text-muted);">${displayName}</span>
            <button class="btn btn-outline" id="btnLogout" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;">Keluar</button>
        `;
        document.getElementById('btnLogout')?.addEventListener('click', () => {
            clearAuth();
            window.location.href = 'login.html';
        });
    }
}

// ----------------------------------------------------------------
// Guard: hanya admin yang boleh masuk
// Cek role dari server karena localStorage lama mungkin tidak punya field role
// ----------------------------------------------------------------
const accessDeniedEl = document.getElementById('accessDenied');
const adminContentEl = document.getElementById('adminContent');

async function checkAdminAccess() {
    if (!isAuthenticated() || isGuest()) {
        window.location.href = 'login.html';
        return { ok: false };
    }

    // Coba ambil role dari localStorage dulu
    const user = getUser();
    if (user && user.role === 'admin') {
        adminContentEl.style.display = 'block';
        return { ok: true, prefetchedStats: null };
    }

    // Jika role tidak ada / bukan admin di localStorage,
    // verifikasi langsung ke server via endpoint stats (hanya admin yang bisa akses)
    try {
        const stats = await getAdminStats();
        // Jika berhasil → memang admin, tampilkan konten
        adminContentEl.style.display = 'block';
        return { ok: true, prefetchedStats: stats };
    } catch (err) {
        // 401 = tidak login, 403 = bukan admin
        accessDeniedEl.style.display = 'block';
        return { ok: false };
    }
}

// ----------------------------------------------------------------
// Load & render stats
// ----------------------------------------------------------------
async function loadStats(prefetchedStats = null) {
    try {
        const stats = prefetchedStats || await getAdminStats();
        document.getElementById('totalUsers').textContent = Number(stats.totalUsers || 0).toLocaleString('id-ID');
        document.getElementById('bannedUsers').textContent = Number(stats.bannedUsers || 0).toLocaleString('id-ID');
        document.getElementById('totalTransactions').textContent = Number(stats.totalTransactions || 0).toLocaleString('id-ID');
        document.getElementById('totalRevenue').textContent = formatRupiah(stats.totalRevenue);
        document.getElementById('avgTransaction').textContent = formatRupiah(stats.avgTransaction);
        document.getElementById('transactionsLast7Days').textContent = Number(stats.last7Days?.transactions || 0).toLocaleString('id-ID');
        document.getElementById('revenueLast7Days').textContent = formatRupiah(stats.last7Days?.revenue);

        const tbody = document.getElementById('topBooksTable');
        if (!stats.topBooks || stats.topBooks.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="table-empty">Belum ada data penjualan.</td></tr>';
            return;
        }

        tbody.innerHTML = stats.topBooks.map((book, i) => `
            <tr>
                <td>
                    <span class="rank-badge">#${i + 1}</span>
                    <span class="book-title-cell">${escapeHtml(book.title || 'Judul Tidak Diketahui')}</span>
                </td>
                <td style="text-align: center;">
                    <strong>${Number(book.count) || 0}</strong> buku
                </td>
                <td style="text-align: right;">${formatRupiah(book.revenue)}</td>
            </tr>
        `).join('');
    } catch (err) {
        console.error('Gagal memuat statistik:', err);
    }
}

// ----------------------------------------------------------------
// Load & render all transactions
// ----------------------------------------------------------------
let allTransactionsData = [];
let filteredTransactionsData = [];

async function loadTransactions() {
    const tbody = document.getElementById('transactionsTable');
    try {
        allTransactionsData = await getAllTransactions();
        renderTransactions(allTransactionsData);
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="7" class="table-empty" style="color:var(--error,#dc2626);">Gagal memuat transaksi: ${escapeHtml(err.message)}</td></tr>`;
    }
}

function renderTransactions(list) {
    filteredTransactionsData = list; // simpan list yang sedang ditampilkan
    const tbody = document.getElementById('transactionsTable');

    if (!list || list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="table-empty">Belum ada transaksi.</td></tr>';
        return;
    }

    tbody.innerHTML = list.map((tx, i) => `
        <tr>
            <td>
                <code class="tx-id">${escapeHtml(tx.id)}</code>
            </td>
            <td>
                <div class="user-cell">
                    <strong>${escapeHtml(tx.user?.fullName || tx.buyer?.name || '-')}</strong>
                    <small>${escapeHtml(tx.user?.email || tx.buyer?.email || '')}</small>
                </div>
            </td>
            <td style="text-align: center;">${Number(tx.itemCount) || 0} judul</td>
            <td style="text-align: right;"><strong>${formatRupiah(tx.total)}</strong></td>
            <td><span class="method-badge">${escapeHtml(formatPaymentMethod(tx.paymentMethod))}</span></td>
            <td class="date-cell">${formatDate(tx.createdAt)}</td>
            <td style="text-align: center;">
                <button class="btn btn-outline btn-sm" data-tx-index="${i}">👁️</button>
            </td>
        </tr>
    `).join('');
}

// Event delegation untuk tombol detail — hindari onclick inline
document.getElementById('transactionsTable')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-tx-index]');
    if (!btn) return;
    const idx = parseInt(btn.dataset.txIndex, 10);
    const tx = filteredTransactionsData[idx]; // pakai list yang sedang ditampilkan
    if (tx) showTransactionDetail(tx);
});

// Detail modal
function showTransactionDetail(tx) {
    const modal = document.getElementById('transactionModal');
    const detailEl = document.getElementById('transactionDetail');

    const itemsHtml = (tx.items || []).map(item => `
        <div class="detail-item">
            <span class="detail-item-title">${escapeHtml(item.title || 'Judul Tidak Diketahui')}</span>
            <span class="detail-item-price">${formatRupiah(item.price ?? item.subtotal)}</span>
        </div>
    `).join('');

    detailEl.innerHTML = `
        <div class="detail-row">
            <span class="detail-label">ID Transaksi</span>
            <code>${escapeHtml(tx.id)}</code>
        </div>
        <div class="detail-row">
            <span class="detail-label">Pengguna</span>
            <span>${escapeHtml(tx.user?.fullName || '-')} &lt;${escapeHtml(tx.user?.email || '-')}&gt;</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Pembeli</span>
            <span>${escapeHtml(tx.buyer?.name || '-')} &lt;${escapeHtml(tx.buyer?.email || '-')}&gt;</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Metode Pembayaran</span>
            <span>${escapeHtml(formatPaymentMethod(tx.paymentMethod))}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Tanggal</span>
            <span>${formatDate(tx.createdAt)}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Total</span>
            <strong>${formatRupiah(tx.total)}</strong>
        </div>
        <hr class="detail-divider">
        <h4 class="detail-items-header">Item (${Number(tx.itemCount) || 0} judul)</h4>
        <div class="detail-items">${itemsHtml}</div>
    `;

    modal.classList.add('active');
}

// Close modal
document.querySelector('.modal-close')?.addEventListener('click', () => {
    document.getElementById('transactionModal').classList.remove('active');
});
document.getElementById('transactionModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'transactionModal') {
        e.target.classList.remove('active');
    }
});

// Search transactions
document.getElementById('searchTransaction')?.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    const filtered = allTransactionsData.filter(tx =>
        tx.id.toLowerCase().includes(q) ||
        (tx.user?.fullName || '').toLowerCase().includes(q) ||
        (tx.user?.email || '').toLowerCase().includes(q) ||
        (tx.buyer?.name || '').toLowerCase().includes(q)
    );
    renderTransactions(filtered);
});

// ----------------------------------------------------------------
// Load & render all users
// ----------------------------------------------------------------
let allUsersData = [];

async function loadUsers() {
    const tbody = document.getElementById('usersTable');
    try {
        allUsersData = await getAllUsers();
        renderFilteredUsers();
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6" class="table-empty" style="color:var(--error,#dc2626);">Gagal memuat pengguna: ${escapeHtml(err.message)}</td></tr>`;
    }
}

function renderUsers(list) {
    const tbody = document.getElementById('usersTable');

    if (!list || list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="table-empty">Belum ada pengguna terdaftar.</td></tr>';
        return;
    }

    tbody.innerHTML = list.map(u => {
        const isActive = u.isActive !== false; // default true jika tidak ada
        const statusBadge = isActive
            ? `<span class="status-badge status-active">✅ Aktif</span>`
            : `<span class="status-badge status-banned">🚫 Dinonaktifkan</span>`;
        const userId = encodeURIComponent(u.id);
        const userName = escapeHtml(u.fullName || '-');
        const actionBtn = isActive
            ? `<button class="btn btn-danger btn-sm" data-action="ban" data-user-id="${userId}" data-user-name="${userName}">Nonaktifkan</button>`
            : `<button class="btn btn-outline btn-sm" data-action="unban" data-user-id="${userId}" data-user-name="${userName}">Aktifkan</button>`;

        return `
            <tr class="${isActive ? '' : 'row-banned'}">
                <td>
                    <div class="user-cell">
                        <div class="user-avatar" style="background: ${isActive ? 'var(--primary)' : 'var(--text-muted)'};">${escapeHtml((u.fullName || '?')[0].toUpperCase())}</div>
                        <strong>${escapeHtml(u.fullName || '-')}</strong>
                    </div>
                </td>
                <td>${escapeHtml(u.email || '-')}</td>
                <td style="text-align: center;">${statusBadge}</td>
                <td style="text-align: center;"><span class="count-badge">${u.transactionCount}</span></td>
                <td style="text-align: right;">${formatRupiah(u.totalSpent)}</td>
                <td style="text-align: center;">${actionBtn}</td>
            </tr>
        `;
    }).join('');
}

// Event delegation untuk tombol ban/unban
document.getElementById('usersTable')?.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const action = btn.dataset.action;
    const userId = decodeURIComponent(btn.dataset.userId || '');
    const userName = btn.dataset.userName;
    const label = action === 'ban' ? 'nonaktifkan' : 'aktifkan kembali';

    if (!confirm(`Yakin ingin ${label} akun "${userName}"?`)) return;

    btn.disabled = true;
    btn.textContent = 'Memproses...';

    try {
        if (action === 'ban') {
            await banUser(userId);
        } else {
            await unbanUser(userId);
        }
        // Reload tabel pengguna dan statistik (jumlah akun nonaktif)
        await Promise.all([loadUsers(), loadStats()]);
    } catch (err) {
        alert(`Gagal: ${err.message}`);
        btn.disabled = false;
        btn.textContent = action === 'ban' ? 'Nonaktifkan' : 'Aktifkan';
    }
});

// Search users
function renderFilteredUsers() {
    const q = (document.getElementById('searchUser')?.value || '').toLowerCase().trim();
    if (!q) {
        renderUsers(allUsersData);
        return;
    }
    renderUsers(allUsersData.filter(u =>
        (u.fullName || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q)
    ));
}

document.getElementById('searchUser')?.addEventListener('input', renderFilteredUsers);

// ----------------------------------------------------------------
// Tabs
// ----------------------------------------------------------------
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;

        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        document.querySelectorAll('.tab-content').forEach(section => {
            section.style.display = 'none';
            section.classList.remove('active');
        });

        const target = document.getElementById(`${tab}Tab`);
        if (target) {
            target.style.display = 'block';
            target.classList.add('active');
        }

        // Lazy load users saat tab pertama kali dibuka
        if (tab === 'users' && allUsersData.length === 0) {
            loadUsers();
        }
    });
});

// ----------------------------------------------------------------
// Init
// ----------------------------------------------------------------
initNavbarAuth();
initMobileNav();

checkAdminAccess().then(({ ok, prefetchedStats }) => {
    if (ok) {
        loadStats(prefetchedStats);
        loadTransactions();
    }
});
