"""QThread worker for the ETL ingest pipeline."""

from __future__ import annotations

from pathlib import Path

from PyQt6.QtCore import QThread, pyqtSignal


class IngestWorker(QThread):
    """
    Runs run_pipeline() in a background thread.

    Signals:
        log_signal(str)          — one log line per event
        progress_signal(int,int) — (current, total) PDF count
        done_signal(dict)        — final stats dict from pipeline
        error_signal(str)        — error message
    """

    log_signal      = pyqtSignal(str)
    progress_signal = pyqtSignal(int, int)
    done_signal     = pyqtSignal(dict)
    error_signal    = pyqtSignal(str)

    def __init__(self, articles_dir: Path, reprocess: bool = False, parent=None) -> None:
        super().__init__(parent)
        self.articles_dir = articles_dir
        self.reprocess = reprocess
        self._total = 0
        self._current = 0

    def run(self) -> None:
        try:
            from app.etl.pipeline import run_pipeline
            for event in run_pipeline(self.articles_dir, self.reprocess):
                etype = event.get("event", "")
                msg   = event.get("message", "")

                if etype == "start":
                    self._total = event.get("total", 0)
                    self.log_signal.emit(msg)

                elif etype == "progress":
                    self.log_signal.emit(msg)
                    if not event.get("skipped", False):
                        self._current += 1
                        self.progress_signal.emit(self._current, self._total)

                elif etype == "done":
                    self.log_signal.emit(msg)
                    self.done_signal.emit(event)

                elif etype == "error":
                    self.log_signal.emit(f"ERROR: {msg}")
                    self.error_signal.emit(msg)

        except Exception as exc:
            self.error_signal.emit(str(exc))
