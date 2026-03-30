# Lit Review Agent v2

A Claude-powered, domain-agnostic literature review assistant that runs entirely on your machine. Drop in academic PDFs, then query them with natural language, generate structured abstracts, and synthesize literature review paragraphs — all streamed in real time.

## Features

| Feature | Description |
|---|---|
| **Semantic search** | SPECTER embeddings (AllenAI, scientific-paper optimized) over your PDF library |
| **RAG Q&A** | Ask anything; get answers with inline citations streamed via Claude |
| **Per-paper abstracts** | Generate structured Objective / Methods / Results / Conclusion abstracts |
| **Literature synthesis** | Multi-paper synthesis paragraph with `[Author YEAR]` citations |
| **Analytics** | Venue breakdown, year distribution, dataset mentions, category stats |
| **Standalone** | Single `python serve.py` command — no Docker, no cloud |

## Architecture

```
┌────────────────────────────────────────────────────────────┐
│                     Browser (React SPA)                    │
│   Dashboard · Library · Query · Abstracts · Analytics ·   │
│                         Ingest                             │
└─────────────────────────┬──────────────────────────────────┘
                          │ HTTP / SSE  (/api/*)
┌─────────────────────────▼──────────────────────────────────┐
│                   FastAPI  (serve.py)                      │
│                                                            │
│  ┌─────────┐  ┌────────┐  ┌──────────┐  ┌─────────────┐  │
│  │ /papers │  │ /query │  │/abstract │  │   /ingest   │  │
│  └────┬────┘  └───┬────┘  └────┬─────┘  └──────┬──────┘  │
│       │           │            │                │          │
│  ┌────▼───────────▼────────────▼────┐  ┌────────▼──────┐  │
│  │         VectorStore              │  │  ETL Pipeline │  │
│  │  SPECTER SentenceTransformer     │  │  pdfplumber   │  │
│  │  ChromaDB  (papers_specter)      │  │  + PyMuPDF    │  │
│  └──────────────────────────────────┘  └───────────────┘  │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │            Anthropic Claude  (claude-sonnet-4-6)     │  │
│  │  RAG · Abstract generation · Literature synthesis    │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
         │                                  │
   backend/data/chroma/           backend/data/results/
   (vector embeddings)            (extraction JSONs)
```

## Requirements

- **Python** 3.10+
- **Node.js** 18+
- **Anthropic API key** — [get one here](https://console.anthropic.com/)
- ~600 MB disk for SPECTER model (downloaded once on first ingest)

## Quick start

```bash
# 1. Clone
git clone https://github.com/your-org/lit-review-agent-v2
cd lit-review-agent-v2

# 2. Install everything + build frontend
bash install.sh

# 3. Add your API key
echo "ANTHROPIC_API_KEY=sk-ant-..." >> .env

# 4. Launch
python serve.py
# → opens http://localhost:8080 in your browser
```

## Manual setup (Makefile)

```bash
make install   # venv + npm install
make build     # npm run build → backend/static/
make run       # python serve.py  (picks free port, opens browser)
```

## Development mode (hot-reload)

```bash
make dev
# Backend:  http://localhost:8001  (uvicorn --reload)
# Frontend: http://localhost:5174  (Vite HMR)
```

## Adding papers

1. Drop PDF files into the `Articles/` folder (any subdirectory structure).
2. Open the app → **Ingest** page → click **Start Ingest**.
3. Watch real-time progress as each paper is extracted, chunked, and embedded.

Or point to an existing folder via `.env`:
```
ARTICLES_DIR=/Users/you/Papers/
```

## Configuration

All settings in `.env` (see `.env.example`):

| Variable | Default | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | *(required)* | Your Anthropic key |
| `CLAUDE_MODEL` | `claude-sonnet-4-6` | Claude model ID |
| `EMBEDDING_MODEL` | `allenai-specter` | HuggingFace model name |
| `ARTICLES_DIR` | `./Articles/` | PDF source folder |
| `CHUNK_SIZE` | `600` | Tokens per chunk |
| `TOP_K` | `10` | Retrieved chunks per query |

## API endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Liveness check |
| `GET` | `/stats` | Collection statistics |
| `GET` | `/papers` | List papers (filter by category/year) |
| `GET` | `/papers/{id}` | Paper detail + chunks |
| `DELETE` | `/papers/{id}` | Remove paper from index |
| `POST` | `/ingest` | Ingest PDFs (SSE stream) |
| `POST` | `/query` | RAG Q&A (SSE stream) |
| `POST` | `/abstract/paper/{id}` | Generate structured abstract |
| `POST` | `/abstract/synthesis` | Literature synthesis (SSE stream) |

## License

MIT — see [LICENSE](LICENSE).
