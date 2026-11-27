# AGENTS.md — Toko Buku Online

Project tugas kuliah: toko buku digital berbasis FastAPI + vanilla JS ES Modules.

---

## Menjalankan server

```powershell
# Pertama kali — install dependensi
uv sync

# Jalankan (auto-buka browser)
uv run python run.py

# Tanpa auto-buka browser
uv run python run.py --no-browser

# Tanpa uv (venv sudah ada)
.venv\Scripts\python.exe run.py
```

> **Jangan** `python run.py` langsung — `uvicorn` dan `fastapi` hanya ada di `.venv`, bukan di Python sistem.

`run.bat` di root melakukan pengecekan `.venv` otomatis dan menampilkan instruksi jika belum ada.

---

## Arsitektur satu port

`run.py` menggabungkan backend + frontend dalam **satu proses Uvicorn** di `http://localhost:8000`:

- `/css`, `/js` → `StaticFiles` dari root project
- `/*.html` → `FileResponse` dari root project
- `/api/*`, `/docs`, `/health` → FastAPI app dari `backend/simple_api.py`

Karena `os.chdir(BACKEND)` dipanggil di `run.py`, semua path relatif di backend (termasuk `tokobuku.db`) mengacu ke folder `backend/`.

`init_db()` dipanggil eksplisit di `run.py` — sub-app yang di-mount tidak menjalankan `startup` event.

---

## Backend — Struktur MVC

Proyek mengikuti pola **Model-View-Controller (MVC)**:

```
backend/
├── app.py                    # Entry point: FastAPI app + mount routers
├── models/                   # MODEL: Schema DB, auth logic
│   ├── database.py          # init_db(), schema tabel
│   └── user.py              # hash_password, create_token, get_user_from_token
├── controllers/              # CONTROLLER: Route handlers
│   ├── auth.py              # /api/auth/*
│   ├── cart.py              # /api/cart/*
│   ├── wishlist.py          # /api/wishlist/*
│   ├── transaction.py       # /api/transactions/*
│   └── admin.py             # /api/admin/* (dashboard, user softban)
└── utils/                    # Helper: pricing, timestamp, auth
    ├── pricing.py
    ├── helpers.py
    └── auth.py             # require_auth, require_admin
```

- **Framework:** FastAPI
- **Database:** SQLite via `sqlite3` stdlib — tidak ada ORM, semua raw SQL
- **File DB:** `backend/tokobuku.db` (dibuat otomatis saat startup)
- **Migrasi:** Additive-only via `ALTER TABLE ADD COLUMN` di `models/database.py`. Tidak ada migration tool.
- **Auth:** Token format `token_<user_id>_<unix_timestamp>` disimpan di `localStorage` client, dikirim sebagai `Authorization: Bearer <token>`. Divalidasi via `models/user.py::get_user_from_token()`.
- **Password:** SHA-256 tanpa salt — cukup untuk tugas, bukan produksi.
- **Harga buku:** Dihitung deterministik dari book ID via `utils/pricing.py::generate_price_from_id()` (Rp 7.000–20.000, step Rp 1.000). **Harga dari client tidak dipercaya** — selalu dihitung ulang di server. Fungsi yang sama diimplementasi di `js/api/bookApi.js`.
- **Keranjang:** Buku digital — 1 judul hanya bisa ada sekali. Tidak ada `PATCH` quantity. `quantity` selalu 1.
- **Checkout:** Pembayaran disimulasikan. Server menampilkan tujuan transfer toko (`PAYMENT_DESTINATIONS`). Tidak ada CVV/PIN/nomor rekening pembeli.

---

## Frontend — `js/`

Semua file menggunakan **ES Modules** (`import`/`export`). Tidak ada build step, bundler, atau framework.

```
js/config.js          # CONFIG.API_BASE_URL, TOKEN_KEY, USER_KEY
js/api/               # SERVICE layer: klien HTTP ke backend (cartApi, paymentApi, wishlistApi, bookApi, authApi, adminApi)
js/pages/             # CONTROLLER + VIEW hybrid: event handlers + render functions (1 file per halaman, termasuk admin.js)
js/utils/             # Helper: authStorage, darkMode, mobileNav
```

**Pola MVC di frontend:**
- **Model:** Backend API (`/api/*`) → data dari SQLite
- **View:** HTML statis (`*.html`, `css/*.css`) + fungsi `render*()` di `js/pages/*.js`
- **Controller:** Event handlers di `js/pages/*.js`
- **Service:** `js/api/*.js` sebagai jembatan antara Controller dan Model

**Data buku diambil live dari Open Library API** (`openlibrary.org`). Katalog akan kosong jika tidak ada koneksi internet.

Jika port diubah dari 8000, perbarui `API_BASE_URL` di `js/config.js`.

---

## Konvensi penting

- **Harga** selalu dari server — jangan percaya nilai `price` yang dikirim client di body request.
- **Duplikat keranjang** ditolak di backend (`alreadyInCart: true`), frontend redirect ke `cart.html`.
- **Wishlist** tidak menyimpan field `stock` — kolom ada di DB lama tapi tidak diisi/dikirim.
- **Katalog stabil** — urutan berdasarkan `title.localeCompare`, bukan acak.
- **`fromCart: true`** di body `POST /api/transactions` akan mengosongkan keranjang setelah transaksi.
- **Admin:** akun admin di-seed otomatis saat DB kosong (`admin@tokobuku.com` / `admin123`). Semua endpoint `/api/admin/*` memakai dependency `require_admin` (role harus `admin`).
- **Softban:** kolom `users.isActive` (default `1`). User dengan `isActive = 0` ditolak saat login (**403**), token lamanya dianggap tidak valid oleh `get_user_from_token()`, dan endpoint read-only mengembalikan data kosong. Admin tidak bisa menonaktifkan sesama admin.
- **Output dinamis dashboard admin** wajib melewati `escapeHtml()` sebelum masuk `innerHTML`.

---

## Reset database

```powershell
Remove-Item backend\tokobuku.db
uv run python run.py   # DB dibuat ulang otomatis
```

---

## Tidak ada

- Test file, CI workflow, atau linting config
- Build step atau bundler
- Pengiriman fisik, stok, atau alamat
- Hash password yang aman (intentional untuk tugas)
