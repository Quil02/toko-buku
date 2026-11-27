# Toko Buku Online - Struktur MVC

Aplikasi toko buku online dengan katalog buku dari Open Library API, keranjang belanja, wishlist, checkout, dan riwayat pembelian. Proyek ini menerapkan **pola Model-View-Controller (MVC)** dengan pemisahan yang jelas antara backend dan frontend.

---

## 📋 Daftar Isi

- [Fitur](#fitur)
- [Teknologi](#teknologi)
- [Struktur MVC](#struktur-mvc)
- [Struktur Folder](#struktur-folder)
- [Arsitektur & Alur Data](#arsitektur--alur-data)
- [Cara Menjalankan](#cara-menjalankan)
- [API Documentation](#api-documentation)
- [Database](#database)
- [Konfigurasi](#konfigurasi)
- [Troubleshooting](#troubleshooting)
- [Catatan Keamanan](#catatan-keamanan)

---

## ✨ Fitur

- ✅ Registrasi dan login akun (token-based authentication)
- ✅ Katalog buku dengan pencarian, filter kategori, filter harga, dan pengurutan
- ✅ Detail buku (sinopsis, penerbit, tahun, ISBN)
- ✅ Keranjang belanja (buku digital: 1 judul = 1 akses)
- ✅ Wishlist
- ✅ Checkout dengan simulasi metode pembayaran
- ✅ Riwayat pembelian
- ✅ Perpustakaan pribadi (buku yang sudah dibeli)
- ✅ Dashboard admin (statistik, transaksi, dan manajemen pengguna)
- ✅ Softban akun pengguna (nonaktifkan/aktifkan kembali; login akun nonaktif ditolak)
- ✅ Mode gelap dan navigasi mobile responsive
- ✅ Data buku real-time dari Open Library API

---

## 🛠️ Teknologi

| Komponen | Teknologi |
|----------|-----------|
| **Frontend** | HTML5, CSS3, JavaScript ES Modules (vanilla, no framework) |
| **Backend** | Python 3.12+, FastAPI, Uvicorn |
| **Database** | SQLite (raw SQL, no ORM) |
| **API Eksternal** | [Open Library API](https://openlibrary.org/developers/api) |
| **Package Manager** | [uv](https://docs.astral.sh/uv/) |

---

## 🏗️ Struktur MVC

### Backend (FastAPI)

Proyek ini mengikuti pola **Model-View-Controller (MVC)** dengan struktur yang jelas:

```
backend/
├── app.py                          # Entry point: FastAPI app + router mounting
├── models/                         # MODEL: Data & Business Logic
│   ├── database.py                # Schema SQLite, init_db(), migrations
│   └── user.py                    # Auth logic, token management
├── controllers/                    # CONTROLLER: HTTP Request Handlers
│   ├── auth.py                    # POST /api/auth/register, /login
│   ├── cart.py                    # GET/POST/DELETE /api/cart/*
│   ├── wishlist.py                # GET/POST/DELETE /api/wishlist/*
│   ├── transaction.py             # GET/POST /api/transactions/*
│   └── admin.py                   # /api/admin/* (stats, transaksi, kelola user)
└── utils/                          # UTILITIES: Helper functions
    ├── pricing.py                 # generate_price_from_id()
    ├── helpers.py                 # get_timestamp()
    └── auth.py                    # require_auth(), require_admin()
```

#### Pemetaan MVC Backend

| Komponen MVC | Lokasi | Tanggung Jawab |
|--------------|--------|----------------|
| **Model** | `backend/models/` | Schema database, query SQL, business rules (harga, auth) |
| **Controller** | `backend/controllers/` | Route handlers, validasi request, return JSON response |
| **View** | JSON responses | Tidak ada HTML template (API-only backend) |

### Frontend (Vanilla JavaScript)

```
js/
├── config.js                       # Konfigurasi API_BASE_URL, TOKEN_KEY
├── api/                            # SERVICE LAYER (jembatan ke backend)
│   ├── authApi.js                 # register(), login()
│   ├── bookApi.js                 # fetchBooks() dari Open Library
│   ├── cartApi.js                 # getCart(), addToCart(), ...
│   ├── wishlistApi.js             # getWishlist(), addToWishlist(), ...
│   ├── paymentApi.js              # createTransaction(), formatRupiah()
│   └── adminApi.js                # getAdminStats(), getAllUsers(), banUser(), unbanUser()
├── pages/                          # CONTROLLER + VIEW (hybrid)
│   ├── catalog.js                 # Event handlers + render katalog
│   ├── cart.js                    # Event handlers + render keranjang
│   ├── checkout.js                # Form submit + render checkout
│   ├── library.js                 # Render perpustakaan
│   ├── wishlist.js                # Event handlers + render wishlist
│   ├── history.js                 # Render riwayat transaksi
│   ├── bookDetail.js              # Render detail buku
│   ├── admin.js                   # Render dashboard admin + softban user
│   ├── login.js, register.js      # Form auth handlers
└── utils/                          # UTILITIES
    ├── authStorage.js             # getUser(), isAuthenticated()
    ├── darkMode.js                # Toggle dark/light mode
    └── mobileNav.js               # Mobile menu
```

#### Pemetaan MVC Frontend

| Komponen MVC | Lokasi | Tanggung Jawab |
|--------------|--------|----------------|
| **Model** | Backend API (`/api/*`) | Data dari SQLite via HTTP |
| **View** | `*.html` + `css/` + fungsi `render*()` di `js/pages/` | Structure (HTML) + Presentation (CSS) + Dynamic content (JS) |
| **Controller** | `js/pages/*.js` event handlers | Event listeners, form validation, state management |
| **Service** | `js/api/*.js` | Wrapper `fetch()` untuk komunikasi dengan backend |

> **Catatan:** Frontend menggunakan **hybrid pattern** karena tidak ada template engine. File `js/pages/*.js` menggabungkan Controller (event handler) dan View (render function). Ini adalah praktik umum di vanilla JS / SPA.

---

## 📁 Struktur Folder

```
toko-buku-mvc/
│
├── 🚀 run.py                       # Bootstrap: gabung backend + frontend di port 8000
├── 📄 run.bat                      # Windows launcher (double-click)
├── 📄 pyproject.toml, uv.lock      # Python dependencies
├── 📄 .python-version              # Python 3.12
├── 📚 README.md                    # Dokumentasi lengkap (file ini)
├── 📝 AGENTS.md                    # Panduan development untuk AI/developer
│
├── backend/                         # ⚙️ BACKEND (FastAPI - MVC Pattern)
│   ├── app.py                      # Entry point: FastAPI app, CORS, mount routers
│   ├── models/                     # 📊 MODEL
│   │   ├── database.py            # Schema, init_db(), migrations
│   │   └── user.py                # Auth: hash password, token management
│   ├── controllers/                # 🎮 CONTROLLER
│   │   ├── auth.py                # /api/auth/*
│   │   ├── cart.py                # /api/cart/*
│   │   ├── wishlist.py            # /api/wishlist/*
│   │   ├── transaction.py         # /api/transactions/*
│   │   └── admin.py               # /api/admin/*
│   ├── utils/                      # 🛠️ Utilities
│   │   ├── pricing.py             # generate_price_from_id()
│   │   ├── helpers.py             # get_timestamp()
│   │   └── auth.py                # require_auth(), require_admin()
│   ├── tokobuku.db                # 💾 SQLite database (auto-generated)
│   └── simple_api_OLD.py          # 🗄️ Backup (sebelum refactor, bisa dihapus)
│
├── js/                             # 💻 FRONTEND (Vanilla JS ES Modules)
│   ├── config.js                  # Konfigurasi API_BASE_URL, TOKEN_KEY
│   ├── api/                        # 🔌 SERVICE LAYER
│   │   ├── authApi.js, bookApi.js, cartApi.js, wishlistApi.js, paymentApi.js
│   │   └── adminApi.js
│   ├── pages/                      # 🎮 CONTROLLER + 🖼️ VIEW (hybrid)
│   │   ├── catalog.js, cart.js, checkout.js, library.js, wishlist.js
│   │   ├── history.js, bookDetail.js, login.js, register.js
│   │   └── admin.js
│   └── utils/                      # 🛠️ Helper Functions
│       ├── authStorage.js, darkMode.js, mobileNav.js
│
├── css/                            # 🎨 VIEW: Styling
│   ├── main.css                   # Base styles, variables, dark mode
│   ├── auth.css, catalog.css, cart.css, checkout.css, detail.css
│   ├── library.css, wishlist.css, admin.css
│
├── *.html                          # 🖼️ VIEW: Kerangka HTML statis
│   ├── index.html                 # Katalog (home)
│   ├── book-detail.html, cart.html, checkout.html
│   ├── library.html, wishlist.html, history.html
│   ├── login.html, register.html
│   └── admin.html                 # Dashboard admin
```

---

## 🔄 Arsitektur & Alur Data

### Diagram Arsitektur

```
┌──────────────────────────────────────────────────────────────────┐
│                       BROWSER (Client)                            │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  VIEW: HTML + CSS                                          │  │
│  │  - *.html, css/*.css                                       │  │
│  └────────────────────────────────────────────────────────────┘  │
│                             ↕                                     │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  CONTROLLER + VIEW: js/pages/*.js                          │  │
│  │  - Event handlers + render functions                       │  │
│  └────────────────────────────────────────────────────────────┘  │
│                             ↕                                     │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  SERVICE: js/api/*.js                                      │  │
│  │  - fetch() wrapper ke backend                              │  │
│  └────────────────────────────────────────────────────────────┘  │
└───────────────────────────┬──────────────────────────────────────┘
                            │ HTTP (JSON)
                            ↓
┌──────────────────────────────────────────────────────────────────┐
│                  BACKEND (FastAPI Server)                         │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  app.py: FastAPI app + CORS + mount routers               │  │
│  └────────────────────────────────────────────────────────────┘  │
│                             ↓                                     │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  CONTROLLER: backend/controllers/*.py                      │  │
│  │  - auth.py, cart.py, wishlist.py, transaction.py          │  │
│  └────────────────────────────────────────────────────────────┘  │
│                             ↓                                     │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  MODEL: backend/models/*.py                                │  │
│  │  - database.py (schema), user.py (auth)                   │  │
│  └────────────────────────────────────────────────────────────┘  │
│                             ↓                                     │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  DATABASE: tokobuku.db (SQLite)                            │  │
│  │  - Tables: users, cart, wishlist, transactions             │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### Contoh Alur Request (Add to Cart)

```
1. USER → Click "Tambah ke Keranjang" di catalog.html
   ↓
2. js/pages/catalog.js (CONTROLLER)
   - Event listener: handleAddToCart(book)
   ↓
3. js/api/cartApi.js (SERVICE)
   - addToCart(book) → fetch POST /api/cart + Bearer token
   ↓
4. backend/controllers/cart.py (CONTROLLER)
   - @router.post("/api/cart")
   - Extract & validate token
   ↓
5. backend/models/user.py (MODEL)
   - get_user_from_token() → SELECT * FROM users WHERE id = ?
   ↓
6. backend/utils/pricing.py (UTIL)
   - generate_price_from_id(book_id) → deterministik price
   ↓
7. backend/controllers/cart.py (CONTROLLER)
   - Check duplicate: SELECT * FROM cart WHERE user_id = ? AND book_id = ?
   - INSERT INTO cart (...) atau return {alreadyInCart: true}
   ↓
8. Response JSON → js/api/cartApi.js (SERVICE)
   ↓
9. js/pages/catalog.js (CONTROLLER + VIEW)
   - Update button: "✓ Di Keranjang"
   - Show toast notification
```

---

## 🚀 Cara Menjalankan

### Prasyarat

- Python **3.12+**
- `uv` (package manager, opsional tapi disarankan)

### Instalasi

**Cara A — pakai `uv` (disarankan)**

```powershell
# Install uv jika belum ada
pip install uv

# Install dependencies (auto create .venv)
uv sync
```

**Cara B — pakai `pip` + venv**

```powershell
python -m venv .venv
.venv\Scripts\activate
pip install fastapi uvicorn
```

### Menjalankan Server

```powershell
# Pakai uv (disarankan)
uv run python run.py

# Atau double-click run.bat di Windows

# Atau langsung dengan .venv (jika sudah ada)
.venv\Scripts\python.exe run.py
```

Browser akan otomatis terbuka di **http://localhost:8000**

| URL | Keterangan |
|-----|------------|
| http://localhost:8000 | Website frontend |
| http://localhost:8000/docs | Swagger UI (API documentation) |
| http://localhost:8000/health | Health check endpoint |

Hentikan server dengan **Ctrl+C**.

### Opsi Lanjutan

```powershell
# Tanpa auto-open browser
uv run python run.py --no-browser

# Custom port
$env:PORT=8080
uv run python run.py

# Jika port diubah, sesuaikan API_BASE_URL di js/config.js
```

### Database

Database SQLite (`backend/tokobuku.db`) akan otomatis dibuat saat pertama kali server dijalankan.

**Reset database:**
```powershell
Remove-Item backend\tokobuku.db
uv run python run.py  # Database dibuat ulang kosong
```

---

## 📡 API Documentation

Semua endpoint berada di `/api/*`. Endpoint yang memerlukan autentikasi ditandai **[Auth]**.

### Authentication

| Method | Endpoint | Body | Response |
|--------|----------|------|----------|
| `POST` | `/api/auth/register` | `{fullName, email, password}` | `{success, message}` |
| `POST` | `/api/auth/login` | `{emailOrUsername, password}` | `{success, token, user}` |

**Header untuk endpoint [Auth]:**
```
Authorization: Bearer <token>
```

### Cart [Auth]

| Method | Endpoint | Keterangan |
|--------|----------|------------|
| `GET` | `/api/cart` | Daftar buku di keranjang |
| `POST` | `/api/cart` | Tambah buku (duplikat ditolak) |
| `DELETE` | `/api/cart/{book_id}` | Hapus satu buku |
| `DELETE` | `/api/cart` | Kosongkan keranjang |
| `GET` | `/api/cart/check/{book_id}` | Cek buku ada di keranjang |
| `GET` | `/api/cart/total` | Total harga & jumlah item |

**Body POST /api/cart:**
```json
{
  "id": "OL45804W",
  "title": "Judul Buku",
  "authors": ["Nama Penulis"],
  "thumbnail": "https://...",
  "category": "Fiction"
}
```

> **Catatan:** Harga tidak dikirim client, dihitung ulang di server berdasarkan book ID.

### Wishlist [Auth]

| Method | Endpoint | Keterangan |
|--------|----------|------------|
| `GET` | `/api/wishlist` | Daftar wishlist |
| `POST` | `/api/wishlist` | Tambah item |
| `DELETE` | `/api/wishlist/{book_id}` | Hapus item |
| `GET` | `/api/wishlist/check/{book_id}` | Cek item di wishlist |

### Transactions [Auth]

| Method | Endpoint | Keterangan |
|--------|----------|------------|
| `GET` | `/api/payment-methods` | Katalog metode pembayaran (QRIS, Virtual Account, E-Wallet, Kartu) |
| `POST` | `/api/transactions` | Buat transaksi baru |
| `GET` | `/api/transactions` | Riwayat transaksi |
| `GET` | `/api/transactions/check/{book_id}` | Cek buku sudah dibeli |
| `DELETE` | `/api/transactions` | Hapus semua riwayat |

**Body POST /api/transactions:**
```json
{
  "items": [
    {"id": "OL45804W", "title": "Judul", "authors": ["Penulis"]}
  ],
  "paymentMethod": "qris",
  "buyer": {"name": "Nama", "email": "email@mail.com"},
  "fromCart": true
}
```

> **Catatan:** 
> - `total` dihitung server, bukan dari client
> - `fromCart: true` akan mengosongkan keranjang setelah checkout
> - Pembayaran disimulasikan (tidak ada integrasi payment gateway)

### Admin [Auth — role `admin`]

| Method | Endpoint | Keterangan |
|--------|----------|------------|
| `GET` | `/api/admin/stats` | Statistik dashboard (user, transaksi, pendapatan, top 5 buku, 7 hari terakhir) |
| `GET` | `/api/admin/transactions` | Semua transaksi beserta detail pembeli |
| `GET` | `/api/admin/users` | Semua user non-admin + ringkasan transaksi + status `isActive` |
| `PATCH` | `/api/admin/users/{user_id}/ban` | Nonaktifkan akun (softban) |
| `PATCH` | `/api/admin/users/{user_id}/unban` | Aktifkan kembali akun |

**Response `GET /api/admin/stats` (ringkas):**
```json
{
  "totalUsers": 10,
  "bannedUsers": 1,
  "totalTransactions": 25,
  "totalRevenue": 350000,
  "avgTransaction": 14000,
  "topBooks": [{"id": "OL...", "title": "...", "count": 5, "revenue": 75000}],
  "last7Days": {"transactions": 4, "revenue": 56000}
}
```

> **Catatan:** Akun admin default di-seed saat database masih kosong: `admin@tokobuku.com` / `admin123`. Segera ganti password pada pemakaian nyata.

### Health Check

| Method | Endpoint | Response |
|--------|----------|----------|
| `GET` | `/health` | `{"status": "healthy"}` |
| `GET` | `/` | API info |

---

## 💾 Database

**Jenis:** SQLite (`backend/tokobuku.db`)  
**Akses:** Raw SQL via `sqlite3` module (no ORM)  
**Migrasi:** Additive-only (ALTER TABLE ADD COLUMN) di `models/database.py`

### Schema Tabel

#### `users`
| Kolom | Tipe | Constraint |
|-------|------|------------|
| `id` | TEXT | PRIMARY KEY |
| `fullName` | TEXT | UNIQUE, NOT NULL |
| `email` | TEXT | UNIQUE, NOT NULL |
| `password` | TEXT | NOT NULL (SHA-256) |
| `role` | TEXT | `user` atau `admin` |
| `isActive` | INTEGER | DEFAULT 1; `0` berarti akun nonaktif |
| `createdAt` | TEXT | NOT NULL (ISO timestamp) |

#### `cart`
| Kolom | Tipe | Catatan |
|-------|------|---------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT |
| `user_id` | TEXT | FOREIGN KEY → users(id) |
| `book_id` | TEXT | NOT NULL |
| `title` | TEXT | NOT NULL |
| `authors` | TEXT | JSON array |
| `price` | REAL | NOT NULL |
| `thumbnail` | TEXT | - |
| `category` | TEXT | - |
| `addedAt` | TEXT | NOT NULL |
| `quantity` | INTEGER | DEFAULT 1 (selalu 1 untuk buku digital) |

#### `wishlist`
Similar dengan `cart`, tanpa kolom `quantity`.

#### `transactions`
| Kolom | Tipe | Catatan |
|-------|------|---------|
| `id` | TEXT | PRIMARY KEY (format: TBK-timestamp-XXXX) |
| `user_id` | TEXT | FOREIGN KEY → users(id) |
| `items` | TEXT | JSON array |
| `total` | REAL | NOT NULL |
| `paymentMethod` | TEXT | NOT NULL |
| `buyerName` | TEXT | - |
| `buyerEmail` | TEXT | - |
| `paymentDetail` | TEXT | JSON object |
| `createdAt` | TEXT | NOT NULL |

---

## ⚙️ Konfigurasi

### `js/config.js`

```javascript
export const CONFIG = {
  API_BASE_URL: 'http://localhost:8000',  // Backend API URL
  TOKEN_KEY: 'bookstore_auth_token',      // localStorage key untuk token
  USER_KEY: 'bookstore_user_data',        // localStorage key untuk user data
};
```

### Environment Variables

| Variable | Default | Keterangan |
|----------|---------|------------|
| `PORT` | `8000` | Port server |

### Harga Buku

Harga dihitung **deterministik** dari book ID menggunakan algoritma hash sederhana (Rp 7.000 - Rp 20.000, step Rp 1.000). Fungsi yang sama diimplementasi di:
- Backend: `backend/utils/pricing.py::generate_price_from_id()`
- Frontend: `js/api/bookApi.js::generatePriceFromId()`

---

## 🐛 Troubleshooting

### Port 8000 sudah dipakai

```powershell
# Kill process di port 8000
Get-NetTCPConnection -LocalPort 8000 -State Listen |
  ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }

# Atau gunakan port lain
$env:PORT=8080
uv run python run.py
```

### Katalog kosong / buku tidak muncul

Katalog membutuhkan koneksi internet ke `openlibrary.org`. Periksa:
1. Koneksi internet aktif
2. Firewall tidak memblokir
3. Buka Developer Console (F12) untuk lihat error

### Frontend tidak terhubung ke backend

1. Pastikan backend running: `curl http://localhost:8000/health`
2. Cek `API_BASE_URL` di `js/config.js` sesuai dengan port backend
3. Buka browser console (F12) untuk lihat error

### `uv` command not found

Install uv:
```powershell
pip install uv
```

Atau gunakan Python langsung:
```powershell
.venv\Scripts\python.exe run.py
```

### Perubahan kode tidak muncul

Hard reload browser: **Ctrl + Shift + R** (bypass cache)

---

## 🔒 Catatan Keamanan

⚠️ **Project ini untuk pembelajaran dan development lokal.**

Sebelum deploy ke produksi:

- [ ] Ganti SHA-256 tanpa salt → **bcrypt** atau **Argon2**
- [ ] Gunakan JWT dengan expiry time, bukan token sederhana
- [ ] Batasi CORS ke domain frontend saja
- [ ] Tambahkan **rate limiting** untuk API
- [ ] Implementasi **HTTPS**
- [ ] Validasi input lebih ketat (SQL injection, XSS)
- [ ] Environment variables untuk secrets (jangan hardcode)
- [ ] Logging dan monitoring
- [ ] Gunakan database server (PostgreSQL/MySQL) untuk produksi

---

## 📚 Referensi Struktur MVC

### Pemisahan Tanggung Jawab (Separation of Concerns)

✅ **Model** (`backend/models/`)
- Tidak tahu soal HTTP request
- Hanya fokus: schema DB, query SQL, business logic

✅ **Controller** (`backend/controllers/`)
- Tidak tahu detail SQL
- Hanya fokus: handle request, validasi input, call model, return response

✅ **View** (Frontend)
- Tidak tahu detail business logic
- Hanya fokus: tampilan, interaksi user

### Keuntungan Struktur Ini

1. **Mudah maintenance** — Edit cart logic? Buka `controllers/cart.py` saja
2. **Mudah testing** — Test auth logic? Import `models/user.py` tanpa FastAPI
3. **Clear responsibility** — Setiap file punya tujuan jelas
4. **Scalable** — Tambah fitur baru tanpa ganggu yang lain
5. **Professional** — Sesuai best practice software engineering

---

## 📝 Lisensi

Project ini dibuat untuk keperluan edukasi dan tugas kuliah.

---

## 📧 Kontak & Support

Jika menemukan bug atau punya pertanyaan:
1. Cek section [Troubleshooting](#troubleshooting)
2. Review log error di terminal atau browser console (F12)
3. Pastikan semua dependencies ter-install dengan `uv sync`

---

**Dibuat:** November 2026  
**Tech Stack:** FastAPI + Vanilla JS + SQLite  
**Pattern:** Model-View-Controller (MVC)  
**Status:** ✅ Production-ready untuk tugas kuliah
