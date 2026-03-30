"""ChromaDB wrapper backed by SPECTER embeddings."""

from typing import Any, Dict, List, Optional

import chromadb
from chromadb.utils.embedding_functions import SentenceTransformerEmbeddingFunction

from app.config import settings


class LiteratureVectorStore:
    # New collection name to avoid dimension conflicts with any v1 data
    COLLECTION = "papers_specter"

    def __init__(self):
        self.client = chromadb.PersistentClient(path=str(settings.chroma_dir))
        # allenai-specter: 768-dim embeddings trained on scientific paper pairs
        # Downloads ~400MB on first run to ~/.cache/huggingface/hub/
        self.ef = SentenceTransformerEmbeddingFunction(
            model_name=settings.embedding_model,  # "allenai-specter"
            device="cpu",
        )
        self.col = self.client.get_or_create_collection(
            self.COLLECTION,
            embedding_function=self.ef,
            metadata={"hnsw:space": "cosine"},
        )

    # ------------------------------------------------------------------
    # Write
    # ------------------------------------------------------------------

    def upsert_paper(
        self,
        ids: List[str],
        documents: List[str],
        metadatas: List[Dict[str, Any]],
    ) -> None:
        self.col.upsert(ids=ids, documents=documents, metadatas=metadatas)

    def delete_paper(self, paper_id: str) -> None:
        results = self.col.get(where={"paper_id": paper_id})
        if results and results.get("ids"):
            self.col.delete(ids=results["ids"])

    # ------------------------------------------------------------------
    # Read
    # ------------------------------------------------------------------

    def paper_exists(self, paper_id: str) -> bool:
        results = self.col.get(where={"paper_id": paper_id}, limit=1)
        return bool(results and results.get("ids"))

    def query(
        self,
        query_text: str,
        n_results: int = 10,
        where: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        kwargs: Dict[str, Any] = {
            "query_texts": [query_text],
            "n_results": min(n_results, max(self.col.count(), 1)),
        }
        if where:
            kwargs["where"] = where
        return self.col.query(**kwargs)

    def get_stats(self) -> Dict[str, Any]:
        count = self.col.count()
        if count == 0:
            return {
                "total_chunks": 0,
                "unique_paper_ids": 0,
                "by_category": {},
            }

        all_meta = self.col.get(include=["metadatas"])["metadatas"]

        paper_ids: set = set()
        by_category: Dict[str, int] = {}

        for m in all_meta:
            if not m:
                continue
            paper_ids.add(m.get("paper_id", ""))
            cat = m.get("category", "other")
            by_category[cat] = by_category.get(cat, 0) + 1

        return {
            "total_chunks": count,
            "unique_paper_ids": len(paper_ids),
            "by_category": by_category,
        }

    def get_all_paper_ids(self) -> List[str]:
        if self.col.count() == 0:
            return []
        all_meta = self.col.get(include=["metadatas"])["metadatas"]
        return list({m["paper_id"] for m in all_meta if m and "paper_id" in m})


# Lazy singleton — SPECTER model loads only on first call, not at import time
_vs_instance: Optional["LiteratureVectorStore"] = None


def get_vectorstore() -> "LiteratureVectorStore":
    global _vs_instance
    if _vs_instance is None:
        _vs_instance = LiteratureVectorStore()
    return _vs_instance


# Back-compat alias used by existing callers (rag_agent.py, loader.py, etc.)
# Accessing .query / .upsert_paper etc. triggers lazy init transparently.
class _LazyVectorStore:
    def __getattr__(self, name):
        return getattr(get_vectorstore(), name)


vectorstore = _LazyVectorStore()
