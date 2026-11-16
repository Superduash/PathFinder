# PathFinder Contract Notes

## 1. Neighbour Exploration Order
The canonical search engine moves in the following deterministic order:
1. **Up**: `(-1, 0)`
2. **Down**: `(1, 0)`
3. **Left**: `(0, -1)`
4. **Right**: `(0, 1)`

*(Followed by diagonal moves if diagonals are enabled: Up-Left, Up-Right, Down-Left, Down-Right).*

> **Note on polish3.md reference:** While early notes in polish3 informally mentioned "up, right, down, left", the implemented and tested contract across all engine algorithms and Python snippets is strictly **up, down, left, right**.

## 2. Race Ranking Rule
Race results are ranked deterministically with no invented scores:
1. **Shortest route first**: racers with route quality $C^* / C \ge 1 - 10^{-9}$ (shortest route found).
2. **Fewest cells checked**: among racers with equal route status, fewer expanded nodes rank higher.
3. **Cheapest route cost**: if neither racer is optimal, the cheaper route cost ranks higher.
4. Racers that failed to find any route are placed at the bottom.
