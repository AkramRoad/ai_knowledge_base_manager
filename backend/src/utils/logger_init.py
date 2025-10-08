import logging
import os
from pathlib import Path
import sys

def setup_logging(log_name: str = __name__, log_level: str = None, log_file: str = "app.log") -> logging.Logger:
    """Configure and return a named logger with console and optional file output."""
    logger = logging.getLogger(log_name)

    if logger.hasHandlers():
        return logger

    level = log_level or os.getenv("LOG_LEVEL", "INFO")
    level = getattr(logging, level.upper(), logging.INFO)
    logger.setLevel(level)

    formatter = logging.Formatter(
        fmt="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(level)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

    if log_file:
        Path(log_file).parent.mkdir(parents=True, exist_ok=True)
        file_handler = logging.FileHandler(log_file, encoding="utf-8")
        file_handler.setLevel(level)
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)

    return logger