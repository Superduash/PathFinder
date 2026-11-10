"""In-memory store for trained regression and classification models."""
from __future__ import annotations
import time
from typing import Any, Optional


class MLStore:
    def __init__(self) -> None:
        self.regression_model: Optional[Any] = None
        self.regression_meta: Optional[dict] = None
        self.classification_model: Optional[Any] = None
        self.classification_meta: Optional[dict] = None

    def set_regression(self, model: Any, meta: dict) -> None:
        self.regression_model = model
        self.regression_meta = {
            "trained_at": time.time(),
            **meta,
        }

    def set_classification(self, model: Any, meta: dict) -> None:
        self.classification_model = model
        self.classification_meta = {
            "trained_at": time.time(),
            **meta,
        }

    def get_status(self) -> dict:
        return {
            "regression": self.regression_meta,
            "classification": self.classification_meta,
        }


ml_store = MLStore()

