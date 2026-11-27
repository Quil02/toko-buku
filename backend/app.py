"""FastAPI application entry point."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from models import init_db
from controllers import (
    auth_router,
    cart_router,
    wishlist_router,
    transaction_router,
    admin_router,
)

app = FastAPI(title="Toko Buku API", version="1.0.0")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database on startup
@app.on_event("startup")
def startup_event():
    init_db()

# Include routers
app.include_router(auth_router)
app.include_router(cart_router)
app.include_router(wishlist_router)
app.include_router(transaction_router)
app.include_router(admin_router)

# Health check endpoints
@app.get("/")
async def root():
    return {
        "message": "Toko Buku API",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
