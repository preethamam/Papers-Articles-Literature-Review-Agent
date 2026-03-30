#!/usr/bin/env python3
"""Lit Review Agent v2 — PyQt6 desktop launcher."""

from pathlib import Path
import sys
import os

# Set up paths before any app imports
REPO    = Path(__file__).resolve().parent
BACKEND = REPO / "backend"

# Both paths needed: backend for app.* imports, repo root for gui.* imports
sys.path.insert(0, str(BACKEND))
sys.path.insert(0, str(REPO))

# Change working directory to backend so relative paths in config.py resolve
os.chdir(BACKEND)

# Now import Qt (lightweight — no models loaded yet)
from PyQt6.QtWidgets import QApplication, QSplashScreen, QLabel
from PyQt6.QtCore import Qt
from PyQt6.QtGui import QPixmap, QColor, QFont

from gui.main_window import MainWindow


def _make_splash(app: QApplication) -> QSplashScreen:
    """Create a minimal text splash screen (no image file required)."""
    pix = QPixmap(480, 200)
    pix.fill(QColor("#1a1a2e"))

    splash = QSplashScreen(pix, Qt.WindowType.WindowStaysOnTopHint)
    splash.showMessage(
        "Lit Review Agent  v2.0\nLoading…",
        Qt.AlignmentFlag.AlignCenter | Qt.AlignmentFlag.AlignBottom,
        QColor("#6ab0f5"),
    )
    return splash


def main() -> None:
    app = QApplication(sys.argv)
    app.setApplicationName("Lit Review Agent")
    app.setOrganizationName("USC Research")
    app.setApplicationVersion("2.0.0")

    # Show splash immediately — window appears before any model loading
    splash = _make_splash(app)
    splash.show()
    app.processEvents()

    # MainWindow construction is fast (no models loaded — lazy vectorstore)
    window = MainWindow()
    splash.finish(window)
    window.show()

    sys.exit(app.exec())


if __name__ == "__main__":
    main()
