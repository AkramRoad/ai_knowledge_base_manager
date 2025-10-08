from docling.datamodel.base_models import InputFormat
from docling.document_converter import DocumentConverter

from backend.src.utils.logger_init import setup_logging

logger = setup_logging(log_name=__name__)

class DoclingConverter:
    def __init__(self):
        self.converter = DocumentConverter()

    def _to_markdown(self, result) -> str:
        """Shared post-processing to export Docling document as Markdown."""
        docling_doc = result.document
        return docling_doc.export_to_markdown()

    def convert_html(self, html_string: str) -> str:
        """Convert HTML content into Markdown."""
        result = self.converter.convert_string(
            html_string, InputFormat.HTML, name="html_input"
        )
        return self._to_markdown(result)

    # ----- TODO: Implement these -----
    # NOTE: Now takes a pdf path but ideally use drag and drop pdf from frontend.
    def convert_pdf(self, pdf_file) -> str:
        """Convert a PDF file-like object into Markdown."""
        result = self.converter.convert(pdf_file)
        return self._to_markdown(result)
    
    def convert_docx(self, ) -> str:
        pass

    def convert_pptx(self, ) -> str:
        pass

    def convert_xlsx(self, ) -> str:
        pass

    def convert_csv(self, ) -> str:
        pass

    def convert_image(self, ) -> str:
        # Check which format, and then call the format specific function:
        # PNG, JPEG, TIFF, BMP, WEBP
        pass