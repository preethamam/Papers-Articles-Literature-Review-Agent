.PHONY: help install run app exe clean

PYTHON  := backend/.venv/bin/python
VENV    := backend/.venv
PROJECT := "Lit Review Agent v2"

help:
	@echo ""
	@echo "  Lit Review Agent v2 — Makefile targets"
	@echo ""
	@echo "  make install   — create Python venv + install all dependencies"
	@echo "  make run       — launch the desktop application"
	@echo "  make app       — build macOS .app bundle via PyInstaller"
	@echo "  make exe       — build Windows .exe via PyInstaller"
	@echo "  make clean     — remove build artifacts and venv"
	@echo ""

# ── Setup ─────────────────────────────────────────────────────────────────────

install:
	@echo "→ Creating Python virtual environment..."
	python3 -m venv $(VENV)
	$(VENV)/bin/pip install --upgrade pip --quiet
	$(VENV)/bin/pip install -r backend/requirements.txt
	@echo "→ Copying .env.example → .env (if not present)..."
	@[ -f .env ] || cp .env.example .env
	@echo ""
	@echo "✓ Setup complete. Edit .env and add your ANTHROPIC_API_KEY."
	@echo "  Then run:  make run"

# ── Run ───────────────────────────────────────────────────────────────────────

run:
	@[ -f $(PYTHON) ] || (echo "ERROR: Run 'make install' first." && exit 1)
	$(PYTHON) serve.py

# ── macOS .app bundle via PyInstaller ─────────────────────────────────────────

app:
	@[ -f $(PYTHON) ] || (echo "ERROR: Run 'make install' first." && exit 1)
	$(PYTHON) -m pip install pyinstaller --quiet
	$(PYTHON) -m PyInstaller lit_review.spec --noconfirm
	@echo ""
	@echo "✓ Built: dist/Lit Review Agent.app"
	@echo "  Drag to /Applications or double-click to launch."

# ── Windows .exe via PyInstaller (run on Windows or in CI) ────────────────────

exe:
	@[ -f $(PYTHON) ] || (echo "ERROR: Run 'make install' first." && exit 1)
	$(PYTHON) -m pip install pyinstaller --quiet
	$(PYTHON) -m PyInstaller lit_review.spec --noconfirm
	@echo ""
	@echo "✓ Built: dist/LitReviewAgent.exe"

# ── Cleanup ───────────────────────────────────────────────────────────────────

clean:
	rm -rf $(VENV) backend/data dist build *.spec.bak
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -name "*.pyc" -delete 2>/dev/null || true
	@echo "✓ Cleaned."
