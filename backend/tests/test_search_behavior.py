"""Test search algorithm behavior with diagonal moves and heuristics (polish5.md Phase 1.2)."""
import pytest
from backend.app.maze.generators import generate
from backend.app.search.algorithms import create_search


def test_astar_octile_optimal_with_diagonals():
    """A* with octile heuristic should match UCS cost on 100 diagonal mazes."""
    failures = []
    
    for seed in range(100):
        maze = generate(
            type="loops",
            rows=15,
            cols=15,
            diagonal=True,
            weighted=True,
            weight_fraction=0.25,
            seed=seed + 1000,
            ensure_solvable_flag=True,
        )
        
        # Run UCS (optimal)
        ucs = create_search("ucs", maze).run_to_completion()
        if ucs.status != "found":
            continue
        
        # Run A* with octile
        astar_octile = create_search("astar", maze, heuristic="octile").run_to_completion()
        
        # A* with octile should be optimal
        if astar_octile.status == "found":
            if abs(astar_octile.path_cost - ucs.path_cost) > 1e-9:
                failures.append({
                    "seed": seed + 1000,
                    "ucs_cost": ucs.path_cost,
                    "astar_octile_cost": astar_octile.path_cost,
                    "diff": abs(astar_octile.path_cost - ucs.path_cost),
                })
    
    if failures:
        print(f"\nA* octile non-optimal in {len(failures)}/100 cases:")
        for f in failures[:5]:  # Print first 5
            print(f"  Seed {f['seed']}: UCS={f['ucs_cost']:.2f}, A*={f['astar_octile_cost']:.2f}, diff={f['diff']:.4f}")
    
    # Should be zero failures (octile is admissible with diagonals)
    assert len(failures) == 0, f"A* octile was non-optimal in {len(failures)} cases"


def test_astar_manhattan_with_diagonals_info():
    """Informational test: count cases where A* manhattan is suboptimal with diagonals."""
    suboptimal_count = 0
    total_tested = 0
    
    for seed in range(100):
        maze = generate(
            type="loops",
            rows=15,
            cols=15,
            diagonal=True,
            weighted=True,
            weight_fraction=0.25,
            seed=seed + 2000,
            ensure_solvable_flag=True,
        )
        
        # Run UCS (optimal)
        ucs = create_search("ucs", maze).run_to_completion()
        if ucs.status != "found":
            continue
        
        total_tested += 1
        
        # Run A* with manhattan
        astar_manhattan = create_search("astar", maze, heuristic="manhattan").run_to_completion()
        
        # Check if suboptimal
        if astar_manhattan.status == "found":
            if astar_manhattan.path_cost > ucs.path_cost + 1e-9:
                suboptimal_count += 1
    
    print(f"\nA* manhattan suboptimal with diagonals: {suboptimal_count}/{total_tested} cases ({100*suboptimal_count/max(1,total_tested):.1f}%)")
    # No assertion - this is informational only
