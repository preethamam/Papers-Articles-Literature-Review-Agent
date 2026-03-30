"""QThread worker for RAG Q&A streaming."""

from __future__ import annotations

from typing import Any, List

from PyQt6.QtCore import QThread, pyqtSignal


class QueryWorker(QThread):
    """
    Calls rag_agent.stream_query() in a background thread.

    Signals:
        token_signal(str)    — each Claude token
        sources_signal(list) — source papers list (final item from generator)
        done_signal()        — stream complete
        error_signal(str)    — error message
    """

    token_signal   = pyqtSignal(str)
    sources_signal = pyqtSignal(list)
    done_signal    = pyqtSignal()
    error_signal   = pyqtSignal(str)

    def __init__(self, question: str, n_results: int = 10, parent=None) -> None:
        super().__init__(parent)
        self.question  = question
        self.n_results = n_results

    def run(self) -> None:
        try:
            from app.services.rag_agent import stream_query
            for item in stream_query(self.question, self.n_results):
                if isinstance(item, str):
                    self.token_signal.emit(item)
                elif isinstance(item, list):
                    self.sources_signal.emit(item)
        except Exception as exc:
            self.error_signal.emit(str(exc))
        finally:
            self.done_signal.emit()
