"""Paper CRUD endpoints."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query

from app.config import settings
from app.etl.loader import paper_id_from_path
from app.models.schemas import PaperExtraction, PaperSummary

router = APIRouter(prefix="/papers", tags=["papers"])


def _all_extractions() -> List[Dict[str, Any]]:
    items = []
    for f in sorted(settings.extractions_dir.glob("*.json")):
        try:
            items.append(json.loads(f.read_text()))
        except Exception:
            pass
    return items


@router.get("", response_model=List[PaperSummary])
def list_papers(
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    year_min: Optional[int] = Query(None),
    year_max: Optional[int] = Query(None),
    has_code: Optional[bool] = Query(None),
):
    summaries: List[PaperSummary] = []
    for data in _all_extractions():
        # Compute paper_id from source_file
        source_file = data.get("source_file", "")
        paper_id = paper_id_from_path(source_file) if source_file else data.get("paper_id", "")

        # Apply filters
        if category and data.get("category", "").lower() != category.lower():
            continue
        year = data.get("year")
        if year_min and (year is None or year < year_min):
            continue
        if year_max and (year is None or year > year_max):
            continue
        code = bool(data.get("code_resources"))
        if has_code is not None and code != has_code:
            continue

        title = data.get("title", "")
        brief = data.get("summaries", {}).get("brief", "")
        if search:
            q = search.lower()
            if q not in title.lower() and q not in brief.lower():
                continue

        corr = next(
            (a["name"] for a in data.get("authors", []) if a.get("is_corresponding")),
            None,
        )

        summaries.append(
            PaperSummary(
                paper_id=paper_id,
                title=title,
                year=year,
                venue=data.get("venue"),
                venue_type=data.get("venue_type"),
                brief=brief,
                methods=data.get("methods", ""),
                best_metric_name=data.get("best_metric_name"),
                best_metric_value=data.get("best_metric_value"),
                category=data.get("category", ""),
                subcategory=data.get("subcategory", ""),
                has_code=code,
                dataset_count=len(data.get("datasets", [])),
                corresponding_author_name=corr,
                has_abstract=bool(data.get("abstract")),
            )
        )

    return summaries


@router.get("/{paper_id}")
def get_paper(paper_id: str) -> Dict[str, Any]:
    path = settings.extractions_dir / f"{paper_id}.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Paper not found")
    data = json.loads(path.read_text())
    data["paper_id"] = paper_id
    return data


@router.delete("/{paper_id}")
def delete_paper(paper_id: str):
    path = settings.extractions_dir / f"{paper_id}.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Paper not found")
    path.unlink()
    # Remove from vectorstore
    from app.services.vectorstore import vectorstore
    vectorstore.delete_paper(paper_id)
    return {"deleted": paper_id}
