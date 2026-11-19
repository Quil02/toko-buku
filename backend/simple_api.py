from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List
import sqlite3
import json
import time
import random
import string
import hashlib

app = FastAPI(title="Toko Buku API", version="1.0.0")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_NAME = "tokobuku.db"

# Harga buku dibuat deterministik dari ID (sama dengan logika di js/api/bookApi.js),
# sehingga server bisa memvalidasi harga yang dikirim client.
PRICE_MIN = 7000
PRICE_MAX = 20000
PRICE_STEP = 1000



def generate_price_from_id(book_id: str) -> int:
    """Hitung harga dari ID buku, identik dengan generatePriceFromId() di frontend."""
    hash_value = 0
    for char in book_id or "":
        hash_value = (hash_value << 5) - hash_value + ord(char)
        # Tiru konversi int32 (hash |= 0) di JavaScript
        hash_value = ((hash_value + 0x80000000) % 0x100000000) - 0x80000000

    range_steps = (PRICE_MAX - PRICE_MIN) // PRICE_STEP  # 13
    return PRICE_MIN + (abs(hash_value) % (range_steps + 1)) * PRICE_STEP


def ensure_column(cursor, table: str, column: str, definition: str) -> None:
    """Tambahkan kolom ke tabel lama tanpa menghapus data."""
    cursor.execute(f"PRAGMA table_info({table})")
    existing = {row[1] for row in cursor.fetchall()}
    if column not in existing:
        cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")


# Database initialization
def init_db():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    
    # Users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            fullName TEXT NOT NULL UNIQUE,
            email TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            createdAt TEXT NOT NULL
        )
    ''')
    
    # Cart table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS cart (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            book_id TEXT NOT NULL,
            title TEXT NOT NULL,
            authors TEXT NOT NULL,
            price REAL NOT NULL,
            thumbnail TEXT,
            category TEXT,
            addedAt TEXT NOT NULL,
            quantity INTEGER NOT NULL DEFAULT 1,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ''')
    
    # Wishlist table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS wishlist (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            book_id TEXT NOT NULL,
            title TEXT NOT NULL,
            authors TEXT NOT NULL,
            price REAL NOT NULL,
            stock INTEGER DEFAULT 10,
            thumbnail TEXT,
            category TEXT,
            addedAt TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ''')
    
    # Transactions table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS transactions (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            items TEXT NOT NULL,
            total REAL NOT NULL,
            paymentMethod TEXT NOT NULL,
            buyerName TEXT,
            buyerEmail TEXT,
            paymentDetail TEXT,
            createdAt TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ''')
    
    # Migrasi untuk database lama
    ensure_column(cursor, "cart", "quantity", "INTEGER NOT NULL DEFAULT 1")
    ensure_column(cursor, "transactions", "buyerName", "TEXT")
    ensure_column(cursor, "transactions", "buyerEmail", "TEXT")
    ensure_column(cursor, "transactions", "paymentDetail", "TEXT")

    # Buku digital hanya butuh 1 eksemplar per judul, jadi quantity lama direset.
    cursor.execute("UPDATE cart SET quantity = 1 WHERE quantity IS NULL OR quantity <> 1")

    conn.commit()
    conn.close()

# Helper functions
def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(plain: str, hashed: str) -> bool:
    return hash_password(plain) == hashed

def generate_user_id():
    timestamp = int(time.time() * 1000)
    random_str = ''.join(random.choices(string.ascii_lowercase + string.digits, k=5))
    return f"user_{timestamp}_{random_str}"

def generate_payment_id():
    timestamp = str(int(time.time() * 1000))
    random_str = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
    return f"TBK-{timestamp}-{random_str}"

def create_token(user_id: str) -> str:
    return f"token_{user_id}_{int(time.time())}"

def get_user_from_token(token: str):
    if not token:
        return None
    try:
        raw = token.strip()
        if raw.lower().startswith("bearer "):
            raw = raw[7:].strip()
        if not raw.startswith("token_"):
            return None

        # Format token: token_<user_id>_<unix_timestamp>
        # user_id sendiri mengandung underscore (user_<timestamp>_<random>),
        # jadi timestamp diambil dari bagian paling akhir.
        payload = raw[len("token_"):]
        if "_" not in payload:
            return None
        user_id = payload.rsplit("_", 1)[0]
        if not user_id:
            return None

        conn = sqlite3.connect(DB_NAME)
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        user = cursor.fetchone()
        conn.close()
        if user:
            return {"id": user[0], "fullName": user[1], "email": user[2]}
    except Exception:
        pass
    return None

