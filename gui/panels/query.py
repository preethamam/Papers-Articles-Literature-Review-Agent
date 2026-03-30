"""RAG Q&A panel — streaming Claude answer + source papers table."""

from __future__ import annotations

from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QSplitter,
    QLabel, QTextEdit, QPushButton, QSpinBox,
    QTableWidget, QTableWidgetItem, QHeaderView,
    QAbstractItemView, QGroupBox,
)
from PyQt6.QtCore import Qt
from PyQt6.QtGui import QFont

from gui.workers.query_worker import QueryWorker


class QueryPanel(QWidget):
    """Ask questions across all ingested papers; Claude streams the answer."""

    def __init__(self, parent=None):
        super().__init__(parent)
        self._worker: QueryWorker | None = None
        self._build_ui()

    # ------------------------------------------------------------------

    def _build_ui(self) -> None:
        root = QVBoxLayout(self)
        root.setSpacing(12)
        root.setContentsMargins(24, 24, 24, 24)

        # Title
        title = QLabel("Q&A — Ask Your Papers")
        title_font = QFont()
        title_font.setPointSize(18)
        title_font.setBold(True)
        title.setFont(title_font)
        title.setStyleSheet("color: #e0e0ff;")
        root.addWidget(title)

        # Input area
        input_box = QGroupBox("Your Question")
        input_box.setStyleSheet("""
            QGroupBox {
                color: #aaaacc;
                border: 1px solid #333355;
                border-radius: 6px;
                margin-top: 8px;
                padding-top: 8px;
            }
            QGroupBox::title { subcontrol-origin: margin; left: 10px; }
        """)
        input_layout = QVBoxLayout(input_box)

        self._question = QTextEdit()
        self._question.setPlaceholderText("Type your question here…")
        self._question.setMaximumHeight(80)
        self._question.setStyleSheet("""
            QTextEdit {
                background: #1e1e2e;
                color: #e0e0ff;
                border: 1px solid #444466;
                border-radius: 4px;
                padding: 6px;
                font-size: 13px;
            }
        """)
        input_layout.addWidget(self._question)

        btn_row = QHBoxLayout()
        btn_row.setSpacing(10)

        top_k_label = QLabel("Top-K:")
        top_k_label.setStyleSheet("color: #c0c0e0;")
        self._top_k = QSpinBox()
        self._top_k.setRange(1, 50)
        self._top_k.setValue(10)
        self._top_k.setFixedWidth(60)
        self._top_k.setStyleSheet("""
            QSpinBox {
                background: #1e1e2e;
                color: #e0e0ff;
                border: 1px solid #444466;
                border-radius: 4px;
                padding: 2px 4px;
            }
        """)

        self._ask_btn = QPushButton("Ask")
        self._ask_btn.setFixedWidth(100)
        self._ask_btn.setStyleSheet("""
            QPushButton {
                background: #4a6aaf;
                color: #ffffff;
                border: none;
                border-radius: 5px;
                padding: 6px 16px;
                font-size: 13px;
                font-weight: bold;
            }
            QPushButton:hover { background: #5a7abf; }
            QPushButton:disabled { background: #2a2a4a; color: #555577; }
        """)
        self._ask_btn.clicked.connect(self._ask)

        clear_btn = QPushButton("Clear")
        clear_btn.setFixedWidth(70)
        clear_btn.setStyleSheet("""
            QPushButton {
                background: #2a2a4a;
                color: #c0c0e0;
                border: 1px solid #444466;
                border-radius: 5px;
                padding: 5px 10px;
            }
            QPushButton:hover { background: #3a3a6a; }
        """)
        clear_btn.clicked.connect(self._clear)

        btn_row.addWidget(top_k_label)
        btn_row.addWidget(self._top_k)
        btn_row.addStretch()
        btn_row.addWidget(clear_btn)
        btn_row.addWidget(self._ask_btn)
        input_layout.addLayout(btn_row)
        root.addWidget(input_box)

        # Splitter: answer top, sources bottom
        splitter = QSplitter(Qt.Orientation.Vertical)

        # Answer browser
        answer_box = QGroupBox("Answer")
        answer_box.setStyleSheet("""
            QGroupBox {
                color: #aaaacc;
                border: 1px solid #333355;
                border-radius: 6px;
                margin-top: 8px;
                padding-top: 8px;
            }
            QGroupBox::title { subcontrol-origin: margin; left: 10px; }
        """)
        answer_layout = QVBoxLayout(answer_box)
        self._answer = QTextEdit()
        self._answer.setReadOnly(True)
        self._answer.setStyleSheet("""
            QTextEdit {
                background: #0d0d1a;
                color: #e0e0ff;
                border: 1px solid #333355;
                border-radius: 4px;
                padding: 8px;
                font-size: 13px;
            }
        """)
        answer_layout.addWidget(self._answer)
        splitter.addWidget(answer_box)

        # Sources table
        sources_box = QGroupBox("Sources")
        sources_box.setStyleSheet("""
            QGroupBox {
                color: #aaaacc;
                border: 1px solid #333355;
                border-radius: 6px;
                margin-top: 8px;
                padding-top: 8px;
            }
            QGroupBox::title { subcontrol-origin: margin; left: 10px; }
        """)
        sources_layout = QVBoxLayout(sources_box)
        self._sources_table = QTableWidget(0, 4)
        self._sources_table.setHorizontalHeaderLabels(["Title", "Year", "Category", "Relevance"])
        self._sources_table.horizontalHeader().setSectionResizeMode(0, QHeaderView.ResizeMode.Stretch)
        for i in range(1, 4):
            self._sources_table.horizontalHeader().setSectionResizeMode(i, QHeaderView.ResizeMode.ResizeToContents)
        self._sources_table.setEditTriggers(QAbstractItemView.EditTrigger.NoEditTriggers)
        self._sources_table.setSelectionBehavior(QAbstractItemView.SelectionBehavior.SelectRows)
        self._sources_table.verticalHeader().setVisible(False)
        self._sources_table.setMaximumHeight(160)
        self._sources_table.setStyleSheet("""
            QTableWidget {
                background: #1a1a2e;
                color: #c0c0e0;
                gridline-color: #2a2a4a;
                border: none;
                font-size: 12px;
            }
            QTableWidget::item:selected { background: #2a4a8a; }
            QHeaderView::section {
                background: #12122a;
                color: #888899;
                border: none;
                border-bottom: 1px solid #333355;
                padding: 3px 6px;
            }
        """)
        sources_layout.addWidget(self._sources_table)
        splitter.addWidget(sources_box)

        splitter.setStretchFactor(0, 3)
        splitter.setStretchFactor(1, 1)
        root.addWidget(splitter, stretch=1)

        # Status
        self._status = QLabel("Ready.")
        self._status.setStyleSheet("color: #666688; font-size: 11px;")
        root.addWidget(self._status)

    # ------------------------------------------------------------------

    def _ask(self) -> None:
        if self._worker and self._worker.isRunning():
            return
        question = self._question.toPlainText().strip()
        if not question:
            return

        self._answer.clear()
        self._sources_table.setRowCount(0)
        self._status.setText("Thinking…")
        self._ask_btn.setEnabled(False)

        self._worker = QueryWorker(question, self._top_k.value(), parent=self)
        self._worker.token_signal.connect(self._append_token)
        self._worker.sources_signal.connect(self._show_sources)
        self._worker.done_signal.connect(self._on_done)
        self._worker.error_signal.connect(self._on_error)
        self._worker.start()

    def _clear(self) -> None:
        self._question.clear()
        self._answer.clear()
        self._sources_table.setRowCount(0)
        self._status.setText("Ready.")

    def _append_token(self, token: str) -> None:
        cursor = self._answer.textCursor()
        cursor.movePosition(cursor.MoveOperation.End)
        cursor.insertText(token)
        self._answer.setTextCursor(cursor)
        self._answer.ensureCursorVisible()

    def _show_sources(self, papers: list) -> None:
        self._sources_table.setRowCount(0)
        for paper in papers:
            row = self._sources_table.rowCount()
            self._sources_table.insertRow(row)
            relevance = paper.get("relevance")
            rel_str = f"{relevance:.3f}" if relevance is not None else "—"
            vals = [
                paper.get("title", "Unknown"),
                str(paper.get("year", "")),
                paper.get("category", ""),
                rel_str,
            ]
            for col, val in enumerate(vals):
                self._sources_table.setItem(row, col, QTableWidgetItem(val))

    def _on_done(self) -> None:
        self._status.setText("Done.")
        self._ask_btn.setEnabled(True)

    def _on_error(self, msg: str) -> None:
        self._answer.append(f"\n\n[Error: {msg}]")
        self._status.setText(f"Error: {msg}")
        self._ask_btn.setEnabled(True)
