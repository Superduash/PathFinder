"""Benchmark execution runner, statistical aggregation, and CSV generation."""
from __future__ import annotations
import gc
import io
import csv
import os
import random
import platform
import statistics
import time
from backend.app.models import (
    BenchmarkConfig, BenchmarkRow, BenchmarkSummaryRow,
    BenchmarkResult, EnvironmentMeta
)
from backend.app.maze.generators import generate, ensure_solvable
from backend.app.maze.grid import MazeGrid
from backend.app.search.algorithms import create_search
from backend.app.search.reference import dijkstra_optimal_cost, compute_optimality
from backend.app.errors import ApiError, JobCancelled, CONFIG_TOO_LARGE


def run_benchmark_job(job, config: BenchmarkConfig) -> BenchmarkResult:
    # 1. Calculate total expected mazes
    total_configs = len(config.sizes) * len(config.densities) * len(config.types)
    total_mazes = total_configs * config.mazes_per_config
    if total_mazes > 3000:
        raise ApiError(CONFIG_TOO_LARGE, f"Total mazes ({total_mazes}) exceeds maximum allowable 3000.")

    job.set_progress(0, total_mazes, "Initializing benchmark...")

    participants = config.participants or [
        {"algorithm": "bfs"},
        {"algorithm": "astar", "heuristic": "manhattan"},
    ]

    rows_data: list[BenchmarkRow] = []
    t_start = time.time()
    mazes_completed = 0

    config_idx = 0
    for sz in config.sizes:
        for dens in config.densities:
            for m_type in config.types:
                config_idx += 1
                for k in range(config.mazes_per_config):
                    if getattr(job, "cancel_requested", False) or job.cancelled:
                        raise JobCancelled("Benchmark was cancelled.")

                    seed = (config.base_seed * 1_000_003 + config_idx * 1_000 + k) % (2**31)

                    # Generate identical maze for all algorithms
                    maze = generate(
                        type=m_type,
                        rows=sz.rows,
                        cols=sz.cols,
                        density=dens,
                        diagonal=config.diagonal,
                        seed=seed,
                        randomize_endpoints_flag=True,
                    )

                    if config.ensure_solvable:
                        maze = ensure_solvable(
                            maze=maze,
                            base_seed=seed,
                            gen_fn=generate,
                            gen_kwargs={
                                "type": m_type,
                                "rows": sz.rows,
                                "cols": sz.cols,
                                "density": dens,
                                "diagonal": config.diagonal,
                                "randomize_endpoints_flag": True,
                            },
                        )

                    c_star = dijkstra_optimal_cost(maze)

                    # Shuffle algorithm run order
                    shuffled_participants = list(participants)
                    random.shuffle(shuffled_participants)

                    for p in shuffled_participants:
                        alg = p.get("algorithm")
                        heur = p.get("heuristic")

                        # Warmup
                        wm = create_search(alg, maze, heuristic=heur)
                        wm.run_to_completion(max_expansions=config.expansion_budget)

                        # Timed runs
                        times_ms = []
                        last_res = wm
                        for _ in range(max(1, config.repeats)):
                            s = create_search(alg, maze, heuristic=heur)
                            gc_enabled = gc.isenabled()
                            try:
                                gc.disable()
                                t0 = time.perf_counter_ns()
                                s.run_to_completion(max_expansions=config.expansion_budget)
                                t1 = time.perf_counter_ns()
                            finally:
                                if gc_enabled:
                                    gc.enable()
                            times_ms.append((t1 - t0) / 1_000_000.0)
                            last_res = s

                        timing_ms = statistics.median(times_ms)
                        opt = compute_optimality(c_star, last_res.path_cost)

                        row = BenchmarkRow(
                            config_index=config_idx,
                            maze_index=k,
                            rows=sz.rows,
                            cols=sz.cols,
                            density=dens,
                            type=m_type,
                            seed=seed,
                            algorithm=alg,
                            heuristic=heur,
                            status=last_res.status,
                            expanded_count=last_res.expanded_count,
                            path_length=last_res.path_length,
                            path_cost=last_res.path_cost,
                            optimality=opt,
                            timing_ms=round(timing_ms, 3),
                        )
                        rows_data.append(row)

                    mazes_completed += 1
                    job.set_progress(
                        mazes_completed,
                        total_mazes,
                        f"Maze {mazes_completed}/{total_mazes} ({sz.rows}x{sz.cols})"
                    )

    # Statistical summary
    summary_data = generate_summary(rows_data)

    env = EnvironmentMeta(
        platform=platform.platform(),
        python_version=platform.python_version(),
        cpu_count=os.cpu_count(),
        repeats=config.repeats,
    )

    return BenchmarkResult(
        rows=rows_data,
        summary=summary_data,
        dataset_size=len(rows_data),
        environment=env,
        elapsed_s=round(time.time() - t_start, 2),
    )


