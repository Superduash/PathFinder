// === Maze canvas: DPI-aware, cached static layer, incremental overlays ===
export const CELL = { FLOOR: 0, WALL: 1, SAND: 2, WATER: 3 };
export const ALGO_COLORS = { bfs: '#4C9AFF', dfs: '#FF9F43', ucs: '#F2C94C', greedy: '#E86AB8', astar: '#5BD68A' };
export const INFORMED = ['greedy', 'astar'];
export const algoLabel = p => ({ astar: 'A*', greedy: 'Greedy' }[p.algorithm] || p.algorithm.toUpperCase()) + (p.heuristic && INFORMED.includes(p.algorithm) ? ` (${p.heuristic})` : '');
const FILL = ['#1C222B', '#06080B', '#3B3524', '#1B3447'];

export class MazeView {
  constructor(canvas, { editable = false, onEdit = null, label = 'Maze' } = {}) {
    Object.assign(this, { canvas, ctx: canvas.getContext('2d'), editable, onEdit, label, color: '#3DD6C6', dashed: false, maze: null, cs: 0, w: 0, dpr: 1, tool: 'wall', path: null, heatVals: null, raf: 0, counts: [0, 0, 0] });
    this.layer = document.createElement('canvas'); this.over = document.createElement('canvas'); this.heat = document.createElement('canvas');
    new ResizeObserver(() => this.resize()).observe(canvas.parentElement);
    if (editable) this.bind();
  }

  setMaze(maze) {
    this.maze = maze; this.state = new Uint8Array(maze.rows * maze.cols);
    this.path = null; this.heatVals = null; this.counts = [0, 0, 0]; this.resize(true);
  }

  resize(force) {
    if (!this.maze) return;
    const w = this.canvas.parentElement.clientWidth;
    if (!w || (w === this.w && !force)) return;
    const { rows, cols } = this.maze, dpr = window.devicePixelRatio || 1;
    this.w = w; this.dpr = dpr; this.cs = w / cols;
    this.canvas.style.width = w + 'px'; this.canvas.style.height = this.cs * rows + 'px';
    for (const c of [this.canvas, this.layer, this.over, this.heat]) { c.width = Math.round(w * dpr); c.height = Math.round(this.cs * rows * dpr); }
    this.paintStatic(); this.repaintOver(); this.paintHeat(); this.schedule();
  }

  rect(i) { const { cols } = this.maze, s = this.cs * this.dpr; return [(i % cols) * s, Math.floor(i / cols) * s, s]; }

  paintStatic() {
    const g = this.layer.getContext('2d');
    for (let i = 0; i < this.maze.cells.length; i++) this.cellStatic(i, g);
  }

  cellStatic(i, g = this.layer.getContext('2d')) {
    const [x, y, s] = this.rect(i), c = this.maze.cells[i];
    g.fillStyle = FILL[c] ?? FILL[0]; g.fillRect(x, y, s, s);
    if (c === CELL.SAND || c === CELL.WATER) { // dot pattern so terrain is not colour-only
      g.fillStyle = c === CELL.SAND ? '#7a6a3a' : '#3b78a6';
      g.fillRect(x + s * .4, y + s * .4, s * .2, s * .2);
    }
    g.strokeStyle = 'rgba(255,255,255,.05)'; g.strokeRect(x, y, s, s);
  }

  drawOver(i) {
    const g = this.over.getContext('2d'), [x, y, s] = this.rect(i), st = this.state[i];
    g.clearRect(x, y, s, s);
    if (!st) return;
    g.fillStyle = this.color; g.globalAlpha = st === 1 ? .35 : 1; g.fillRect(x + 1, y + 1, s - 2, s - 2); g.globalAlpha = 1;
    if (st === 2) { g.fillStyle = '#0E1116'; g.beginPath(); g.arc(x + s / 2, y + s / 2, s * .16, 0, 7); g.fill(); }
  }

  repaintOver() { this.over.getContext('2d').clearRect(0, 0, this.over.width, this.over.height); this.state?.forEach((st, i) => st && this.drawOver(i)); }

  /** Set one cell's overlay state: 0 none, 1 explored, 2 frontier. Only that cell is redrawn. */
  mark(i, st) { this.counts[this.state[i]]--; this.counts[st]++; this.state[i] = st; this.drawOver(i); this.schedule(); }
  setPath(p) { this.path = p; this.schedule(); }
  clearOverlay() { this.state.fill(0); this.counts = [0, 0, 0]; this.path = null; this.repaintOver(); this.schedule(); }

