"""Algorithm recommendation classification: DecisionTreeClassifier vs Majority baseline."""
from __future__ import annotations
import random
import numpy as np
from sklearn.tree import DecisionTreeClassifier, export_text
from sklearn.dummy import DummyClassifier
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix
from sklearn.model_selection import train_test_split
from backend.app.models import ClassificationConfig, ClassificationResult, ClassificationMetrics
from backend.app.maze.generators import generate, ensure_solvable
from backend.app.search.algorithms import create_search
from backend.app.ml.features import extract_maze_features, CLASSIFICATION_FEATURE_NAMES
from backend.app.ml.store import ml_store
from backend.app.search.reference import is_reachable, dijkstra_optimal_cost
CANDIDATES = [
    {"name": "bfs", "algorithm": "bfs", "heuristic": None},
    {"name": "astar_manhattan", "algorithm": "astar", "heuristic": "manhattan"},
    {"name": "greedy", "algorithm": "greedy", "heuristic": "manhattan"},
    {"name": "bds", "algorithm": "bds", "heuristic": None},
]
# Training mix: mirrors what the app generates (all maze types, several sizes, with/without
# weighted terrain). Training on one size/type made predictions fail on the default 21x21 "loops" maze.
TRAIN_TYPES = ["backtracker", "random", "loops", "braided", "weighted"]
TRAIN_SIZES = [11, 15, 21, 25, 31]
TRAIN_DENSITIES = [0.15, 0.23, 0.31, 0.39]
def pick_winner(maze, tolerance: float = 0.05):
    """Single source of truth for the "best algorithm" label.

    Winner = the candidate that expands the FEWEST nodes among those whose path cost
    is within `tolerance` of the optimal cost C*. Used by both training and prediction,
    so "actual winner" always matches how the model was trained.
    """
    c_star = dijkstra_optimal_cost(maze)
    best_alg = None
    min_exp = float("inf")
    for c in CANDIDATES:
        s = create_search(c["algorithm"], maze, heuristic=c["heuristic"])
        s.run_to_completion()
        if s.status != "found":
            continue
        if c_star is not None and s.path_cost is not None \
                and s.path_cost > c_star * (1.0 + tolerance) + 1e-9:
            continue  # path too costly -> not eligible to win
        if s.expanded_count < min_exp:
            min_exp = s.expanded_count
            best_alg = c["name"]
    return best_alg
def train_classification(job, config: ClassificationConfig) -> ClassificationResult:
    job.set_progress(0, config.n_mazes, "Generating mazes and running actual races...")
    X_list = []
    y_list = []
    for m_idx in range(config.n_mazes):
        if getattr(job, "cancel_requested", False) or job.cancelled:
            return None
        rng = random.Random(config.seed * 31337 + m_idx)   # deterministic per maze
        seed = rng.randrange(2**31)
        m_type = TRAIN_TYPES[m_idx % len(TRAIN_TYPES)]
        size = rng.choice(TRAIN_SIZES)
        dens = rng.choice(TRAIN_DENSITIES)
        weighted = rng.random() < 0.7
        for retry in range(20):
            maze = generate(type=m_type, rows=size, cols=size, density=dens, weighted=weighted, seed=seed)
            if is_reachable(maze):
                break
            seed = (seed * 1_000_003 + retry + 1) % (2**31)
        best_alg = pick_winner(maze, config.tolerance)
        if best_alg is not None:
            feat = extract_maze_features(maze)
            X_list.append(feat)
            y_list.append(best_alg)
        job.set_progress(m_idx + 1, config.n_mazes, f"Classified maze {m_idx + 1}/{config.n_mazes}")
    if len(X_list) < 10:
        raise ValueError("Insufficient solvable mazes for classification.")
    X = np.array(X_list, dtype=np.float32)
    y = np.array(y_list)
    classes, counts = np.unique(y, return_counts=True)
    class_dist = {str(c): int(cnt) for c, cnt in zip(classes, counts)}
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=config.test_size, random_state=config.seed, stratify=y if len(classes) > 1 and min(counts) > 1 else None
    )
    # Majority baseline
    dummy = DummyClassifier(strategy="most_frequent")
    dummy.fit(X_train, y_train)
    base_acc = float(dummy.score(X_test, y_test))
    # Decision tree
    dt = DecisionTreeClassifier(
        max_depth=5,
        min_samples_leaf=3,
        criterion=config.criterion if config.criterion in ("gini", "entropy") else "gini",
        random_state=config.seed
    )
    dt.fit(X_train, y_train)
    y_pred = dt.predict(X_test)
    acc = float(accuracy_score(y_test, y_pred))
    p, r, f1, _ = precision_recall_fscore_support(y_test, y_pred, average="macro", zero_division=0)
    # Confusion matrix
    labels = sorted(list(classes))
    cm = confusion_matrix(y_test, y_pred, labels=labels).tolist()
    feat_importances = {
        name: round(float(imp), 4)
        for name, imp in zip(CLASSIFICATION_FEATURE_NAMES, dt.feature_importances_)
    }
    tree_rules = export_text(dt, feature_names=CLASSIFICATION_FEATURE_NAMES)
    warnings = []
    if len(classes) == 1:
        warnings.append("Degenerate class distribution: only one algorithm won all mazes.")
    if acc <= base_acc:
        warnings.append("Model does not beat the majority-class baseline - use more training mazes.")
    if len(y_test) < 60:
        warnings.append(f"Small test set ({len(y_test)} mazes): accuracy is noisy. Use 300+ training mazes.")
    ml_store.set_classification(
        model=dt,
        meta={
            "n_mazes": config.n_mazes,
            "dataset_size": len(X),
            "classes": labels,
            "accuracy": acc,
            "baseline_accuracy": base_acc,
            "class_distribution": class_dist,
            "tolerance": config.tolerance,
        },
    )
    return ClassificationResult(
        dataset_size=len(X),
        n_classes=len(classes),
        class_distribution=class_dist,
        metrics=ClassificationMetrics(
            accuracy=round(acc, 3),
            macro_precision=round(float(p), 3),
            macro_recall=round(float(r), 3),
            macro_f1=round(float(f1), 3),
        ),
        baseline_accuracy=round(base_acc, 3),
        confusion_matrix=cm,
        feature_importances=feat_importances,
        tree_rules=tree_rules,
        warnings=warnings,
    )
