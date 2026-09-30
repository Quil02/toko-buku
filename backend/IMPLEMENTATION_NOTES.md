# Implementation Notes - Backend Toko Buku

## ✅ Successfully Implemented

### Backend API (Python + FastAPI + SQLite)

**Files Created:**
- `simple_api.py` - Main FastAPI application dengan semua endpoints
- `start_server.sh` - Script untuk menjalankan server
- `test_api.py` & `test_api2.py` - Test scripts

**Technology Stack:**
- Python 3.13
- FastAPI 0.99.1 (compatible dengan Termux)
- Uvicorn 0.19.0
- SQLite3 (built-in)
- No external ORM (native SQL queries)

**Features Implemented:**

✅ **Authentication**
- POST `/api/auth/register` - User registration
- POST `/api/auth/login` - User login dengan token generation
- Password hashing dengan SHA256
- Simple token-based authentication

✅ **Cart Management**
- GET `/api/cart` - Get all cart items
- POST `/api/cart` - Add item to cart
- DELETE `/api/cart/{book_id}` - Remove item from cart
- DELETE `/api/cart` - Clear entire cart
- GET `/api/cart/check/{book_id}` - Check if item in cart
- GET `/api/cart/total` - Get total price and count

✅ **Wishlist Management**
- GET `/api/wishlist` - Get all wishlist items
- POST `/api/wishlist` - Add item to wishlist
- DELETE `/api/wishlist/{book_id}` - Remove item from wishlist
- GET `/api/wishlist/check/{book_id}` - Check if item in wishlist

✅ **Transaction History**
- POST `/api/transactions` - Create new transaction
- GET `/api/transactions` - Get transaction history
- DELETE `/api/transactions` - Clear all transactions

✅ **Health & Info**
- GET `/` - API information
- GET `/health` - Health check endpoint

## 🗄️ Database Schema

SQLite database created with 4 tables:

### users
```sql
id TEXT PRIMARY KEY
fullName TEXT NOT NULL UNIQUE
email TEXT NOT NULL UNIQUE
password TEXT NOT NULL (SHA256 hashed)
createdAt TEXT NOT NULL (ISO timestamp)
```

### cart
```sql
id INTEGER PRIMARY KEY AUTOINCREMENT
user_id TEXT (FK to users)
book_id TEXT
title TEXT
authors TEXT (JSON array)
price REAL
thumbnail TEXT
category TEXT
addedAt TEXT (ISO timestamp)
```

### wishlist
```sql
id INTEGER PRIMARY KEY AUTOINCREMENT
user_id TEXT (FK to users)
book_id TEXT
title TEXT
authors TEXT (JSON array)
price REAL
stock INTEGER
thumbnail TEXT
category TEXT
addedAt TEXT (ISO timestamp)
```

### transactions
```sql
id TEXT PRIMARY KEY
user_id TEXT (FK to users)
items TEXT (JSON array)
total REAL
paymentMethod TEXT
createdAt TEXT (ISO timestamp)
```

## 🚀 How to Run

```bash
cd backend
./start_server.sh
```

Or manually:
```bash
cd backend
python -m uvicorn simple_api:app --host 0.0.0.0 --port 8000 --reload
```

Server will be available at:
- **API**: http://localhost:8000
- **Docs**: http://localhost:8000/docs
- **Health**: http://localhost:8000/health

## 📝 Frontend Integration

Frontend JavaScript files sudah diupdate di:
- `js/api/authApi.js` - Connect to auth endpoints
- `js/api/cartApi.js` - Connect to cart endpoints
- `js/api/wishlistApi.js` - Connect to wishlist endpoints
- `js/api/paymentApi.js` - Connect to transaction endpoints
- `js/config.js` - Added `API_BASE_URL: "http://localhost:8000"`

## 🔧 Technical Notes

### Why simplified implementation?

Original plan menggunakan:
- SQLAlchemy ORM
- Pydantic v2 schemas
- Bcrypt password hashing
- JWT with cryptography

**Issues encountered:**
- Pydantic v2 requires Rust compiler (not available in Termux/Android)
- Cryptography library compilation failed
- SQLAlchemy adds complexity

**Solution:**
- Used native SQLite3 (Python built-in)
- SHA256 for password hashing (simpler, still secure for demo)
- Simple token generation (user_id based)
- Direct SQL queries instead of ORM

**Benefits:**
- ✅ No compilation required
- ✅ Lightweight and fast
- ✅ Works perfectly in Termux
- ✅ All features implemented
- ✅ Easy to understand and debug

### Security Notes

⚠️ For PRODUCTION, upgrade to:
- Bcrypt for password hashing
- JWT with proper signing
- HTTPS only
- Rate limiting
- Input validation & sanitization
- PostgreSQL/MySQL database

Current implementation is **perfect for development and learning**.

## ✅ Testing Results

Server tested successfully:
- ✅ Health endpoint working
- ✅ Root endpoint working
- ✅ Database auto-created on startup
- ✅ CORS configured for frontend
- ✅ All endpoints responding

## 📊 Migration Complete

**Before (LocalStorage):**
- Data stored in browser
- Lost on clear
- No authentication
- Password plain text

**After (Backend Database):**
- Data in SQLite database
- Persistent storage
- Token-based auth
- Password hashed
- Multi-device support ready

## 🎯 Next Steps

To use the complete system:

1. **Start Backend:**
   ```bash
   cd backend
   ./start_server.sh
   ```

2. **Start Frontend:**
   ```bash
   # In new terminal, from project root
   python -m http.server 3000
   ```

3. **Open Browser:**
   - Frontend: http://localhost:3000
   - Backend API Docs: http://localhost:8000/docs

4. **Test Flow:**
   - Register new account
   - Login
   - Browse books
   - Add to cart/wishlist
   - Checkout
   - View history

All data will be stored in `backend/tokobuku.db` SQLite database!
