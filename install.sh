#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Lit Review Agent v2 — one-shot installer (PyQt6 desktop app, no Node.js)
# Usage:  bash install.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$REPO_DIR/backend"
VENV_DIR="$BACKEND_DIR/.venv"

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  Lit Review Agent v2 — Installer"
echo "════════════════════════════════════════════════════════════"
echo ""

# ── Check Python ──────────────────────────────────────────────────────────────
if ! command -v python3 &>/dev/null; then
    echo "ERROR: python3 not found. Install Python 3.10+ and re-run."
    exit 1
fi
PYTHON_VERSION=$(python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
echo "✓ Python $PYTHON_VERSION"

# Require at least 3.10
MAJOR=$(python3 -c "import sys; print(sys.version_info.major)")
MINOR=$(python3 -c "import sys; print(sys.version_info.minor)")
if [ "$MAJOR" -lt 3 ] || { [ "$MAJOR" -eq 3 ] && [ "$MINOR" -lt 10 ]; }; then
    echo "ERROR: Python 3.10 or newer is required (found $PYTHON_VERSION)."
    exit 1
fi

# ── Python venv ───────────────────────────────────────────────────────────────
echo ""
echo "→ Setting up Python virtual environment..."
python3 -m venv "$VENV_DIR"
"$VENV_DIR/bin/pip" install --upgrade pip --quiet
echo "→ Installing Python dependencies (this may take a few minutes)..."
"$VENV_DIR/bin/pip" install -r "$BACKEND_DIR/requirements.txt"
echo "✓ Python dependencies installed."

# ── .env setup ───────────────────────────────────────────────────────────────
cd "$REPO_DIR"
if [ ! -f .env ]; then
    cp .env.example .env
    echo ""
    echo "⚠️  Created .env from .env.example."
    echo "   Open .env and add your ANTHROPIC_API_KEY before launching."
else
    echo "✓ .env already exists."
fi

# ── macOS launcher shortcut ───────────────────────────────────────────────────
if [[ "${OSTYPE:-}" == "darwin"* ]]; then
    LAUNCHER="/usr/local/bin/litreview"
    echo ""
    echo "→ Creating launcher shortcut at $LAUNCHER ..."
    cat > /tmp/litreview-launcher <<EOF
#!/usr/bin/env bash
exec "$VENV_DIR/bin/python" "$REPO_DIR/serve.py" "\$@"
EOF
    chmod +x /tmp/litreview-launcher
    if sudo mv /tmp/litreview-launcher "$LAUNCHER" 2>/dev/null; then
        echo "✓ Installed. Launch from any terminal with:  litreview"
    else
        echo "  (Could not write to /usr/local/bin — run manually instead)"
    fi
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  Installation complete!"
echo ""
echo "  Launch the app:"
echo "    $VENV_DIR/bin/python $REPO_DIR/serve.py"
echo ""
echo "  Or use the Makefile:"
echo "    make run"
echo ""
echo "  To build a standalone bundle:"
echo "    make app    # macOS .app"
echo "    make exe    # Windows .exe (run on Windows)"
echo "════════════════════════════════════════════════════════════"
echo ""