def get_timestamp():
    from datetime import datetime
    return datetime.utcnow().isoformat()

# Initialize database on startup
@app.on_event("startup")
def startup_event():
    init_db()

# ==================== AUTH ENDPOINTS ====================

@app.post("/api/auth/register")
async def register(data: dict):
    fullName = data.get("fullName", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    
    if not fullName or not email or not password:
        raise HTTPException(status_code=400, detail="Semua data wajib diisi!")
    
    if "@" not in email or "." not in email.split("@")[-1]:
        raise HTTPException(status_code=400, detail="Format email tidak valid!")
    
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Kata sandi minimal 6 karakter!")
    
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    
    # Check existing email
    cursor.execute("SELECT * FROM users WHERE email = ?", (email,))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail="Email sudah terdaftar. Silakan gunakan email lain atau masuk ke akun Anda.")
    
    # Check existing name
    cursor.execute("SELECT * FROM users WHERE LOWER(fullName) = ?", (fullName.lower(),))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail="Nama pengguna sudah digunakan. Silakan gunakan nama lain.")
    
    # Create user
    user_id = generate_user_id()
    hashed_pwd = hash_password(password)
    timestamp = get_timestamp()
    
    cursor.execute(
        "INSERT INTO users (id, fullName, email, password, createdAt) VALUES (?, ?, ?, ?, ?)",
        (user_id, fullName, email, hashed_pwd, timestamp)
    )
    conn.commit()
    conn.close()
    
    return {"success": True, "message": "Registrasi berhasil!"}

@app.post("/api/auth/login")
async def login(data: dict):
    emailOrUsername = data.get("emailOrUsername", "").strip().lower()
    password = data.get("password", "")
    
    if not emailOrUsername or not password:
        raise HTTPException(status_code=400, detail="Email/Username dan kata sandi wajib diisi!")
    
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    
    is_email = "@" in emailOrUsername
    
    if is_email:
        cursor.execute("SELECT * FROM users WHERE email = ?", (emailOrUsername,))
    else:
        cursor.execute("SELECT * FROM users WHERE LOWER(fullName) = ?", (emailOrUsername,))
    
    user = cursor.fetchone()
    conn.close()
    
    if not user or not verify_password(password, user[3]):
        raise HTTPException(status_code=400, detail="Email/Username atau kata sandi salah!")
    
    token = create_token(user[0])
    
    return {
        "success": True,
        "token": token,
        "user": {
            "id": user[0],
            "fullName": user[1],
            "email": user[2]
        }
    }

# ==================== CART ENDPOINTS ====================

@app.get("/api/cart")
async def get_cart(authorization: Optional[str] = Header(None)):
    user = get_user_from_token(authorization)
    if not user:
        return []
    
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute(
        "SELECT book_id, title, authors, price, thumbnail, category, addedAt "
        "FROM cart WHERE user_id = ? ORDER BY addedAt ASC",
        (user["id"],)
    )
    items = cursor.fetchall()
    conn.close()
    
    result = []
    for item in items:
        try:
            authors = json.loads(item[2])
        except (TypeError, ValueError):
            authors = [item[2]] if item[2] else ["Anonim"]
        
        result.append({
            "id": item[0],  # book_id
            "title": item[1],
            "authors": authors,
            "price": item[3],
            "thumbnail": item[4],
            "category": item[5],
            "addedAt": item[6],
        })
    
    return result

