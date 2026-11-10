// === Race controller: state machine, tick loop, delta application ===
import { MazeView, ALGO_COLORS, INFORMED, algoLabel } from './maze-canvas.js';
import { el, icons, rid, fmt } from './api.js';

export const SPEEDS = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55];
const BADGE = { idle: ['clock', 'Waiting'], running: ['loader-circle', 'Running'], found: ['check', 'Found'], failed: ['x', 'Failed'] };
const FIELDS = [['expanded', 'Expanded'], ['frontier', 'Frontier'], ['peak_frontier', 'Peak frontier'], ['path_length', 'Path length'], ['path_cost', 'Path cost'], ['optimality', 'Optimality'], ['compute_ms', 'Server compute ms (indicative)'], ['rank', 'Rank']];

export class RaceController {
  /** opts: mount, cards?, getSpeed, onState, onError, say, loop */
  constructor(socket, opts) {
    this.socket = socket; this.o = opts; this.state = 'idle'; this.views = {}; this.cards = {}; this.inflight = false; this.once = false; this.hold = false;
    socket.on('race.ready', m => this.onReady(m)).on('race.update', m => this.onUpdate(m)).on('race.summary', m => this.onSummary(m)).on('error', m => this.onError(m));
    socket.onState(s => this.onSocket(s));
  }

  setState(s) { this.state = s; this.o.onState?.(s); }
  say(t) { this.o.say?.(t); }
  get active() { return this.state !== 'idle'; }

  init(maze, parts) {
    this.maze = maze; this.parts = parts; this.raceId = null; this.build();
    this.setState('initing'); this.pending = true;
    this.socket.isOpen() ? this.sendInit() : this.socket.connect();
  }

  sendInit() {
    this.pending = false;
    this.socket.send({ type: 'race.init', requestId: rid(), maze: this.maze, participants: this.parts.map(({ id, algorithm, heuristic }) => INFORMED.includes(algorithm) ? { id, algorithm, heuristic } : { id, algorithm }), options: { expansion_budget: null } });
  }

  build() {
    this.o.mount.replaceChildren(); if (this.o.cards) this.o.cards.replaceChildren();
    this.views = {}; this.cards = {}; this.sets = {};
    this.parts.forEach((p, n) => {
      const canvas = el('canvas', { role: 'img', 'aria-label': algoLabel(p) }), name = algoLabel(p);
      this.o.mount.append(el('figure', { class: 'panel' }, el('figcaption', {}, name), el('div', { class: 'canvas-wrap' }, canvas)));
      const v = new MazeView(canvas, { label: name });
      v.color = ALGO_COLORS[p.algorithm]; v.dashed = this.parts.findIndex(q => q.algorithm === p.algorithm) !== n;
      v.setMaze(structuredClone(this.maze)); this.views[p.id] = v;
      if (this.o.cards) this.cards[p.id] = this.card(p, name);
    });
    icons();
  }

  card(p, name) {
    const badge = el('span', { class: 'badge' }), q = {};
    const dl = el('dl', {}, FIELDS.map(([k, t]) => [el('dt', {}, t), (q[k] = el('dd', {}, '—'))]));
    const a = el('article', { class: 'card stat', style: `border-top:3px solid ${ALGO_COLORS[p.algorithm]}` }, el('header', {}, el('h3', {}, name), badge), dl);
    this.o.cards.append(a); const c = { badge, q }; this.badge(c, 'idle'); return c;
  }

  badge(c, s) { const [i, t] = BADGE[s] || BADGE.idle; c.badge.replaceChildren(el('i', { 'data-lucide': i }), t); c.badge.dataset.s = s; icons(); }

  onReady(m) {
    this.raceId = m.raceId; this.finished = false;
    for (const p of m.participants) { const v = this.views[p.id]; if (!v) continue; (m.initial?.[p.id]?.discovered || []).forEach(i => v.mark(i, 2)); if (this.cards[p.id]) this.badge(this.cards[p.id], 'running'); }
    this.optimal = m.optimal_cost; this.reachable = m.reachable;
    this.setState('ready'); this.o.onReady?.(m);
    if (!m.reachable) this.say('Goal unreachable — all algorithms will exhaust the search.');
    if (this.o.autorun || this.o.loop) this.run();
  }

