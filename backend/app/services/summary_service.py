"""Section summaries and Related Works synthesis — sync generators for PyQt6."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, Generator, List, Optional, Union

import anthropic

from app.config import settings
from app.services.prompts import RELATED_WORKS_SYSTEM_PROMPT
from app.services.vectorstore import vectorstore

client = anthropic.Anthropic(api_key=settings.anthropic_api_key)


# ---------------------------------------------------------------------------
# Section summaries (read from extraction JSON — generated during ingest)
# ---------------------------------------------------------------------------

def get_section_summaries(paper_id: str) -> Dict[str, str]:
    """
    Return {section_name: summary_text} from the paper's extraction JSON.
    Summaries are generated during ingest via Claude tool-use (no extra API call).
    """
    path = settings.extractions_dir / f"{paper_id}.json"
    if not path.exists():
        return {}
    data = json.loads(path.read_text())
    sections_list = data.get("summaries", {}).get("sections", [])
    return {s["section"]: s["summary"] for s in sections_list if "section" in s and "summary" in s}


def get_paper_info(paper_id: str) -> Dict[str, Any]:
    """Return full extraction dict for a paper."""
    path = settings.extractions_dir / f"{paper_id}.json"
    if not path.exists():
        return {}
    return json.loads(path.read_text())


def list_all_papers() -> List[Dict[str, Any]]:
    """Return a list of {paper_id, title, authors, year, ...} for all ingested papers."""
    papers = []
    if not settings.extractions_dir.exists():
        return papers
    for path in sorted(settings.extractions_dir.glob("*.json")):
        try:
            data = json.loads(path.read_text())
            papers.append({
                "paper_id": path.stem,
                "title": data.get("title", "Untitled"),
                "authors": data.get("authors", []),
                "year": data.get("year"),
                "venue": data.get("venue", ""),
                "venue_type": data.get("venue_type", ""),
                "category": data.get("category", ""),
                "subcategory": data.get("subcategory", ""),
                "has_code": bool(data.get("code_resources")),
                "dataset_count": len(data.get("datasets", [])),
                "brief": data.get("summaries", {}).get("brief", ""),
                "objective": data.get("objective", ""),
                "has_section_summaries": bool(data.get("summaries", {}).get("sections")),
            })
        except Exception:
            continue
    return papers


# ---------------------------------------------------------------------------
# Related Works synthesis — sync generator for SynthesisWorker
# ---------------------------------------------------------------------------

def _format_context(results: Dict[str, Any]) -> tuple[str, List[Dict[str, Any]]]:
    docs = results.get("documents", [[]])[0]
    metas = results.get("metadatas", [[]])[0]
    distances = results.get("distances", [[]])[0]

    lines: List[str] = []
    cited: List[Dict[str, Any]] = []
    seen: set = set()

    for doc, meta, dist in zip(docs, metas, distances):
        if not meta:
            continue
        paper_id = meta.get("paper_id", "")
        title = meta.get("title", "Unknown")
        year = meta.get("year", "")
        lines.append(f"[{title} ({year})]\n{doc}\n---")
        if paper_id not in seen:
            seen.add(paper_id)
            cited.append({
                "paper_id": paper_id,
                "title": title,
                "year": year,
                "category": meta.get("category", ""),
                "relevance": round(1 - dist, 3) if dist is not None else None,
            })

    return "\n\n".join(lines), cited


def stream_related_works(
    query: str,
    n_results: int = 10,
    style: str = "background",
) -> Generator[Union[str, List[Dict[str, Any]]], None, None]:
    """
    Sync generator. Yields:
      - str: each Claude token as it streams
      - list: cited papers as the final item
    """
    results = vectorstore.query(query, n_results=n_results)
    context, cited_papers = _format_context(results)

    style_instruction = {
        "background": "Write a Background/Related Work section",
        "survey": "Write a survey-style comparative overview",
        "introduction": "Write an Introduction motivation paragraph",
    }.get(style, "Write a Background/Related Work section")

    user_content = (
        f"{style_instruction} on the topic: '{query}'\n\n"
        f"Paper excerpts:\n\n{context}"
    )

    with client.messages.stream(
        model=settings.claude_model,
        max_tokens=3000,
        system=RELATED_WORKS_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_content}],
    ) as stream:
        for text in stream.text_stream:
            yield text

    yield cited_papers
