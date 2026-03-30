"""GET /stats — aggregate statistics from extractions."""

from __future__ import annotations

import json
from collections import Counter
from typing import Any, Dict, List

from fastapi import APIRouter

from app.config import settings
from app.models.schemas import StatsResponse
from app.services.vectorstore import vectorstore

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("", response_model=StatsResponse)
def get_stats():
    vs_stats = vectorstore.get_stats()

    all_data: List[Dict[str, Any]] = []
    for f in settings.extractions_dir.glob("*.json"):
        try:
            all_data.append(json.loads(f.read_text()))
        except Exception:
            pass

    total_papers = len(all_data)

    by_category: Counter = Counter()
    venue_types: Counter = Counter()
    years: Counter = Counter()
    dataset_names: Counter = Counter()
    papers_with_code = 0
    papers_with_abstract = 0
    all_datasets: set = set()

    for d in all_data:
        by_category[d.get("category", "Uncategorised")] += 1
        vt = d.get("venue_type") or "unknown"
        venue_types[vt] += 1
        yr = d.get("year")
        if yr:
            years[str(yr)] += 1
        if d.get("code_resources"):
            papers_with_code += 1
        if d.get("abstract"):
            papers_with_abstract += 1
        for ds in d.get("datasets", []):
            name = ds.get("name", "")
            if name:
                all_datasets.add(name)
                dataset_names[name] += 1

    top_datasets = [
        {"name": name, "count": cnt}
        for name, cnt in dataset_names.most_common(10)
    ]

    return StatsResponse(
        total_papers=total_papers,
        total_chunks=vs_stats["total_chunks"],
        by_category=dict(by_category),
        papers_with_code_count=papers_with_code,
        papers_with_abstract_count=papers_with_abstract,
        unique_datasets_count=len(all_datasets),
        top_datasets=top_datasets,
        venue_type_breakdown=dict(venue_types),
        year_distribution=dict(years),
    )
