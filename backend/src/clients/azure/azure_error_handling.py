# NOTE: DONE FOR MVP (FOR NOW DOESN'T WORK CORRECTLY)
# TODO: Fix mismatch in type hinting for return type, it is in the mismatch of the output of the function and the one of the decorator

from azure.core.exceptions import (
    ClientAuthenticationError,
    ResourceNotFoundError,
    HttpResponseError,
    ServiceRequestError,
    ServiceResponseError,
    AzureError,
    )

from functools import wraps
from typing import Any, Callable

from backend.src.utils.logger_init import setup_logging

logger = setup_logging(log_name=__name__)

def handle_azure_errors(func: Callable[..., Any]) -> Callable[..., dict[str, Any] | Any]:
    """Decorator that wraps Azure SDK calls with unified error handling."""
    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        
        except ClientAuthenticationError as e:
            logger.error("Azure Authentication error", exc_info=True)
            return {
                "status": "error", 
                "data": [], 
                "message": "Authentication failed. Check Azure credentials."
                }
        
        except ResourceNotFoundError as e:
            logger.error("Azure Resource not found", exc_info=True)
            return {
                "status": "error", 
                "data": [], 
                "message": "Requested resource not found or permission denied."
                }
        
        except HttpResponseError as e:
            logger.error("Azure HTTP response error", exc_info=True)
            return {
                "status": "error",  
                "data": [], 
                "message": "Azure API responded with an error."
                }
        
        except (ServiceRequestError, ServiceResponseError) as e:
            logger.error("Azure network or response error", exc_info=True)
            return {
                "status": "error", 
                "data": [], 
                "message": "Network or connection issue with Azure service."
                }
        
        except AzureError as e:
            logger.error("General Azure SDK error", exc_info=True)
            return {
                "status": "error", 
                "data": [], 
                "message": "Unexpected Azure service issue."
                }
        
        except Exception as e:
            logger.error("Unexpected system error", exc_info=True)
            return {
                "status": "error", 
                "data": [], 
                "message": "Unexpected system error occurred."
                }

    return wrapper