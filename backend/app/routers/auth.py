from fastapi import APIRouter, Depends, HTTPException, status

from app.core.deps import get_current_user
from app.core.security import create_access_token, hash_password, verify_password
from app.db.database import repository
from app.core.config import settings
from app.models.user import TokenResponse, UserCreate, UserLogin, UserOut, ProfileUpdate, PasswordChange, GoogleLogin

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: UserCreate):
    existing = await repository.find_one("users", {"email": payload.email})
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists")

    user_doc = {
        "full_name": payload.full_name,
        "email": payload.email,
        "hashed_password": hash_password(payload.password),
        "role": payload.role.value,
        "organization": payload.organization,
    }
    created = await repository.insert_one("users", user_doc)

    token = create_access_token({"sub": created["email"], "role": created["role"]})
    return TokenResponse(
        access_token=token,
        user=UserOut(
            id=created["_id"],
            full_name=created["full_name"],
            email=created["email"],
            role=created["role"],
            organization=created.get("organization"),
        ),
    )


@router.post("/login", response_model=TokenResponse)
async def login(payload: UserLogin):
    user = await repository.find_one("users", {"email": payload.email})
    if not user or not verify_password(payload.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    token = create_access_token({"sub": user["email"], "role": user["role"]})
    return TokenResponse(
        access_token=token,
        user=UserOut(
            id=user["_id"],
            full_name=user["full_name"],
            email=user["email"],
            role=user["role"],
            organization=user.get("organization"),
        ),
    )


@router.post("/google", response_model=TokenResponse)
async def google_login(payload: GoogleLogin):
    """Verify a Google Identity Services ID token and issue a NanoMed JWT."""
    if not settings.GOOGLE_CLIENT_ID.strip():
        raise HTTPException(status_code=503, detail="Google OAuth is not configured on the server")

    try:
        from google.oauth2 import id_token
        from google.auth.transport import requests as google_requests
        info = id_token.verify_oauth2_token(
            payload.credential, google_requests.Request(), settings.GOOGLE_CLIENT_ID.strip()
        )
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired Google credential")

    email = info.get("email")
    if not email or not info.get("email_verified"):
        raise HTTPException(status_code=401, detail="Google account email is not verified")

    existing = await repository.find_one("users", {"email": email})
    if existing:
        user = existing
        # Link Google login to an existing account without changing its password.
        if user.get("auth_provider") != "google":
            await repository.update_one("users", {"_id": user["_id"]}, {
                "google_sub": info.get("sub"), "auth_provider": "google"
            })
            user = {**user, "google_sub": info.get("sub"), "auth_provider": "google"}
    else:
        import secrets
        name = (info.get("name") or email.split("@")[0]).strip()[:100]
        user_doc = {
            "full_name": name,
            "email": email,
            "hashed_password": hash_password(secrets.token_urlsafe(32)),
            "role": "researcher",
            "organization": None,
            "google_sub": info.get("sub"),
            "auth_provider": "google",
        }
        user = await repository.insert_one("users", user_doc)

    token = create_access_token({"sub": user["email"], "role": user["role"]})
    return TokenResponse(
        access_token=token,
        user=UserOut(
            id=user["_id"], full_name=user["full_name"], email=user["email"],
            role=user["role"], organization=user.get("organization")
        ),
    )


@router.get("/me", response_model=UserOut)
async def me(current_user: UserOut = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=UserOut)
async def update_profile(payload: ProfileUpdate, current_user: UserOut = Depends(get_current_user)):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if updates:
        await repository.update_one("users", {"_id": current_user.id}, updates)
    user = await repository.find_one("users", {"_id": current_user.id})
    return UserOut(
        id=user["_id"],
        full_name=user["full_name"],
        email=user["email"],
        role=user["role"],
        organization=user.get("organization"),
    )


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
async def change_password(payload: PasswordChange, current_user: UserOut = Depends(get_current_user)):
    user = await repository.find_one("users", {"_id": current_user.id})
    if not verify_password(payload.current_password, user["hashed_password"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    await repository.update_one(
        "users", {"_id": current_user.id}, {"hashed_password": hash_password(payload.new_password)}
    )
