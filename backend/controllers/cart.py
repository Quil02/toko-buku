"""Cart management endpoints."""
from fastapi import APIRouter, HTTPException, Header
from typing import Optional
import sqlite3
import json
from models import DB_NAME, get_user_from_token
from utils import get_timestamp, generate_price_from_id

router = APIRouter()


@router.get("/api/cart")
async def get_cart(authorization: Optional[str] = Header(None)):
    """Get all cart items for authenticated user."""
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


@router.post("/api/cart")
async def add_to_cart(data: dict, authorization: Optional[str] = Header(None)):
    """Add book to cart."""
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


@router.delete("/api/cart/{book_id}")
async def remove_from_cart(book_id: str, authorization: Optional[str] = Header(None)):
    """Remove book from cart."""
    user = get_user_from_token(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM cart WHERE user_id = ? AND book_id = ?", (user["id"], book_id))
    conn.commit()
    conn.close()
    
    return {"success": True, "message": "Item berhasil dihapus dari cart"}


@router.delete("/api/cart")
async def clear_cart(authorization: Optional[str] = Header(None)):
    """Clear all items from cart."""
    user = get_user_from_token(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM cart WHERE user_id = ?", (user["id"],))
    conn.commit()
    conn.close()
    
    return {"success": True, "message": "Cart berhasil dikosongkan"}


@router.get("/api/cart/check/{book_id}")
async def check_in_cart(book_id: str, authorization: Optional[str] = Header(None)):
    """Check if book is in cart."""
    user = get_user_from_token(authorization)
    if not user:
        return {"inCart": False}
    
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM cart WHERE user_id = ? AND book_id = ?", (user["id"], book_id))
    exists = cursor.fetchone() is not None
    conn.close()
    
    return {"inCart": exists}


@router.get("/api/cart/total")
async def get_cart_total(authorization: Optional[str] = Header(None)):
    """Get cart total and item count."""
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
