from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from app.core.config import settings

router = APIRouter(prefix="/api/auth", tags=["auth"])
security = HTTPBearer()


def verify_jwt(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Verifies the Supabase JWT token.
    Supabase signs JWTs with HS256 using the JWT secret.
    The token payload contains: sub (user_id), email, exp, etc.
    """
    token = credentials.credentials
    try:
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            options={"verify_aud": False}  # Supabase doesn't use standard aud
        )
        return payload
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


@router.get("/me")
def get_current_user(user=Depends(verify_jwt)):
    """Returns the current user's info from JWT payload."""
    return {"user_id": user.get("sub"), "email": user.get("email")}
