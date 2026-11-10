"""Learned heuristic regression: LinearRegression and DecisionTreeRegressor."""
from __future__ import annotations
import random
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.tree import DecisionTreeRegressor
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import GroupShuffleSplit

from backend.app.models import RegressionConfig, RegressionResult, RegressionMetrics
from backend.app.maze.generators import generate
from backend.app.maze.grid import MazeGrid
from backend.app.search.reference import dijkstra_optimal_cost
from backend.app.ml.features import extract_pair_features, FEATURE_NAMES
from backend.app.ml.store import ml_store


def train_regression(job, config: RegressionConfig) -> RegressionResult:
    job.set_progress(0, config.n_mazes, "Generating regression training data...")

    X_list = []
    y_list = []
    groups = []

    rng = random.Random(config.seed)

    for m_idx in range(config.n_mazes):
        if job.cancelled:
            return None

        seed = (config.seed * 10007 + m_idx) % (2**31)
        maze = generate(type="random", rows=15, cols=15, density=0.2, weighted=True, seed=seed)

        # Compute cost-to-goal reverse map or sample pairs
        open_cells = [
            (r, c)
            for r in range(maze.rows)
            for c in range(maze.cols)
            if maze.cell(r, c) != 1
        ]

        if len(open_cells) < 2:
            continue

        goal = maze.goal

        # Sample cells in maze
        samples = rng.sample(open_cells, min(len(open_cells), config.samples_per_maze))
        for cell in samples:
            sub_maze = MazeGrid(
                rows=maze.rows,
                cols=maze.cols,
                cells=list(maze.cells),
                start=cell,
                goal=goal,
                diagonal=maze.diagonal,
            )
            c_star = dijkstra_optimal_cost(sub_maze)
            if c_star is not None:
                feat = extract_pair_features(maze, cell[0], cell[1], goal[0], goal[1])
                X_list.append(feat)
                y_list.append(c_star)
                groups.append(m_idx)

        job.set_progress(m_idx + 1, config.n_mazes, f"Maze {m_idx + 1}/{config.n_mazes} sampled")

    if len(X_list) < 20:
        raise ValueError("Insufficient reachable training points collected.")

    X = np.array(X_list, dtype=np.float32)
    y = np.array(y_list, dtype=np.float32)
    groups = np.array(groups)

    # GroupShuffleSplit so test set has unseen mazes
    gss = GroupShuffleSplit(n_splits=1, test_size=config.test_size, random_state=config.seed)
    train_idx, test_idx = next(gss.split(X, y, groups=groups))

    X_train, X_test = X[train_idx], X[test_idx]
    y_train, y_test = y[train_idx], y[test_idx]

    # Baseline: Manhattan distance
    manhattan_preds = X_test[:, 0]  # feature index 0 is manhattan
    base_mae = float(mean_absolute_error(y_test, manhattan_preds))
    base_r2 = float(r2_score(y_test, manhattan_preds))
    base_over = float(np.mean(manhattan_preds > y_test) * 100.0)

    # Model 1: Linear Regression
    lr = LinearRegression()
    lr.fit(X_train, y_train)
    lr_preds = lr.predict(X_test)
    lr_mae = float(mean_absolute_error(y_test, lr_preds))
    lr_r2 = float(r2_score(y_test, lr_preds))
    lr_over = float(np.mean(lr_preds > y_test) * 100.0)

    # Model 2: Decision Tree Regressor
    dt = DecisionTreeRegressor(max_depth=5, random_state=config.seed)
    dt.fit(X_train, y_train)
    dt_preds = dt.predict(X_test)
    dt_mae = float(mean_absolute_error(y_test, dt_preds))
    dt_r2 = float(r2_score(y_test, dt_preds))
    dt_over = float(np.mean(dt_preds > y_test) * 100.0)

    # Store models
    ml_store.set_regression(
        model={"linear": lr, "tree": dt},
        meta={
            "n_mazes": config.n_mazes,
            "dataset_size": len(X),
            "metrics": {
                "linear": {"mae": lr_mae, "r2": lr_r2, "overestimate_pct": lr_over},
                "tree": {"mae": dt_mae, "r2": dt_r2, "overestimate_pct": dt_over},
                "baseline": {"mae": base_mae, "r2": base_r2, "overestimate_pct": base_over},
            },
        },
    )

    coef_dict = {
        name: round(float(c), 4)
        for name, c in zip(FEATURE_NAMES, lr.coef_)
    }
    coef_dict["intercept"] = round(float(lr.intercept_), 4)

    warnings = []
    if dt_over > 5.0:
        warnings.append("Learned heuristic overestimates true distance in some cases; A* may not be optimal.")

    return RegressionResult(
        dataset_size=len(X),
        n_mazes=config.n_mazes,
        metrics=[
            RegressionMetrics(model="Baseline (Manhattan)", mae=round(base_mae, 3), r2=round(base_r2, 3), overestimate_pct=round(base_over, 1)),
            RegressionMetrics(model="Linear Regression", mae=round(lr_mae, 3), r2=round(lr_r2, 3), overestimate_pct=round(lr_over, 1)),
            RegressionMetrics(model="Decision Tree (depth=5)", mae=round(dt_mae, 3), r2=round(dt_r2, 3), overestimate_pct=round(dt_over, 1)),
        ],
        coefficients=coef_dict,
        warnings=warnings,
    )

