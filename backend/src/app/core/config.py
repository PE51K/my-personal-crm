"""Application configuration using pydantic-settings."""

import json
from functools import lru_cache
from typing import Annotated

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables.

    All settings are loaded from environment variables with appropriate defaults
    for development. In production, ensure all required variables are set.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Supabase Configuration (Required)
    supabase_url: Annotated[str, Field(description="Supabase project URL")]
    supabase_service_role_key: Annotated[str, Field(description="Supabase service role key")]
    supabase_jwt_secret: Annotated[
        str | None,
        Field(
            default=None,
            description="[DEPRECATED] Legacy JWT secret - no longer needed with JWKS verification",
        ),
    ]
    supabase_storage_bucket: Annotated[
        str, Field(default="contact-photos", description="Storage bucket name")
    ]

    # Application Configuration
    app_env: Annotated[str, Field(default="development", description="Application environment")]
    app_debug: Annotated[bool, Field(default=True, description="Enable debug mode")]
    app_log_level: Annotated[str, Field(default="INFO", description="Logging level")]

    # Security
    cors_origins: Annotated[
        list[str],
        Field(default=["http://localhost:3000"], description="Allowed CORS origins"),
    ]
    access_token_expire_minutes: Annotated[
        int, Field(default=30, description="Access token expiration in minutes")
    ]
    refresh_token_expire_days: Annotated[
        int, Field(default=7, description="Refresh token expiration in days")
    ]

    # Server
    host: Annotated[str, Field(default="0.0.0.0", description="Host to bind to")]
    port: Annotated[int, Field(default=8000, description="Port to listen on")]

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: str | list[str]) -> list[str]:
        """Parse CORS origins from string or list.

        Args:
            v: CORS origins as string (JSON) or list.

        Returns:
            List of CORS origin strings.
        """
        if isinstance(v, str):
            return json.loads(v)
        return v

    @field_validator("app_log_level", mode="before")
    @classmethod
    def validate_log_level(cls, v: str) -> str:
        """Validate and normalize log level.

        Args:
            v: Log level string.

        Returns:
            Normalized uppercase log level.

        Raises:
            ValueError: If log level is invalid.
        """
        valid_levels = {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}
        normalized = v.upper()
        if normalized not in valid_levels:
            msg = f"Invalid log level: {v}. Must be one of {valid_levels}"
            raise ValueError(msg)
        return normalized

    @property
    def is_development(self) -> bool:
        """Check if running in development mode.

        Returns:
            True if in development environment.
        """
        return self.app_env == "development"

    @property
    def is_production(self) -> bool:
        """Check if running in production mode.

        Returns:
            True if in production environment.
        """
        return self.app_env == "production"


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance.

    Uses LRU cache to ensure settings are only loaded once.

    Returns:
        Settings instance with values from environment.
    """
    return Settings()
