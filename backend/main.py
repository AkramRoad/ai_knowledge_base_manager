# TODO: Init Azure/Confluence when app starts not in endpoints
import os
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.schemas import SyncNowRequest, APIResponse
from backend.src.clients.azure.azure_client import AzureVectorStoreManager
from backend.src.clients.confluence.confluence_catalog_client import ConfluenceCatalog
from backend.src.orchestrators.confluence_to_vectorstore_ingestion import ingest_confluence_pages
from backend.src.utils.logger_init import setup_logging
from backend.src.utils.security import validate_user_vector_store_access

logger = setup_logging(__name__)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

azure_client: AzureVectorStoreManager | None = None
confluence_catalog_builder: ConfluenceCatalog | None = None

@app.on_event("startup")
def startup_event():
    global azure_client, confluence_catalog_builder
    azure_client = AzureVectorStoreManager()
    confluence_catalog_builder = ConfluenceCatalog()

@app.post("/v1/pages/sync-now")
def ingest_confluence_pages_endpoint(request: SyncNowRequest) -> dict[str, Any]:
    # TODO: Add here actual Auth Logic, own db with the credentials
    try:
        if not validate_user_vector_store_access(request.user_id, request.vector_store_id):
            return {
                "status": "error", 
                "data": {}, "message": 
                "User does not have the correct credentials to perform this action."
                }
    except Exception as e:
        logger.error("Failed to validate user access", exc_info=True)
        return {
            "status": "error", 
            "data": {}, 
            "message": f"Failed to validate user access: {str(e)}"
            }
    
    try:
        result = ingest_confluence_pages(
            vector_store_id=request.vector_store_id,
            page_ids=request.page_ids
        )
        return {
            "status": "success",
            "data": result,
            "message": "Pages synced successfully"
            }
    # TODO: More Specific Exception Handling
    except Exception as e:
        logger.error("Error during ingestion", exc_info=True)
        return {
            "status": "error", 
            "data": {}, 
            "message": f"Error during ingestion: {str(e)}"
            }
    

@app.get("/v1/vector-stores")
def get_vector_stores():
    """Get all vector stores with their metadata."""
    try:
        vector_stores = azure_client.list_vector_stores()
        return {
            "status": "success",
            "data": vector_stores,
            "message": f"Found {len(vector_stores)} vector stores."
        }
    # TODO: More Specific Exception Handling
    except Exception as e:
        logger.error("Failed to fetch vector stores", exc_info=True)
        return {
            "status": "error",
            "data": [],
            "message": str(e)
        }

    
@app.get("/vectorstore/{vector_store_id}/pages")
def get_vectorstore_page_ids(vector_store_id: str):
    """
    Returns a list of Confluence page IDs currently in the vector store.
    """
    try:
        page_ids = azure_client.get_existing_page_ids(vector_store_id)
        return {
            "status": "success",
            "data": list(page_ids),
            "message": f"Found {len(page_ids)} page IDs in vector store."
        }
    # TODO: More Specific Exception Handling
    except Exception as e:
        return {
            "status": "error",
            "data": [],
            "message": f"Failed to fetch page IDs: {str(e)}"
        }


@app.get("/confluence/catalog")
def get_confluence_catalog():
    """
    Fetches the full Confluence catalog.
    """
    try:
        confluence_catalog = confluence_catalog_builder.get_full_catalog()
        return {
            "status": "success",
            "data": confluence_catalog,
            "message": "Successfully fetched Confluence catalog."
        }
    # TODO: More Specific Exception Handling
    except Exception as e:
        logger.error("Failed to fetch Confluence catalog", exc_info=True)
        return {
            "status": "error",
            "data": [],
            "message": f"Failed to fetch Confluence catalog: {str(e)}"
        }