"""Machine learning endpoints: learned heuristics, algorithm recommender, and model registry."""
from __future__ import annotations
import logging
import numpy as np
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.app.db.base import get_db, session_scope
from backend.app.models import (
    RegressionConfig, RegressionResult,
    ClassificationConfig, ClassificationResult,
    JobStatus, Maze
)
from backend.app.jobs import job_manager
from backend.app.ml.regression import train_regression
from backend.app.ml.classification import train_classification, CANDIDATES
from backend.app.ml.features import extract_pair_features, extract_maze_features
from backend.app.ml.store import ml_store
from backend.app.maze.grid import MazeGrid
from backend.app.search.algorithms import create_search
from backend.app.search.reference import dijkstra_optimal_cost, compute_optimality
from backend.app.errors import ApiError, NOT_FOUND
from backend.app.services import models_registry

logger = logging.getLogger("pathfinder.ml")
router = APIRouter()


def execute_and_persist_regression(job, config: RegressionConfig):
    res = train_regression(job, config)
    if res:
        try:
            with session_scope() as db_session:
                models_registry.register_trained_model(
                    session=db_session,
                    kind="regression",
                    name=config.name,
                    model_obj=ml_store.regression_model,
                    params=config.model_dump(),
                    metrics=res.model_dump(),
                    job_id=job.job_id,
                )
        except Exception as e:
            logger.warning("Failed to register regression model in DB: %s", e)
    return res


def execute_and_persist_classification(job, config: ClassificationConfig):
    res = train_classification(job, config)
    if res:
        try:
            with session_scope() as db_session:
                models_registry.register_trained_model(
                    session=db_session,
                    kind="classification",
                    name=config.name,
                    model_obj=ml_store.classification_model,
                    params=config.model_dump(),
                    metrics=res.model_dump(),
                    job_id=job.job_id,
                )
        except Exception as e:
            logger.warning("Failed to register classification model in DB: %s", e)
    return res


@router.post("/ml/regression/train", response_model=JobStatus)
@router.post("/ml/regression/jobs", response_model=JobStatus)
def api_train_regression(config: RegressionConfig) -> JobStatus:
    job = job_manager.create("ml_regression", lambda j: execute_and_persist_regression(j, config))
    return job.to_model()


@router.post("/ml/classification/train", response_model=JobStatus)
@router.post("/ml/classification/jobs", response_model=JobStatus)
def api_train_classification(config: ClassificationConfig) -> JobStatus:
    job = job_manager.create("ml_classification", lambda j: execute_and_persist_classification(j, config))
    return job.to_model()


@router.get("/ml/status")
def api_ml_status(db: Session = Depends(get_db)) -> dict:
    return models_registry.get_ml_status(db)


@router.get("/ml/models")
def api_list_models(
    kind: Optional[str] = Query(None, pattern="^(regression|classification)$"),
    db: Session = Depends(get_db),
) -> dict:
    return {"models": models_registry.list_models(db, kind=kind)}


@router.post("/ml/models/{model_id}/activate")
def api_activate_model(
    model_id: int,
    db: Session = Depends(get_db),
) -> dict:
    return models_registry.activate_model(db, model_id)


@router.delete("/ml/models/{model_id}")
def api_delete_model(
    model_id: int,
    db: Session = Depends(get_db),
) -> dict:
    return models_registry.delete_model(db, model_id)