@app.post("/api/cart")
async def add_to_cart(data: dict, authorization: Optional[str] = Header(None)):
    user = get_user_from_token(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    book_id = str(data.get("id") or "").strip()
    if not book_id:
        raise HTTPException(status_code=400, detail="ID buku wajib diisi!")
    
    authors = data.get("authors") or ["Anonim"]
    if not isinstance(authors, list):
        authors = [str(authors)]
    
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    
    # Harga tidak dipercaya dari client; dihitung ulang di server.
    price = generate_price_from_id(book_id)
    
    # Buku digital: satu judul hanya boleh ada sekali di keranjang.
    cursor.execute(
        "SELECT book_id FROM cart WHERE user_id = ? AND book_id = ?",
        (user["id"], book_id)
    )
    if cursor.fetchone():
        conn.close()
        return {
            "success": True,
            "alreadyInCart": True,
            "message": "Buku ini sudah ada di keranjang",
            "price": price,
        }
    
    cursor.execute(
        "INSERT INTO cart (user_id, book_id, title, authors, price, thumbnail, category, addedAt, quantity) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)",
        (
            user["id"],
            book_id,
            str(data.get("title") or "Tanpa Judul"),
            json.dumps(authors),
            price,
            data.get("thumbnail"),
            data.get("category"),
            get_timestamp(),
        )
    )
    conn.commit()
    conn.close()
    
    return {
        "success": True,
        "alreadyInCart": False,
        "message": "Buku berhasil ditambahkan ke keranjang",
        "price": price,
    }

@app.delete("/api/cart/{book_id}")
async def remove_from_cart(book_id: str, authorization: Optional[str] = Header(None)):
    user = get_user_from_token(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM cart WHERE user_id = ? AND book_id = ?", (user["id"], book_id))
    conn.commit()
    conn.close()
    
    return {"success": True, "message": "Item berhasil dihapus dari cart"}

@app.delete("/api/cart")
async def clear_cart(authorization: Optional[str] = Header(None)):
    user = get_user_from_token(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM cart WHERE user_id = ?", (user["id"],))
    conn.commit()
    conn.close()
    
    return {"success": True, "message": "Cart berhasil dikosongkan"}

@app.get("/api/cart/check/{book_id}")
async def check_in_cart(book_id: str, authorization: Optional[str] = Header(None)):
    user = get_user_from_token(authorization)
    if not user:
        return {"inCart": False}
    
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM cart WHERE user_id = ? AND book_id = ?", (user["id"], book_id))
    exists = cursor.fetchone() is not None
    conn.close()
    
    return {"inCart": exists}

@app.get("/api/cart/total")
async def get_cart_total(authorization: Optional[str] = Header(None)):
    user = get_user_from_token(authorization)
    if not user:
        return {"total": 0, "count": 0}
    
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute("SELECT price FROM cart WHERE user_id = ?", (user["id"],))
    items = cursor.fetchall()
    conn.close()
    
    # Buku digital: setiap judul dihitung 1 eksemplar.
    total = sum(item[0] for item in items)
    count = len(items)
    
    return {"total": total, "count": count}

# ==================== WISHLIST ENDPOINTS ====================

@app.get("/api/wishlist")
async def get_wishlist(authorization: Optional[str] = Header(None)):
    user = get_user_from_token(authorization)
    if not user:
        return []
    
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute(
        "SELECT book_id, title, authors, price, thumbnail, category, addedAt "
        "FROM wishlist WHERE user_id = ? ORDER BY addedAt ASC",
        (user["id"],)
    )
    items = cursor.fetchall()
    conn.close()
    
    result = []
    for item in items:
        result.append({
            "id": item[0],  # book_id
            "title": item[1],
            "authors": json.loads(item[2]),
            "price": item[3],
            "thumbnail": item[4],
            "category": item[5],
            "addedAt": item[6]
        })
    
    return result

@app.post("/api/wishlist")
async def add_to_wishlist(data: dict, authorization: Optional[str] = Header(None)):
    user = get_user_from_token(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    book_id = data.get("id")
    
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    
    # Check if exists
    cursor.execute("SELECT * FROM wishlist WHERE user_id = ? AND book_id = ?", (user["id"], book_id))
    if cursor.fetchone():
        conn.close()
        return {"success": False, "message": "Item sudah ada di wishlist"}
    
    # Add to wishlist
    cursor.execute(
        "INSERT INTO wishlist (user_id, book_id, title, authors, price, thumbnail, category, addedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (
            user["id"],
            book_id,
            data.get("title", "Tanpa Judul"),
            json.dumps(data.get("authors", ["Anonim"])),
            data.get("price", 0),
            data.get("thumbnail"),
            data.get("category"),
            get_timestamp()
        )
    )
    conn.commit()
    conn.close()
    
    return {"success": True, "message": "Item berhasil ditambahkan ke wishlist"}

@app.delete("/api/wishlist/{book_id}")
async def remove_from_wishlist(book_id: str, authorization: Optional[str] = Header(None)):
    user = get_user_from_token(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM wishlist WHERE user_id = ? AND book_id = ?", (user["id"], book_id))
    conn.commit()
    conn.close()
    
    return {"success": True, "message": "Item berhasil dihapus dari wishlist"}

@app.get("/api/wishlist/check/{book_id}")
async def check_in_wishlist(book_id: str, authorization: Optional[str] = Header(None)):
    user = get_user_from_token(authorization)
    if not user:
        return {"inWishlist": False}
    
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM wishlist WHERE user_id = ? AND book_id = ?", (user["id"], book_id))
    exists = cursor.fetchone() is not None
    conn.close()
    
    return {"inWishlist": exists}

# ==================== TRANSACTION ENDPOINTS ====================

def normalize_transaction_items(raw_items) -> list:
    """Validasi item transaksi dan hitung harga/total di server."""
    merged = {}

    for item in raw_items or []:
        if not isinstance(item, dict):
            continue

        book_id = str(item.get("id") or "").strip()
        if not book_id:
            continue

        # Buku digital: setiap judul dihitung 1 eksemplar, duplikat diabaikan.
        if book_id in merged:
            continue

        authors = item.get("authors")
        if not isinstance(authors, list):
            authors = [item.get("author") or "Anonim"]
        authors = [str(author) for author in authors] or ["Anonim"]

        # Harga selalu dihitung ulang di server, bukan dari client.
        price = generate_price_from_id(book_id)

        merged[book_id] = {
            "id": book_id,
            "title": str(item.get("title") or "Tanpa Judul"),
            "author": authors[0],
            "authors": authors,
            "thumbnail": item.get("thumbnail"),
            "price": price,
            "quantity": 1,
            "subtotal": price,
        }

    return list(merged.values())


@app.post("/api/transactions")
async def create_transaction(data: dict, authorization: Optional[str] = Header(None)):
    user = get_user_from_token(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    payment_method = str(data.get("paymentMethod") or "").strip()
    if not payment_method:
        raise HTTPException(status_code=400, detail="Metode pembayaran wajib dipilih!")
    
    items = normalize_transaction_items(data.get("items"))
    if not items:
        raise HTTPException(status_code=400, detail="Tidak ada item yang bisa diproses!")
    
    total = sum(item["subtotal"] for item in items)
    transaction_id = generate_payment_id()
    created_at = get_timestamp()
    
    buyer = data.get("buyer") or {}
    buyer_name = str(buyer.get("name") or user.get("fullName") or "")
    buyer_email = str(buyer.get("email") or user.get("email") or "")
    payment_detail = data.get("paymentDetail")
    payment_detail_json = (
        json.dumps(payment_detail, ensure_ascii=False)
        if isinstance(payment_detail, dict) else None
    )
    
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO transactions "
        "(id, user_id, items, total, paymentMethod, buyerName, buyerEmail, paymentDetail, createdAt) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (
            transaction_id,
            user["id"],
            json.dumps(items, ensure_ascii=False),
            total,
            payment_method,
            buyer_name,
            buyer_email,
            payment_detail_json,
            created_at,
        )
    )
    
    # Transaksi dari keranjang sekaligus mengosongkan keranjang.
    if data.get("fromCart"):
        cursor.execute("DELETE FROM cart WHERE user_id = ?", (user["id"],))
    
    conn.commit()
    conn.close()
    
    return {
        "id": transaction_id,
        "user_id": user["id"],
        "items": items,
        "total": total,
        "paymentMethod": payment_method,
        "buyer": {"name": buyer_name, "email": buyer_email},
        "paymentDetail": payment_detail,
        "createdAt": created_at,
    }

@app.get("/api/transactions")
async def get_transactions(authorization: Optional[str] = Header(None)):
    user = get_user_from_token(authorization)
    if not user:
        return []
    
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, user_id, items, total, paymentMethod, buyerName, buyerEmail, paymentDetail, createdAt "
        "FROM transactions WHERE user_id = ? ORDER BY createdAt DESC",
        (user["id"],)
    )
    transactions = cursor.fetchall()
    conn.close()
    
    result = []
    for tx in transactions:
        try:
            items = json.loads(tx[2])
        except (TypeError, ValueError):
            items = []
        
        # Data lama belum punya quantity/author/subtotal.
        for item in items:
            item.setdefault("quantity", 1)
            item.setdefault("author", (item.get("authors") or ["Anonim"])[0])
            item.setdefault("subtotal", item.get("price", 0) * item["quantity"])
        
        try:
            payment_detail = json.loads(tx[7]) if tx[7] else None
        except (TypeError, ValueError):
            payment_detail = None
        
        result.append({
            "id": tx[0],
            "user_id": tx[1],
            "items": items,
            "total": tx[3],
            "paymentMethod": tx[4],
            "buyer": {"name": tx[5] or "", "email": tx[6] or ""},
            "paymentDetail": payment_detail,
            "createdAt": tx[8],
        })
    
    return result

@app.delete("/api/transactions")
async def clear_transactions(authorization: Optional[str] = Header(None)):
    user = get_user_from_token(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM transactions WHERE user_id = ?", (user["id"],))
    conn.commit()
    conn.close()
    
    return {"success": True, "message": "Riwayat transaksi berhasil dihapus"}

# ==================== HEALTH CHECK ====================

@app.get("/")
async def root():
    return {
        "message": "Toko Buku API",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