  setHeat(vals) { this.heatVals = vals; this.paintHeat(); this.schedule(); }
  paintHeat() {
    const g = this.heat.getContext('2d'); g.clearRect(0, 0, this.heat.width, this.heat.height);
    const v = this.heatVals; if (!v) return;
    const nums = v.filter(x => x != null), lo = Math.min(...nums), hi = Math.max(...nums) || 1;
    v.forEach((x, i) => { if (x == null) return; const [px, py, s] = this.rect(i); g.fillStyle = `rgba(255,159,67,${.1 + .7 * (x - lo) / ((hi - lo) || 1)})`; g.fillRect(px, py, s, s); });
  }

  schedule() { if (!this.raf) this.raf = requestAnimationFrame(() => { this.raf = 0; this.compose(); }); }

  compose() {
    if (!this.maze) return;
    const g = this.ctx, { cols } = this.maze;
    g.clearRect(0, 0, this.canvas.width, this.canvas.height);
    g.drawImage(this.layer, 0, 0); if (this.heatVals) g.drawImage(this.heat, 0, 0); g.drawImage(this.over, 0, 0);
    const mid = i => { const [x, y, s] = this.rect(i); return [x + s / 2, y + s / 2, s]; };
    if (this.path?.length > 1) {
      const s = this.cs * this.dpr;
      g.lineJoin = g.lineCap = 'round'; g.beginPath();
      this.path.forEach((i, k) => { const [x, y] = mid(i); k ? g.lineTo(x, y) : g.moveTo(x, y); });
      g.setLineDash(this.dashed ? [s * .5, s * .35] : []);
      g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = s * .42; g.stroke();
      g.strokeStyle = this.color; g.lineWidth = s * .26; g.stroke(); g.setLineDash([]);
    }
    const { start, goal } = this.maze, [sx, sy, s] = mid(start[0] * cols + start[1]), [gx, gy] = mid(goal[0] * cols + goal[1]);
    g.fillStyle = '#E6EAF0'; g.beginPath(); g.arc(sx, sy, s * .4, 0, 7); g.fill();
    g.beginPath(); g.moveTo(gx, gy - s * .46); g.lineTo(gx + s * .46, gy); g.lineTo(gx, gy + s * .46); g.lineTo(gx - s * .46, gy); g.closePath(); g.fillStyle = '#FF6B6B'; g.fill();
    g.fillStyle = '#0E1116'; g.font = `bold ${s * .5}px system-ui`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('S', sx, sy + 1); g.fillText('G', gx, gy + 1);
    this.canvas.setAttribute('aria-label', `${this.label}: ${this.maze.rows}×${this.maze.cols} maze, ${this.counts[1]} explored, ${this.counts[2]} frontier${this.path?.length ? ', path drawn' : ''}`);
  }

  // --- editing (mouse + touch via pointer events) ---
  bind() {
    const c = this.canvas; c.style.touchAction = 'none';
    let down = false, dirty = false;
    const at = e => { const r = c.getBoundingClientRect(), { rows, cols } = this.maze; const col = Math.floor((e.clientX - r.left) / r.width * cols), row = Math.floor((e.clientY - r.top) / r.height * rows); return col < 0 || row < 0 || col >= cols || row >= rows ? -1 : row * cols + col; };
    c.addEventListener('pointerdown', e => { if (!this.maze) return; down = true; c.setPointerCapture(e.pointerId); dirty = this.edit(at(e)) || dirty; });
    c.addEventListener('pointermove', e => { if (down) dirty = this.edit(at(e)) || dirty; });
    const up = () => { down = false; if (dirty) { dirty = false; this.onEdit?.(); } };
    c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up);
  }

  /** Applies one painted edit (not algorithm logic). Returns true when the maze changed. */
  edit(i) {
    if (i < 0) return false;
    const m = this.maze, { cols } = m, rc = [Math.floor(i / cols), i % cols];
    const isS = m.start[0] === rc[0] && m.start[1] === rc[1], isG = m.goal[0] === rc[0] && m.goal[1] === rc[1];
    const codes = { wall: 1, erase: 0, sand: 2, water: 3 };
    if (this.tool in codes) {
      if (isS || isG || m.cells[i] === codes[this.tool]) return false;
      m.cells[i] = codes[this.tool]; this.cellStatic(i);
    } else {
      const key = this.tool, other = key === 'start' ? isG : isS, cur = m[key];
      if (other || (cur[0] === rc[0] && cur[1] === rc[1])) return false;
      m.cells[i] = 0; m[key] = rc; this.cellStatic(i); this.cellStatic(cur[0] * cols + cur[1]);
    }
    this.schedule(); return true;
  }
}
