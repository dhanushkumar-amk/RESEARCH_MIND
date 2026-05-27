from fastapi import APIRouter, Depends, status

from app.dependencies.auth import get_current_user
from app.schemas.auth import (
    AuthResponse,
    ForgotPasswordRequest,
    LoginRequest,
    LogoutRequest,
    MessageResponse,
    RefreshTokenRequest,
    RegisterRequest,
    ResendVerificationRequest,
    ResetPasswordRequest,
    UserResponse,
    VerifyEmailRequest,
    VerifyResetCodeRequest,
)
from app.services.auth_service import AuthService


router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest):
    service = AuthService()
    return await service.register(payload)


@router.post("/verify-email", response_model=AuthResponse)
async def verify_email(payload: VerifyEmailRequest):
    service = AuthService()
    return await service.verify_email(payload.email, payload.code)


@router.post("/resend-verification", response_model=MessageResponse)
async def resend_verification(payload: ResendVerificationRequest):
    service = AuthService()
    result = await service.resend_verification(payload.email)
    return MessageResponse(**result)


@router.post("/login", response_model=AuthResponse)
async def login(payload: LoginRequest):
    service = AuthService()
    return await service.login(payload)


@router.post("/refresh", response_model=AuthResponse)
async def refresh_tokens(payload: RefreshTokenRequest):
    service = AuthService()
    return await service.refresh_tokens(payload.refresh_token)


@router.post("/logout", response_model=MessageResponse)
async def logout(payload: LogoutRequest):
    service = AuthService()
    result = await service.logout(payload.refresh_token)
    return MessageResponse(**result)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user=Depends(get_current_user)):
    return UserResponse(
        id=str(current_user["_id"]),
        name=current_user["name"],
        email=current_user["email"],
        is_email_verified=current_user.get("is_email_verified", False),
        created_at=current_user["created_at"],
        updated_at=current_user["updated_at"],
    )


@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(payload: ForgotPasswordRequest):
    service = AuthService()
    result = await service.forgot_password(payload.email)
    return MessageResponse(**result)


@router.post("/verify-reset-code")
async def verify_reset_code(payload: VerifyResetCodeRequest):
    service = AuthService()
    return await service.verify_reset_code(payload.email, payload.code)


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(payload: ResetPasswordRequest):
    service = AuthService()
    result = await service.reset_password(
        new_password=payload.new_password,
        reset_token=payload.reset_token,
        email=payload.email,
        code=payload.code,
    )
    return MessageResponse(**result)
