"""Wishlist management endpoints."""
from fastapi import APIRouter, HTTPException, Header
from typing import Optional
import sqlite3
import json
from models import DB_NAME, get_user_from_token
from utils import get_timestamp, generate_price_from_id

router = APIRouter()


@router.get("/api/wishlist")
async def get_wishlist(authorization: Optional[str] = Header(None)):
    """Get all wishlist items for authenticated user."""
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


@router.post("/api/wishlist")
async def add_to_wishlist(data: dict, authorization: Optional[str] = Header(None)):
    """Add book to wishlist."""
    user = get_user_from_token(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    book_id = str(data.get("id") or "").strip()
    if not book_id:
        raise HTTPException(status_code=400, detail="ID buku wajib diisi!")

    # Harga tidak dipercaya dari client; dihitung ulang di server.
    price = generate_price_from_id(book_id)
    
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
            price,
            data.get("thumbnail"),
            data.get("category"),
            get_timestamp()
        )
    )
    conn.commit()
    conn.close()
    
    return {"success": True, "message": "Item berhasil ditambahkan ke wishlist"}


@router.delete("/api/wishlist/{book_id}")
async def remove_from_wishlist(book_id: str, authorization: Optional[str] = Header(None)):
    """Remove book from wishlist."""
    user = get_user_from_token(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM wishlist WHERE user_id = ? AND book_id = ?", (user["id"], book_id))
    conn.commit()
    conn.close()
    
    return {"success": True, "message": "Item berhasil dihapus dari wishlist"}


@router.get("/api/wishlist/check/{book_id}")
async def check_in_wishlist(book_id: str, authorization: Optional[str] = Header(None)):
    """Check if book is in wishlist."""
    user = get_user_from_token(authorization)
    if not user:
        return {"inWishlist": False}
    
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM wishlist WHERE user_id = ? AND book_id = ?", (user["id"], book_id))
    exists = cursor.fetchone() is not None
    conn.close()
    
    return {"inWishlist": exists}
