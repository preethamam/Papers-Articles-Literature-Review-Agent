"""ETL pipeline orchestrator — scan folder → docling extract → embed → persist."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, Generator, List, Optional

from app.config import settings
from app.etl.extractor import DoclingPDFLoader
from app.etl.loader import paper_id_from_path, save_extraction, upsert_to_vectorstore
from app.etl.transformer import chunk_documents, extract_metadata
from app.services.vectorstore import vectorstore


def _load_manifest() -> Dict[str, Any]:
    if settings.manifest_path.exists():
        return json.loads(settings.manifest_path.read_text())
    return {}


def _save_manifest(manifest: Dict[str, Any]) -> None:
    settings.manifest_path.write_text(json.dumps(manifest, indent=2))


def _discover_pdfs(articles_dir: Path) -> List[Path]:
    """Recursively find all PDFs under articles_dir."""
    if articles_dir.is_dir():
        return sorted(articles_dir.rglob("*.pdf"))
    return []


def _category_from_path(pdf_path: Path, articles_dir: Path) -> tuple[str, str]:
    """Derive category/subcategory from folder structure relative to articles_dir."""
    try:
        rel = pdf_path.relative_to(articles_dir)
        parts = rel.parts
        category = parts[0] if len(parts) > 1 else "Uncategorised"
        subcategory = "/".join(parts[1:-1]) if len(parts) > 2 else ""
    except ValueError:
        category, subcategory = "Uncategorised", ""
    return category, subcategory


def run_pipeline(
    articles_dir: Path,
    reprocess: bool = False,
) -> Generator[Dict[str, Any], None, None]:
    """
    Synchronous generator — yields event dicts consumed by IngestWorker.

    Event types:
      {"event": "start",    "total": N}
      {"event": "progress", "message": str, "paper_id": str, "skipped": bool}
      {"event": "done",     "message": str, "processed": int, "skipped": int, "errors": int}
      {"event": "error",    "message": str, "paper_id": str}
    """
    manifest = _load_manifest()
    pdfs = _discover_pdfs(articles_dir)

    if not pdfs:
        yield {"event": "error", "message": f"No PDFs found in {articles_dir}"}
        return

    yield {"event": "start", "total": len(pdfs), "message": f"Found {len(pdfs)} PDF(s)"}

    processed = skipped = errors = 0

    for pdf_path in pdfs:
        try:
            source_file = str(pdf_path.relative_to(articles_dir))
        except ValueError:
            source_file = pdf_path.name
        paper_id = paper_id_from_path(source_file)

        if not reprocess and manifest.get(paper_id) == "done":
            skipped += 1
            yield {"event": "progress", "message": f"Skipped: {pdf_path.name}",
                   "paper_id": paper_id, "skipped": True}
            continue

        yield {"event": "progress", "message": f"Parsing: {pdf_path.name}",
               "paper_id": paper_id, "skipped": False, "file": pdf_path.name}

        try:
            # 1. Parse PDF → structured Documents (docling)
            loader = DoclingPDFLoader(pdf_path)
            documents = loader.load()
            if not documents:
                raise ValueError("No content extracted from PDF")

            # 2. Claude metadata extraction
            category, subcategory = _category_from_path(pdf_path, articles_dir)
            extraction, _ = extract_metadata(
                documents=documents,
                source_file=source_file,
                category=category,
                subcategory=subcategory,
            )

            # 3. Persist JSON
            save_extraction(paper_id, extraction)

            # 4. Chunk → embed → upsert
            chunks = chunk_documents(documents, title=extraction.title)
            chunk_count = upsert_to_vectorstore(paper_id, extraction, chunks)

            manifest[paper_id] = "done"
            _save_manifest(manifest)
            processed += 1

            yield {
                "event": "progress",
                "message": f"Done: {extraction.title} ({chunk_count} chunks)",
                "paper_id": paper_id,
                "title": extraction.title,
                "chunks": chunk_count,
                "skipped": False,
                "file": pdf_path.name,
            }

        except Exception as exc:
            errors += 1
            manifest[paper_id] = f"error: {exc}"
            _save_manifest(manifest)
            yield {
                "event": "error",
                "message": f"Error: {pdf_path.name} — {exc}",
                "paper_id": paper_id,
            }

    yield {
        "event": "done",
        "message": f"Complete — processed: {processed}, skipped: {skipped}, errors: {errors}",
        "processed": processed,
        "skipped": skipped,
        "errors": errors,
    }
