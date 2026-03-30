"""Paper Library panel — searchable table + detail pane."""

from __future__ import annotations

import json
from typing import Any, Dict, List

from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QSplitter,
    QLabel, QLineEdit, QPushButton,
    QTableWidget, QTableWidgetItem, QHeaderView,
    QTextBrowser, QAbstractItemView,
)
from PyQt6.QtCore import Qt, QTimer
from PyQt6.QtGui import QFont


class LibraryPanel(QWidget):
    """Displays all ingested papers in a searchable table with detail view."""

    _COLUMNS = ["Title", "First Author", "Year", "Venue", "Category", "Code?"]

    def __init__(self, parent=None):
        super().__init__(parent)
        self._all_papers: List[Dict[str, Any]] = []
        self._build_ui()

    # ------------------------------------------------------------------

    def _build_ui(self) -> None:
        root = QVBoxLayout(self)
        root.setSpacing(10)
        root.setContentsMargins(24, 24, 24, 24)

        # Title row
        header_row = QHBoxLayout()
        title = QLabel("Paper Library")
        title_font = QFont()
        title_font.setPointSize(18)
        title_font.setBold(True)
        title.setFont(title_font)
        title.setStyleSheet("color: #e0e0ff;")
        header_row.addWidget(title)
        header_row.addStretch()

        refresh_btn = QPushButton("Refresh")
        refresh_btn.setFixedWidth(80)
        refresh_btn.clicked.connect(self.refresh)
        refresh_btn.setStyleSheet(self._btn_style())
        header_row.addWidget(refresh_btn)
        root.addLayout(header_row)

        # Search bar
        search_row = QHBoxLayout()
        search_label = QLabel("Search:")
        search_label.setStyleSheet("color: #c0c0e0;")
        self._search = QLineEdit()
        self._search.setPlaceholderText("Filter by title, author, year, venue…")
        self._search.setStyleSheet("""
            QLineEdit {
                background: #1e1e2e;
                color: #e0e0ff;
                border: 1px solid #444466;
                border-radius: 4px;
                padding: 4px 8px;
            }
        """)
        self._search.textChanged.connect(self._filter)
        search_row.addWidget(search_label)
        search_row.addWidget(self._search)
        root.addLayout(search_row)

        # Splitter: table left, detail right
        splitter = QSplitter(Qt.Orientation.Horizontal)

        # Table
        self._table = QTableWidget(0, len(self._COLUMNS))
        self._table.setHorizontalHeaderLabels(self._COLUMNS)
        self._table.horizontalHeader().setSectionResizeMode(0, QHeaderView.ResizeMode.Stretch)
        for i in range(1, len(self._COLUMNS)):
            self._table.horizontalHeader().setSectionResizeMode(i, QHeaderView.ResizeMode.ResizeToContents)
        self._table.setSelectionBehavior(QAbstractItemView.SelectionBehavior.SelectRows)
        self._table.setEditTriggers(QAbstractItemView.EditTrigger.NoEditTriggers)
        self._table.setAlternatingRowColors(True)
        self._table.verticalHeader().setVisible(False)
        self._table.setStyleSheet("""
            QTableWidget {
                background: #1a1a2e;
                color: #e0e0ff;
                gridline-color: #2a2a4a;
                border: 1px solid #333355;
            }
            QTableWidget::item:selected {
                background: #2a4a8a;
            }
            QHeaderView::section {
                background: #12122a;
                color: #aaaacc;
                border: none;
                border-bottom: 1px solid #333355;
                padding: 4px 8px;
            }
            QTableWidget::item:alternate {
                background: #141428;
            }
        """)
        self._table.currentRowChanged.connect(self._show_detail)
        splitter.addWidget(self._table)

        # Detail pane
        self._detail = QTextBrowser()
        self._detail.setMinimumWidth(260)
        self._detail.setStyleSheet("""
            QTextBrowser {
                background: #12122a;
                color: #c0c0e0;
                border: 1px solid #333355;
                border-radius: 4px;
                padding: 8px;
                font-size: 12px;
            }
        """)
        self._detail.setPlaceholderText("Select a paper to view details.")
        splitter.addWidget(self._detail)
        splitter.setStretchFactor(0, 3)
        splitter.setStretchFactor(1, 2)

        root.addWidget(splitter, stretch=1)

        self._status = QLabel("No papers loaded. Run Extract & Load first.")
        self._status.setStyleSheet("color: #666688; font-size: 11px;")
        root.addWidget(self._status)

    # ------------------------------------------------------------------

    @staticmethod
    def _btn_style() -> str:
        return """
            QPushButton {
                background: #2a2a4a;
                color: #c0c0e0;
                border: 1px solid #444466;
                border-radius: 5px;
                padding: 5px 10px;
                font-size: 12px;
            }
            QPushButton:hover { background: #3a3a6a; color: #ffffff; }
        """

    def showEvent(self, event):
        super().showEvent(event)
        if not self._all_papers:
            self.refresh()

    def refresh(self) -> None:
        try:
            from app.services.summary_service import list_all_papers
            self._all_papers = list_all_papers()
            self._filter(self._search.text())
            self._status.setText(f"{len(self._all_papers)} paper(s) in library.")
        except Exception as exc:
            self._status.setText(f"Error loading papers: {exc}")

    def _filter(self, text: str) -> None:
        q = text.lower().strip()
        rows = [p for p in self._all_papers if self._matches(p, q)] if q else self._all_papers
        self._populate(rows)

    @staticmethod
    def _matches(paper: Dict[str, Any], q: str) -> bool:
        haystack = " ".join([
            paper.get("title", ""),
            " ".join(paper.get("authors", [])),
            str(paper.get("year", "")),
            paper.get("venue", ""),
            paper.get("category", ""),
        ]).lower()
        return q in haystack

    def _populate(self, papers: List[Dict[str, Any]]) -> None:
        self._table.setRowCount(0)
        for paper in papers:
            row = self._table.rowCount()
            self._table.insertRow(row)
            authors = paper.get("authors", [])
            first_author = authors[0] if authors else "—"
            vals = [
                paper.get("title", "Untitled"),
                first_author,
                str(paper.get("year", "")),
                paper.get("venue", ""),
                paper.get("category", ""),
                "Yes" if paper.get("has_code") else "No",
            ]
            for col, val in enumerate(vals):
                item = QTableWidgetItem(val)
                item.setData(Qt.ItemDataRole.UserRole, paper)
                self._table.setItem(row, col, item)

    def _show_detail(self, row: int) -> None:
        if row < 0:
            return
        item = self._table.item(row, 0)
        if not item:
            return
        paper = item.data(Qt.ItemDataRole.UserRole)
        if not paper:
            return
        self._detail.setHtml(self._render_detail(paper))

    @staticmethod
    def _render_detail(p: Dict[str, Any]) -> str:
        authors = ", ".join(p.get("authors", [])) or "—"
        datasets = ", ".join(p.get("datasets", [])) if isinstance(p.get("datasets"), list) else "—"
        brief = p.get("brief", "")
        objective = p.get("objective", "")
        return f"""
        <html><body style="font-family:sans-serif; color:#c0c0e0; font-size:12px;">
        <h3 style="color:#6ab0f5;">{p.get("title","Untitled")}</h3>
        <p><b>Authors:</b> {authors}</p>
        <p><b>Year:</b> {p.get("year","")}</p>
        <p><b>Venue:</b> {p.get("venue","—")} ({p.get("venue_type","—")})</p>
        <p><b>Category:</b> {p.get("category","—")}</p>
        <p><b>Subcategory:</b> {p.get("subcategory","—")}</p>
        <p><b>Datasets:</b> {datasets}</p>
        <p><b>Has Code:</b> {"Yes" if p.get("has_code") else "No"}</p>
        <hr style="border-color:#333355;">
        {f"<p><b>Brief:</b> {brief}</p>" if brief else ""}
        {f"<p><b>Objective:</b> {objective}</p>" if objective else ""}
        </body></html>
        """
