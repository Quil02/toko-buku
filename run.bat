@echo off
cd /d "%~dp0"

if exist ".venv\Scripts\python.exe" (
    echo Menjalankan Toko Buku...
    ".venv\Scripts\python.exe" run.py %*
) else (
    echo.
    echo [ERROR] Virtual environment tidak ditemukan!
    echo Jalankan perintah ini dulu untuk menginstall dependensi:
    echo.
    echo     uv sync
    echo.
    echo Jika uv belum terinstall:
    echo     pip install uv
    echo     uv sync
    echo.
    pause
    exit /b 1
)

pause
