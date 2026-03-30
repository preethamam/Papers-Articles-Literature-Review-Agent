"""Section-aware chunking and Claude metadata extraction."""

from __future__ import annotations

import re
from typing import Any, Dict, List, Optional, Tuple

import anthropic
from tenacity import retry, stop_after_attempt, wait_exponential

from app.config import settings
from app.etl.extractor import Document
from app.models.schemas import PaperExtraction
from app.services.prompts import EXTRACTION_SYSTEM_PROMPT

client = anthropic.Anthropic(api_key=settings.anthropic_api_key)


# ---------------------------------------------------------------------------
# Section-aware, table-aware chunking
# ---------------------------------------------------------------------------

def chunk_documents(documents: List[Document], title: str = "") -> List[Document]:
    """
    Convert docling Documents into SPECTER-ready chunks.

    - Tables: kept as single chunks, never split.
    - Text: grouped by section, split at paragraph boundaries, then word limit.
    - Each chunk gets SPECTER title prefix: "Title [SEP] body".
    """
    section_groups: Dict[str, List[Document]] = {}
    table_docs: List[Document] = []

    for doc in documents:
        if doc.metadata.get("element_type") == "table":
            table_docs.append(doc)
        else:
            sec = doc.metadata.get("section", "")
            section_groups.setdefault(sec, []).append(doc)

    chunks: List[Document] = []
    idx = 0

    for section, docs in section_groups.items():
        combined = "\n\n".join(d.page_content for d in docs)
        base_meta = docs[0].metadata.copy()
        for chunk_text in _split_text(combined, settings.chunk_size, settings.chunk_overlap):
            specter = f"{title} [SEP] {chunk_text}" if title else chunk_text
            chunks.append(Document(
                page_content=specter,
                metadata={**base_meta, "element_type": "text", "section": section,
                          "chunk_index": idx, "title": title},
            ))
            idx += 1

    for table_doc in table_docs:
        specter = f"{title} [SEP] {table_doc.page_content}" if title else table_doc.page_content
        chunks.append(Document(
            page_content=specter,
            metadata={**table_doc.metadata, "chunk_index": idx, "title": title},
        ))
        idx += 1

    return chunks


def _split_text(text: str, size: int, overlap: int) -> List[str]:
    """Split at paragraph boundaries first, then enforce word limit."""
    text = re.sub(r"\n{3,}", "\n\n", text).strip()
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    chunks: List[str] = []
    current: List[str] = []
    for para in paragraphs:
        words = para.split()
        if current and len(current) + len(words) > size:
            chunks.append(" ".join(current))
            current = current[-overlap:] if overlap else []
        current.extend(words)
    if current:
        chunks.append(" ".join(current))
    return chunks or [text]


# ---------------------------------------------------------------------------
# Abstract extraction from docling section metadata
# ---------------------------------------------------------------------------

def extract_abstract_from_documents(documents: List[Document]) -> Optional[str]:
    """Extract abstract using docling section labels; falls back to regex."""
    in_abstract = False
    parts: List[str] = []
    for doc in documents:
        sec = doc.metadata.get("section", "").lower()
        if "abstract" in sec:
            in_abstract = True
        elif in_abstract and sec and "abstract" not in sec:
            break
        if in_abstract and doc.metadata.get("element_type") == "text":
            parts.append(doc.page_content)
    if parts:
        return " ".join(parts)

    combined = "\n\n".join(d.page_content for d in documents[:20])[:4000]
    return _regex_abstract_fallback(combined)


def _regex_abstract_fallback(head: str) -> Optional[str]:
    patterns = [
        r"(?i)abstract[\s\n]+([A-Z][^#]{100,1500})(?=\n\n|\n[A-Z]{3,}|\nKeywords|\nIndex Terms)",
        r"(?i)\bAbstract[—\-–:]?\s*\n([^\n].{100,1500}?)(?=\n\n|\nKeywords|\n[A-Z]{3,})",
        r"(?i)ABSTRACT\s*\n([\s\S]{100,1500}?)(?=\n\n[A-Z]|\nKeywords|\nIndex Terms)",
    ]
    for p in patterns:
        m = re.search(p, head, re.DOTALL)
        if m:
            t = m.group(1).strip()
            if 80 < len(t) < 2000:
                return t
    return None


