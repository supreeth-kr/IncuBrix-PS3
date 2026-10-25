from typing import Any, Dict, Optional
from pydantic import BaseModel, Field


class ErrorDetail(BaseModel):
    code: str = Field(..., description="Uppercase snake-case error code, e.g. INVALID_INPUT")
    message: str = Field(..., description="Human-readable explanation")
    retryable: bool = Field(default=False, description="Whether client may retry")
    details: Dict[str, Any] = Field(default_factory=dict, description="Structured error details")


class ErrorResponse(BaseModel):
    error: ErrorDetail


class AppException(Exception):
    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        retryable: bool = False,
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message
        self.retryable = retryable
        self.details = details or {}
