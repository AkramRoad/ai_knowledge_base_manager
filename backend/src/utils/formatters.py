from backend.src.clients.confluence.confluence_page_client import StructuredConfluencePage

def format_for_vector_ingestion(markdown_content: str, structured_page: StructuredConfluencePage) -> dict:
    """
    Format page content for vector store ingestion.
    
    Args:
        markdown_content: The converted markdown content
        structured_page: The structured page data
        
    Returns:
        Dictionary formatted for vector store ingestion
    """
    prepared_data = structured_page.model_dump(exclude={'html_content'})
    
    prepared_data.update({
        "content": markdown_content,
        "filename": f"{structured_page.title}__PAGEID__{structured_page.id}.json"
    })
    
    return prepared_data