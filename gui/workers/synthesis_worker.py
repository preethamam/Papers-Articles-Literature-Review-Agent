"""QThread worker for Related Works synthesis streaming."""

from __future__ import annotations

from PyQt6.QtCore import QThread, pyqtSignal


class SynthesisWorker(QThread):
    """
    Calls summary_service.stream_related_works() in a background thread.

    Signals:
        token_signal(str)    — each Claude token
        sources_signal(list) — cited papers list (final item from generator)
        done_signal()        — stream complete
        error_signal(str)    — error message
    """

    token_signal   = pyqtSignal(str)
    sources_signal = pyqtSignal(list)
    done_signal    = pyqtSignal()
    error_signal   = pyqtSignal(str)

    def __init__(self, query: str, n_results: int = 10, style: str = "background", parent=None) -> None:
        super().__init__(parent)
        self.query     = query
        self.n_results = n_results
        self.style     = style

    def run(self) -> None:
        try:
            from app.services.summary_service import stream_related_works
            for item in stream_related_works(self.query, self.n_results, self.style):
                if isinstance(item, str):
                    self.token_signal.emit(item)
                elif isinstance(item, list):
                    self.sources_signal.emit(item)
        except Exception as exc:
            self.error_signal.emit(str(exc))
        finally:
            self.done_signal.emit()
