from pydantic import BaseModel
from pydantic.generics import GenericModel
from typing import Generic, TypeVar

T = TypeVar("T")

class SyncNowRequest(BaseModel):
    user_id: str
    vector_store_id: str
    page_ids: list[str]

class APIResponse(GenericModel, Generic[T]):
    status: str
    data: T     
    message: str