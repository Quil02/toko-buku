"""Database schema and initialization."""
import sqlite3

DB_NAME = "tokobuku.db"


def ensure_column(cursor, table: str, column: str, definition: str) -> None:
    """Tambahkan kolom ke tabel lama tanpa menghapus data."""
    cursor.execute(f"PRAGMA table_info({table})")
    existing = {row[1] for row in cursor.fetchall()}
    if column not in existing:
        cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")


def init_db():
    """Initialize database tables and run migrations."""
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
    ensure_column(cursor, "users", "role", "TEXT NOT NULL DEFAULT 'user'")
    ensure_column(cursor, "users", "isActive", "INTEGER NOT NULL DEFAULT 1")

    # Buku digital hanya butuh 1 eksemplar per judul, jadi quantity lama direset.
    cursor.execute("UPDATE cart SET quantity = 1 WHERE quantity IS NULL OR quantity <> 1")

    # Seed admin account jika belum ada
    cursor.execute("SELECT COUNT(*) FROM users WHERE role = 'admin'")
    admin_count = cursor.fetchone()[0]
    if admin_count == 0:
        from .user import hash_password, generate_user_id
        from utils.helpers import get_timestamp
        admin_id = generate_user_id()
        admin_password = hash_password("admin123")  # Default password
        cursor.execute(
            "INSERT INTO users (id, fullName, email, password, role, createdAt) VALUES (?, ?, ?, ?, ?, ?)",
            (admin_id, "Admin", "admin@tokobuku.com", admin_password, "admin", get_timestamp())
        )

    conn.commit()
    conn.close()
