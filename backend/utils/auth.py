"""Authentication middleware and dependencies."""
from fastapi import Header, HTTPException
from typing import Optional
from models.user import get_user_from_token


def require_auth(authorization: Optional[str] = Header(None)):
    """Require authenticated user."""
    user = get_user_from_token(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return user


def require_admin(authorization: Optional[str] = Header(None)):
    """Require admin role."""
    user = get_user_from_token(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Forbidden: Admin access required")
    
    return user
