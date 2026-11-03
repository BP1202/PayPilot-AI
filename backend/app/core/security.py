import base64
import binascii
import hashlib
import hmac
import json
import secrets
from datetime import UTC, datetime, timedelta
from typing import Any

from app.core.config import settings


class SecurityError(Exception):
    """Base exception for authentication and token validation errors."""


class ExpiredTokenError(SecurityError):
    """Raised when an authentication token has expired."""


class InvalidTokenError(SecurityError):
    """Raised when an authentication token is malformed or signature is invalid."""


def hash_password(password: str) -> str:
    """Hashes a plaintext password using PBKDF2-HMAC-SHA256 with a unique cryptographic salt."""
    salt = secrets.token_hex(16)
    iterations = 100_000
    hash_bytes = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        iterations,
    )
    return f"pbkdf2:sha256:{iterations}${salt}${hash_bytes.hex()}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plaintext password against a PBKDF2-HMAC-SHA256 hash using constant-time comparison."""
    try:
        parts = hashed_password.split("$")
        if len(parts) != 3:
            return False
        header, salt, expected_hash = parts
        _, _, iterations_str = header.split(":")
        iterations = int(iterations_str)

        computed_bytes = hashlib.pbkdf2_hmac(
            "sha256",
            plain_password.encode("utf-8"),
            salt.encode("utf-8"),
            iterations,
        )
        return hmac.compare_digest(computed_bytes.hex(), expected_hash)
    except (ValueError, TypeError, AttributeError):
        return False


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(data: str) -> bytes:
    padding = 4 - (len(data) % 4)
    if padding != 4:
        data += "=" * padding
    return base64.urlsafe_b64decode(data.encode("ascii"))


def create_access_token(
    user_id: str,
    email: str,
    expires_delta: timedelta | None = None,
) -> str:
    """Generates an RFC 7519 compliant HMAC-SHA256 JWT access token."""
    now = datetime.now(UTC)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.AUTH_TOKEN_EXPIRE_MINUTES)

    header = {"alg": settings.AUTH_ALGORITHM, "typ": "JWT"}
    payload = {
        "sub": str(user_id),
        "email": str(email).lower(),
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
        "jti": secrets.token_hex(16),
    }

    header_b64 = _b64url_encode(
        json.dumps(header, separators=(",", ":")).encode("utf-8")
    )
    payload_b64 = _b64url_encode(
        json.dumps(payload, separators=(",", ":")).encode("utf-8")
    )
    signing_input = f"{header_b64}.{payload_b64}".encode("ascii")

    signature = hmac.new(
        settings.AUTH_SECRET_KEY.encode("utf-8"),
        signing_input,
        hashlib.sha256,
    ).digest()
    signature_b64 = _b64url_encode(signature)

    return f"{header_b64}.{payload_b64}.{signature_b64}"


def decode_access_token(token: str) -> dict[str, Any]:
    """Validates signature, structure, and expiration of an access token."""
    try:
        parts = token.strip().split(".")
        if len(parts) != 3:
            raise InvalidTokenError("Malformed token structure.")

        header_b64, payload_b64, signature_b64 = parts
        signing_input = f"{header_b64}.{payload_b64}".encode("ascii")

        # Verify cryptographic signature using constant-time comparison
        expected_sig = hmac.new(
            settings.AUTH_SECRET_KEY.encode("utf-8"),
            signing_input,
            hashlib.sha256,
        ).digest()
        provided_sig = _b64url_decode(signature_b64)

        if not hmac.compare_digest(expected_sig, provided_sig):
            raise InvalidTokenError("Invalid token signature.")

        # Decode header and enforce expected algorithm
        header = json.loads(_b64url_decode(header_b64).decode("utf-8"))
        if header.get("alg") != settings.AUTH_ALGORITHM:
            raise InvalidTokenError("Unsupported token algorithm.")

        # Decode payload
        payload = json.loads(_b64url_decode(payload_b64).decode("utf-8"))
    except (
        SecurityError,
        ValueError,
        KeyError,
        json.JSONDecodeError,
        binascii.Error,
    ) as err:
        if isinstance(err, SecurityError):
            raise
        raise InvalidTokenError("Unable to decode token.") from err

    # Verify expiration claim
    exp = payload.get("exp")
    if not exp or not isinstance(exp, (int, float)):
        raise InvalidTokenError("Missing or invalid expiration claim.")

    if datetime.now(UTC).timestamp() >= exp:
        raise ExpiredTokenError("Authentication token has expired.")

    # Verify subject claim
    if not payload.get("sub"):
        raise InvalidTokenError("Missing subject claim in token.")

    return payload
