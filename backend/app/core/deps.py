from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from app.core.security import decode_access_token
from app.db.database import repository
from app.models.user import UserOut, UserRole

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")
optional_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


async def get_current_user(token: str = Depends(oauth2_scheme)) -> UserOut:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    email = payload.get("sub")
    if email is None:
        raise credentials_exception

    user = await repository.find_one("users", {"email": email})
    if user is None:
        raise credentials_exception

    return UserOut(
        id=user["_id"],
        full_name=user["full_name"],
        email=user["email"],
        role=user["role"],
        organization=user.get("organization"),
    )


async def get_optional_user(token: Optional[str] = Depends(optional_oauth2_scheme)) -> Optional[UserOut]:
    """Same as `get_current_user` but returns None instead of raising when no
    (or an invalid) token is present. Used by endpoints — like the chatbot —
    that should work for anonymous visitors but unlock more when logged in."""
    if not token:
        return None
    payload = decode_access_token(token)
    if payload is None:
        return None
    email = payload.get("sub")
    if email is None:
        return None
    user = await repository.find_one("users", {"email": email})
    if user is None:
        return None
    return UserOut(
        id=user["_id"],
        full_name=user["full_name"],
        email=user["email"],
        role=user["role"],
        organization=user.get("organization"),
    )


def require_role(*roles: UserRole):
    async def checker(current_user: UserOut = Depends(get_current_user)) -> UserOut:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action",
            )
        return current_user

    return checker
