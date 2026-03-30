"""Dashboard panel — stat cards + quick-action buttons."""

from __future__ import annotations

from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QGridLayout,
    QLabel, QPushButton, QFrame, QSizePolicy,
)
from PyQt6.QtCore import Qt, QTimer
from PyQt6.QtGui import QFont


class _StatCard(QFrame):
    """A single stat card with a large number and a label."""

    def __init__(self, title: str, value: str = "—", color: str = "#6ab0f5", parent=None):
        super().__init__(parent)
        self.setFrameShape(QFrame.Shape.StyledPanel)
        self.setStyleSheet(f"""
            QFrame {{
                background: #1e1e2e;
                border: 1px solid #333355;
                border-radius: 8px;
                padding: 4px;
            }}
        """)
        self.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Fixed)
        self.setMinimumHeight(100)

        layout = QVBoxLayout(self)
        layout.setSpacing(4)

        self._value_label = QLabel(value)
        font = QFont()
        font.setPointSize(32)
        font.setBold(True)
        self._value_label.setFont(font)
        self._value_label.setStyleSheet(f"color: {color}; border: none;")
        self._value_label.setAlignment(Qt.AlignmentFlag.AlignCenter)

        self._title_label = QLabel(title)
        title_font = QFont()
        title_font.setPointSize(10)
        self._title_label.setFont(title_font)
        self._title_label.setStyleSheet("color: #aaaacc; border: none;")
        self._title_label.setAlignment(Qt.AlignmentFlag.AlignCenter)

        layout.addWidget(self._value_label)
        layout.addWidget(self._title_label)

    def set_value(self, value: str) -> None:
        self._value_label.setText(value)


class DashboardPanel(QWidget):
    """Overview stats + quick-action nav buttons."""

    # Emitted to request navigation — connected by MainWindow
    # We use a simple callback approach instead of signals for simplicity

    def __init__(self, parent=None):
        super().__init__(parent)
        self._nav_callbacks: dict[str, object] = {}
        self._build_ui()
        # Refresh stats every 30 s while visible
        self._timer = QTimer(self)
        self._timer.setInterval(30_000)
        self._timer.timeout.connect(self.refresh)

    def _build_ui(self) -> None:
        root = QVBoxLayout(self)
        root.setSpacing(20)
        root.setContentsMargins(24, 24, 24, 24)

        # Title
        title = QLabel("Dashboard")
        title_font = QFont()
        title_font.setPointSize(20)
        title_font.setBold(True)
        title.setFont(title_font)
        title.setStyleSheet("color: #e0e0ff;")
        root.addWidget(title)

        # Stat grid
        grid = QGridLayout()
        grid.setSpacing(16)

        self._card_papers   = _StatCard("Total Papers",        "—", "#6ab0f5")
        self._card_chunks   = _StatCard("Total Chunks",        "—", "#a0f5ab")
        self._card_cats     = _StatCard("Categories",          "—", "#f5d06a")
        self._card_code     = _StatCard("Papers with Code",    "—", "#f5906a")

        grid.addWidget(self._card_papers, 0, 0)
        grid.addWidget(self._card_chunks, 0, 1)
        grid.addWidget(self._card_cats,   0, 2)
        grid.addWidget(self._card_code,   0, 3)
        root.addLayout(grid)

        # Quick-action buttons
        actions_label = QLabel("Quick Actions")
        actions_label.setStyleSheet("color: #aaaacc; font-size: 12px;")
        root.addWidget(actions_label)

        btn_row = QHBoxLayout()
        btn_row.setSpacing(12)

        actions = [
            ("Extract & Load", "ingest"),
            ("Paper Library",  "library"),
            ("Q&A",            "query"),
            ("Section Summary","section_summary"),
            ("Related Works",  "related_works"),
        ]
        for label, key in actions:
            btn = QPushButton(label)
            btn.setFixedHeight(40)
            btn.setStyleSheet("""
                QPushButton {
                    background: #2a2a4a;
                    color: #c0c0e0;
                    border: 1px solid #444466;
                    border-radius: 6px;
                    padding: 4px 12px;
                    font-size: 13px;
                }
                QPushButton:hover {
                    background: #3a3a6a;
                    color: #ffffff;
                }
            """)
            nav_key = key
            btn.clicked.connect(lambda _, k=nav_key: self._navigate(k))
            btn_row.addWidget(btn)

        root.addLayout(btn_row)
        root.addStretch()

        self._status = QLabel("Loading stats…")
        self._status.setStyleSheet("color: #666688; font-size: 11px;")
        root.addWidget(self._status)

    def register_nav(self, key: str, callback) -> None:
        """MainWindow calls this to register navigation callbacks."""
        self._nav_callbacks[key] = callback

    def _navigate(self, key: str) -> None:
        cb = self._nav_callbacks.get(key)
        if cb:
            cb()

    # ------------------------------------------------------------------
    def showEvent(self, event):
        super().showEvent(event)
        self.refresh()
        self._timer.start()

    def hideEvent(self, event):
        super().hideEvent(event)
        self._timer.stop()

    def refresh(self) -> None:
        try:
            from app.services.summary_service import list_all_papers
            papers = list_all_papers()
            n_papers = len(papers)
            n_cats   = len({p.get("category", "") for p in papers if p.get("category")})
            n_code   = sum(1 for p in papers if p.get("has_code"))

            # Chunk count from vectorstore (may trigger lazy load — only if already loaded)
            n_chunks = "—"
            try:
                from app.services.vectorstore import _vs_instance
                if _vs_instance is not None:
                    col = _vs_instance._collection
                    if col is not None:
                        n_chunks = str(col.count())
            except Exception:
                pass

            self._card_papers.set_value(str(n_papers))
            self._card_chunks.set_value(n_chunks)
            self._card_cats.set_value(str(n_cats) if n_cats else "—")
            self._card_code.set_value(str(n_code))
            self._status.setText(f"Last refreshed at {self._now()}")
        except Exception as exc:
            self._status.setText(f"Stats unavailable: {exc}")

    @staticmethod
    def _now() -> str:
        from datetime import datetime
        return datetime.now().strftime("%H:%M:%S")