def generate_summary(rows: list[BenchmarkRow]) -> list[BenchmarkSummaryRow]:
    groups = {"overall": rows}
    # Also group by size RxC
    for r in rows:
        key = f"{r.rows}x{r.cols}"
        groups.setdefault(key, []).append(r)

    summary_list: list[BenchmarkSummaryRow] = []

    for grp_name, grp_rows in groups.items():
        # group by (algorithm, heuristic)
        alg_groups = {}
        for r in grp_rows:
            k = (r.algorithm, r.heuristic)
            alg_groups.setdefault(k, []).append(r)

        best_mean_time = float("inf")
        best_std_time = 0.0

        temp_summary = []
        for (alg, heur), r_list in alg_groups.items():
            n_mazes = len(r_list)
            found_list = [x for x in r_list if x.status == "found"]
            n_found = len(found_list)

            exp_counts = [x.expanded_count for x in r_list]
            times = [x.timing_ms for x in r_list]
            opts = [x.optimality for x in found_list if x.optimality is not None]

            m_exp = statistics.mean(exp_counts) if exp_counts else 0.0
            s_exp = statistics.stdev(exp_counts) if len(exp_counts) > 1 else 0.0

            m_time = statistics.mean(times) if times else 0.0
            s_time = statistics.stdev(times) if len(times) > 1 else 0.0

            m_opt = statistics.mean(opts) if opts else None

            if m_time < best_mean_time:
                best_mean_time = m_time
                best_std_time = s_time

            temp_summary.append({
                "algorithm": alg,
                "heuristic": heur,
                "group": grp_name,
                "n_mazes": n_mazes,
                "n_found": n_found,
                "mean_expanded": round(m_exp, 2),
                "std_expanded": round(s_exp, 2),
                "mean_time_ms": round(m_time, 3),
                "std_time_ms": round(s_time, 3),
                "mean_optimality": round(m_opt, 4) if m_opt is not None else None,
            })

        for item in temp_summary:
            # Within noise: |mean - best_mean| <= std
            within_noise = abs(item["mean_time_ms"] - best_mean_time) <= max(item["std_time_ms"], best_std_time, 0.05)
            summary_list.append(BenchmarkSummaryRow(**item, within_noise_of_best=within_noise))

    return summary_list


def export_csv(result_dict: dict, table: str = "summary") -> str:
    output = io.StringIO()
    writer = csv.writer(output)

    if table == "summary":
        summary_rows = result_dict.get("summary", [])
        if summary_rows:
            headers = list(summary_rows[0].keys())
            writer.writerow(headers)
            for r in summary_rows:
                writer.writerow([r.get(h) for h in headers])
    elif table == "rows":
        rows = result_dict.get("rows", [])
        if rows:
            headers = list(rows[0].keys())
            writer.writerow(headers)
            for r in rows:
                writer.writerow([r.get(h) for h in headers])

    return output.getvalue()

