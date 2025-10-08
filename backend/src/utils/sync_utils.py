def build_sync_plan(frontend_page_ids: list[str], existing_page_ids: set[str]) -> dict[str, list[str]]:
    """
    Compares the current files in the vector store and the list received from the frontend,
    to build a plan which pages to add/update and which one to delete.

    Args:
        frontend_page_ids: List of page IDs from the frontend
        existing_page_ids: Set of page IDs currently in the vector store

    Returns:
        A dictionary with two keys: "add_or_update" and "delete", each containing a list of page IDs.
    """
    frontend_set = set(frontend_page_ids)
    
    to_add_or_update = list(frontend_set - existing_page_ids)
    to_delete = list(existing_page_ids - frontend_set)
    
    return {
        "add_or_update": to_add_or_update,
        "delete": to_delete
    }