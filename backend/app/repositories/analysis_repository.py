"""In-memory thread-safe repository for SolarScope analysis runs."""

from __future__ import annotations

from threading import Lock
from typing import Any, Dict, List, Optional
from backend.app.config import settings


class AnalysisRepository:
    """Thread-safe in-memory store for session analysis records.

    Architectural Decision:
    An in-memory dictionary guarded by a threading Lock is intentionally chosen for the MVP
    to eliminate external database dependencies (e.g. PostgreSQL, Redis) while maintaining
    thread safety across concurrent FastAPI async worker threads.

    Trade-off:
    Records do not survive process restarts. This is acceptable for the current single-session
    analytical tool where runs are ephemeral and exportable as PDF audit reports.

    Future Improvement:
    If multi-instance horizontal scaling or cross-session persistence is required,
    swap this implementation for an async SQLAlchemy or Redis adapter behind this same interface.
    """

    MAX_CAPACITY = settings.MAX_ANALYSES_CAPACITY

    def __init__(self, max_capacity: Optional[int] = None) -> None:
        self._store: Dict[str, Dict[str, Any]] = {}
        self._lock = Lock()
        self.max_capacity = max_capacity if max_capacity is not None else settings.MAX_ANALYSES_CAPACITY

    def save(self, analysis_id: str, record: Dict[str, Any]) -> None:
        with self._lock:
            # Bounded Retention / Memory Safety:
            # To prevent memory exhaustion under continuous load, we enforce a strict upper limit
            # on retained analysis sessions. When capacity is reached, the oldest session is evicted.
            if len(self._store) >= self.max_capacity and analysis_id not in self._store:
                oldest_id = next(iter(self._store))
                del self._store[oldest_id]
            self._store[analysis_id] = record

    def get(self, analysis_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            return self._store.get(analysis_id)

    def list_all(self) -> List[Dict[str, Any]]:
        with self._lock:
            # We sort descending by creation timestamp so the UI presents the newest runs first.
            items = list(self._store.values())
            items.sort(key=lambda x: x.get("created_at", ""), reverse=True)
            return items

    def save_scenario(self, analysis_id: str, scenario_id: str, scenario_record: Dict[str, Any]) -> bool:
        with self._lock:
            analysis = self._store.get(analysis_id)
            if not analysis:
                return False
            # Scenarios are nested within the parent analysis record to keep delta audits co-located.
            if "scenarios" not in analysis:
                analysis["scenarios"] = {}
            analysis["scenarios"][scenario_id] = scenario_record
            return True

    def clear(self) -> None:
        """Clear all stored analyses (primarily for testing isolation)."""
        with self._lock:
            self._store.clear()


# Global repository instance
analysis_repo = AnalysisRepository()
