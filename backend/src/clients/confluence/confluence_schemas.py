# NOTE: DONE FOR MVP

from pydantic import BaseModel, Field
from typing import Optional

class RawConfluencePageMinimal(BaseModel):
    id: str = Field(..., description="Unique identifier of the page")
    type: str = Field(..., description="Type of the Confluence content")
    status: str = Field(..., description="Current status of the page")
    title: str = Field(..., description="Page title")
    value: str = Field(..., description="Page content") 

class StructuredConfluencePage(BaseModel):
    id: str = Field(..., description="Unique identifier of the structured page")
    title: str = Field(..., description="Page title")
    type: str = Field(..., description="Type of the Confluence content")
    html_content: str = Field(..., description="HTML content of the page")

class ConfluencePageFetchResult(BaseModel):
    successful_pages: list[RawConfluencePageMinimal] = Field(
        ..., description="List of pages successfully fetched"
    )
    failed_page_ids: list[str] = Field(
        ..., description="List of page IDs that failed to fetch"
    )

class ConfluenceSpace(BaseModel):
    id: str = Field(..., description="Unique identifier of the space")
    key: str = Field(..., description="Key of the Confluence space")
    name: str = Field(..., description="Name of the Confluence space")

class ConfluencePage(BaseModel):
    id: str = Field(..., description="Unique identifier of the page")
    title: str = Field(..., description="Page title")
    parentId: Optional[str] = Field(None, description="Parent page ID, if any")

class ConfluenceTreePage(ConfluencePage):
    children: list["ConfluenceTreePage"] = Field(default_factory=list, description="Child pages of the current page")

class ConfluenceSpaceCatalog(ConfluenceSpace):
    pages: list[ConfluenceTreePage] = Field(default_factory=list, description="Tree of pages within the space")