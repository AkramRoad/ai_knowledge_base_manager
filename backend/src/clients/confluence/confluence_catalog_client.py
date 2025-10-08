# NOTE: DONE FOR MVP
# TODO: Add unit tests
# TODO: Look into decorators for error handling
# TODO: Performance improvements: Parallelize space page fetching
# TODO: Add retry logic with exponential backoff for robustness
# TODO: Better Exception Handling

import requests

from typing import Any, Optional, TypeVar

from backend.src.clients.confluence.confluence_base_client import BaseConfluenceClient

from backend.src.clients.confluence.confluence_schemas import (
    ConfluencePage, 
    ConfluenceSpace,
    ConfluenceSpaceCatalog,
    ConfluenceTreePage
    )

from backend.src.utils.logger_init import setup_logging

logger = setup_logging(__name__)

T = TypeVar('T', bound=dict[str, Any])

class ConfluenceCatalog:
    def __init__(self, base_client: Optional[BaseConfluenceClient] = None):
        """
        Initialize Confluence page client using a BaseConfluenceClient
        for credentials and session handling.

        Args:
            base_client: Optional BaseConfluenceClient instance. If None, creates new instance.
        """
        self.client = base_client or BaseConfluenceClient()

    def get_all_spaces(self) -> list[ConfluenceSpace]:
        """
        Fetches all Confluence spaces and returns them as a simplified list.

        NOTE: Discards the full space metadata, keeping only id, key, and name.
        """
        logger.info("Fetching all Confluence spaces...")
        spaces_url = f"{self.client.api_base_url}/spaces?limit=250"
        raw_spaces = self._fetch_paginated_results(spaces_url)
        
        spaces: list[ConfluenceSpace] = [
            {
                "id": str(space.get("id", "")),
                "key": str(space.get("key", "")),
                "name": str(space.get("name", ""))
            }
            for space in raw_spaces
        ]

        logger.info(f"Found {len(spaces)} spaces.")
        return spaces

    def get_pages_for_space(self, space_id: str) -> list[ConfluencePage]:
        """
        Fetches a flat list of all pages for a given space ID.

        NOTE: Discards the full space metadata, keeping only id, title, and parentId.
        """
        logger.info(f"Fetching all pages for space ID {space_id}...")

        pages_url = f"{self.client.api_base_url}/spaces/{space_id}/pages?limit=250"
        pages_raw = self._fetch_paginated_results(pages_url)

        pages: list[ConfluencePage] = [
            {"id": str(page_raw["id"]), "title": str(page_raw["title"]), "parentId": page_raw.get("parentId")}
            for page_raw in pages_raw
        ]

        logger.info(f"Found {len(pages)} pages in space {space_id}.")
        return pages

    # TODO: Performance improvements: Parallelize space page fetching
    def get_full_catalog(self) -> list[ConfluenceSpaceCatalog]:
        """
        Fetches all spaces and builds a complete, structured page tree for each one.
        This is the primary method to generate the catalog for the dashboard.

        Returns:
            A list of spaces, each containing its name, ID, and a nested tree of its pages.
        """
        logger.info("Building the full Confluence catalog...")

        catalog: list[ConfluenceSpaceCatalog] = []
        spaces: list[ConfluenceSpace] = self.get_all_spaces()

        for space in spaces:
            pages: list[ConfluencePage] = self.get_pages_for_space(space['id'])
            page_tree: list[ConfluenceTreePage] = self._build_page_tree(pages)
            
            space_catalog: ConfluenceSpaceCatalog = {
                "id": space["id"],
                "name": space["name"],
                "key": space["key"],
                "pages": page_tree
            }
            catalog.append(space_catalog)
            logger.info(f"Built page tree for space '{space['name']}'.")

        logger.info("Successfully built the full Confluence catalog.")
        return catalog
    
    # TODO: Add retry logic with exponential backoff for robustness
    def _fetch_paginated_results(self, url: str) -> list[T]:
        """
        Handles pagination for Confluence API v2 endpoints by following the 'next' link.

        Args:
            url: The initial URL for the API endpoint.

        Returns:
            A list containing all results from all pages.
        """
        all_results: list[T] = []
        next_url: str | None = url

        while next_url:
            try:
                response = self.client.session.get(next_url)
                response.raise_for_status()
                data = response.json()
                
                all_results.extend(data.get('results', []))
                
                next_link = data.get('_links', {}).get('next')
                if next_link:
                    next_url = f"{self.client.url}{next_link}"
                else:
                    next_url = None
            # TODO: Better Exception Handling, e.g. sending a meaning full message to the frontend to try again
            except requests.RequestException as e:
                logger.error(f"Error during pagination for URL {next_url}: {e}", exc_info=True)
                break
        return all_results

    def _build_page_tree(self, pages: list[ConfluencePage]) -> list[ConfluenceTreePage]:
        """
        Organizes a flat list of pages into a hierarchical tree structure
        based on parent-child relationships.
        """
        tree_pages: dict[str, ConfluenceTreePage] = {
            page['id']: {**page, 'children': []} for page in pages
        }

        tree: list[ConfluenceTreePage] = []

        for page in tree_pages.values():
            parent_id = page.get('parentId')
            if parent_id and parent_id in tree_pages:
                tree_pages[parent_id]['children'].append(page)
            else:
                tree.append(page)
        return tree