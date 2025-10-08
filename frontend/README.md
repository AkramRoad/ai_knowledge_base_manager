# AI Knowledge Base Manager - Frontend

This document outlines the technical details and setup for the frontend application, which serves as the **Admin Panel** for managing the AI Assistant's knowledge base.

## 🚀 Core Purpose

The frontend is a single-page application (SPA) providing a modern user interface for:
1.  **Selection**: Identifying and selecting a target Azure Vector Store (AI Assistant).
2.  **Management**: Viewing the hierarchical Confluence data catalog and selecting specific pages to be included or excluded from the knowledge base.
3.  **Synchronization**: Triggering the backend's ingestion pipeline (`/v1/pages/sync-now`) to apply changes to the Vector Store.

***

## 🏗️ Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Framework** | **React** and **TypeScript** | Component-based UI and type safety. |
| **Tooling** | **Vite** | Fast development environment and bundling (`@vitejs/plugin-react-swc`). |
| **Routing** | **`react-router-dom`** | Handles client-side navigation (`/`, `/select`, `/dashboard/:id`). |
| **State Management** | **`@tanstack/react-query`** | Manages asynchronous server state (data fetching, caching, synchronization). |
| **Styling** | **Tailwind CSS** | Utility-first CSS framework with custom design tokens (`hsl` variables). |
| **UI Components** | **Radix UI** primitives and custom styled components (shadcn/ui convention) | Provides accessible, composable UI building blocks (`src/components/ui/`). |

***

## 🧩 Key Modules & Functionality

### Pages (`src/pages/`)

| File | Route | Purpose |
| :--- | :--- | :--- |
| `Landing.tsx` | `/` | Entry point and initial login prompt. |
| `VectorStoreSelection.tsx` | `/select` | Fetches available Vector Stores (`/v1/vector-stores`) and allows selection before navigating to the Dashboard. |
| `Dashboard.tsx` | `/dashboard/:vectorStoreId` | Main administration interface housing the `ConfluenceTab` and `UploadsTab`. |

### Logic Components (`src/components/`)

| File | Functionality | Notes |
| :--- | :--- | :--- |
| `ConfluenceTab.tsx` | **Synchronization Control, Catalog View & Search** | Manages `spaces` and `enabledPageIds` state. Implements tri-state checkbox logic for pages/spaces and search/filter logic for the hierarchical view. Caches catalog data for performance. |
| `KPICard.tsx` | **KPI Display** | Reusable card component for displaying key metrics, including conditional rendering for "Coming Soon" status. |
| `UploadsTab.tsx` | **File Upload Placeholder** | Provides an interface structure for future file upload functionality (DOCX, PDF, Images). |

### Utilities (`src/lib/` and `src/hooks/`)

| File | Purpose |
| :--- | :--- |
| `src/lib/utils.ts` | Provides the core **`cn`** utility function, which combines `clsx` and `tailwind-merge` for conditional and intelligent Tailwind class string construction. |
| `src/hooks/use-toast.ts` | Custom hook and state management logic for displaying toasts/notifications across the application. |
| `src/hooks/use-mobile.tsx` | Custom hook for responsive behavior based on a fixed mobile breakpoint (`768px`). |

***

## ⚙️ Development and Setup

### 1. Installation

First, navigate into the frontend directory, and then install the Node.js dependencies specified in `package.json`:

```bash
cd frontend
npm install
```

### 2. Running the Development Server

Start the application using the `dev` script defined in `package.json`. This command uses Vite and handles API proxying to the backend.

```bash
npm run dev
```