@router.post("/ml/regression/astar-compare")
def api_astar_compare(payload: dict, db: Session = Depends(get_db)) -> dict:
    maze_data = payload.get("maze")
    model_choice = payload.get("model", "tree")  # "linear" or "tree"
    if not maze_data:
        raise ApiError("INVALID_PARAMS", "Missing maze")

    if not ml_store.regression_model:
        loaded = models_registry.load_active_model(db, "regression")
        if loaded:
            ml_store.regression_model = loaded
        else:
            raise ApiError(NOT_FOUND, "No regression model has been trained yet.")

    model = ml_store.regression_model.get(model_choice)
    if not model:
        raise ApiError(NOT_FOUND, f"Model '{model_choice}' not found.")

    grid = MazeGrid.from_model(Maze(**maze_data))
    grid.validate()
    c_star = dijkstra_optimal_cost(grid)

    # 1. Standard A* with Manhattan
    std_astar = create_search("astar", grid, heuristic="manhattan")
    std_astar.run_to_completion()
    std_opt = compute_optimality(c_star, std_astar.path_cost)

    # 2. Build batched learned heuristic table
    gr, gc = grid.goal
    h_table = {}
    X_pred = []
    cells_order = []

    for r in range(grid.rows):
        for c in range(grid.cols):
            if grid.cell(r, c) != 1:
                feat = extract_pair_features(grid, r, c, gr, gc)
                X_pred.append(feat)
                cells_order.append((r, c))

    if X_pred:
        preds = model.predict(np.array(X_pred, dtype=np.float32))
        for (r, c), p in zip(cells_order, preds):
            h_table[(r, c)] = max(0.0, float(p))

    # Run A* with learned heuristic table
    class LearnedAStar(type(std_astar)):
        def __init__(self, m):
            super().__init__(m, kind="astar", heuristic="zero")
            self.h_fn = lambda r, c, gr, gc: h_table.get((r, c), 0.0)
            self.waiting = [(self.score(self.start), next(self.tiebreak), self.start)]

    learned_search = LearnedAStar(grid)
    learned_search.run_to_completion()
    learned_opt = compute_optimality(c_star, learned_search.path_cost)

    heatmap = []
    for r in range(grid.rows):
        for c in range(grid.cols):
            if grid.cell(r, c) != 1:
                h_val = h_table.get((r, c), 0.0)
                heatmap.append({"r": r, "c": c, "h": round(h_val, 2)})

    return {
        "standard_astar": {
            "expanded": std_astar.expanded_count,
            "cost": std_astar.path_cost,
            "optimality": std_opt,
        },
        "learned_astar": {
            "expanded": learned_search.expanded_count,
            "cost": learned_search.path_cost,
            "optimality": learned_opt,
        },
        "heatmap": heatmap,
        "warning": "Learned heuristics may overestimate cost and lose optimality.",
    }


@router.post("/ml/classification/predict")
def api_predict_winner(payload: dict, db: Session = Depends(get_db)) -> dict:
    maze_data = payload.get("maze")
    run_actual = payload.get("run_actual", True)
    if not maze_data:
        raise ApiError("INVALID_PARAMS", "Missing maze")

    if not ml_store.classification_model:
        loaded = models_registry.load_active_model(db, "classification")
        if loaded:
            ml_store.classification_model = loaded
        else:
            raise ApiError(NOT_FOUND, "No classification model has been trained yet.")

    model = ml_store.classification_model
    grid = MazeGrid.from_model(Maze(**maze_data))
    grid.validate()

    feat = extract_maze_features(grid).reshape(1, -1)
    prediction = model.predict(feat)[0]
    probs = model.predict_proba(feat)[0]
    classes = model.classes_

    prob_dict = {
        str(cls_name): round(float(prob), 3)
        for cls_name, prob in zip(classes, probs)
    }

    actual_winner = None
    if run_actual:
        min_exp = float("inf")
        for c in CANDIDATES:
            s = create_search(c["algorithm"], grid, heuristic=c["heuristic"])
            s.run_to_completion()
            if s.status == "found" and s.expanded_count < min_exp:
                min_exp = s.expanded_count
                actual_winner = c["name"]

    return {
        "predicted_winner": str(prediction),
        "confidence": round(float(np.max(probs)), 3),
        "probabilities": prob_dict,
        "actual_winner": actual_winner,
        "correct": (str(prediction) == str(actual_winner)) if actual_winner else None,
    }
