"""Section Summary panel — per-paper section accordion."""

from __future__ import annotations

from typing import Dict, List

from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QScrollArea,
    QLabel, QComboBox, QPushButton,
    QGroupBox, QSizePolicy, QApplication,
)
from PyQt6.QtCore import Qt
from PyQt6.QtGui import QFont


class _SectionCard(QGroupBox):
    """Expandable card showing one section summary."""

    def __init__(self, section: str, summary: str, parent=None):
        super().__init__(section, parent)
        self.setCheckable(True)
        self.setChecked(True)
        self.setStyleSheet("""
            QGroupBox {
                color: #6ab0f5;
                border: 1px solid #333355;
                border-radius: 6px;
                margin-top: 10px;
                padding-top: 6px;
                font-size: 13px;
                font-weight: bold;
            }
            QGroupBox::title {
                subcontrol-origin: margin;
                left: 10px;
                padding: 0 4px;
            }
            QGroupBox::indicator:checked { /* hide default checkbox indicator */ width: 0; height: 0; }
            QGroupBox::indicator:unchecked { width: 0; height: 0; }
        """)
        layout = QVBoxLayout(self)
        text = QLabel(summary or "(No summary available)")
        text.setWordWrap(True)
        text.setStyleSheet("color: #c0c0e0; font-size: 12px; font-weight: normal;")
        text.setTextInteractionFlags(Qt.TextInteractionFlag.TextSelectableByMouse)
        layout.addWidget(text)

        self.toggled.connect(lambda checked: text.setVisible(checked))


