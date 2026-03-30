from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Sub-models
# ---------------------------------------------------------------------------

class Author(BaseModel):
    name: str
    email: Optional[str] = None
    affiliation: Optional[str] = None
    is_corresponding: bool = False


class Dataset(BaseModel):
    name: str
    url: Optional[str] = None
    paper_url: Optional[str] = None
    creators: Optional[str] = None
    description: Optional[str] = None
    is_open_source: bool = True


class CodeResource(BaseModel):
    platform: Literal["github", "gitlab", "bitbucket", "huggingface", "project_page", "other"]
    url: str
    description: Optional[str] = None


class SectionSummary(BaseModel):
    section: str
    summary: str


class PaperSummaries(BaseModel):
    brief: str
    medium: str
    sections: List[SectionSummary]


class StructuredAbstract(BaseModel):
    objective: str
    methods: str
    results: str
    conclusion: str
    generated_by: Literal["extracted", "claude"] = "claude"
    generated_at: Optional[str] = None


# ---------------------------------------------------------------------------
# Main extraction model — domain-agnostic
# ---------------------------------------------------------------------------

class PaperExtraction(BaseModel):
    # Identity
    title: str
    authors: List[Author]
    year: Optional[int] = None
    venue: Optional[str] = None
    venue_type: Optional[Literal["journal", "conference", "workshop"]] = None
    doi: Optional[str] = None

    # ETL metadata (from file path — NOT Claude)
    source_file: str
    category: str = ""
    subcategory: str = ""

    # Multi-level summaries
    summaries: PaperSummaries

    # Research scope (domain-agnostic)
    objective: str
    methods: str = ""
    key_findings: str = ""
    contributions: List[str] = Field(default_factory=list)

    # Technical
    ml_model_or_algorithm: Optional[str] = None
    datasets: List[Dataset] = Field(default_factory=list)
    code_resources: List[CodeResource] = Field(default_factory=list)

    # Results
    performance_metrics: Optional[str] = None
    best_metric_name: Optional[str] = None
    best_metric_value: Optional[float] = None

    # Gaps
    limitations: Optional[str] = None
    future_work: Optional[str] = None

    # Per-paper abstract (populated on demand or during ingest if found in PDF)
    abstract: Optional[StructuredAbstract] = None
    raw_abstract: Optional[str] = None  # verbatim text found in PDF


# ---------------------------------------------------------------------------
# Flattened summary for table rows
# ---------------------------------------------------------------------------

class PaperSummary(BaseModel):
    paper_id: str
    title: str
    year: Optional[int] = None
    venue: Optional[str] = None
    venue_type: Optional[str] = None
    brief: str = ""
    methods: str = ""
    best_metric_name: Optional[str] = None
    best_metric_value: Optional[float] = None
    category: str = ""
    subcategory: str = ""
    has_code: bool = False
    dataset_count: int = 0
    corresponding_author_name: Optional[str] = None
    has_abstract: bool = False


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class QueryRequest(BaseModel):
    question: str
    n_results: int = 10
    filters: Optional[Dict[str, Any]] = None
    chat_history: List[Dict[str, str]] = Field(default_factory=list)


class IngestRequest(BaseModel):
    folder_paths: Optional[List[str]] = None
    reprocess: bool = False


class PaperAbstractRequest(BaseModel):
    force_regenerate: bool = False


class SynthesisRequest(BaseModel):
    query: str
    n_results: int = 10
    style: Literal["background", "survey", "introduction"] = "background"


class SynthesisResponse(BaseModel):
    synthesis: str
    cited_papers: List[Dict[str, Any]]
    query: str
    n_papers_retrieved: int


class StatsResponse(BaseModel):
    total_papers: int
    total_chunks: int
    by_category: Dict[str, int]
    papers_with_code_count: int
    papers_with_abstract_count: int
    unique_datasets_count: int
    top_datasets: List[Dict[str, Any]]
    venue_type_breakdown: Dict[str, int]
    year_distribution: Dict[str, int]
