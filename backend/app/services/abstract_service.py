"""Abstract generation: per-paper structured abstract + multi-paper synthesis."""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, AsyncGenerator, Dict, List, Optional

import anthropic

from app.config import settings
from app.models.schemas import StructuredAbstract
from app.services.prompts import (
    ABSTRACT_GENERATION_SYSTEM_PROMPT,
    SYNTHESIS_SYSTEM_PROMPT,
)
from app.services.vectorstore import vectorstore

client = anthropic.Anthropic(api_key=settings.anthropic_api_key)


# ---------------------------------------------------------------------------
# Per-paper abstract
# ---------------------------------------------------------------------------

def _load_extraction(paper_id: str) -> Optional[Dict[str, Any]]:
    path = settings.extractions_dir / f"{paper_id}.json"
    if not path.exists():
        return None
    return json.loads(path.read_text())


def _save_extraction(paper_id: str, data: Dict[str, Any]) -> None:
    path = settings.extractions_dir / f"{paper_id}.json"
    path.write_text(json.dumps(data, indent=2))


def _parse_structured_abstract(text: str) -> StructuredAbstract:
    """Parse Claude's 4-section formatted abstract into a StructuredAbstract."""
    sections = {"objective": "", "methods": "", "results": "", "conclusion": ""}
    patterns = {
        "objective": r"\*\*Objective:\*\*\s*(.+?)(?=\*\*Methods:|$)",
        "methods":   r"\*\*Methods:\*\*\s*(.+?)(?=\*\*Results:|$)",
        "results":   r"\*\*Results:\*\*\s*(.+?)(?=\*\*Conclusion:|$)",
        "conclusion": r"\*\*Conclusion:\*\*\s*(.+?)(?=\*\*|$)",
    }
    for key, pattern in patterns.items():
        m = re.search(pattern, text, re.DOTALL | re.IGNORECASE)
        if m:
            sections[key] = m.group(1).strip()

    return StructuredAbstract(
        **sections,
        generated_by="claude",
        generated_at=datetime.now(timezone.utc).isoformat(),
    )


def generate_paper_abstract(paper_id: str, force_regenerate: bool = False) -> StructuredAbstract:
    """Generate or retrieve a structured abstract for a single paper."""
    data = _load_extraction(paper_id)
    if data is None:
        raise ValueError(f"Paper {paper_id} not found in extractions")

    # Return cached abstract if available and not forcing regeneration
    if not force_regenerate and data.get("abstract"):
        ab = data["abstract"]
        return StructuredAbstract(**ab)

    # If raw_abstract was extracted from PDF, use it as the source
    raw = data.get("raw_abstract", "")
    summaries = data.get("summaries", {})
    medium_summary = summaries.get("medium", "")
    brief_summary = summaries.get("brief", "")

    paper_content = f"""Title: {data.get('title', 'Unknown')}

Raw Abstract (if found in PDF):
{raw or '(not found in PDF)'}

Paper Summary:
{medium_summary or brief_summary}

Key Findings: {data.get('key_findings', '')}
Methods: {data.get('methods', '')}
Contributions: {'; '.join(data.get('contributions', []))}
Performance: {data.get('performance_metrics', '')}"""

    response = client.messages.create(
        model=settings.claude_model,
        max_tokens=1024,
        system=ABSTRACT_GENERATION_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": paper_content}],
    )

    abstract = _parse_structured_abstract(response.content[0].text)

    # Persist back to extraction JSON
    data["abstract"] = abstract.model_dump()
    _save_extraction(paper_id, data)

    return abstract


# ---------------------------------------------------------------------------
# Synthesis abstract (multi-paper, streaming)
# ---------------------------------------------------------------------------

def _format_synthesis_context(results: Dict[str, Any]) -> tuple[str, List[Dict[str, Any]]]:
    docs = results.get("documents", [[]])[0]
    metas = results.get("metadatas", [[]])[0]
    distances = results.get("distances", [[]])[0]

    lines: List[str] = []
    cited: List[Dict[str, Any]] = []
    seen_papers: set = set()

    for doc, meta, dist in zip(docs, metas, distances):
        if not meta:
            continue
        paper_id = meta.get("paper_id", "")
        title = meta.get("title", "Unknown")
        year = meta.get("year", "")
        category = meta.get("category", "")

        lines.append(
            f"[Paper: {title} ({year}), Category: {category}]\n{doc}\n---"
        )

        if paper_id not in seen_papers:
            seen_papers.add(paper_id)
            cited.append({
                "paper_id": paper_id,
                "title": title,
                "year": year,
                "category": category,
                "relevance": round(1 - dist, 3) if dist is not None else None,
            })

    return "\n\n".join(lines), cited


async def stream_synthesis(
    query: str,
    n_results: int = 10,
    style: str = "background",
) -> AsyncGenerator[str, None]:
    """Retrieve top-K papers and stream a literature review synthesis paragraph."""
    results = vectorstore.query(query, n_results=n_results)
    context, cited_papers = _format_synthesis_context(results)

    style_instruction = {
        "background": "Write a Background/Related Work section paragraph",
        "survey": "Write a survey-style comparative overview",
        "introduction": "Write an Introduction motivation paragraph",
    }.get(style, "Write a Background section paragraph")

    user_content = (
        f"{style_instruction} on the topic: '{query}'\n\n"
        f"Use the following paper excerpts:\n\n{context}"
    )

    with client.messages.stream(
        model=settings.claude_model,
        max_tokens=2048,
        system=SYNTHESIS_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_content}],
    ) as stream:
        for text in stream.text_stream:
            yield f"data: {json.dumps({'token': text})}\n\n"

    yield f"data: {json.dumps({'cited_papers': cited_papers, 'n_papers_retrieved': len(cited_papers)})}\n\n"
    yield "data: [DONE]\n\n"
