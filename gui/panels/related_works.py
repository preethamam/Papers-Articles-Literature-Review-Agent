"""Related Works panel — streaming synthesis + bibliography."""

from __future__ import annotations

from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QSplitter,
    QLabel, QTextEdit, QPushButton, QSpinBox, QComboBox,
    QGroupBox, QApplication,
)
from PyQt6.QtCore import Qt
from PyQt6.QtGui import QFont

from gui.workers.synthesis_worker import SynthesisWorker


class RelatedWorksPanel(QWidget):
    """Generate a Related Works section with bibliography via streaming Claude."""

    def __init__(self, parent=None):
        super().__init__(parent)
        self._worker: SynthesisWorker | None = None
        self._build_ui()

    # ------------------------------------------------------------------

    def _build_ui(self) -> None:
        root = QVBoxLayout(self)
        root.setSpacing(12)
        root.setContentsMargins(24, 24, 24, 24)

        # Title
        title = QLabel("Related Works Synthesis")
        title_font = QFont()
        title_font.setPointSize(18)
        title_font.setBold(True)
        title.setFont(title_font)
        title.setStyleSheet("color: #e0e0ff;")
        root.addWidget(title)

        subtitle = QLabel(
            "Enter a research topic — Claude will synthesize a Related Works paragraph\n"
            "with inline citations and a formatted bibliography."
        )
        subtitle.setStyleSheet("color: #888899; font-size: 12px;")
        root.addWidget(subtitle)

        # Input group
        input_box = QGroupBox("Research Topic")
        input_box.setStyleSheet(self._groupbox_style())
        input_layout = QVBoxLayout(input_box)

        self._topic = QTextEdit()
        self._topic.setPlaceholderText(
            "e.g. deep learning for automated pavement crack detection"
        )
        self._topic.setMaximumHeight(80)
        self._topic.setStyleSheet("""
            QTextEdit {
                background: #1e1e2e;
                color: #e0e0ff;
                border: 1px solid #444466;
                border-radius: 4px;
                padding: 6px;
                font-size: 13px;
            }
        """)
        input_layout.addWidget(self._topic)

        # Controls row
        ctrl_row = QHBoxLayout()
        ctrl_row.setSpacing(10)

        top_k_label = QLabel("Top-K:")
        top_k_label.setStyleSheet("color: #c0c0e0;")
        self._top_k = QSpinBox()
        self._top_k.setRange(1, 50)
        self._top_k.setValue(10)
        self._top_k.setFixedWidth(60)
        self._top_k.setStyleSheet(self._spinbox_style())

        style_label = QLabel("Style:")
        style_label.setStyleSheet("color: #c0c0e0;")
        self._style_combo = QComboBox()
        self._style_combo.addItems(["background", "survey", "introduction"])
        self._style_combo.setFixedWidth(130)
        self._style_combo.setStyleSheet("""
            QComboBox {
                background: #1e1e2e;
                color: #e0e0ff;
                border: 1px solid #444466;
                border-radius: 4px;
                padding: 3px 6px;
            }
            QComboBox::drop-down { border: none; }
            QComboBox QAbstractItemView {
                background: #1a1a2e;
                color: #e0e0ff;
                selection-background-color: #2a4a8a;
            }
        """)

        self._synth_btn = QPushButton("Synthesize")
        self._synth_btn.setFixedWidth(110)
        self._synth_btn.clicked.connect(self._synthesize)
        self._synth_btn.setStyleSheet("""
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

        clear_btn = QPushButton("Clear")
        clear_btn.setFixedWidth(70)
        clear_btn.clicked.connect(self._clear)
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

        ctrl_row.addWidget(top_k_label)
        ctrl_row.addWidget(self._top_k)
        ctrl_row.addWidget(style_label)
        ctrl_row.addWidget(self._style_combo)
        ctrl_row.addStretch()
        ctrl_row.addWidget(clear_btn)
        ctrl_row.addWidget(self._synth_btn)
        input_layout.addLayout(ctrl_row)
        root.addWidget(input_box)

        # Output area
        output_box = QGroupBox("Output")
        output_box.setStyleSheet(self._groupbox_style())
        output_layout = QVBoxLayout(output_box)

        self._output = QTextEdit()
        self._output.setReadOnly(True)
        self._output.setStyleSheet("""
            QTextEdit {
                background: #0d0d1a;
                color: #e0e0ff;
                border: 1px solid #333355;
                border-radius: 4px;
                padding: 10px;
                font-size: 13px;
                line-height: 1.5;
            }
        """)
        output_layout.addWidget(self._output)

        # Copy buttons
        copy_row = QHBoxLayout()
        copy_row.setSpacing(8)

        copy_rw_btn = QPushButton("Copy Related Works")
        copy_rw_btn.clicked.connect(lambda: self._copy_section("## Related Works"))
        copy_rw_btn.setStyleSheet(self._copy_btn_style())

        copy_bib_btn = QPushButton("Copy Bibliography")
        copy_bib_btn.clicked.connect(lambda: self._copy_section("## Bibliography"))
        copy_bib_btn.setStyleSheet(self._copy_btn_style())

        copy_all_btn = QPushButton("Copy All")
        copy_all_btn.clicked.connect(self._copy_all)
        copy_all_btn.setStyleSheet(self._copy_btn_style())

        copy_row.addWidget(copy_rw_btn)
        copy_row.addWidget(copy_bib_btn)
        copy_row.addWidget(copy_all_btn)
        copy_row.addStretch()
        output_layout.addLayout(copy_row)
        root.addWidget(output_box, stretch=1)

        # Status
        self._status = QLabel("Enter a topic and press Synthesize.")
        self._status.setStyleSheet("color: #666688; font-size: 11px;")
        root.addWidget(self._status)

    # ------------------------------------------------------------------

    @staticmethod
    def _groupbox_style() -> str:
        return """
            QGroupBox {
                color: #aaaacc;
                border: 1px solid #333355;
                border-radius: 6px;
                margin-top: 8px;
                padding-top: 8px;
            }
            QGroupBox::title { subcontrol-origin: margin; left: 10px; }
        """

    @staticmethod
    def _spinbox_style() -> str:
        return """
            QSpinBox {
                background: #1e1e2e;
                color: #e0e0ff;
                border: 1px solid #444466;
                border-radius: 4px;
                padding: 2px 4px;
            }
        """

    @staticmethod
    def _copy_btn_style() -> str:
        return """
            QPushButton {
                background: #2a2a4a;
                color: #c0c0e0;
                border: 1px solid #444466;
                border-radius: 5px;
                padding: 4px 10px;
                font-size: 12px;
            }
            QPushButton:hover { background: #3a3a6a; color: #ffffff; }
        """

    # ------------------------------------------------------------------

    def _synthesize(self) -> None:
        if self._worker and self._worker.isRunning():
            return
        query = self._topic.toPlainText().strip()
        if not query:
            return

        self._output.clear()
        self._status.setText("Generating…")
        self._synth_btn.setEnabled(False)

        self._worker = SynthesisWorker(
            query=query,
            n_results=self._top_k.value(),
            style=self._style_combo.currentText(),
            parent=self,
        )
        self._worker.token_signal.connect(self._append_token)
        self._worker.sources_signal.connect(self._on_sources)
        self._worker.done_signal.connect(self._on_done)
        self._worker.error_signal.connect(self._on_error)
        self._worker.start()

    def _clear(self) -> None:
        self._topic.clear()
        self._output.clear()
        self._status.setText("Enter a topic and press Synthesize.")

    def _append_token(self, token: str) -> None:
        cursor = self._output.textCursor()
        cursor.movePosition(cursor.MoveOperation.End)
        cursor.insertText(token)
        self._output.setTextCursor(cursor)
        self._output.ensureCursorVisible()

    def _on_sources(self, papers: list) -> None:
        self._status.setText(f"Cited {len(papers)} paper(s).")

    def _on_done(self) -> None:
        self._synth_btn.setEnabled(True)
        if "Cited" not in self._status.text():
            self._status.setText("Done.")

    def _on_error(self, msg: str) -> None:
        self._output.append(f"\n\n[Error: {msg}]")
        self._status.setText(f"Error: {msg}")
        self._synth_btn.setEnabled(True)

    def _copy_section(self, header: str) -> None:
        text = self._output.toPlainText()
        idx = text.find(header)
        if idx == -1:
            QApplication.clipboard().setText(text)
            self._status.setText("Section not found — copied full output.")
            return
        # Find next ## section boundary
        next_idx = text.find("\n## ", idx + len(header))
        section = text[idx:next_idx].strip() if next_idx != -1 else text[idx:].strip()
        QApplication.clipboard().setText(section)
        self._status.setText(f"Copied {header} to clipboard.")

    def _copy_all(self) -> None:
        text = self._output.toPlainText()
        if text.strip():
            QApplication.clipboard().setText(text)
            self._status.setText("Copied full output to clipboard.")
