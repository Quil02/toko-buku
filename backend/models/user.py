"""User authentication and token management."""
import hashlib
import time
import random
import string
import sqlite3
from .database import DB_NAME


def hash_password(password: str) -> str:
    """Hash password using SHA-256 (for educational purposes only)."""
    return hashlib.sha256(password.encode()).hexdigest()


def verify_password(plain: str, hashed: str) -> bool:
    """Verify plain password against hashed password."""
    return hash_password(plain) == hashed


def generate_user_id():
    """Generate unique user ID."""
    timestamp = int(time.time() * 1000)
    random_str = ''.join(random.choices(string.ascii_lowercase + string.digits, k=5))
    return f"user_{timestamp}_{random_str}"


def create_token(user_id: str) -> str:
    """Create authentication token for user."""
    return f"token_{user_id}_{int(time.time())}"


def get_user_from_token(token: str):
    """Extract and validate user from authentication token."""
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
        cursor.execute("SELECT id, fullName, email, role, isActive FROM users WHERE id = ?", (user_id,))
        user = cursor.fetchone()
        conn.close()
        if user:
            # Tolak token jika akun di-ban (isActive = 0)
            if user[4] == 0:
                return None
            return {
                "id": user[0],
                "fullName": user[1],
                "email": user[2],
                "role": user[3] or "user",
                "isActive": bool(user[4])
            }
    except Exception:
        pass
    return None
