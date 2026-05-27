import asyncio
import logging
import smtplib
from email.message import EmailMessage

import resend

from app.core.config import settings


logger = logging.getLogger(__name__)


class EmailService:
    def __init__(self) -> None:
        if settings.resend_api_key:
            resend.api_key = settings.resend_api_key

    async def send_verification_code(self, *, email: str, name: str, code: str) -> dict[str, str | bool]:
        subject = "Verify your ResearchMind account"
        text_body = (
            f"Hi {name},\n\n"
            f"Your ResearchMind verification code is: {code}\n\n"
            f"This code expires in {settings.verification_code_expiry_minutes} minutes."
        )
        html_body = (
            f"<p>Hi {name},</p>"
            f"<p>Your ResearchMind verification code is:</p>"
            f"<h2>{code}</h2>"
            f"<p>This code expires in {settings.verification_code_expiry_minutes} minutes.</p>"
        )
        return await self._send_email(email=email, subject=subject, text_body=text_body, html_body=html_body, fallback_code=code)

    async def send_password_reset_code(self, *, email: str, name: str, code: str) -> dict[str, str | bool]:
        subject = "Reset your ResearchMind password"
        text_body = (
            f"Hi {name},\n\n"
            f"Your password reset code is: {code}\n\n"
            f"This code expires in {settings.password_reset_code_expiry_minutes} minutes."
        )
        html_body = (
            f"<p>Hi {name},</p>"
            f"<p>Your password reset code is:</p>"
            f"<h2>{code}</h2>"
            f"<p>This code expires in {settings.password_reset_code_expiry_minutes} minutes.</p>"
        )
        return await self._send_email(email=email, subject=subject, text_body=text_body, html_body=html_body, fallback_code=code)

    async def _send_email(
        self,
        *,
        email: str,
        subject: str,
        text_body: str,
        html_body: str,
        fallback_code: str,
    ) -> dict[str, str | bool]:
        if not settings.email_enabled:
            logger.warning("Email not configured. OTP for %s: %s", email, fallback_code)
            return {"delivered": False, "channel": "console"}

        if settings.resend_enabled:
            await asyncio.to_thread(
                self._send_via_resend,
                email,
                subject,
                text_body,
                html_body,
            )
            return {"delivered": True, "channel": "resend"}

        message = EmailMessage()
        message["Subject"] = subject
        message["From"] = f"{settings.smtp_from_name} <{settings.smtp_from_email}>"
        message["To"] = email
        message.set_content(text_body)
        message.add_alternative(html_body, subtype="html")

        await asyncio.to_thread(self._send_via_smtp, message)
        return {"delivered": True, "channel": "smtp"}

    def _send_via_smtp(self, message: EmailMessage) -> None:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=30) as smtp:
            if settings.smtp_use_tls:
                smtp.starttls()
            smtp.login(settings.smtp_username, settings.smtp_password)
            smtp.send_message(message)

    def _send_via_resend(self, email: str, subject: str, text_body: str, html_body: str) -> None:
        params: resend.Emails.SendParams = {
            "from": f"{settings.resend_from_name} <{settings.resend_from_email}>",
            "to": [email],
            "subject": subject,
            "text": text_body,
            "html": html_body,
        }
        resend.Emails.send(params)


email_service = EmailService()
