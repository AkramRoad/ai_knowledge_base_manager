# NOTE: DONE FOR MVP

from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional

class AzureFileCountsSchema(BaseModel):
    total: int = Field(..., description="Total number of files in the vector store")
    completed: int = Field(..., description="Number of files successfully processed")
    failed: int = Field(..., description="Number of files that failed processing")
    in_progress: int = Field(..., description="Number of files currently in progress")
    cancelled: int = Field(..., description="Number of files that were cancelled")

class AzureVectorStoreSchema(BaseModel):
    id: str = Field(..., description="Unique identifier of the vector store")
    name: str = Field(..., description="Name of the vector store")
    object: str = Field(..., description="Type or object identifier of the store")
    status: str = Field(..., description="Current status of the vector store")
    last_active_at: Optional[datetime | int] = Field(
        None, description="Timestamp of the last activity in the vector store"
    )
    created_at: datetime | int = Field(..., description="Creation timestamp of the vector store")
    file_counts: AzureFileCountsSchema = Field(..., description="File counts summary of the vector store")

class VectorStoreDocument(BaseModel):
    id: str = Field(..., description="Unique ID of the document in the vector store")
    filename: str = Field(..., description="Filename of the uploaded document")
    object: str = Field(..., description="Object type returned by Azure")
    status: str = Field(..., description="Status of the document upload")
    created_at: datetime | int = Field(..., description="Timestamp when the document was created")

class VectorStoreDocumentInput(BaseModel):
    title: str = Field(..., description="Title of the document")
    id: str = Field(..., description="Unique identifier of the document")
    content: str = Field(..., description="Content of the document")