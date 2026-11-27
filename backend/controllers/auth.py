"""Authentication endpoints."""
from fastapi import APIRouter, HTTPException
import sqlite3
from models import (
    DB_NAME,
    hash_password,
    verify_password,
    generate_user_id,
    create_token,
)
from utils import get_timestamp

router = APIRouter()


@router.post("/api/auth/register")
async def register(data: dict):
    """Register new user."""
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


@router.post("/api/auth/login")
async def login(data: dict):
    """Login user and return token."""
    emailOrUsername = data.get("emailOrUsername", "").strip().lower()
    password = data.get("password", "")
    
    if not emailOrUsername or not password:
        raise HTTPException(status_code=400, detail="Email/Username dan kata sandi wajib diisi!")
    
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    
    is_email = "@" in emailOrUsername
    
    if is_email:
        cursor.execute("SELECT id, fullName, email, password, role, isActive FROM users WHERE email = ?", (emailOrUsername,))
    else:
        cursor.execute("SELECT id, fullName, email, password, role, isActive FROM users WHERE LOWER(fullName) = ?", (emailOrUsername,))
    
    user = cursor.fetchone()
    conn.close()
    
    if not user or not verify_password(password, user[3]):
        raise HTTPException(status_code=400, detail="Email/Username atau kata sandi salah!")
    
    # Tolak login jika akun di-ban
    if user[5] == 0:
        raise HTTPException(status_code=403, detail="Akun Anda telah dinonaktifkan. Hubungi administrator.")

    token = create_token(user[0])
    
    return {
        "success": True,
        "token": token,
        "user": {
            "id": user[0],
            "fullName": user[1],
            "email": user[2],
            "role": user[4] or "user",
            "isActive": bool(user[5])
        }
    }
