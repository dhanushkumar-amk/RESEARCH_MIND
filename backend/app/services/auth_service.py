from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from pymongo.errors import DuplicateKeyError

from app.core.database import get_database
from app.core.email import email_service
from app.core.security import (
    create_access_token,
    create_refresh_token,
    create_reset_token,
    decode_token,
    generate_otp_code,
    get_password_hash,
    validate_password_strength,
    verify_password,
)
from app.schemas.auth import AuthResponse, LoginRequest, RegisterRequest, UserResponse


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _to_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _user_to_response(user: dict) -> UserResponse:
    return UserResponse(
        id=str(user["_id"]),
        name=user["name"],
        email=user["email"],
        is_email_verified=user.get("is_email_verified", False),
        created_at=user["created_at"],
        updated_at=user["updated_at"],
    )


class AuthService:
    def __init__(self) -> None:
        self.db = get_database()

    async def register(self, payload: RegisterRequest) -> dict[str, str | bool]:
        self._ensure_password_strength(payload.password)

        now = _utcnow()
        user_document = {
            "name": payload.name,
            "email": payload.email,
            "password_hash": get_password_hash(payload.password),
            "is_email_verified": False,
            "created_at": now,
            "updated_at": now,
        }

        try:
            await self.db.users.insert_one(user_document)
        except DuplicateKeyError as exc:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email already exists.",
            ) from exc

        await self._create_and_send_verification_code(payload.email, payload.name)
        return {
            "message": "Registration successful. Check your email for the verification code.",
            "requires_verification": True,
        }

    async def verify_email(self, email: str, code: str) -> AuthResponse:
        user = await self.db.users.find_one({"email": email})
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

        verification_record = await self._validate_otp(
            collection_name="email_verifications",
            email=email,
            code=code,
        )
        if not verification_record:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired verification code.",
            )

        now = _utcnow()
        await self.db.users.update_one(
            {"_id": user["_id"]},
            {"$set": {"is_email_verified": True, "updated_at": now}},
        )
        await self.db.email_verifications.delete_many({"email": email})

        user["is_email_verified"] = True
        user["updated_at"] = now
        return await self._issue_auth_response(user)

    async def resend_verification(self, email: str) -> dict[str, str]:
        user = await self.db.users.find_one({"email": email})
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
        if user.get("is_email_verified"):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email is already verified.")

        await self._create_and_send_verification_code(email, user["name"])
        return {"message": "A new verification code has been sent."}

    async def login(self, payload: LoginRequest) -> AuthResponse:
        user = await self.db.users.find_one({"email": payload.email})
        if not user or not verify_password(payload.password, user["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password.",
            )
        if not user.get("is_email_verified"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Please verify your email before signing in.",
            )
        return await self._issue_auth_response(user)

    async def refresh_tokens(self, refresh_token: str) -> AuthResponse:
        payload = self._decode_typed_token(refresh_token, expected_type="refresh")
        user_id = payload["sub"]
        jti = payload["jti"]

        refresh_session = await self.db.refresh_tokens.find_one(
            {"jti": jti, "user_id": user_id, "revoked_at": None}
        )
        if not refresh_session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token is invalid or has been revoked.",
            )

        user = await self.db.users.find_one({"_id": refresh_session["user_object_id"]})
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

        await self.db.refresh_tokens.update_one(
            {"_id": refresh_session["_id"]},
            {"$set": {"revoked_at": _utcnow()}},
        )
        return await self._issue_auth_response(user)

    async def logout(self, refresh_token: str) -> dict[str, str]:
        try:
            payload = self._decode_typed_token(refresh_token, expected_type="refresh")
        except HTTPException:
            return {"message": "Logged out successfully."}

        await self.db.refresh_tokens.update_one(
            {"jti": payload["jti"]},
            {"$set": {"revoked_at": _utcnow()}},
        )
        return {"message": "Logged out successfully."}

    async def get_current_user(self, user_id: str) -> dict:
        from bson import ObjectId

        user = await self.db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
        return user

    async def forgot_password(self, email: str) -> dict[str, str]:
        user = await self.db.users.find_one({"email": email})
        if user:
            await self._create_and_send_reset_code(email, user["name"])
        return {"message": "If that email exists, a password reset code has been sent."}

    async def verify_reset_code(self, email: str, code: str) -> dict[str, str]:
        user = await self.db.users.find_one({"email": email})
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

        reset_record = await self._validate_otp(
            collection_name="password_resets",
            email=email,
            code=code,
        )
        if not reset_record:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired reset code.",
            )

        reset_token, _, _ = create_reset_token(subject=str(user["_id"]), email=user["email"])
        return {"message": "Reset code verified.", "reset_token": reset_token}

    async def reset_password(
        self,
        *,
        new_password: str,
        reset_token: str | None = None,
        email: str | None = None,
        code: str | None = None,
    ) -> dict[str, str]:
        self._ensure_password_strength(new_password)

        user = None
        if reset_token:
            payload = self._decode_typed_token(reset_token, expected_type="password_reset")
            user = await self.get_current_user(payload["sub"])
            email = payload["email"]
        else:
            if not email or not code:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email and code are required.",
                )
            reset_record = await self._validate_otp(
                collection_name="password_resets",
                email=email,
                code=code,
            )
            if not reset_record:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid or expired reset code.",
                )
            user = await self.db.users.find_one({"email": email})

        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

        now = _utcnow()
        await self.db.users.update_one(
            {"_id": user["_id"]},
            {
                "$set": {
                    "password_hash": get_password_hash(new_password),
                    "updated_at": now,
                }
            },
        )
        await self.db.password_resets.delete_many({"email": user["email"]})
        await self.db.refresh_tokens.update_many(
            {"user_id": str(user["_id"]), "revoked_at": None},
            {"$set": {"revoked_at": now}},
        )

        return {"message": "Password reset successful."}

    async def _issue_auth_response(self, user: dict) -> AuthResponse:
        from bson import ObjectId

        access_token, _, _ = create_access_token(subject=str(user["_id"]), email=user["email"])
        refresh_token, refresh_jti, refresh_expires_at = create_refresh_token(
            subject=str(user["_id"]),
            email=user["email"],
        )

        await self.db.refresh_tokens.insert_one(
            {
                "jti": refresh_jti,
                "user_id": str(user["_id"]),
                "user_object_id": ObjectId(str(user["_id"])),
                "expires_at": refresh_expires_at,
                "created_at": _utcnow(),
                "revoked_at": None,
            }
        )

        return AuthResponse(
            user=_user_to_response(user),
            access_token=access_token,
            refresh_token=refresh_token,
        )

    async def _create_and_send_verification_code(self, email: str, name: str) -> None:
        await self.db.email_verifications.delete_many({"email": email})
        code = generate_otp_code()
        await self.db.email_verifications.insert_one(
            {
                "email": email,
                "code_hash": get_password_hash(code),
                "created_at": _utcnow(),
                "expires_at": _utcnow() + timedelta(minutes=10),
            }
        )
        await email_service.send_verification_code(email=email, name=name, code=code)

    async def _create_and_send_reset_code(self, email: str, name: str) -> None:
        await self.db.password_resets.delete_many({"email": email})
        code = generate_otp_code()
        await self.db.password_resets.insert_one(
            {
                "email": email,
                "code_hash": get_password_hash(code),
                "created_at": _utcnow(),
                "expires_at": _utcnow() + timedelta(minutes=10),
            }
        )
        await email_service.send_password_reset_code(email=email, name=name, code=code)

    async def _validate_otp(self, *, collection_name: str, email: str, code: str) -> dict | None:
        collection = self.db[collection_name]
        document = await collection.find_one({"email": email})
        if not document:
            return None
        if _to_utc(document["expires_at"]) < _utcnow():
            await collection.delete_many({"email": email})
            return None
        if not verify_password(code, document["code_hash"]):
            return None
        return document

    def _decode_typed_token(self, token: str, *, expected_type: str) -> dict:
        try:
            payload = decode_token(token)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=str(exc),
            ) from exc

        if payload.get("type") != expected_type:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type.",
            )
        return payload

    @staticmethod
    def _ensure_password_strength(password: str) -> None:
        try:
            validate_password_strength(password)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(exc),
            ) from exc
