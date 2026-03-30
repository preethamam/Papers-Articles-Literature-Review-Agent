"""PDF text extraction using docling — single parser, structured output."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, Generator, List, Optional


@dataclass
class Document:
    """LangChain-compatible document schema, defined locally (no langchain dependency)."""
    page_content: str
    metadata: Dict[str, Any] = field(default_factory=dict)


class DoclingPDFLoader:
    """
    Parse a PDF using docling's DocumentConverter.

    Yields one Document per text paragraph or table (section-aware).
    Tables are kept intact and serialized to markdown.
    """

    def __init__(self, pdf_path: Path) -> None:
        self.pdf_path = Path(pdf_path)

    def lazy_load(self) -> Generator[Document, None, None]:
        from docling.document_converter import DocumentConverter
        from docling.datamodel.pipeline_options import PdfPipelineOptions

        pipeline_options = PdfPipelineOptions()
        pipeline_options.do_ocr = False           # digital PDFs — skip OCR for speed
        pipeline_options.do_table_structure = True

        converter = DocumentConverter()
        result = converter.convert(str(self.pdf_path))
        doc = result.document

        doc_title = _extract_doc_title(doc)
        base_meta: Dict[str, Any] = {
            "source": str(self.pdf_path),
            "filename": self.pdf_path.name,
            "doc_title": doc_title,
        }

        current_section = ""

        for element in doc.texts:
            label = getattr(element, "label", "") or ""
            text = getattr(element, "text", "") or ""

            if label in {"section_header", "title", "page_header"}:
                current_section = text.strip()
                continue

            if not text or len(text.strip()) < 20:
                continue

            yield Document(
                page_content=text.strip(),
                metadata={
                    **base_meta,
                    "element_type": "text",
                    "section": current_section,
                },
            )

        for i, table in enumerate(doc.tables):
            table_md = _serialize_table(table, doc_title, current_section)
            if table_md:
                yield Document(
                    page_content=table_md,
                    metadata={
                        **base_meta,
                        "element_type": "table",
                        "table_index": i,
                        "section": current_section,
                    },
                )

    def load(self) -> List[Document]:
        return list(self.lazy_load())


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _extract_doc_title(doc) -> str:
    """Pull title from PDF XMP metadata or first heading element."""
    if hasattr(doc, "metadata") and doc.metadata:
        t = getattr(doc.metadata, "title", None)
        if t and len(str(t)) > 5:
            return str(t).strip()
    for item in doc.texts:
        if getattr(item, "label", "") == "title":
            return (getattr(item, "text", "") or "").strip()
    return ""


def _serialize_table(table, doc_title: str, section: str) -> str:
    """
    Serialize a docling TableItem to markdown with SPECTER context prefix.

    Format:
        [Title: <doc_title>] [Section: <section>] [Caption: <caption>]
        | col1 | col2 | ...
        |------|------|
        | val  | val  |
    """
    try:
        caption = ""
        if hasattr(table, "captions") and table.captions:
            cap = table.captions[0]
            caption = (getattr(cap, "text", "") or "").strip()

        try:
            df = table.export_to_dataframe()
            table_body = df.to_markdown(index=False)
        except Exception:
            table_body = str(table)

        lines: List[str] = []
        if doc_title:
            lines.append(f"[Title: {doc_title}]")
        if section:
            lines.append(f"[Section: {section}]")
        if caption:
            lines.append(f"[Caption: {caption}]")
        lines.append(table_body)
        return "\n".join(lines)
    except Exception:
        return (getattr(table, "text", "") or "")
