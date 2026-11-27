"""Admin dashboard endpoints."""
from fastapi import APIRouter, Depends, HTTPException
import sqlite3
import json
from datetime import datetime, timedelta
from models.database import DB_NAME
from utils.auth import require_admin

router = APIRouter()


@router.get("/api/admin/stats")
async def get_admin_stats(user = Depends(require_admin)):
    """Get dashboard statistics."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    
    # Total users
    cursor.execute("SELECT COUNT(*) FROM users WHERE role != 'admin'")
    total_users = cursor.fetchone()[0]

    # Jumlah akun yang dinonaktifkan (softban)
    cursor.execute("SELECT COUNT(*) FROM users WHERE role != 'admin' AND isActive = 0")
    banned_users = cursor.fetchone()[0]
    
    # Total transactions
    cursor.execute("SELECT COUNT(*) FROM transactions")
    total_transactions = cursor.fetchone()[0]
    
    # Total revenue
    cursor.execute("SELECT COALESCE(SUM(total), 0) FROM transactions")
    total_revenue = cursor.fetchone()[0]
    
    # Average transaction value
    avg_transaction = total_revenue / total_transactions if total_transactions > 0 else 0
    
    # Top 5 best selling books
    cursor.execute("SELECT items FROM transactions")
    all_transactions = cursor.fetchall()
    
    book_sales = {}
    for (items_json,) in all_transactions:
        try:
            items = json.loads(items_json)
            for item in items:
                book_id = item.get("id")
                if book_id:
                    if book_id not in book_sales:
                        book_sales[book_id] = {
                            "id": book_id,
                            "title": item.get("title", "Unknown"),
                            "count": 0,
                            "revenue": 0
                        }
                    book_sales[book_id]["count"] += item.get("quantity", 1)
                    book_sales[book_id]["revenue"] += item.get("subtotal", 0)
        except (TypeError, ValueError, json.JSONDecodeError):
            pass
    
    top_books = sorted(book_sales.values(), key=lambda x: x["count"], reverse=True)[:5]
    
    # Transactions in last 7 days
    seven_days_ago = (datetime.utcnow() - timedelta(days=7)).isoformat()
    cursor.execute(
        "SELECT COUNT(*), COALESCE(SUM(total), 0) FROM transactions WHERE createdAt >= ?",
        (seven_days_ago,)
    )
    recent_tx = cursor.fetchone()
    transactions_last_7_days = recent_tx[0]
    revenue_last_7_days = recent_tx[1]
    
    conn.close()
    
    return {
        "totalUsers": total_users,
        "bannedUsers": banned_users,
        "totalTransactions": total_transactions,
        "totalRevenue": total_revenue,
        "avgTransaction": round(avg_transaction, 2),
        "topBooks": top_books,
        "last7Days": {
            "transactions": transactions_last_7_days,
            "revenue": revenue_last_7_days
        }
    }


@router.get("/api/admin/transactions")
async def get_all_transactions(user = Depends(require_admin)):
    """Get all transactions with user details."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT 
            t.id, t.user_id, t.items, t.total, t.paymentMethod, 
            t.buyerName, t.buyerEmail, t.paymentDetail, t.createdAt,
            u.fullName, u.email
        FROM transactions t
        LEFT JOIN users u ON t.user_id = u.id
        ORDER BY t.createdAt DESC
    """)
    
    transactions = cursor.fetchall()
    conn.close()
    
    result = []
    for tx in transactions:
        try:
            items = json.loads(tx[2])
        except (TypeError, ValueError, json.JSONDecodeError):
            items = []
        
        # Normalize items
        for item in items:
            item.setdefault("quantity", 1)
            item.setdefault("author", (item.get("authors") or ["Anonim"])[0])
            item.setdefault("subtotal", item.get("price", 0) * item["quantity"])
        
        try:
            payment_detail = json.loads(tx[7]) if tx[7] else None
        except (TypeError, ValueError, json.JSONDecodeError):
            payment_detail = None
        
        result.append({
            "id": tx[0],
            "userId": tx[1],
            "items": items,
            "itemCount": len(items),
            "total": tx[3],
            "paymentMethod": tx[4],
            "buyer": {"name": tx[5] or "", "email": tx[6] or ""},
            "paymentDetail": payment_detail,
            "createdAt": tx[8],
            "user": {
                "fullName": tx[9] or "Unknown",
                "email": tx[10] or "N/A"
            }
        })
    
    return result


@router.get("/api/admin/users")
async def get_all_users(user = Depends(require_admin)):
    """Get all users with transaction summary."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    
    # Get all users except admin, sertakan isActive
    cursor.execute("""
        SELECT id, fullName, email, createdAt, role, isActive
        FROM users 
        WHERE role != 'admin'
        ORDER BY createdAt DESC
    """)
    users = cursor.fetchall()
    
    result = []
    for u in users:
        user_id = u[0]
        
        # Count transactions
        cursor.execute(
            "SELECT COUNT(*), COALESCE(SUM(total), 0) FROM transactions WHERE user_id = ?",
            (user_id,)
        )
        tx_data = cursor.fetchone()
        
        result.append({
            "id": user_id,
            "fullName": u[1],
            "email": u[2],
            "createdAt": u[3],
            "role": u[4] or "user",
            "isActive": bool(u[5]) if u[5] is not None else True,
            "transactionCount": tx_data[0],
            "totalSpent": tx_data[1]
        })
    
    conn.close()
    return result


@router.patch("/api/admin/users/{user_id}/ban")
async def ban_user(user_id: str, user = Depends(require_admin)):
    """Nonaktifkan (ban) akun user."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    # Pastikan target bukan admin
    cursor.execute("SELECT role FROM users WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="User tidak ditemukan.")
    if row[0] == "admin":
        conn.close()
        raise HTTPException(status_code=403, detail="Tidak bisa menonaktifkan akun admin.")

    cursor.execute("UPDATE users SET isActive = 0 WHERE id = ?", (user_id,))
    conn.commit()
    conn.close()
    return {"success": True, "message": "Akun berhasil dinonaktifkan."}


@router.patch("/api/admin/users/{user_id}/unban")
async def unban_user(user_id: str, user = Depends(require_admin)):
    """Aktifkan kembali akun user yang di-ban."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    cursor.execute("SELECT role FROM users WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="User tidak ditemukan.")

    cursor.execute("UPDATE users SET isActive = 1 WHERE id = ?", (user_id,))
    conn.commit()
    conn.close()
    return {"success": True, "message": "Akun berhasil diaktifkan kembali."}
