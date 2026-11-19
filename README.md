# Toko Buku

Aplikasi toko buku online sederhana: katalog buku dari Open Library, keranjang, wishlist, checkout, dan riwayat pembelian. Frontend berupa HTML/CSS/JavaScript murni, backend FastAPI dengan database SQLite.

## Fitur

- Registrasi dan login akun (token-based)
- Katalog buku dengan pencarian, filter kategori, filter harga, dan pengurutan
- Detail buku (sinopsis, penerbit, tahun, ISBN)
- Keranjang belanja (1 judul = 1 akses, tanpa jumlah)
- Wishlist
- Checkout dengan beberapa metode pembayaran
- Riwayat pembelian
- Mode gelap dan navigasi mobile
- Data buku diambil langsung dari Open Library API

## Teknologi

| Bagian | Teknologi |
|---|---|
| Frontend | HTML5, CSS3, JavaScript ES Modules |
| Backend | Python 3.12+, FastAPI, Uvicorn |
| Database | SQLite (`sqlite3` bawaan Python, tanpa ORM) |
| Sumber data buku | [Open Library API](https://openlibrary.org/developers/api) |
| Manajemen environment | [uv](https://docs.astral.sh/uv/) (`pyproject.toml` + `uv.lock`) |

## Struktur Project

```
toko-buku/
├── run.py                 # Launcher: website + API dalam satu server
├── run.bat                # Shortcut Windows (double-click)
├── pyproject.toml         # Dependensi Python
├── uv.lock                # Lockfile uv
├── .python-version        # Versi Python (3.12)
├── README.md
│
├── index.html             # Katalog
├── book-detail.html       # Detail buku
├── cart.html              # Keranjang
├── checkout.html          # Checkout
├── history.html           # Riwayat pembelian
├── wishlist.html          # Wishlist
├── login.html             # Login
├── register.html          # Registrasi
│
├── css/                   # Stylesheet per halaman
├── js/
│   ├── config.js          # Konfigurasi API dan storage key
│   ├── api/               # Klien API (auth, buku, cart, wishlist, pembayaran)
│   ├── pages/             # Controller tiap halaman
│   └── utils/             # Auth storage, dark mode, navigasi mobile
│
└── backend/
    ├── simple_api.py      # Aplikasi FastAPI + skema database
    ├── .gitignore
    └── tokobuku.db        # Database SQLite (dibuat otomatis, tidak di-commit)
```

## Menjalankan Aplikasi

### Prasyarat

- Python **3.12+**
- `uv` (opsional, tapi disarankan)

### Pertama kali — pilih salah satu cara

**Cara A — pakai `uv` (disarankan, otomatis buat `.venv`)**

```powershell
uv sync
```

Jika `uv` belum terinstall:

```powershell
pip install uv
uv sync
```

**Cara B — pakai `pip` biasa**

```powershell
python -m venv .venv
.venv\Scripts\activate
pip install fastapi uvicorn
```

> ⚠️ **Jangan jalankan `python run.py` langsung** tanpa mengaktifkan `.venv` terlebih dahulu — `uvicorn` dan `fastapi` hanya ada di dalam `.venv`, bukan di instalasi Python sistem.

### Menjalankan (cara cepat)

Windows — double-click **`run.bat`**, atau dari terminal:

```powershell
# Jika pakai uv:
uv run python run.py

# Jika pakai venv biasa (sudah activate):
python run.py

# Tanpa activate, langsung tunjuk python di .venv:
.venv\Scripts\python.exe run.py
```

Browser akan terbuka otomatis di <http://localhost:8000>.

| Alamat | Keterangan |
|---|---|
| <http://localhost:8000> | Website |
| <http://localhost:8000/docs> | Dokumentasi API (Swagger UI) |
| <http://localhost:8000/health> | Health check |

Hentikan server dengan `Ctrl+C`.

`run.py` melayani halaman HTML, aset `css/` dan `js/`, serta seluruh endpoint `/api/*` dari satu port. Database otomatis dibuat di `backend/tokobuku.db` saat pertama kali dijalankan.

### Menjalankan tanpa auto-open browser

```powershell
uv run python run.py --no-browser
```

### Mengganti port

```powershell
$env:PORT=8080
uv run python run.py
```

Jika port diubah, sesuaikan juga `API_BASE_URL` di `js/config.js` agar frontend menunjuk ke port yang sama.

### Mode manual (backend dan frontend terpisah)

Berguna untuk debugging frontend dengan port terpisah.

```powershell
# Terminal 1 — backend
cd backend
..\.venv\Scripts\python.exe -m uvicorn simple_api:app --host 0.0.0.0 --port 8000 --reload
```

```powershell
# Terminal 2 — frontend, dari root project
.venv\Scripts\python.exe -m http.server 3000
```

Frontend: <http://localhost:3000> — Backend: <http://localhost:8000>.

## Konfigurasi

### `js/config.js`

| Key | Default | Fungsi |
|---|---|---|
| `API_BASE_URL` | `http://localhost:8000` | Alamat backend API |
| `GOOGLE_BOOK_API_BASE_URL` | Google Books API | Tidak dipakai saat ini |
| `TOKEN_KEY` | `bookstore_auth_token` | Key localStorage untuk token |
| `USER_KEY` | `bookstore_user_data` | Key localStorage untuk data user |
| `REVIEWS_KEY` | `bookstore_reviews_storage` | Disiapkan untuk fitur ulasan |
| `MOCK_USERS_KEY` | `mock_registered_users` | Sisa mode mock lama |

### Environment

| Variabel | Default | Keterangan |
|---|---|---|
| `PORT` | `8000` | Port server `run.py` |

### Data buku

Katalog, pencarian, dan detail buku diambil dari Open Library API. Harga tidak berasal dari API: harga dibuat deterministik dari ID buku (Rp 7.000–Rp 20.000) agar konsisten setiap kali halaman dimuat.

## Alur Halaman

1. `index.html` — katalog, pencarian, filter, dan tombol detail.
2. `book-detail.html?id=<work_id>` — detail buku dan aksi tambah ke keranjang/wishlist.
3. `cart.html` — daftar keranjang (perlu login).
4. `checkout.html` — isi data pengiriman dan metode pembayaran (perlu login, bukan mode tamu).
5. `history.html` — riwayat transaksi (perlu login).
6. `wishlist.html` — daftar wishlist (perlu login).
7. `login.html` / `register.html` — autentikasi, juga menyediakan "Lanjut sebagai Tamu".

## API

Semua endpoint berada di bawah `/api`. Endpoint bertanda **Auth** membutuhkan header:

```
Authorization: Bearer <token>
```

Token didapat dari respons login.

### Autentikasi

| Method | Endpoint | Body | Respons |
|---|---|---|---|
| `POST` | `/api/auth/register` | `{ fullName, email, password }` | `{ success, message }` |
| `POST` | `/api/auth/login` | `{ emailOrUsername, password }` | `{ success, token, user: { id, fullName, email } }` |

`emailOrUsername` boleh berisi email atau nama lengkap.

### Keranjang — Auth

| Method | Endpoint | Keterangan |
|---|---|---|
| `GET` | `/api/cart` | Daftar buku di keranjang |
| `POST` | `/api/cart` | Tambah buku; jika sudah ada, tidak ditambahkan dua kali |
| `DELETE` | `/api/cart/{book_id}` | Hapus satu buku |
| `DELETE` | `/api/cart` | Kosongkan keranjang |
| `GET` | `/api/cart/check/{book_id}` | Cek buku ada di keranjang |
| `GET` | `/api/cart/total` | Total harga dan jumlah judul |

Body `POST /api/cart`:

```json
{
  "id": "OL45804W",
  "title": "Judul Buku",
  "authors": ["Nama Penulis"],
  "price": 15000,
  "thumbnail": "https://...",
  "category": "Fiction"
}
```

Harga yang dikirim client tidak dipakai; server menghitung ulang harga dari ID buku.
Karena semua buku bersifat digital, satu judul hanya bisa ada satu kali di keranjang (tidak ada jumlah/quantity).

### Wishlist — Auth

| Method | Endpoint | Keterangan |
|---|---|---|
| `GET` | `/api/wishlist` | Daftar wishlist |
| `POST` | `/api/wishlist` | Tambah item |
| `DELETE` | `/api/wishlist/{book_id}` | Hapus item |
| `GET` | `/api/wishlist/check/{book_id}` | Cek item ada di wishlist |

### Transaksi — Auth

| Method | Endpoint | Keterangan |
|---|---|---|
| `POST` | `/api/transactions` | Simpan transaksi |
| `GET` | `/api/transactions` | Riwayat transaksi |
| `DELETE` | `/api/transactions` | Hapus semua riwayat |

Body `POST /api/transactions`:

```json
{
  "items": [
    { "id": "OL45804W", "title": "Judul Buku", "authors": ["Nama Penulis"] }
  ],
  "paymentMethod": "bca",
  "buyer": { "name": "Nama Pembeli", "email": "pembeli@mail.com" },
  "fromCart": true
}
```

- `total` **tidak dikirim** oleh client; server menghitung ulang harga tiap item dan total akhir.
- `fromCart: true` akan mengosongkan keranjang pengguna setelah transaksi tersimpan.
- Setiap judul dihitung 1 akses; duplikat dalam satu transaksi diabaikan.
- Pembayaran disimulasikan: aplikasi hanya menampilkan tujuan transfer/e-wallet toko, tidak meminta data sensitif pembeli (CVV, PIN, atau nomor rekening sendiri).

### Umum

| Method | Endpoint | Keterangan |
|---|---|---|
| `GET` | `/` | Halaman katalog |
| `GET` | `/health` | Health check |
| `GET` | `/docs` | Swagger UI |

## Database

- **Jenis:** SQLite, file `backend/tokobuku.db`
- **Akses:** query SQL langsung melalui modul `sqlite3`
- **Dibuat otomatis:** `init_db()` dijalankan saat server start
- **Migrasi otomatis:** kolom baru (`buyerName`, `buyerEmail`, `paymentDetail`) ditambahkan saat startup tanpa menghapus data lama; `quantity` di keranjang selalu direset ke 1
- **Password:** di-hash dengan SHA-256 (tanpa salt)

### Tabel

**`users`**

| Kolom | Tipe | Catatan |
|---|---|---|
| `id` | TEXT | Primary key |
| `fullName` | TEXT | Unik |
| `email` | TEXT | Unik |
| `password` | TEXT | SHA-256 |
| `createdAt` | TEXT | ISO timestamp |

**`cart`**

`id` (INTEGER, PK), `user_id`, `book_id`, `title`, `authors` (JSON), `price`, `thumbnail`, `category`, `addedAt`, `quantity`

**`wishlist`**

`id` (INTEGER, PK), `user_id`, `book_id`, `title`, `authors` (JSON), `price`, `thumbnail`, `category`, `addedAt`

**`transactions`**

`id` (TEXT, PK), `user_id`, `items` (JSON), `total`, `paymentMethod`, `buyerName`, `buyerEmail`, `paymentDetail` (JSON), `createdAt`

### Reset database

Hentikan server, hapus file database, lalu jalankan lagi:

```powershell
Remove-Item backend\tokobuku.db
uv run python run.py
```

Tabel akan dibuat ulang. Semua akun, keranjang, wishlist, dan riwayat akan hilang.

## Troubleshooting

**Port 8000 sudah dipakai**

```powershell
Get-NetTCPConnection -LocalPort 8000 -State Listen |
  ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

Atau jalankan dengan port lain (`$env:PORT=8080`).

**`uv` tidak tersedia**

Gunakan Python langsung:

```powershell
.venv\Scripts\python.exe run.py
```

Jika `.venv` belum ada, buat manual lalu pasang dependensi:

```powershell
python -m venv .venv
.venv\Scripts\python.exe -m pip install fastapi uvicorn
```

**Halaman tampil tetapi katalog kosong**

Katalog membutuhkan koneksi internet ke `openlibrary.org` dan `covers.openlibrary.org`. Periksa koneksi, lalu muat ulang halaman.

**Frontend tidak terhubung ke backend**

Pastikan `API_BASE_URL` di `js/config.js` sesuai alamat backend, dan backend benar-benar berjalan (`/health` merespons `{"status":"healthy"}`).

**Perubahan JS/CSS tidak muncul**

Lakukan hard reload (`Ctrl+Shift+R`) untuk melewati cache browser.

## Catatan Keamanan

Project ini ditujukan untuk pembelajaran dan pengembangan lokal. Sebelum dipakai di produksi:

- Ganti SHA-256 tanpa salt dengan algoritma hashing password yang tepat (misalnya Argon2/bcrypt).
- Gunakan token yang ditandatangani dan memiliki masa berlaku (JWT), bukan `token_<user_id>_<timestamp>`.
- Batasi CORS ke origin frontend saja.
- Tambahkan validasi input, rate limiting, HTTPS, dan logging.
- Pertimbangkan database server seperti PostgreSQL untuk beban produksi.

## Lisensi

Untuk keperluan edukasi.