  run() { if (!this.raceId || this.state === 'finished') return; this.setState('running'); this.requestStep(); }
  pause() { if (this.state === 'running') this.setState('paused'); }
  resume() { if (this.state === 'paused') this.run(); }
  step() { if (['ready', 'paused'].includes(this.state)) { this.once = true; this.requestStep(true); } }

  /** Exactly one race.step in flight; the next one is sent after the update has been drawn. */
  requestStep(force) {
    if (this.inflight || !this.raceId || (!force && this.state !== 'running')) return;
    this.inflight = true; this.sentAt = performance.now();
    if (!this.socket.send({ type: 'race.step', requestId: rid(), raceId: this.raceId, expansions: SPEEDS[(this.o.getSpeed?.() ?? 5) - 1] })) this.inflight = false;
  }

  onUpdate(m) {
    for (const [id, u] of Object.entries(m.participants)) {
      const v = this.views[id]; if (!v) continue;
      u.discovered.forEach(i => v.state[i] !== 1 && v.mark(i, 2)); u.expanded.forEach(i => v.mark(i, 1)); // changed cells only
      if (u.path?.length) v.setPath(u.path);
      this.stats(id, u);
    }
    this.inflight = false;
    if (m.finished) { this.finished = true; this.setState('finished'); return; }
    if (this.once) { this.once = false; return; }
    if (this.state === 'running') setTimeout(() => this.requestStep(), Math.max(0, 33 - (performance.now() - this.sentAt)));
  }

  stats(id, u) {
    const c = this.cards[id]; if (!c) return;
    const s = u.stats || {}, prev = c.status; this.badge(c, u.status);
    const set = { expanded: s.expanded, frontier: s.frontier, peak_frontier: s.peak_frontier, compute_ms: s.compute_ms };
    if (u.status !== 'running') Object.assign(set, { path_length: s.path_length, path_cost: s.path_cost, optimality: s.optimality == null ? null : +s.optimality.toFixed(3) });
    for (const [k, v] of Object.entries(set)) c.q[k].textContent = fmt(v, 2);
    if (u.status === 'failed') c.q.path_length.textContent = u.reason === 'no_path' ? 'no path (unreachable)' : (u.reason || 'failed');
    if (u.status !== 'running' && prev !== u.status) { c.status = u.status; const p = this.parts.find(x => x.id === id); this.say(u.status === 'found' ? `${algoLabel(p)} found a path, cost ${fmt(s.path_cost)}, ${s.expanded} expansions` : `${algoLabel(p)} failed: ${u.reason}`); }
  }

  onSummary(m) {
    m.ranking.forEach(r => { const c = this.cards[r.id]; if (c) c.q.rank.textContent = '#' + r.rank; });
    const w = m.ranking.find(r => r.id === m.winner), p = w && this.parts.find(x => x.id === w.id);
    this.o.onSummary?.(p ? `Winner by search effort: ${algoLabel(p)} with ${w.expanded} expansions (cost ${fmt(w.path_cost)}).` : 'No winner: every participant failed (goal unreachable).');
    if (this.o.loop) setTimeout(() => { if (!this.hold && this.state === 'finished') this.replay(); }, 2500);
  }

  replay() { this.socket.send({ type: 'race.reset', raceId: this.raceId }); this.init(this.maze, this.parts); }
  restart() { this.init(this.maze, this.parts); }

  reset() {
    if (this.raceId) this.socket.send({ type: 'race.reset', raceId: this.raceId });
    this.raceId = null; this.inflight = false; this.once = false; this.pending = false; this.o.mount.replaceChildren(); this.o.cards?.replaceChildren(); this.setState('idle');
  }

  onError(m) {
    const t = `${m.error?.code}: ${m.error?.message}`; this.inflight = false;
    this.o.onError?.(t); if (this.state === 'initing') this.reset();
  }

  onSocket(s) {
    if (s === 'open' && this.pending) this.sendInit();
    if (s === 'closed' && this.active && this.state !== 'finished') { this.inflight = false; this.pending = false; this.setState('disconnected'); this.say('Connection lost. The race was discarded.'); }
  }
}
