# Lit Review Agent v2

Local-first literature review assistant with:

- PDF parsing through GROBID
- TEI metadata extraction (title, authors, abstract, venue, links)
- Cached LLM workflows (intro/metadata, section summary, literature review)
- Multi-paper chat and citations
- Metadata explorer + Excel export

## Stack

- `frontend/`: React + Vite + Tailwind
- `app/`: Express + TypeScript + SQLite (`better-sqlite3`)
- Local DB path: `~/.litreview/data.db`

## Prerequisites

- Node.js 20+ (Node 22 recommended)
- npm 10+
- GROBID running locally or reachable on your network
- OpenRouter API key

## Install from GitHub

```bash
git clone https://github.com/<your-user>/<your-repo>.git
cd "<your-repo>"
bash install.sh
```

The installer will:

- install npm dependencies for root, `app`, and `frontend`
- create `.env` from `.env.example` if needed
- build the frontend into `app/public`

## Configure environment

Edit `.env`:

```env
OPENROUTER_API_KEY=sk-or-v1-...
GROBID_URL=http://localhost:8070
```

## Run

Production-style single server:

```bash
npm start
```

Dev mode (frontend HMR + backend):

```bash
npm run dev
```

- Frontend dev URL: `http://localhost:5174`
- Backend URL: `http://localhost:3456`

## Common scripts

```bash
npm run dev        # backend + frontend
npm run build      # build frontend to app/public
npm start          # run express app
```

## Notes for end users

- GROBID is not bundled in this repository.
- Configure GROBID URL in Settings in the app.
- Export metadata is tracked in DB settings (last export timestamp/count/scope).

## License

MIT - see `LICENSE`.
