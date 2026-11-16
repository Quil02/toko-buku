# Toko Buku - E-commerce Aplikasi Buku

Aplikasi toko buku online dengan frontend JavaScript dan backend Python.

## Teknologi

**Frontend:**
- HTML5, CSS3, JavaScript (ES6+)
- Open Library API untuk data buku

**Backend:**
- Python 3.8+
- FastAPI - Web framework
- SQLite - Database
- Token-based authentication

## Fitur

✅ User authentication (register & login)  
✅ Browse & search buku  
✅ Shopping cart management  
✅ Wishlist management  
✅ Transaction history  
✅ Persistent database storage  

## Quick Start

### Cara cepat — satu perintah, satu port

Windows (double-click `run.bat`, atau dari terminal):

```powershell
run.bat
```

Alternatif:

```powershell
.venv\Scripts\python.exe run.py
# atau
uv run python run.py
```

Lalu buka **http://localhost:8000** (browser terbuka otomatis).
Website, API, dan database berjalan dari satu server — tidak perlu terminal kedua.

- Website: **http://localhost:8000**
- API Docs: **http://localhost:8000/docs**
- Tekan `Ctrl+C` untuk berhenti.

### Cara manual — backend & frontend terpisah

```bash
# Terminal 1
cd backend
python -m uvicorn simple_api:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2 (dari root project)
python -m http.server 3000
```

Frontend: **http://localhost:3000** — Backend: **http://localhost:8000**

### Test Aplikasi

1. Buka http://localhost:8000
2. Register akun baru
3. Login
4. Browse buku
5. Tambah ke cart/wishlist
6. Checkout & lihat history

## Struktur Project

```
tokoBuku/
├── run.py                # Jalankan website + API dalam satu perintah
├── run.bat               # Shortcut Windows (double-click)
├── backend/              # Backend Python API
│   ├── simple_api.py     # FastAPI application
│   ├── start_server.sh   # Server startup
│   ├── tokobuku.db       # SQLite database
│   └── requirements.txt  # Dependencies
│
├── js/                   # Frontend JavaScript
│   ├── api/              # API clients
│   ├── pages/            # Page controllers
│   └── utils/            # Utilities
│
├── css/                  # Stylesheets
├── *.html                # HTML pages
└── README.md             # This file
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login (get token)

### Cart (Auth Required)
- `GET /api/cart` - List items
- `POST /api/cart` - Add item
- `DELETE /api/cart/{book_id}` - Remove item
- `DELETE /api/cart` - Clear cart

### Wishlist (Auth Required)
- `GET /api/wishlist` - List items
- `POST /api/wishlist` - Add item
- `DELETE /api/wishlist/{book_id}` - Remove item

### Transactions (Auth Required)
- `POST /api/transactions` - Create transaction
- `GET /api/transactions` - Get history
- `DELETE /api/transactions` - Clear history

## Database

**Type:** SQLite  
**Location:** `backend/tokobuku.db`

**Tables:**
- users - User accounts
- cart - Shopping cart items
- wishlist - Wishlist items
- transactions - Purchase history

## Troubleshooting

**Backend tidak start:**
```bash
cd backend
pip install fastapi uvicorn
python -m uvicorn simple_api:app --host 0.0.0.0 --port 8000
```

**Frontend tidak connect:**
- Pastikan backend berjalan di port 8000
- Check `js/config.js` - `API_BASE_URL` harus `http://localhost:8000`

**Reset database:**
```bash
cd backend
rm tokobuku.db
# Restart server
```

## License

Educational purposes.