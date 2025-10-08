# NOTE: DONE FOR MVP
# TODO: Add unit tests
# TODO: Look into decorators for error handling
# TODO: Better Exception Handling

import os
import requests

from backend.src.utils.logger_init import setup_logging

logger = setup_logging(log_name=__name__)

class BaseConfluenceClient:
    def __init__(
        self,
        url: str | None = None,
        username: str | None = None,
        api_token: str | None = None
    ):
        self.url = url or os.getenv("CONFLUENCE_URL")
        self.username = username or os.getenv("CONFLUENCE_USERNAME")
        self.api_token = api_token or os.getenv("CONFLUENCE_API_KEY")

        missing = [name for name, val in {
            "CONFLUENCE_URL": self.url,
            "CONFLUENCE_USERNAME": self.username,
            "CONFLUENCE_API_KEY": self.api_token
        }.items() if not val]

        if missing:
            logger.error(
                "Confluence initialization failed: missing configuration values.",
                extra={"missing": missing}
            )
            
            raise ValueError(
                f"Missing Confluence credentials or configuration: {', '.join(missing)}"
            )
    
        try:
            logger.debug(
                "Confluence client initializing...",
                extra={
                    "url": self.url,
                    "username": self.username,
                }
            )

            self.session = requests.Session()
            self.session.auth = (self.username, self.api_token)
            self.session.headers.update({"Accept": "application/json"})
            self.api_base_url = f"{self.url}/wiki/api/v2"
        # TODO: Catch more specific exceptions
        except Exception as e:
            logger.error(
                "Failed to initialize Confluence client.",
                exc_info=True
            )
            raise