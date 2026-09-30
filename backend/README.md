# Toko Buku Backend API

Backend API untuk aplikasi Toko Buku menggunakan Python, FastAPI, SQLite, dan SQLAlchemy.

## Fitur

- **Authentication**: Register dan Login dengan JWT token
- **Cart Management**: Tambah, hapus, dan lihat keranjang belanja
- **Wishlist Management**: Tambah, hapus, dan lihat daftar keinginan
- **Transaction History**: Simpan dan lihat riwayat pembelian

## Teknologi

- Python 3.8+
- FastAPI
- SQLAlchemy ORM
- SQLite Database
- JWT Authentication
- Bcrypt Password Hashing

## Instalasi

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Copy file .env.example ke .env (opsional):
```bash
cp .env.example .env
```

3. Jalankan server:
```bash
python run.py
```

Server akan berjalan di: http://localhost:8000

## API Endpoints

### Authentication

- `POST /api/auth/register` - Registrasi user baru
- `POST /api/auth/login` - Login user

### Cart

- `GET /api/cart` - Ambil semua item di cart
- `POST /api/cart` - Tambah item ke cart
- `DELETE /api/cart/{book_id}` - Hapus item dari cart
- `DELETE /api/cart` - Kosongkan cart
- `GET /api/cart/check/{book_id}` - Cek apakah item ada di cart
- `GET /api/cart/total` - Ambil total harga dan jumlah item

### Wishlist

- `GET /api/wishlist` - Ambil semua item di wishlist
- `POST /api/wishlist` - Tambah item ke wishlist
- `DELETE /api/wishlist/{book_id}` - Hapus item dari wishlist
- `GET /api/wishlist/check/{book_id}` - Cek apakah item ada di wishlist

### Transactions

- `POST /api/transactions` - Buat transaksi baru
- `GET /api/transactions` - Ambil riwayat transaksi
- `DELETE /api/transactions` - Hapus semua riwayat transaksi

### Health Check

- `GET /` - Info API
- `GET /health` - Health check

## API Documentation

Dokumentasi interaktif tersedia di:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Database Schema

### User
- id (String, PK)
- fullName (String, Unique)
- email (String, Unique)
- password (String, Hashed)
- createdAt (DateTime)

### Cart
- id (Integer, PK)
- user_id (String, FK)
- book_id (String)
- title (String)
- authors (JSON Array)
- price (Float)
- thumbnail (String)
- category (String)
- addedAt (DateTime)

### Wishlist
- id (Integer, PK)
- user_id (String, FK)
- book_id (String)
- title (String)
- authors (JSON Array)
- price (Float)
- stock (Integer)
- thumbnail (String)
- category (String)
- addedAt (DateTime)

### Transaction
- id (String, PK)
- user_id (String, FK)
- items (JSON Array)
- total (Float)
- paymentMethod (String)
- createdAt (DateTime)

## CORS

CORS sudah dikonfigurasi untuk menerima request dari semua origin. Untuk production, sebaiknya batasi hanya domain frontend yang diizinkan.

## Security Notes

⚠️ **PENTING untuk Production:**

1. Ganti `SECRET_KEY` di `auth.py` dengan key yang aman
2. Batasi CORS origins di `main.py`
3. Gunakan HTTPS
4. Gunakan database PostgreSQL/MySQL untuk production
5. Implementasikan rate limiting
6. Tambahkan logging dan monitoring

## Development

Database SQLite akan dibuat otomatis saat pertama kali server dijalankan dengan nama `tokobuku.db`.

Untuk reset database, hapus file `tokobuku.db` dan restart server.
