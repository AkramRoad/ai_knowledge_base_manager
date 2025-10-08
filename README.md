# AI Knowledge Base Manager

This repository contains a full-stack solution for managing and synchronizing structured knowledge from corporate sources (Confluence) to an AI assistant's vector store (Azure OpenAI).

## 💡 The Problem

Maintaining the performance and relevance of an AI assistant relies heavily on the quality and freshness of its knowledge base. Unstructured enterprise documentation (like internal Confluence pages) is often difficult to manage and synchronize manually with vectorized data stores, leading to stale, inconsistent, or poorly structured context for the AI.

## ✅ The Solution

The **AI Knowledge Base Manager** is a dedicated platform for administrators to visually curate, validate, and synchronize specific knowledge content to a target Vector Store.

### How it Works

The system is split into two co-dependent applications:

#### 1. Frontend (The Control Panel)

The React/TypeScript application provides the user interface for administrative control.
* **Selection**: Allows the administrator to select the target AI Assistant (Vector Store) from a fetched list.
* **Curation**: Displays the full hierarchical content catalog from Confluence, enabling multi-level selection of pages/spaces via tri-state checkboxes.
* **Trigger**: Submits the final list of desired Page IDs to the backend via the `/v1/pages/sync-now` endpoint to initiate the ETL process.

#### 2. Backend (The ETL Pipeline)

The Python/FastAPI service handles all data logic and external integrations.
* **Synchronization Logic**: Calculates the difference between the requested pages (from the frontend) and the pages already indexed in the Vector Store, generating an optimized `add/update/delete` plan.
* **Content Processing**: Fetches raw content from Confluence, cleans it, and converts it to vector-optimized **Markdown**.
* **Vector Store Management**: Executes the synchronization plan against the Azure OpenAI Vector Store by uploading new documents and deleting deprecated ones.

***

## 🗺️ Product Roadmap

The project is structured around three main phases, moving from core functionality to scalability and feature expansion.

### Phase 1: Minimum Viable Product (MVP) - (Current State)

Focus on establishing core connections and the manual synchronization loop.
* **Core Functionality**: Full implementation of the Confluence ETL pipeline and Azure Vector Store management endpoints.
* **Frontend**: Basic dashboard with manual file selection and sync button.
* **Known Gaps**: Frontend search is a work-in-progress, and security is a placeholder.

### Phase 2: Production Readiness & First Users

Focus on stability, user experience, and essential missing features.
* **Deployment**: Migrate from local development to production-ready infrastructure (e.g., cloud hosting for FastAPI and React).
* **User Management**: Implement actual user authentication (replacing placeholder logic) and ensure only authorized administrators can select vector stores and trigger syncs.
* **Feature Polish**: Complete the front-end redesign that supports all features, implement the search function on the frontend, and solidify data integrity.

### Phase 3: Scaling & New Features

Focus on expanding administrative control and content sources.
* **Delegated Access**: Implement functionality allowing existing authorized administrators to add and manage new users within the system, replacing the need for manual administrator configuration.
* **New Ingestion Sources**: Introduce support for additional content sources (e.g., manual file uploads for PDFs, DOCX, etc.).
* **Advanced Features**: Further planned features will be announced to users after the successful rollout of phase 2 capabilities.