"""Transaction/payment endpoints."""
from fastapi import APIRouter, HTTPException, Header
from typing import Optional
import sqlite3
import json
from models import DB_NAME, get_user_from_token
from utils import get_timestamp, generate_price_from_id, generate_payment_id

router = APIRouter()


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


@router.post("/api/transactions")
async def create_transaction(data: dict, authorization: Optional[str] = Header(None)):
    """Create new transaction/checkout."""
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


@router.get("/api/transactions")
async def get_transactions(authorization: Optional[str] = Header(None)):
    """Get all transactions for authenticated user."""
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


@router.get("/api/transactions/check/{book_id}")
async def check_book_purchased(book_id: str, authorization: Optional[str] = Header(None)):
    """Cek apakah user sudah membeli buku tertentu."""
    user = get_user_from_token(authorization)
    if not user:
        return {"purchased": False}

    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute(
        "SELECT items FROM transactions WHERE user_id = ?",
        (user["id"],)
    )
    rows = cursor.fetchall()
    conn.close()

    for row in rows:
        try:
            items = json.loads(row[0]) or []
        except (TypeError, ValueError):
            items = []
        for item in items:
            if str(item.get("id") or "").strip() == str(book_id).strip():
                return {"purchased": True}

    return {"purchased": False}


@router.delete("/api/transactions")
async def clear_transactions(authorization: Optional[str] = Header(None)):
    """Clear all transaction history."""
    user = get_user_from_token(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM transactions WHERE user_id = ?", (user["id"],))
    conn.commit()
    conn.close()
    
    return {"success": True, "message": "Riwayat transaksi berhasil dihapus"}
