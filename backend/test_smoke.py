"""Smoke test untuk Toko Buku (pengganti backend/test_api2.py).

Menyalakan server dari salinan sementara repo (jadi database asli tidak
ikut berubah), lalu memeriksa endpoint utama. Tidak memakai akun atau
endpoint admin sama sekali.

Stdlib-only: urllib + subprocess.

Jalankan dari root repo:
    python backend/test_smoke.py

Butuh fastapi + uvicorn ter-install (misal: uv sync atau pip install
fastapi uvicorn). Keluar 0 kalau semua cek lolos, 1 kalau ada yang gagal.
"""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BACKEND = ROOT / "backend"
PORT = int(os.environ.get("SMOKE_PORT", "8123"))
BASE = f"http://127.0.0.1:{PORT}"

# Import harga server dari salinan repo yang sama, untuk membandingkan
# harga wishlist yang tersimpan (harus sama dengan hitungan server,
# bukan harga yang dikirim client).
sys.path.insert(0, str(BACKEND))
from utils import generate_price_from_id  # noqa: E402


def http(method, path, body=None, token=None):
    """Satu panggilan HTTP, kembalikan (status, json_atau_teks)."""
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.status, json.loads(resp.read() or b"{}")
    except urllib.error.HTTPError as e:
        raw = e.read()
        try:
            return e.code, json.loads(raw or b"{}")
        except json.JSONDecodeError:
            return e.code, raw.decode(errors="replace")
    except urllib.error.URLError as e:
        return None, f"tidak bisa terhubung: {e}"


def wait_for_health(proc, timeout=30):
    deadline = time.time() + timeout
    while time.time() < deadline:
        if proc.poll() is not None:
            return False, f"server berhenti sendiri (exit {proc.returncode})"
        status, _ = http("GET", "/health")
        if status == 200:
            return True, ""
        time.sleep(0.5)
    return False, "server tidak menjawab /health dalam 30 detik"


