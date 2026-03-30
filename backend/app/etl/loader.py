"""Persist extractions to ChromaDB and JSON."""

from __future__ import annotations

import hashlib
import json
from typing import Any, Dict, List

from app.config import settings
from app.etl.extractor import Document
from app.models.schemas import PaperExtraction
from app.services.vectorstore import vectorstore


def paper_id_from_path(source_file: str) -> str:
    return hashlib.md5(source_file.encode()).hexdigest()[:16]


def save_extraction(paper_id: str, extraction: PaperExtraction) -> None:
    path = settings.extractions_dir / f"{paper_id}.json"
    path.write_text(extraction.model_dump_json(indent=2))


def load_extraction(paper_id: str) -> Dict[str, Any]:
    path = settings.extractions_dir / f"{paper_id}.json"
    return json.loads(path.read_text())


def upsert_to_vectorstore(
    paper_id: str,
    extraction: PaperExtraction,
    chunks: List[Document],
) -> int:
    """Upsert pre-chunked Documents into ChromaDB. Returns chunk count."""
    ids: List[str] = []
    documents: List[str] = []
    metadatas: List[Dict[str, Any]] = []

    for i, chunk in enumerate(chunks):
        ids.append(f"{paper_id}_{i}")
        documents.append(chunk.page_content)
        metadatas.append({
            "paper_id": paper_id,
            "title": extraction.title,
            "year": extraction.year,
            "category": extraction.category,
            "subcategory": extraction.subcategory,
            "venue": extraction.venue or "",
            "venue_type": extraction.venue_type or "",
            "has_code": bool(extraction.code_resources),
            "dataset_count": len(extraction.datasets),
            "chunk_index": chunk.metadata.get("chunk_index", i),
            "section": chunk.metadata.get("section", ""),
            "element_type": chunk.metadata.get("element_type", "text"),
        })

    vectorstore.upsert_paper(ids=ids, documents=documents, metadatas=metadatas)
    return len(chunks)
