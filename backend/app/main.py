"""FastAPI application entry point."""

from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.routers import abstract, ingest, papers, query, stats

app = FastAPI(
    title="Literature Review Agent v2",
    description="Claude-powered RAG over academic papers with SPECTER embeddings",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5174", "http://localhost:5173", "http://localhost:4173", "http://localhost:80"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(papers.router)
app.include_router(query.router)
app.include_router(ingest.router)
app.include_router(abstract.router)
app.include_router(stats.router)


@app.get("/health")
def health():
    return {"status": "ok", "version": "2.0.0"}


# ---------------------------------------------------------------------------
# Standalone / production mode: serve the built React frontend
# Activated when backend/static/index.html exists (after `make build`)
# ---------------------------------------------------------------------------
_STATIC_DIR = Path(__file__).parent.parent / "static"

if _STATIC_DIR.exists():
    # Serve JS/CSS/image assets
    _assets = _STATIC_DIR / "assets"
    if _assets.exists():
        app.mount("/assets", StaticFiles(directory=str(_assets)), name="assets")

    # Serve other static files (favicon, manifest, etc.)
    app.mount("/static-files", StaticFiles(directory=str(_STATIC_DIR)), name="static-files")

    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_spa(full_path: str):
        """Catch-all: return index.html so React Router handles navigation."""
        return FileResponse(str(_STATIC_DIR / "index.html"))
