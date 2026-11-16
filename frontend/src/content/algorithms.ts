export interface AlgorithmContent {
  id: string;
  name: string;
  fullName: string;
  informed: boolean;
  idea: string;
  analogy: string;
  picksNext: string;
  structure: string;
  formulaTex: string;
  timeTex: string;
  spaceTex: string;
  shortestMoves: boolean;
  shortestCost: boolean;
  complete: boolean;
  usesHint: boolean;
  pros: string[];
  cons: string[];
  realLife: string[];
  whenToUse: string[];
  avoidWhen: string[];
  snippet: string;
}

export const ALGORITHM_LESSONS: Record<string, AlgorithmContent> = {
  bfs: {
    id: "bfs",
    name: "BFS",
    fullName: "Breadth-First Search",
    informed: false,
    idea: "Checks every cell 1 step away, then 2 steps away, expanding in concentric circles.",
    analogy: "Ripples spreading across a pond when a stone is dropped in the water.",
    picksNext: "The oldest waiting cell (first in, first out)",
    structure: "Queue (FIFO) — front to back",
    formulaTex: "f(n) = g(n)",
    timeTex: "O(V + E)",
    spaceTex: "O(V)",
    shortestMoves: true,
    shortestCost: false,
    complete: true,
    usesHint: false,
    pros: [
      "Guaranteed to find the path with fewest steps on unweighted grids",
      "Complete: always finds a route if one exists",
      "Predictable, uniform wave-front expansion",
    ],
    cons: [
      "Blind to terrain costs (treats mud and road identically)",
      "Explores in all directions equally, wasting effort on open maps",
      "High memory usage storing entire frontier rings",
    ],
    realLife: [
      "Degrees of separation / friends-of-friends in social networks",
      "Web crawlers discovering pages level by level",
      "Unweighted network hop routing",
    ],
    whenToUse: [
      "Every step has equal cost and you want the fewest steps",
      "The graph is unweighted or uniform",
    ],
    avoidWhen: [
      "Terrain weights differ (sand, water, elevation)",
      "Huge open maps where directional hints would save immense work",
    ],
    snippet: "bfs.py",
  },
  dfs: {
    id: "dfs",
    name: "DFS",
    fullName: "Depth-First Search",
    informed: false,
    idea: "Follows a single corridor to the bitter end, backtracking only when hitting a dead end.",
    analogy: "A mouse keeping its hand on the right wall to solve a maze.",
    picksNext: "The newest waiting cell (last in, first out)",
    structure: "Stack (LIFO) — top of the stack",
    formulaTex: "f(n) = -\\text{depth}(n)",
    timeTex: "O(b^m)",
    spaceTex: "O(bm)",
    shortestMoves: false,
    shortestCost: false,
    complete: true,
    usesHint: false,
    pros: [
      "Extremely low memory footprint on narrow passages",
      "Fast at finding *any* solution if lucky with corridor choice",
      "Natural fit for backtracking and puzzle state spaces",
    ],
    cons: [
      "Routes are often wildly convoluted and far from optimal",
      "Can dive down endless branches without finding the target",
      "High variance in search time depending on tie-breakers",
    ],
    realLife: [
      "Solving mazes or Sudoku puzzles by trial and backtracking",
      "Topological sorting and dependency resolution",
      "Cycle detection in directed graphs",
    ],
    whenToUse: [
      "You just need any valid route, regardless of quality",
      "Memory is severely constrained",
    ],
    avoidWhen: [
      "The route must be short or cheap",
      "The state graph has deep or infinite branches",
    ],
    snippet: "dfs.py",
  },
  ucs: {
    id: "ucs",
    name: "UCS / Dijkstra",
    fullName: "Uniform-Cost Search (Dijkstra)",
    informed: false,
    idea: "Always extends the cheapest route found so far, navigating around expensive terrain.",
    analogy: "Water finding the path of least resistance through sand and stones.",
    picksNext: "Lowest cost-so-far g(n)",
    structure: "Priority Queue ordered by cumulative cost g",
    formulaTex: "f(n) = g(n)",
    timeTex: "O((V + E) \\log V)",
    spaceTex: "O(V)",
    shortestMoves: false,
    shortestCost: true,
    complete: true,
    usesHint: false,
    pros: [
      "Guaranteed to find the mathematically cheapest route on any non-negative weights",
      "Handles varying terrain costs (sand, water, hills)",
      "Foundation of modern navigation engines",
    ],
    cons: [
      "Blind search: explores in all directions without a goal hint",
      "High memory usage storing priority queue entries",
      "Slower than A* on open maps because it radiates uniformly",
    ],
    realLife: [
      "GPS road navigation considering toll roads, speed limits, and traffic",
      "Internet packet routing protocols (OSPF, IS-IS)",
      "Flight cost optimization with layovers",
    ],
    whenToUse: [
      "Terrain or movement costs differ and you need the cheapest route",
      "No reliable heuristic estimate to the goal is available",
    ],
    avoidWhen: [
      "A good distance hint is available (A* does far less work)",
      "All moves have equal cost (BFS is faster with less overhead)",
    ],
    snippet: "ucs.py",
  },
  greedy: {
    id: "greedy",
    name: "Greedy Best-First",
    fullName: "Greedy Best-First Search",
    informed: true,
    idea: "Beelines straight toward the goal using only the distance hint h(n), ignoring cost so far.",
    analogy: "A hiker walking toward a visible mountain peak, ignoring marshes or ravines along the way.",
    picksNext: "Lowest heuristic hint h(n)",
    structure: "Priority Queue ordered by remaining distance hint h",
    formulaTex: "f(n) = h(n)",
    timeTex: "O(b^m)",
    spaceTex: "O(b^m)",
    shortestMoves: false,
    shortestCost: false,
    complete: true,
    usesHint: true,
    pros: [
      "Incredibly fast in open environments with few obstacles",
      "Checks minimal cells when an unblocked straight line exists",
      "Simple heuristic-driven guidance",
    ],
    cons: [
      "Not optimal: easily takes suboptimal detours",
      "Can get trapped in cul-de-sacs and U-shaped obstacles",
      "Ignores cumulative movement cost entirely",
    ],
    realLife: [
      "Non-player character (NPC) chasing a target in simple video games",
      "Rough robot heading towards a beacon before obstacles appear",
      "Quick greedy triage in automated planning",
    ],
    whenToUse: [
      "Speed matters far more than route quality",
      "The terrain is open with very few obstacles",
    ],
    avoidWhen: [
      "The map contains concave walls, dead ends, or traps",
      "Optimal or shortest routes are required",
    ],
    snippet: "greedy.py",
  },
  astar: {
    id: "astar",
    name: "A*",
    fullName: "A* (A-star) Search",
    informed: true,
    idea: "Balances cost so far g(n) with estimated distance remaining h(n): f(n) = g(n) + h(n).",
    analogy: "An experienced navigator choosing a highway pointed toward their destination.",
    picksNext: "Lowest total estimated cost f(n) = g(n) + h(n)",
    structure: "Priority Queue ordered by combined score f = g + h",
    formulaTex: "f(n) = g(n) + h(n)",
    timeTex: "O((V + E) \\log V)",
    spaceTex: "O(V)",
    shortestMoves: false,
    shortestCost: true,
    complete: true,
    usesHint: true,
    pros: [
      "Guaranteed optimal path when using an admissible heuristic",
      "Optimally efficient: explores the fewest nodes among all optimal informed searches",
      "Seamlessly handles weighted terrain",
    ],
    cons: [
      "Maintains all generated nodes in memory (can exhaust RAM on massive graphs)",
      "Heuristic calculation adds per-node CPU overhead",
      "Quality degrades if the heuristic overestimates (inadmissible)",
    ],
    realLife: [
      "Turn-by-turn map directions and routing engines (Google Maps)",
      "Video game character movement and RTS unit navigation",
      "Autonomous vehicle path planning and robotic arms",
    ],
    whenToUse: [
      "You need the guaranteed shortest or cheapest route fast",
      "You have an admissible heuristic (like Manhattan or Euclidean distance)",
    ],
    avoidWhen: [
      "Memory is extremely limited (consider IDA* or memory-bounded A*)",
      "The heuristic cannot be computed cheaply",
    ],
    snippet: "astar.py",
  },
  bds: {
    id: "bds",
    name: "BDS",
    fullName: "Bidirectional Search",
    informed: false,
    idea: "Runs two simultaneous search waves, one from start and one from goal, meeting in the middle.",
    analogy: "Two construction crews digging a tunnel from opposite sides of a mountain.",
    picksNext: "Alternates between forward and backward FIFO queues",
    structure: "Two FIFO Queues (Forward and Backward)",
    formulaTex: "f(n) = g_F(n) + g_B(n)",
    timeTex: "O(b^{d/2})",
    spaceTex: "O(b^{d/2})",
    shortestMoves: true,
    shortestCost: false,
    complete: true,
    usesHint: false,
    pros: [
      "Dramatically reduces explored space: O(b^(d/2)) instead of O(b^d)",
      "Finds minimum move route on unweighted grids",
      "Symmetric exploration rings from both ends",
    ],
    cons: [
      "Requires knowing the exact goal coordinate in advance",
      "Complex termination condition when the two wavefronts touch",
      "Minimizes steps rather than weighted terrain cost",
    ],
    realLife: [
      "Six degrees of separation queries between two specific people",
      "Bi-directional route planners where start and end points are fixed",
      "Graph connectivity verification",
    ],
    whenToUse: [
      "Start and goal are both known and fixed in advance",
      "Unweighted or step-count optimization is needed",
    ],
    avoidWhen: [
      "Multiple goal candidates exist",
      "Terrain costs vary significantly",
    ],
    snippet: "bds.py",
  },
};
