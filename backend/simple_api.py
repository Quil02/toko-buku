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
            createdAt TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ''')
    
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
        parts = token.replace("Bearer ", "").split("_")
        if len(parts) >= 2:
            user_id = parts[1]
            conn = sqlite3.connect(DB_NAME)
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
            user = cursor.fetchone()
            conn.close()
            if user:
                return {"id": user[0], "fullName": user[1], "email": user[2]}
    except:
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
    cursor.execute("SELECT * FROM cart WHERE user_id = ?", (user["id"],))
    items = cursor.fetchall()
    conn.close()
    
    result = []
    for item in items:
        result.append({
            "id": item[2],  # book_id
            "title": item[3],
            "authors": json.loads(item[4]),
            "price": item[5],
            "thumbnail": item[6],
            "category": item[7],
            "addedAt": item[8]
        })
    
    return result

@app.post("/api/cart")
async def add_to_cart(data: dict, authorization: Optional[str] = Header(None)):
    user = get_user_from_token(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    book_id = data.get("id")
    
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    
    # Check if exists
    cursor.execute("SELECT * FROM cart WHERE user_id = ? AND book_id = ?", (user["id"], book_id))
    if cursor.fetchone():
        conn.close()
        return {"success": False, "message": "Item sudah ada di cart"}
    
    # Add to cart
    cursor.execute(
        "INSERT INTO cart (user_id, book_id, title, authors, price, thumbnail, category, addedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
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
    
    return {"success": True, "message": "Item berhasil ditambahkan ke cart"}

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
    cursor.execute("SELECT * FROM wishlist WHERE user_id = ?", (user["id"],))
    items = cursor.fetchall()
    conn.close()
    
    result = []
    for item in items:
        result.append({
            "id": item[2],  # book_id
            "title": item[3],
            "authors": json.loads(item[4]),
            "price": item[5],
            "stock": item[6],
            "thumbnail": item[7],
            "category": item[8],
            "addedAt": item[9]
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
        "INSERT INTO wishlist (user_id, book_id, title, authors, price, stock, thumbnail, category, addedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (
            user["id"],
            book_id,
            data.get("title", "Tanpa Judul"),
            json.dumps(data.get("authors", ["Anonim"])),
            data.get("price", 0),
            data.get("stock", 10),
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

@app.post("/api/transactions")
async def create_transaction(data: dict, authorization: Optional[str] = Header(None)):
    user = get_user_from_token(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    transaction_id = generate_payment_id()
    
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO transactions (id, user_id, items, total, paymentMethod, createdAt) VALUES (?, ?, ?, ?, ?, ?)",
        (
            transaction_id,
            user["id"],
            json.dumps(data.get("items", [])),
            data.get("total", 0),
            data.get("paymentMethod", ""),
            get_timestamp()
        )
    )
    conn.commit()
    conn.close()
    
    return {
        "id": transaction_id,
        "user_id": user["id"],
        "items": data.get("items", []),
        "total": data.get("total", 0),
        "paymentMethod": data.get("paymentMethod", ""),
        "createdAt": get_timestamp()
    }

@app.get("/api/transactions")
async def get_transactions(authorization: Optional[str] = Header(None)):
    user = get_user_from_token(authorization)
    if not user:
        return []
    
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM transactions WHERE user_id = ? ORDER BY createdAt DESC", (user["id"],))
    transactions = cursor.fetchall()
    conn.close()
    
    result = []
    for tx in transactions:
        result.append({
            "id": tx[0],
            "user_id": tx[1],
            "items": json.loads(tx[2]),
            "total": tx[3],
            "paymentMethod": tx[4],
            "createdAt": tx[5]
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
