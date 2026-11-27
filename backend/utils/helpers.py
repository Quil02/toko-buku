"""General helper functions."""
from datetime import datetime


def get_timestamp():
    """Get current UTC timestamp in ISO format."""
    return datetime.utcnow().isoformat()


def format_rupiah(amount: float) -> str:
    """Format number to Indonesian Rupiah."""
    return f"Rp {int(amount):,}".replace(",", ".")
