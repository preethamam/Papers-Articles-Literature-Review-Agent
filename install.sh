#!/usr/bin/env bash
# Lit Review Agent v2 installer (Node + Express + React)
# Usage: bash install.sh
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo "============================================================"
echo "  Lit Review Agent v2 - Installer"
echo "============================================================"
echo ""

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: Node.js is required (20+ recommended)."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "ERROR: npm is required."
  exit 1
fi

echo "Using Node: $(node -v)"
echo "Using npm:  $(npm -v)"

echo ""
echo "-> Installing root dependencies..."
cd "$REPO_DIR"
npm install

echo "-> Installing app dependencies..."
npm --prefix app install

echo "-> Installing frontend dependencies..."
npm --prefix frontend install

if [ ! -f "$REPO_DIR/.env" ]; then
  cp "$REPO_DIR/.env.example" "$REPO_DIR/.env"
  echo "-> Created .env from .env.example"
else
  echo "-> .env already exists"
fi

echo "-> Building frontend into app/public..."
npm run build

echo ""
echo "============================================================"
echo "  Installation complete"
echo "============================================================"
echo "Next:"
echo "  1) Edit .env and set OPENROUTER_API_KEY (+ optional GROBID_URL)"
echo "  2) Run app: npm start"
echo "  3) For dev mode: npm run dev"
echo ""
