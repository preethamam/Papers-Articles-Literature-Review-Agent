"""RAG agent: retrieve via SPECTER → stream Claude answer (sync generator)."""

from __future__ import annotations

from typing import Any, Dict, Generator, List, Optional, Union

import anthropic

from app.config import settings
from app.services.prompts import RAG_SYSTEM_PROMPT
from app.services.vectorstore import vectorstore

client = anthropic.Anthropic(api_key=settings.anthropic_api_key)


def _format_context(results: Dict[str, Any]) -> str:
    lines: List[str] = []
    docs = results.get("documents", [[]])[0]
    metas = results.get("metadatas", [[]])[0]
    for i, (doc, meta) in enumerate(zip(docs, metas)):
        if not meta:
            continue
        title = meta.get("title", "Unknown")
        year = meta.get("year", "")
        section = meta.get("section", "")
        label = f"{title} ({year})" + (f" — {section}" if section else "")
        lines.append(f"[{label}]\n{doc}\n---")
    return "\n\n".join(lines)


def stream_query(
    question: str,
    n_results: int = 10,
    filters: Optional[Dict[str, Any]] = None,
    chat_history: Optional[List[Dict[str, str]]] = None,
) -> Generator[Union[str, List[Dict[str, Any]]], None, None]:
    """
    Synchronous generator. Yields:
      - str: each Claude token as it streams
      - list: source papers list as the final item
    """
    chat_history = chat_history or []
    results = vectorstore.query(question, n_results=n_results, where=filters)
    context = _format_context(results)

    user_content = f"Relevant paper excerpts:\n\n{context}\n\n---\n\nQuestion: {question}"
    messages = chat_history + [{"role": "user", "content": user_content}]

    with client.messages.stream(
        model=settings.claude_model,
        max_tokens=4096,
        system=RAG_SYSTEM_PROMPT,
        messages=messages,
    ) as stream:
        for text in stream.text_stream:
            yield text

    # Yield sources list as final item
    docs = results.get("documents", [[]])[0]
    metas = results.get("metadatas", [[]])[0]
    distances = results.get("distances", [[]])[0]

    sources = [
        {
            "title": m.get("title", ""),
            "year": m.get("year"),
            "category": m.get("category", ""),
            "section": m.get("section", ""),
            "paper_id": m.get("paper_id", ""),
            "chunk": doc[:300],
            "relevance": round(1 - d, 3) if d is not None else None,
        }
        for m, doc, d in zip(metas, docs, distances)
        if m
    ]
    yield sources
