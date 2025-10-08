# NOTE: DONE FOR MVP
# TODO: Add unit tests
# TODO: Look into decorators for error handling
# TODO: Better Exception Handling

import requests

from bs4 import BeautifulSoup, NavigableString
from typing import Optional

from backend.src.clients.confluence.confluence_base_client import BaseConfluenceClient

from backend.src.clients.confluence.confluence_schemas import (
    RawConfluencePageMinimal, 
    StructuredConfluencePage, 
    ConfluencePageFetchResult
    )

from backend.src.utils.logger_init import setup_logging

logger = setup_logging(__name__)

class ConfluencePageClient:
    def __init__(self, base_client: Optional[BaseConfluenceClient] = None):
        """
        Initialize Confluence page client using a BaseConfluenceClient
        for credentials and session handling.

        Args:
            base_client: Optional BaseConfluenceClient instance. If None, creates new instance.
        """
        self.client = base_client or BaseConfluenceClient()

    # TODO: Concurrent Fetching
    def get_pages_content(self, page_ids: list[str]) -> ConfluencePageFetchResult:
        """
        Fetch and return the JSON content of multiple Confluence pages.
        
        Args:
            page_ids: List of Confluence page IDs to fetch.
            
        Returns:
            ConfluencePageFetchResult containing successful and failed page fetches.
        """
        successful_pages: list[RawConfluencePageMinimal] = []
        failed_page_ids: list[str] = []

        for page_id in page_ids:
            try:
                response = self.client.session.get(
                    f"{self.client.url}/wiki/rest/api/content/{page_id}?expand=body.storage",
                    auth=(self.client.username, self.client.api_token)
                )
                response.raise_for_status()
                data = response.json()
                value = data.get('body', {}).get('storage', {}).get('value', '')

                if not value.strip():
                    logger.warning(f"Page {page_id} has empty content")
                    failed_page_ids.append(page_id)
                    continue
            
                page = RawConfluencePageMinimal(
                    id=data['id'],
                    type=data['type'],
                    status=data.get('status', ''),
                    title=data['title'],
                    value=value
                )
                successful_pages.append(page)
   
            except requests.RequestException as e:
                logger.error(f"Error fetching page {page_id}", exc_info=True)
                failed_page_ids.append(page_id)
                continue
        
        return ConfluencePageFetchResult(
            successful_pages=successful_pages,
            failed_page_ids=failed_page_ids
        )

    def structure_page(self, pages: list[RawConfluencePageMinimal]) -> list[StructuredConfluencePage]:
        """
        Convert raw Confluence pages data into structured format.

        Args:
            pages: List of raw page data as fetched from Confluence.

        Returns:
            List of structured page information.
        """
        structured_pages: list[StructuredConfluencePage] = []

        for page in pages:
            html_content = f"<html><body>{page.value}</body></html>"
            soup = BeautifulSoup(html_content, "html.parser")

            for ac_image in soup.find_all("ac:image"):
                ri_attachment = ac_image.find("ri:attachment")
                filename = ri_attachment["ri:filename"] if ri_attachment and ri_attachment.has_attr("ri:filename") else "unknown_image"
                placeholder = soup.new_tag("p")
                placeholder.string = f"IMAGE: {filename}"
                ac_image.replace_with(placeholder)

            # TODO: Link description is missing not sure yet if really needed
            for link in soup.find_all("a"):
                url = link.get("href", "unknown_link")
                parent = link.parent
                if parent.name == "p":
                    link.replace_with(NavigableString(f"LINK: {url}"))
                else:
                    placeholder = soup.new_tag("p")
                    placeholder.string = f"LINK: {url}"
                    link.replace_with(placeholder)
            
            structured_pages.append(StructuredConfluencePage(
                id=page.id,
                title=page.title,
                type=page.type,
                html_content=str(soup)
            ))
        return structured_pages