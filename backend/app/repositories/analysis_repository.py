"""In-memory thread-safe repository for SolarScope analysis runs."""

from __future__ import annotations

from threading import Lock
from typing import Any, Dict, List, Optional


class AnalysisRepository:
    """Thread-safe in-memory store for session analysis records.

    Kept modular so durable persistence (e.g., SQLite or Postgres) can be plugged in later
    without changing domain or API layers.
    """

    def __init__(self) -> None:
        self._store: Dict[str, Dict[str, Any]] = {}
        self._lock = Lock()

    def save(self, analysis_id: str, record: Dict[str, Any]) -> None:
        with self._lock:
            self._store[analysis_id] = record

    def get(self, analysis_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            return self._store.get(analysis_id)

    def list_all(self) -> List[Dict[str, Any]]:
        with self._lock:
            # Return list sorted by creation timestamp descending
            items = list(self._store.values())
            items.sort(key=lambda x: x.get("created_at", ""), reverse=True)
            return items

    def save_scenario(self, analysis_id: str, scenario_id: str, scenario_record: Dict[str, Any]) -> bool:
        with self._lock:
            analysis = self._store.get(analysis_id)
            if not analysis:
                return False
            if "scenarios" not in analysis:
                analysis["scenarios"] = {}
            analysis["scenarios"][scenario_id] = scenario_record
            return True

    def clear(self) -> None:
        """Clear all stored analyses (primarily for testing)."""
        with self._lock:
            self._store.clear()


# Global repository instance
analysis_repo = AnalysisRepository()