def main():
    # Cek dependensi server dulu, supaya gagalnya jelas.
    try:
        import fastapi  # noqa: F401
        import uvicorn  # noqa: F401
    except ImportError:
        print("SKIP: fastapi/uvicorn belum ter-install. Jalankan: uv sync")
        print("      atau: pip install fastapi uvicorn")
        return 2

    results = []

    def check(name, ok, detail=""):
        results.append((name, ok, detail))
        print(f"[{'OK' if ok else 'GAGAL'}] {name}" + (f" — {detail}" if detail and not ok else ""))

    # Salin repo ke folder sementara supaya database asli tidak berubah.
    tmp = Path(tempfile.mkdtemp(prefix="tokobuku-smoke-"))
    proc = None
    try:
        shutil.copytree(
            ROOT, tmp / "toko-buku",
            ignore=shutil.ignore_patterns(".git", "__pycache__", ".venv", "*.db"),
        )
        workdir = tmp / "toko-buku"
        env = dict(os.environ, PORT=str(PORT))
        proc = subprocess.Popen(
            [sys.executable, "run.py", "--no-browser"],
            cwd=workdir, env=env,
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )

        ok, why = wait_for_health(proc)
        check("server menyala & /health menjawab", ok, why)
        if not ok:
            return 1

        status, body = http("GET", "/health")
        check("/health mengembalikan status healthy",
              status == 200 and body.get("status") == "healthy",
              f"status={status}, body={body}")

        # Akun uji dengan email unik supaya tidak bentrok dengan data lama.
        email = f"smoke-{uuid.uuid4().hex[:8]}@contoh.id"
        status, body = http("POST", "/api/auth/register", {
            "fullName": "Smoke Test", "email": email, "password": "rahasia123",
        })
        check("register akun baru berhasil",
              status == 200 and body.get("success") is True,
              f"status={status}, body={body}")

        status, body = http("POST", "/api/auth/login", {
            "emailOrUsername": email, "password": "rahasia123",
        })
        token = body.get("token") if isinstance(body, dict) else None
        check("login berhasil dan token didapat",
              status == 200 and bool(token),
              f"status={status}, body={body}")
        if not token:
            return 1

        # Katalog metode pembayaran (Gramedia: QRIS, VA, e-wallet, kartu).
        status, methods = http("GET", "/api/payment-methods")
        ids = [m.get("id") for m in methods] if isinstance(methods, list) else []
        check("GET /api/payment-methods mengembalikan katalog",
              status == 200 and all(x in ids for x in
                  ["qris", "va_bca", "va_mandiri", "va_bri", "va_bni", "va_permata",
                   "gopay", "ovo", "dana", "shopeepay", "card"]),
              f"status={status}, ids={ids}")

        # Metode di luar katalog harus ditolak 400.
        status, body = http("POST", "/api/transactions", {
            "items": [{"id": "OL45804W", "title": "Buku Uji", "authors": ["Penulis Uji"]}],
            "paymentMethod": "tidak-ada",
            "buyer": {"name": "Smoke Test", "email": email},
        }, token=token)
        check("POST /api/transactions metode tidak dikenal ditolak 400",
              status == 400, f"status={status}, body={body}")

        # ID lama "bca" sudah tidak berlaku sejak jadi "va_bca".
        status, body = http("POST", "/api/transactions", {
            "items": [{"id": "OL45804W", "title": "Buku Uji", "authors": ["Penulis Uji"]}],
            "paymentMethod": "bca",
            "buyer": {"name": "Smoke Test", "email": email},
        }, token=token)
        check("POST /api/transactions id lama 'bca' ditolak 400",
              status == 400, f"status={status}, body={body}")

        # Transaksi QRIS berhasil dan menyimpan metodenya.
        status, body = http("POST", "/api/transactions", {
            "items": [{"id": "OL45804W", "title": "Buku Uji", "authors": ["Penulis Uji"]}],
            "paymentMethod": "qris",
            "buyer": {"name": "Smoke Test", "email": email},
        }, token=token)
        check("POST /api/transactions dengan QRIS berhasil",
              status == 200 and body.get("paymentMethod") == "qris",
              f"status={status}, body={body}")

        # Wishlist tanpa id harus ditolak 400.
        status, body = http("POST", "/api/wishlist",
                            {"title": "Tanpa ID"}, token=token)
        check("POST /api/wishlist tanpa id ditolak 400",
              status == 400, f"status={status}, body={body}")

        # Harga dari client harus diabaikan; server yang menghitung.
        book_id = "OL45804W"
        harga_client = 999999999
        status, body = http("POST", "/api/wishlist", {
            "id": book_id, "title": "Buku Uji", "authors": ["Penulis Uji"],
            "price": harga_client, "thumbnail": "", "category": "Fiksi",
        }, token=token)
        check("POST /api/wishlist dengan id berhasil",
              status == 200 and body.get("success") is True,
              f"status={status}, body={body}")

        status, items = http("GET", "/api/wishlist", token=token)
        harga_server = generate_price_from_id(book_id)
        tersimpan = None
        if isinstance(items, list):
            for item in items:
                if item.get("id") == book_id:
                    tersimpan = item.get("price")
        check("harga wishlist dihitung server, bukan dari client",
              tersimpan == harga_server and tersimpan != harga_client,
              f"harga tersimpan={tersimpan}, harga server={harga_server}, "
              f"harga client={harga_client}")

        # Duplikat harus ditolak dengan pesan, bukan dobel tersimpan.
        status, body = http("POST", "/api/wishlist", {
            "id": book_id, "title": "Buku Uji",
        }, token=token)
        check("wishlist duplikat ditolak",
              status == 200 and body.get("success") is False,
              f"status={status}, body={body}")
    finally:
        if proc is not None:
            proc.terminate()
            try:
                proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                proc.kill()
        shutil.rmtree(tmp, ignore_errors=True)

    gagal = [r for r in results if not r[1]]
    print(f"\n{len(results) - len(gagal)}/{len(results)} cek lolos.")
    if gagal:
        print("Yang gagal:")
        for name, _, detail in gagal:
            print(f"  - {name} {detail}")
        return 1
    print("Smoke test lolos.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
