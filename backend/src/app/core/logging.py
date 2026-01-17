"""Helpers for creating configured aiologger instances."""

import logging
from functools import lru_cache

from aiologger import Logger
from aiologger.formatters.base import Formatter
from aiologger.handlers.streams import AsyncStreamHandler

from app.core.settings import get_settings

LOG_FORMAT = "%(levelname)s:     127.0.0.1:34974 - %(pathname)s:%(lineno)d - %(message)s"


@lru_cache
def get_logger(name: str) -> Logger:
    """Return a configured module-level logger with consistent formatting.

    Args:
        name: Name of the logger (usually __name__).

    Returns:
        Logger: Configured aiologger instance.
    """
    settings = get_settings()
    level = logging.getLevelName(settings.app.logging.log_level.upper())
    logger = Logger(name=name, level=level)
    logger.propagate = False

    formatter = Formatter(fmt=LOG_FORMAT)
    handler = AsyncStreamHandler(formatter=formatter)
    logger.add_handler(handler)
    return logger


__all__ = ["get_logger"]
