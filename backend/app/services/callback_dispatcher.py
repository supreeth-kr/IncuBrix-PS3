import hashlib
import hmac
import ipaddress
import json
import socket
from urllib.parse import urlparse
import httpx
from app.config import get_settings
from app.core.logging import get_logger

logger = get_logger("callback_dispatcher")
settings = get_settings()


class CallbackDispatcher:
    @staticmethod
    def is_ssrf_safe(url: str, allow_localhost: bool = False) -> bool:
        """Validates that callback URL does not resolve to local/internal IP ranges (SSRF mitigation)."""
        try:
            parsed = urlparse(url)
            if parsed.scheme not in ("http", "https"):
                return False

            hostname = parsed.hostname
            if not hostname:
                return False

            if hostname.lower() in ("localhost", "127.0.0.1") and allow_localhost:
                return True

            ip_str = socket.gethostbyname(hostname)
            ip = ipaddress.ip_address(ip_str)

            # Block loopback, private, link-local, multicast
            if ip.is_loopback or ip.is_private or ip.is_link_local or ip.is_multicast:
                return False

            return True
        except Exception as e:
            logger.warning(f"SSRF validation failed for URL '{url}': {e}")
            return False

    @staticmethod
    def sign_payload(payload: str, secret: str) -> str:
        """Computes HMAC-SHA256 hex signature."""
        sig = hmac.new(secret.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).hexdigest()
        return f"sha256={sig}"

    @classmethod
    async def dispatch(cls, callback_url: str, payload_dict: dict) -> bool:
        """Dispatches signed webhook payload."""
        if not callback_url:
            return False

        if not cls.is_ssrf_safe(callback_url, allow_localhost=settings.DEBUG):
            logger.warning(f"Blocked webhook callback to suspicious or internal URL: {callback_url}")
            return False

        payload_json = json.dumps(payload_dict, default=str)
        signature = cls.sign_payload(payload_json, settings.WEBHOOK_SECRET)

        headers = {
            "Content-Type": "application/json",
            "X-IncuBrix-Signature": signature,
            "User-Agent": f"IncuBrix-Webhook-Dispatcher/{settings.APP_VERSION}",
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(callback_url, content=payload_json, headers=headers)
                logger.info(f"Webhook dispatched to {callback_url}, response status: {res.status_code}")
                return res.status_code < 300
        except Exception as e:
            logger.error(f"Failed to deliver webhook to {callback_url}: {e}")
            return False
