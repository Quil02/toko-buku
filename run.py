"""Jalankan seluruh website Toko Buku dengan satu perintah.

Contoh:
    .venv\\Scripts\\python.exe run.py
    uv run python run.py

Website + API akan tersedia di http://localhost:8000
"""

from __future__ import annotations

import os
import sys
import threading
import webbrowser
from pathlib import Path

import uvicorn
from fastapi import FastAPI, Response
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

ROOT = Path(__file__).resolve().parent
BACKEND = ROOT / "backend"
PORT = int(os.environ.get("PORT", "8000"))

# Backend memakai path database relatif (tokobuku.db), jadi jalankan dari folder backend.
os.chdir(BACKEND)
sys.path.insert(0, str(BACKEND))

from simple_api import app as api_app, init_db  # noqa: E402  (import setelah sys.path diatur)

# Sub-app yang di-mount tidak menjalankan startup event, jadi inisialisasi DB di sini.
init_db()


def create_app() -> FastAPI:
    """Bungkus API backend + file frontend dalam satu aplikasi."""
    app = FastAPI(title="Toko Buku")

    # Aset statis frontend
    app.mount("/css", StaticFiles(directory=ROOT / "css"), name="css")
    app.mount("/js", StaticFiles(directory=ROOT / "js"), name="js")

    # Halaman HTML di root project (index.html, cart.html, dst.)
    @app.get("/{page}.html", include_in_schema=False)
    async def html_page(page: str):
        file = ROOT / f"{page}.html"
        if file.is_file():
            return FileResponse(file)
        return FileResponse(ROOT / "index.html", status_code=404)

    @app.get("/", include_in_schema=False)
    async def home():
        return FileResponse(ROOT / "index.html")

    @app.get("/favicon.ico", include_in_schema=False)
    async def favicon():
        return Response(status_code=204)

    # Semua request lain (/api/..., /docs, /health) diteruskan ke backend.
    app.mount("/", api_app)
    return app


app = create_app()


def open_browser() -> None:
    webbrowser.open(f"http://localhost:{PORT}")


if __name__ == "__main__":
    print(f"Toko Buku berjalan di http://localhost:{PORT}")
    print("Tekan Ctrl+C untuk berhenti.\n")

    if "--no-browser" not in sys.argv:
        threading.Timer(1.5, open_browser).start()

    uvicorn.run(app, host="127.0.0.1", port=PORT)
