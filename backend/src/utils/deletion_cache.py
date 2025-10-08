import time

from backend.src.utils.logger_init import setup_logging

logger = setup_logging(__name__)

class DeletionCache:
    def __init__(self, expiration_seconds: int = 300):
        """Initializes the cache for pending deletions."""
        self._pending_deletions: dict[str, float] = {}
        self.expiration_seconds = expiration_seconds  # 5 minutes default

    def add(self, page_id: str):
        """Adds a page_id to the pending deletions cache."""
        self._pending_deletions[page_id] = time.time()
        logger.info(f"Added page ID {page_id} to pending deletions cache.")

    def get_ids(self) -> set[str]:
        """Returns a set of all page_ids in the pending deletions cache."""
        return set(self._pending_deletions.keys())

    def clear_expired(self):
        """Removes entries from the pending_deletions cache that have expired."""
        current_time = time.time()
        expired_ids = [
            page_id for page_id, timestamp in self._pending_deletions.items()
            if current_time - timestamp > self.expiration_seconds
        ]
        if expired_ids:
            for page_id in expired_ids:
                del self._pending_deletions[page_id]
            logger.info(f"Cleared {len(expired_ids)} expired pending deletions.")

# Create a single instance of the cache to be used throughout the application.
# This makes it a singleton.
pending_deletion_cache = DeletionCache()