class SectionSummaryPanel(QWidget):
    """Shows section-by-section summaries for a selected paper."""

    def __init__(self, parent=None):
        super().__init__(parent)
        self._sections: Dict[str, str] = {}
        self._build_ui()

    # ------------------------------------------------------------------

    def _build_ui(self) -> None:
        root = QVBoxLayout(self)
        root.setSpacing(10)
        root.setContentsMargins(24, 24, 24, 24)

        # Title
        title = QLabel("Section Summary")
        title_font = QFont()
        title_font.setPointSize(18)
        title_font.setBold(True)
        title.setFont(title_font)
        title.setStyleSheet("color: #e0e0ff;")
        root.addWidget(title)

        subtitle = QLabel("Summaries are generated during ingest — select a paper to view.")
        subtitle.setStyleSheet("color: #888899; font-size: 12px;")
        root.addWidget(subtitle)

        # Paper selector row
        sel_row = QHBoxLayout()
        sel_row.setSpacing(8)

        sel_label = QLabel("Paper:")
        sel_label.setStyleSheet("color: #c0c0e0;")
        sel_label.setFixedWidth(50)

        self._paper_combo = QComboBox()
        self._paper_combo.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Fixed)
        self._paper_combo.setStyleSheet("""
            QComboBox {
                background: #1e1e2e;
                color: #e0e0ff;
                border: 1px solid #444466;
                border-radius: 4px;
                padding: 4px 8px;
                font-size: 12px;
            }
            QComboBox::drop-down { border: none; }
            QComboBox QAbstractItemView {
                background: #1a1a2e;
                color: #e0e0ff;
                selection-background-color: #2a4a8a;
            }
        """)

        load_btn = QPushButton("Load")
        load_btn.setFixedWidth(70)
        load_btn.clicked.connect(self._load_paper)
        load_btn.setStyleSheet("""
            QPushButton {
                background: #4a6aaf;
                color: #fff;
                border: none;
                border-radius: 5px;
                padding: 5px 12px;
            }
            QPushButton:hover { background: #5a7abf; }
        """)

        refresh_combo_btn = QPushButton("↻")
        refresh_combo_btn.setFixedWidth(32)
        refresh_combo_btn.setToolTip("Reload paper list")
        refresh_combo_btn.clicked.connect(self._populate_combo)
        refresh_combo_btn.setStyleSheet("""
            QPushButton {
                background: #2a2a4a;
                color: #c0c0e0;
                border: 1px solid #444466;
                border-radius: 5px;
                font-size: 14px;
            }
            QPushButton:hover { background: #3a3a6a; }
        """)

        copy_btn = QPushButton("Copy All")
        copy_btn.setFixedWidth(80)
        copy_btn.clicked.connect(self._copy_all)
        copy_btn.setStyleSheet("""
            QPushButton {
                background: #2a2a4a;
                color: #c0c0e0;
                border: 1px solid #444466;
                border-radius: 5px;
                padding: 5px 10px;
            }
            QPushButton:hover { background: #3a3a6a; }
        """)

        sel_row.addWidget(sel_label)
        sel_row.addWidget(self._paper_combo)
        sel_row.addWidget(refresh_combo_btn)
        sel_row.addWidget(load_btn)
        sel_row.addWidget(copy_btn)
        root.addLayout(sel_row)

        # Scroll area for section cards
        self._scroll_area = QScrollArea()
        self._scroll_area.setWidgetResizable(True)
        self._scroll_area.setStyleSheet("""
            QScrollArea {
                border: 1px solid #333355;
                border-radius: 4px;
                background: transparent;
            }
        """)
        self._cards_widget = QWidget()
        self._cards_layout = QVBoxLayout(self._cards_widget)
        self._cards_layout.setSpacing(8)
        self._cards_layout.setContentsMargins(8, 8, 8, 8)
        self._cards_layout.addStretch()
        self._scroll_area.setWidget(self._cards_widget)
        root.addWidget(self._scroll_area, stretch=1)

        # Status
        self._status = QLabel("Select a paper and press Load.")
        self._status.setStyleSheet("color: #666688; font-size: 11px;")
        root.addWidget(self._status)

    # ------------------------------------------------------------------

    def showEvent(self, event):
        super().showEvent(event)
        self._populate_combo()

    def _populate_combo(self) -> None:
        try:
            from app.services.summary_service import list_all_papers
            papers = list_all_papers()
            self._paper_combo.clear()
            for p in papers:
                label = f"{p.get('title','Untitled')} ({p.get('year','')})"
                self._paper_combo.addItem(label, userData=p.get("paper_id", ""))
            if not papers:
                self._status.setText("No papers found. Run Extract & Load first.")
        except Exception as exc:
            self._status.setText(f"Error loading papers: {exc}")

    def _load_paper(self) -> None:
        paper_id = self._paper_combo.currentData()
        if not paper_id:
            self._status.setText("No paper selected.")
            return

        try:
            from app.services.summary_service import get_section_summaries
            sections = get_section_summaries(paper_id)
            self._sections = sections
            self._render_sections(sections)
            label = self._paper_combo.currentText()
            self._status.setText(f"Loaded {len(sections)} section(s) for: {label}")
        except Exception as exc:
            self._status.setText(f"Error: {exc}")

    def _render_sections(self, sections: Dict[str, str]) -> None:
        # Clear existing cards (keep stretch at end)
        while self._cards_layout.count() > 1:
            item = self._cards_layout.takeAt(0)
            if item.widget():
                item.widget().deleteLater()

        if not sections:
            placeholder = QLabel("No section summaries available for this paper.\n"
                                  "Summaries are generated during ingest when Claude\n"
                                  "successfully extracts and summarizes each section.")
            placeholder.setStyleSheet("color: #888899; font-size: 12px;")
            placeholder.setAlignment(Qt.AlignmentFlag.AlignCenter)
            self._cards_layout.insertWidget(0, placeholder)
            return

        for i, (section, summary) in enumerate(sections.items()):
            card = _SectionCard(section, summary)
            self._cards_layout.insertWidget(i, card)

    def _copy_all(self) -> None:
        if not self._sections:
            return
        lines = []
        for section, summary in self._sections.items():
            lines.append(f"## {section}\n{summary}")
        text = "\n\n".join(lines)
        QApplication.clipboard().setText(text)
        self._status.setText("Copied all summaries to clipboard.")
