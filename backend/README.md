# AI Knowledge Base Manager - Backend

This document serves as the technical overview for the backend service. Its primary purpose is to maintain a synchronized, high-quality knowledge base by managing content flow from **Confluence** to **Azure OpenAI Vector Stores**.

## 🚀 Core Purpose

The backend is a **Python FastAPI** application responsible for the ETL (Extract, Transform, Load) pipeline:
1.  **Extract**: Pulling hierarchical data and HTML content from the Confluence API.
2.  **Transform**: Converting Confluence HTML into vector-optimized **Markdown** and determining the `add/update/delete` synchronization plan.
3.  **Load**: Managing document creation and deletion in the Azure Vector Store.

***

## 🏗️ Technical Modules & Functionality

The code is organized into a modular architecture to separate concerns between external communication, data transformation, and business logic orchestration.

| Module | Key Responsibility | Core Files |
| :--- | :--- | :--- |
| **Clients.Azure** | All Azure OpenAI Vector Store CRUD operations (list, upload batch, delete by page ID). Includes standardized error handling for Azure SDK exceptions. | `azure_client.py`, `azure_schemas.py` |
| **Clients.Confluence** | Fetching the multi-level page hierarchy (catalog) and raw content (`body.storage`). Uses BeautifulSoup to clean and parse macro/link placeholders. | `confluence_catalog_client.py`, `confluence_page_client.py`, `confluence_schemas.py` |
| **Processors** | Content transformation layer. The `DoclingConverter` ensures content readability and structural integrity by producing clean Markdown. | `docling_converter.py` |
| **Orchestrators** | Encapsulates the entire multi-step synchronization workflow, combining calls to Clients and Processors. Manages overall transaction flow for ingestion. | `confluence_to_vectorstore_ingestion.py` |
| **Utilities** | Core logic for sync planning using set operations (`sync_utils.py`), managing temporary deletion states (`deletion_cache.py`), and standardized data formatting. | `sync_utils.py`, `deletion_cache.py`, `logger_init.py` |

***

## ⚙️ Configuration and Startup

### Dependencies

Install required libraries using `requirements.txt`:

```bash
pip install -r requirements.txt
```

### Environment Variables

The service requires a `.env` file in the root of the `backend/` directory for credentials and configuration.

* **Azure Configuration**: `AZURE_API_VERSION`, `AZURE_ENDPOINT`, `AZURE_API_KEY`.
* **Confluence Configuration**: `CONFLUENCE_URL`, `CONFLUENCE_USERNAME`, `CONFLUENCE_API_KEY`.

### Startup

Run the FastAPI application with Uvicorn:

```bash
uvicorn backend.main:app --reload
```

-----

## 💾 API Endpoint Reference

Defined in `main.py`.

| Method | Endpoint | Purpose |
| :--- | :--- | :--- |
| `GET` | `/v1/vector-stores` | Lists configured Azure Vector Stores and metadata. |
| `GET` | `/confluence/catalog` | Retrieves the entire Confluence hierarchy (spaces/pages). |
| `GET` | `/vectorstore/{vector_store_id}/pages` | Returns the list of currently indexed Confluence page IDs in the specified vector store. |
| `POST` | `/v1/pages/sync-now` | Triggers the ingestion pipeline based on the pages provided in the `SyncNowRequest`. |
