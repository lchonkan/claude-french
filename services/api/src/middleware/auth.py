"""Supabase JWT authentication middleware and FastAPI dependency.

Every protected endpoint should depend on ``get_current_user`` which:

1. Extracts the ``Bearer`` token from the ``Authorization`` header.
2. Verifies the JWT by calling Supabase ``auth.get_user(token)``.
3. Attaches the authenticated user to ``request.state.user``.
4. Returns a ``UserInfo`` dataclass for convenient access in route handlers.

Returns HTTP 401 when the token is missing, malformed, or invalid.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

logger = logging.getLogger(__name__)

# FastAPI security scheme -- generates the OpenAPI "Authorize" button
_bearer_scheme = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class UserInfo:
    """Minimal representation of an authenticated Supabase user."""

    id: str
    email: str | None
    role: str
    raw: dict[str, Any]


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
) -> UserInfo:
    """FastAPI dependency that verifies the Supabase JWT and returns user info.

    Usage in a route::

        @router.get("/me")
        async def me(user: UserInfo = Depends(get_current_user)):
            return {"user_id": user.id}

    Raises
    ------
    HTTPException(401)
        If the ``Authorization`` header is missing, the token format is
        wrong, or Supabase rejects the token.
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Empty bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # The Supabase client is stored on app state during the lifespan event.
    supabase = getattr(request.app.state, "supabase", None)
    if supabase is None:
        logger.error("Supabase client not initialized on app state.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication service not available.",
        )

    try:
        # supabase-py async: auth.get_user(token) verifies the JWT and
        # returns the user object or raises an error.
        user_response = await supabase.auth.get_user(token)
        user = user_response.user
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token.",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("JWT verification failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    user_info = UserInfo(
        id=str(user.id),
        email=getattr(user, "email", None),
        role=getattr(user, "role", "authenticated"),
        raw=user.__dict__ if hasattr(user, "__dict__") else {},
    )

    # Attach to request state for middleware or logging downstream.
    request.state.user = user_info

    return user_info
