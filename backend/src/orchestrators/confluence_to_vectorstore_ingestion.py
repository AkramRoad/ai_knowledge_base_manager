from backend.src.clients.azure.azure_client import AzureVectorStoreManager
from backend.src.clients.azure.azure_schemas import VectorStoreDocumentInput
from backend.src.clients.confluence.confluence_page_client import ConfluencePageClient
from backend.src.processors.docling_converter import DoclingConverter
from backend.src.utils.deletion_cache import pending_deletion_cache
from backend.src.utils.formatters import format_for_vector_ingestion
from backend.src.utils.logger_init import setup_logging
from backend.src.utils.sync_utils import build_sync_plan

logger = setup_logging(__name__)

def ingest_confluence_pages(vector_store_id: str, page_ids: list[str]) -> dict:
    """
    Orchestrate Confluence pages ingestions to the vector store.
    
    Args:
        vector_store_id: ID of the vector store to ingest into
        page_ids: List of Confluence page IDs to process
        
    Returns:
        A dictionary with details about the ingestion process. Fields include:
            - sync_plan: Details of pages added, updated, or deleted
            - deleted: List of page IDs that were deleted
    """
    pending_deletion_cache.clear_expired()

    vector_manager = AzureVectorStoreManager()
    confluence_client = ConfluencePageClient()
    converter = DoclingConverter()

    existing_page_ids = vector_manager.get_existing_page_ids(vector_store_id)
    active_page_ids = existing_page_ids - pending_deletion_cache.get_ids()
    sync_plan = build_sync_plan(page_ids, active_page_ids)
    logger.info(f"Sync plan: {sync_plan}")

    contents_to_add: list[VectorStoreDocumentInput] = []
    if sync_plan["add_or_update"]:
        processing_result = confluence_client.get_pages_content(sync_plan["add_or_update"])
        
        if processing_result.failed_page_ids:
            logger.error(f"Failed to fetch pages: {processing_result.failed_page_ids}")
        
        if processing_result.successful_pages:
            structured_pages = confluence_client.structure_page(processing_result.successful_pages)
            
            for structured in structured_pages:
                markdown = converter.convert_html(structured.html_content)
                prepared = format_for_vector_ingestion(markdown, structured)
                contents_to_add.append(prepared)

    if contents_to_add:
        vector_manager.upload_documents_to_vector_store(vector_store_id, contents_to_add)

    delete_results = vector_manager.delete_file_by_page_id(vector_store_id, sync_plan['delete'])

    for page_id, success in delete_results.items():
        if success:
            pending_deletion_cache.add(page_id)

    return {
        "sync_plan": sync_plan,
        "deleted": [pid for pid, success in delete_results.items() if success],
        "added_or_updated": [p["id"] for p in contents_to_add]
        }