# ---------------------------------------------------------------------------
# Claude metadata extraction
# ---------------------------------------------------------------------------

EXTRACTION_SCHEMA = {
    "name": "extract_paper_metadata",
    "description": "Extract structured metadata from an academic paper",
    "input_schema": {
        "type": "object",
        "required": ["title", "authors", "summaries", "objective", "methods"],
        "properties": {
            "title": {"type": "string"},
            "authors": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string"},
                        "email": {"type": ["string", "null"]},
                        "affiliation": {"type": ["string", "null"]},
                        "is_corresponding": {"type": "boolean"},
                    },
                    "required": ["name"],
                },
            },
            "year": {"type": ["integer", "null"]},
            "venue": {"type": ["string", "null"]},
            "venue_type": {"type": ["string", "null"], "enum": ["journal", "conference", "workshop", None]},
            "doi": {"type": ["string", "null"]},
            "summaries": {
                "type": "object",
                "required": ["brief", "medium", "sections"],
                "properties": {
                    "brief": {"type": "string"},
                    "medium": {"type": "string"},
                    "sections": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "section": {"type": "string"},
                                "summary": {"type": "string"},
                            },
                        },
                    },
                },
            },
            "objective": {"type": "string"},
            "methods": {"type": "string"},
            "key_findings": {"type": "string"},
            "contributions": {"type": "array", "items": {"type": "string"}},
            "ml_model_or_algorithm": {"type": ["string", "null"]},
            "datasets": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string"},
                        "url": {"type": ["string", "null"]},
                        "paper_url": {"type": ["string", "null"]},
                        "creators": {"type": ["string", "null"]},
                        "description": {"type": ["string", "null"]},
                        "is_open_source": {"type": "boolean"},
                    },
                    "required": ["name"],
                },
            },
            "code_resources": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "platform": {"type": "string"},
                        "url": {"type": "string"},
                        "description": {"type": ["string", "null"]},
                    },
                    "required": ["platform", "url"],
                },
            },
            "performance_metrics": {"type": ["string", "null"]},
            "best_metric_name": {"type": ["string", "null"]},
            "best_metric_value": {"type": ["number", "null"]},
            "limitations": {"type": ["string", "null"]},
            "future_work": {"type": ["string", "null"]},
        },
    },
}


def _build_claude_input(documents: List[Document], max_chars: int = 12000) -> str:
    """Priority sections first (abstract, intro, conclusion), then fill to budget."""
    PRIORITY = {"abstract", "introduction", "conclusion", "contributions", "results"}
    priority = [d for d in documents if any(p in d.metadata.get("section", "").lower() for p in PRIORITY)]
    other = [d for d in documents if d not in priority]
    return "\n\n".join(d.page_content for d in priority + other)[:max_chars]


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=30))
def extract_metadata(
    documents: List[Document],
    source_file: str,
    category: str,
    subcategory: str,
) -> Tuple[PaperExtraction, Optional[str]]:
    """Call Claude to extract structured metadata from docling Documents."""
    raw_abstract = extract_abstract_from_documents(documents)
    claude_input = _build_claude_input(documents)

    response = client.messages.create(
        model=settings.claude_model,
        max_tokens=4096,
        system=EXTRACTION_SYSTEM_PROMPT,
        tools=[EXTRACTION_SCHEMA],
        tool_choice={"type": "tool", "name": "extract_paper_metadata"},
        messages=[{"role": "user", "content": f"Extract metadata from this paper:\n\n{claude_input}"}],
    )

    tool_use = next(b for b in response.content if b.type == "tool_use")
    data: Dict[str, Any] = tool_use.input

    extraction = PaperExtraction(
        source_file=source_file,
        category=category,
        subcategory=subcategory,
        raw_abstract=raw_abstract,
        **data,
    )
    return extraction, raw_abstract
