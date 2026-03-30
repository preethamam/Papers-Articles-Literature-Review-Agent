"""Extract & Load panel — folder picker, progress bar, live log."""

from __future__ import annotations

from pathlib import Path

from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout,
    QLabel, QLineEdit, QPushButton,
    QProgressBar, QTextEdit, QCheckBox,
    QFileDialog, QSizePolicy,
)
from PyQt6.QtCore import Qt, QSettings
from PyQt6.QtGui import QFont, QColor

from gui.workers.ingest_worker import IngestWorker


_SETTINGS_ORG = "USC Research"
_SETTINGS_APP = "LitReview"
_KEY_FOLDER    = "ingest/last_folder"


class IngestPanel(QWidget):
    """Panel for PDF extraction and ChromaDB loading."""

    def __init__(self, parent=None):
        super().__init__(parent)
        self._worker: IngestWorker | None = None
        self._build_ui()
        self._load_saved_folder()

    # ------------------------------------------------------------------
    # UI construction
    # ------------------------------------------------------------------

    def _build_ui(self) -> None:
        root = QVBoxLayout(self)
        root.setSpacing(12)
        root.setContentsMargins(24, 24, 24, 24)

        # Title
        title = QLabel("Extract & Load")
        title_font = QFont()
        title_font.setPointSize(18)
        title_font.setBold(True)
        title.setFont(title_font)
        title.setStyleSheet("color: #e0e0ff;")
        root.addWidget(title)

        subtitle = QLabel("Select a folder of PDFs to parse, embed and store.")
        subtitle.setStyleSheet("color: #888899; font-size: 12px;")
        root.addWidget(subtitle)

        # Row 1 — folder selector
        folder_row = QHBoxLayout()
        folder_row.setSpacing(8)

        folder_label = QLabel("Articles Folder:")
        folder_label.setStyleSheet("color: #c0c0e0;")
        folder_label.setFixedWidth(120)

        self._folder_edit = QLineEdit()
        self._folder_edit.setPlaceholderText("Path to folder containing PDFs…")
        self._folder_edit.setStyleSheet("""
            QLineEdit {
                background: #1e1e2e;
                color: #e0e0ff;
                border: 1px solid #444466;
                border-radius: 4px;
                padding: 4px 8px;
            }
        """)

        browse_btn = QPushButton("Browse…")
        browse_btn.setFixedWidth(80)
        browse_btn.clicked.connect(self._browse)
        browse_btn.setStyleSheet(self._btn_style())

        folder_row.addWidget(folder_label)
        folder_row.addWidget(self._folder_edit)
        folder_row.addWidget(browse_btn)
        root.addLayout(folder_row)

        # Row 2 — scan + start + reprocess
        action_row = QHBoxLayout()
        action_row.setSpacing(8)

        self._scan_btn = QPushButton("Scan Folder")
        self._scan_btn.clicked.connect(self._scan)
        self._scan_btn.setStyleSheet(self._btn_style())

        self._scan_label = QLabel("")
        self._scan_label.setStyleSheet("color: #a0f5ab; font-size: 12px;")

        self._start_btn = QPushButton("Start Ingest")
        self._start_btn.clicked.connect(self._start_ingest)
        self._start_btn.setStyleSheet(self._btn_style(primary=True))

        self._reprocess_cb = QCheckBox("Re-process all")
        self._reprocess_cb.setStyleSheet("color: #c0c0e0;")

        action_row.addWidget(self._scan_btn)
        action_row.addWidget(self._scan_label)
        action_row.addStretch()
        action_row.addWidget(self._reprocess_cb)
        action_row.addWidget(self._start_btn)
        root.addLayout(action_row)

        # Progress bar
        self._progress = QProgressBar()
        self._progress.setValue(0)
        self._progress.setTextVisible(True)
        self._progress.setStyleSheet("""
            QProgressBar {
                background: #1e1e2e;
                border: 1px solid #444466;
                border-radius: 4px;
                height: 18px;
                color: #e0e0ff;
                text-align: center;
            }
            QProgressBar::chunk {
                background: #6ab0f5;
                border-radius: 3px;
            }
        """)
        root.addWidget(self._progress)

        # Log area
        log_label = QLabel("Log:")
        log_label.setStyleSheet("color: #888899; font-size: 11px;")
        root.addWidget(log_label)

        self._log = QTextEdit()
        self._log.setReadOnly(True)
        mono = QFont("Courier New", 10)
        mono.setStyleHint(QFont.StyleHint.Monospace)
        self._log.setFont(mono)
        self._log.setStyleSheet("""
            QTextEdit {
                background: #0d0d1a;
                color: #c0c0e0;
                border: 1px solid #333355;
                border-radius: 4px;
            }
        """)
        root.addWidget(self._log, stretch=1)

        # Status label
        self._status_label = QLabel("Idle — select a folder and press Start Ingest.")
        self._status_label.setStyleSheet("color: #666688; font-size: 11px;")
        root.addWidget(self._status_label)

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _btn_style(primary: bool = False) -> str:
        if primary:
            return """
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
            """
        return """
            QPushButton {
                background: #2a2a4a;
                color: #c0c0e0;
                border: 1px solid #444466;
                border-radius: 5px;
                padding: 6px 12px;
                font-size: 13px;
            }
            QPushButton:hover { background: #3a3a6a; color: #ffffff; }
            QPushButton:disabled { color: #444455; }
        """

    def _load_saved_folder(self) -> None:
        qs = QSettings(_SETTINGS_ORG, _SETTINGS_APP)
        folder = qs.value(_KEY_FOLDER, "")
        if folder:
            self._folder_edit.setText(folder)

    def _save_folder(self, path: str) -> None:
        qs = QSettings(_SETTINGS_ORG, _SETTINGS_APP)
        qs.setValue(_KEY_FOLDER, path)

    # ------------------------------------------------------------------
    # Slots
    # ------------------------------------------------------------------

    def _browse(self) -> None:
        start = self._folder_edit.text() or str(Path.home())
        folder = QFileDialog.getExistingDirectory(self, "Select Articles Folder", start)
        if folder:
            self._folder_edit.setText(folder)
            self._save_folder(folder)
            self._scan()

    def _scan(self) -> None:
        folder = self._folder_edit.text().strip()
        if not folder:
            self._scan_label.setText("No folder selected.")
            return
        p = Path(folder)
        if not p.is_dir():
            self._scan_label.setText("Folder not found.")
            return
        pdfs = list(p.rglob("*.pdf"))
        self._scan_label.setText(f"Found {len(pdfs)} PDF(s)")

    def _start_ingest(self) -> None:
        if self._worker and self._worker.isRunning():
            return

        folder = self._folder_edit.text().strip()
        if not folder:
            self._log_line("ERROR: No folder selected.")
            return
        articles_dir = Path(folder)
        if not articles_dir.is_dir():
            self._log_line(f"ERROR: Directory not found: {folder}")
            return

        self._save_folder(folder)
        self._log.clear()
        self._progress.setValue(0)
        self._progress.setMaximum(1)
        self._status_label.setText("Processing…")
        self._start_btn.setEnabled(False)

        reprocess = self._reprocess_cb.isChecked()
        self._worker = IngestWorker(articles_dir, reprocess, parent=self)
        self._worker.log_signal.connect(self._log_line)
        self._worker.progress_signal.connect(self._on_progress)
        self._worker.done_signal.connect(self._on_done)
        self._worker.error_signal.connect(self._on_error)
        self._worker.start()

    def _log_line(self, msg: str) -> None:
        self._log.append(msg)

    def _on_progress(self, current: int, total: int) -> None:
        self._progress.setMaximum(total)
        self._progress.setValue(current)
        self._status_label.setText(f"Processing {current} / {total}…")

    def _on_done(self, event: dict) -> None:
        msg = event.get("message", "Done.")
        self._log_line(f"\n✓ {msg}")
        self._status_label.setText(msg)
        self._progress.setValue(self._progress.maximum())
        self._start_btn.setEnabled(True)

    def _on_error(self, msg: str) -> None:
        self._log_line(f"ERROR: {msg}")
        self._status_label.setText(f"Error: {msg}")
        self._start_btn.setEnabled(True)
