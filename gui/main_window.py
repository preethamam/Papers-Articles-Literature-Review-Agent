"""Main application window — sidebar nav + stacked panels."""

from __future__ import annotations

from PyQt6.QtWidgets import (
    QMainWindow, QWidget, QHBoxLayout, QVBoxLayout,
    QListWidget, QListWidgetItem, QStackedWidget,
    QStatusBar, QLabel, QSizePolicy,
)
from PyQt6.QtCore import Qt, QSize
from PyQt6.QtGui import QFont, QColor

# --- Panel imports (lazy at construction time, not module load) ---
from gui.panels.dashboard       import DashboardPanel
from gui.panels.ingest          import IngestPanel
from gui.panels.library         import LibraryPanel
from gui.panels.query           import QueryPanel
from gui.panels.section_summary import SectionSummaryPanel
from gui.panels.related_works   import RelatedWorksPanel


APP_STYLE = """
QMainWindow, QWidget {
    background-color: #12122a;
    color: #e0e0ff;
}
QScrollBar:vertical {
    background: #1a1a2e;
    width: 8px;
    margin: 0;
}
QScrollBar::handle:vertical {
    background: #444466;
    border-radius: 4px;
    min-height: 20px;
}
QScrollBar::handle:vertical:hover { background: #6666aa; }
QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical { height: 0; }
QScrollBar:horizontal {
    background: #1a1a2e;
    height: 8px;
}
QScrollBar::handle:horizontal {
    background: #444466;
    border-radius: 4px;
    min-width: 20px;
}
QStatusBar { background: #0d0d1a; color: #888899; font-size: 11px; }
QSplitter::handle { background: #1e1e2e; }
QToolTip { background: #1a1a2e; color: #e0e0ff; border: 1px solid #444466; }
"""

SIDEBAR_STYLE = """
QListWidget {
    background: #0d0d1a;
    border: none;
    border-right: 1px solid #222244;
    padding: 8px 0;
    outline: none;
}
QListWidget::item {
    color: #aaaacc;
    padding: 10px 16px;
    font-size: 13px;
    border-radius: 0;
}
QListWidget::item:selected {
    background: #1e1e3e;
    color: #ffffff;
    border-left: 3px solid #6ab0f5;
}
QListWidget::item:hover:!selected {
    background: #181830;
    color: #d0d0f0;
}
"""


class MainWindow(QMainWindow):
    """Top-level application window."""

    # (nav label, emoji icon, panel class, nav key for dashboard)
    _NAV: list[tuple[str, str, type, str]] = [
        ("Dashboard",      "📊", DashboardPanel,      "dashboard"),
        ("Extract & Load", "📥", IngestPanel,          "ingest"),
        ("Library",        "📚", LibraryPanel,         "library"),
        ("Q&A",            "💬", QueryPanel,           "query"),
        ("Section Summary","📄", SectionSummaryPanel,  "section_summary"),
        ("Related Works",  "🔗", RelatedWorksPanel,    "related_works"),
    ]

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Lit Review Agent — USC Research")
        self.resize(1200, 780)
        self.setMinimumSize(900, 600)
        self.setStyleSheet(APP_STYLE)

        self._panels: list[QWidget] = []
        self._build_ui()
        self._connect_dashboard_nav()

    # ------------------------------------------------------------------

    def _build_ui(self) -> None:
        central = QWidget()
        self.setCentralWidget(central)
        layout = QHBoxLayout(central)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(0)

        # --- Sidebar ---
        sidebar_container = QWidget()
        sidebar_container.setFixedWidth(190)
        sidebar_container.setStyleSheet("background: #0d0d1a;")
        sidebar_layout = QVBoxLayout(sidebar_container)
        sidebar_layout.setContentsMargins(0, 0, 0, 0)
        sidebar_layout.setSpacing(0)

        # App name header
        app_label = QLabel("  Lit Review\n  Agent v2")
        app_font = QFont()
        app_font.setPointSize(13)
        app_font.setBold(True)
        app_label.setFont(app_font)
        app_label.setStyleSheet(
            "color: #6ab0f5; background: #0a0a1a;"
            "padding: 16px 0 12px 0; border-bottom: 1px solid #222244;"
        )
        app_label.setAlignment(Qt.AlignmentFlag.AlignLeft | Qt.AlignmentFlag.AlignVCenter)
        sidebar_layout.addWidget(app_label)

        # Nav list
        self._nav_list = QListWidget()
        self._nav_list.setStyleSheet(SIDEBAR_STYLE)
        self._nav_list.setFocusPolicy(Qt.FocusPolicy.NoFocus)

        nav_font = QFont()
        nav_font.setPointSize(12)

        for label, icon, _panel_cls, _key in self._NAV:
            item = QListWidgetItem(f"  {icon}  {label}")
            item.setFont(nav_font)
            item.setSizeHint(QSize(190, 42))
            self._nav_list.addItem(item)

        sidebar_layout.addWidget(self._nav_list, stretch=1)

        # Version footer
        version_label = QLabel("  v2.0.0")
        version_label.setStyleSheet("color: #444466; font-size: 10px; padding: 8px 0;")
        sidebar_layout.addWidget(version_label)

        layout.addWidget(sidebar_container)

        # --- Stacked panels ---
        self._stack = QStackedWidget()
        for _label, _icon, PanelCls, _key in self._NAV:
            panel = PanelCls()
            self._panels.append(panel)
            self._stack.addWidget(panel)

        layout.addWidget(self._stack, stretch=1)

        # Connect nav
        self._nav_list.currentRowChanged.connect(self._stack.setCurrentIndex)
        self._nav_list.setCurrentRow(0)

        # Status bar
        self._status_bar = QStatusBar()
        self.setStatusBar(self._status_bar)
        self._status_bar.showMessage("Ready — select a panel from the sidebar.")

    # ------------------------------------------------------------------

    def _connect_dashboard_nav(self) -> None:
        """Register navigation callbacks on the DashboardPanel."""
        dashboard: DashboardPanel = self._panels[0]
        for i, (_label, _icon, _cls, key) in enumerate(self._NAV):
            if key == "dashboard":
                continue
            idx = i
            dashboard.register_nav(key, lambda _idx=idx: self._go_to(_idx))

    def _go_to(self, index: int) -> None:
        self._nav_list.setCurrentRow(index)
        self._stack.setCurrentIndex(index)
