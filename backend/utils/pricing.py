"""Price calculation utilities."""
import time
import random
import string

# Harga buku dibuat deterministik dari ID (sama dengan logika di js/api/bookApi.js),
# sehingga server bisa memvalidasi harga yang dikirim client.
PRICE_MIN = 7000
PRICE_MAX = 20000
PRICE_STEP = 1000


def generate_price_from_id(book_id: str) -> int:
    """Hitung harga dari ID buku, identik dengan generatePriceFromId() di frontend."""
    hash_value = 0
    for char in book_id or "":
        hash_value = (hash_value << 5) - hash_value + ord(char)
        # Tiru konversi int32 (hash |= 0) di JavaScript
        hash_value = ((hash_value + 0x80000000) % 0x100000000) - 0x80000000

    range_steps = (PRICE_MAX - PRICE_MIN) // PRICE_STEP  # 13
    return PRICE_MIN + (abs(hash_value) % (range_steps + 1)) * PRICE_STEP


def generate_payment_id():
    """Generate unique payment/transaction ID."""
    timestamp = str(int(time.time() * 1000))
    random_str = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
    return f"TBK-{timestamp}-{random_str}"
