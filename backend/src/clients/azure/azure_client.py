# NOTE: DONE FOR MVP
# TODO: Look into decorators for error handling

import json
import os
import re

from azure.core.exceptions import (
    AzureError,
    ClientAuthenticationError, 
    HttpResponseError,  
    ServiceRequestError, 
    ServiceResponseError
    )

from io import BytesIO
from typing import Sequence
from openai import AzureOpenAI, NotFoundError

from backend.src.clients.azure.azure_error_handling import handle_azure_errors

from backend.src.clients.azure.azure_schemas import (
    AzureFileCountsSchema, 
    AzureVectorStoreSchema, 
    VectorStoreDocument, 
    VectorStoreDocumentInput
    )

from backend.src.utils.logger_init import setup_logging

logger = setup_logging(log_name=__name__)

class AzureVectorStoreManager:
    # TODO: Look into decorators for error handling
    def __init__(
        self,
        api_version: str | None = None,
        endpoint: str | None = None,
        api_key: str | None = None
    ):
        """Initialize the Azure OpenAI client."""
        self.api_version = api_version or os.getenv("AZURE_API_VERSION")
        self.endpoint = endpoint or os.getenv("AZURE_ENDPOINT")
        self.api_key = api_key or os.getenv("AZURE_API_KEY")

        missing = [name for name, val in {
            "AZURE_API_VERSION": self.api_version,
            "AZURE_ENDPOINT": self.endpoint,
            "AZURE_API_KEY": self.api_key
        }.items() if not val]

        if missing:
            logger.error(
                "AzureVectorStoreManager initialization failed: missing configuration values.",
                extra={"missing": missing}
            )
            
            raise ValueError(
                f"Missing Azure credentials or configuration: {', '.join(missing)}"
            )

        try:   
            logger.debug(
                "AzureVectorStoreManager initializing...",
                extra={
                    "api_version": self.api_version,
                    "endpoint": self.endpoint,
                }
            )

            self.client = AzureOpenAI(
                api_version=self.api_version,
                azure_endpoint=self.endpoint,
                api_key=self.api_key
            )

            logger.debug("AzureVectorStoreManager successfully initialized.")

        except ClientAuthenticationError as e:
            logger.error("Azure authentication failed.", exc_info=True)
            raise              
        except (ServiceRequestError, ServiceResponseError) as e:
            logger.error("Failed to connect to Azure endpoint or response failed.", exc_info=True)
            raise     
        except HttpResponseError as e:
            logger.error("HttpResponse Error.", exc_info=True)
            raise       
        except AzureError as e:
            logger.error("Azure client error.", exc_info=True)
            raise
        
    # TODO: Look into decorators for error handling
    def upload_documents_to_vector_store(self, vector_store_id: str, documents: list[VectorStoreDocumentInput]) -> bool:
        """Upload multiple JSON documents to a vector store in a single batch."""
        files_to_upload: list[BytesIO] = []

        for doc in documents:
            safe_title = re.sub(r'[\\/*?:"<>|]', "-", doc["title"])
            filename = f"{safe_title}__PAGEID__{doc['id']}.json"

            json_bytes = json.dumps(doc).encode("utf-8")
            json_file_like = BytesIO(json_bytes)
            json_file_like.name = filename

            files_to_upload.append(json_file_like)

        try:
            file_batch = self.client.vector_stores.file_batches.upload_and_poll(
                vector_store_id=vector_store_id,
                files=files_to_upload,
            )
            logger.info(f"Batch status: {file_batch.status}")
            logger.info(f"Files in batch: {file_batch.file_counts}")
            return True
        # TODO: Refine error handling to be more specific
        except Exception as e:
            logger.error(f"Failed to upload batch: {e}", exc_info=True)
            raise        

    # TODO: Look into correct Error Handling Decorator
    @handle_azure_errors
    def list_vector_stores(self) -> list[AzureVectorStoreSchema]:
        """
        Fetches and returns a list of vector stores from the Azure account.

        Returns:
            list[AzureVectorStoreSchema]: The list of vector stores with metadata.
        """
        logger.info("Fetching list of vector stores...")

        vector_stores = self.client.vector_stores.list()

        if not vector_stores or not vector_stores.data:
            logger.warning("No vector stores found.")
            return []

        vector_stores_list = [
            AzureVectorStoreSchema(
                id=vs.id,
                name=vs.name,
                object=vs.object,
                status=vs.status,
                last_active_at=vs.last_active_at,
                created_at=vs.created_at,
                file_counts=AzureFileCountsSchema(
                    total=vs.file_counts.total,
                    completed=vs.file_counts.completed,
                    failed=vs.file_counts.failed,
                    in_progress=vs.file_counts.in_progress,
                    cancelled=vs.file_counts.cancelled,
                )
            )
            for vs in vector_stores.data
        ]

        logger.debug(f"Found {len(vector_stores_list)} vector stores.")
        return vector_stores_list

    # TODO: Check for performance bottleneck
    # TODO: Look into correct Error Handling Decorator
    @handle_azure_errors
    def list_vector_store_documents(self, vector_store_id: str) -> list[VectorStoreDocument]:
        """Return all documents in a given vector store with their metadata."""
        docs_list: list[VectorStoreDocument] = []
        after = None  # Pagination cursor
        
        while True:
            # Fetch a page of documents
            if after:
                documents = self.client.vector_stores.files.list(
                    vector_store_id=vector_store_id,
                    after=after
                )
            else:
                documents = self.client.vector_stores.files.list(
                    vector_store_id=vector_store_id
                )
            
            if not documents or not documents.data:
                break
            
            # Process each document in the current page
            for doc in documents.data:
                try:
                    doc_info = self.client.files.retrieve(doc.id)
                    docs_list.append(VectorStoreDocument(
                        id=doc_info.id,
                        filename=doc_info.filename,
                        object=doc_info.object,
                        status=doc_info.status,
                        created_at=doc_info.created_at
                    ))
                except NotFoundError:
                    logger.warning(f"File with ID {doc.id} not found while listing, skipping.")
                    continue
            
            # Check if there are more pages
            if documents.has_more:
                after = documents.data[-1].id  # Use the last item's ID as cursor
            else:
                break
        
        logger.info(f"{len(docs_list)} files found in vector store {vector_store_id}.")
        return docs_list

    # TODO: Look into correct Error Handling Decorator
    @handle_azure_errors
    def get_existing_page_ids(self, vector_store_id: str) -> set[str]:
        """
        Return a set of page IDs extracted from filenames in the given vector store.
        
        Args:
            vector_store_id (str): The ID of the vector store to query.
            
        Returns:
            set[str]: A set of page IDs found in the vector store filenames."""
        documents = self.list_vector_store_documents(vector_store_id)
        page_ids = set()
        for doc in documents:
            match = re.search(r'__PAGEID__(\d+)', doc.filename)
            if match:
                page_ids.add(match.group(1))
        return page_ids
    
    # TODO: Look into correct Error Handling Decorator
    def delete_file_by_page_id(self, vector_store_id: str, page_ids: Sequence[str]) -> dict[str, bool]:
        """
        Delete one or more files from the vector store based on page IDs.
        Returns a dict mapping each page_id -> success (True/False).

        Args:
            vector_store_id (str): The ID of the vector store.
            page_ids (Sequence[str]): The page IDs whose corresponding files should be deleted.
        
        Returns:
            dict[str, bool]: A dictionary mapping page IDs to deletion success status.
        """
        results: dict[str, bool] = {}
        files = self.list_vector_store_documents(vector_store_id)

        for page_id in page_ids:
            target_file = next(
                (f for f in files if re.search(rf'__PAGEID__{page_id}(?:\.json)?$', f.filename)),
                None
            )

            if not target_file:
                logger.warning(f"No file found with page ID {page_id} in vector store {vector_store_id}.")
                results[page_id] = False
                continue

            try:
                self.client.vector_stores.files.delete(
                    vector_store_id=vector_store_id,
                    file_id=target_file.id
                )
                logger.info(f"Deleted file {target_file.filename} (ID: {target_file.id}) from vector store {vector_store_id}.")
                results[page_id] = True
            except Exception as e:
                logger.error(
                    f"Failed to delete file {target_file.filename} (ID: {target_file.id}): {e}",
                    exc_info=True
                )
                results[page_id] = False

        return results