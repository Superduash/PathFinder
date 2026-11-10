// === Entry point: store, router, connection, visualizer wiring, landing, about ===
import { request, post, ApiError, RaceSocket, el, icons } from './api.js';
import { MazeView, ALGO_COLORS, INFORMED, algoLabel } from './maze-canvas.js';
import { RaceController, SPEEDS } from './race.js';
import { initBenchmark, initML } from './lab.js';

const $ = id => document.getElementById(id);
export const store = { maze: null, meta: null, health: null, conn: 'connecting', parts: [] };

export function toast(msg, kind = 'info') {
  const t = el('div', { class: 'toast ' + kind, role: 'status' }, msg); $('toasts').append(t); setTimeout(() => t.remove(), 4500);
}
export const errText = e => e instanceof ApiError ? `${e.code}: ${e.message}` : String(e?.message || e);

/** Disables a button while fn runs; shows errors inline and as a toast. */
export async function guarded(btn, fn, errEl) {
  if (btn) btn.disabled = true; if (errEl) errEl.textContent = '';
  try { return await fn(); } catch (e) { const t = errText(e); if (errEl) errEl.textContent = t; toast(t, 'error'); }
  finally { if (btn) btn.disabled = btn.hasAttribute('data-needs-backend') && store.conn !== 'connected'; }
}

// --- connection -----------------------------------------------------------
function setConn(c) {
  store.conn = c; $('conn').dataset.s = c;
  $('conn-text').textContent = { connected: 'Connected', connecting: 'Connecting…', disconnected: 'Disconnected' }[c];
  $('retry').hidden = c !== 'disconnected'; $('banner').hidden = c !== 'disconnected';
  document.querySelectorAll('[data-needs-backend]').forEach(b => { b.disabled = c !== 'connected'; b.title = c === 'connected' ? '' : 'Requires the backend'; });
  $('hero-static').hidden = c === 'connected'; $('hero-mount').hidden = c !== 'connected';
}

async function connect() {
  setConn('connecting');
  try {
    store.health = await request('/health'); setConn('connected'); $('ver').textContent = `v${store.health.version} · Python ${store.health.python}`;
    if (!store.meta) await loadMeta();
    heroDemo();
  } catch { setConn('disconnected'); }
}

// --- meta, about, landing cards ---------------------------------------------
async function loadMeta() {
  const m = store.meta = await request('/meta'), d = m.defaults || {};
  store.parts = m.algorithms.map((a, i) => ({ id: 'p' + (i + 1), algorithm: a.key, heuristic: INFORMED.includes(a.key) ? 'manhattan' : undefined, on: ['bfs', 'astar'].includes(a.key) }));
  $('v-preset').replaceChildren(...m.presets.map(p => el('option', { value: p.key, title: p.description }, p.name)));
  $('algo-cards').replaceChildren(...m.algorithms.map(a => el('article', { class: 'card', style: `border-top:3px solid ${ALGO_COLORS[a.key]}` }, el('h3', {}, a.name), el('span', { class: 'badge' }, a.informed ? 'Informed' : 'Uninformed'),
    el('p', {}, a.description), el('p', { class: 'muted' }, `${a.optimal ? 'Optimal' : 'Not optimal'} · time ${a.time_complexity}`))));
  $('about-algos').replaceChildren(...m.algorithms.map(a => el('div', {}, el('h3', {}, a.name), el('p', {}, a.description), el('p', { class: 'muted' }, `Data structure: ${a.data_structure} · time ${a.time_complexity} · space ${a.space_complexity} · ${a.optimal_note || ''}`),
    el('p', {}, 'Pros: ', (a.pros || []).join('; '), '. Cons: ', (a.cons || []).join('; '), '.'))));
  $('about-heur').replaceChildren(el('table', {}, el('thead', {}, el('tr', {}, ['Heuristic', 'Formula', 'Admissible', 'Needs diagonal', 'Note'].map(h => el('th', {}, h)))),
    el('tbody', {}, m.heuristics.map(h => el('tr', {}, [h.name, h.formula, h.admissible ? 'Yes' : 'No', h.requires_diagonal ? 'Yes' : 'No', h.note].map(x => el('td', {}, x)))))));
  if (d.speed) { $('r-speed').value = d.speed; syncSpeed(); }
  renderParts(); await generate(); icons();
}

// --- router ---------------------------------------------------------------
const VIEWS = ['home', 'visualizer', 'benchmark', 'ml', 'about'];
const current = () => VIEWS.find(v => v === (location.hash.replace('#/', '') || 'home')) || 'home';
function route() {
  const v = current();
  document.querySelectorAll('[data-view]').forEach(s => { s.hidden = s.dataset.view !== v; });
  document.querySelectorAll('[data-nav]').forEach(a => a.toggleAttribute('aria-current', a.dataset.nav === v));
  hero.hold = v !== 'home'; if (v === 'home' && hero.state === 'paused') hero.resume();
  if (v !== 'home' && hero.state === 'running') hero.pause();
  if (v === 'visualizer') editView?.resize(true);
  document.title = `PathFinder — ${v}`;
  $('main').focus?.(); window.scrollTo(0, 0);
}

// --- visualizer -------------------------------------------------------------
let editView, race;
const speedK = () => SPEEDS[+$('r-speed').value - 1];
function syncSpeed() { $('o-speed').textContent = $('r-speed').value; $('o-k').textContent = speedK(); }

function renderParts() {
  const diag = $('v-diag').checked, hs = (store.meta?.heuristics || []).filter(h => h.key !== 'learned' && (diag || !h.requires_diagonal));
  const box = $('algo-list'); box.replaceChildren();
  store.parts.forEach(p => {
    if (INFORMED.includes(p.algorithm) && !hs.some(h => h.key === p.heuristic)) p.heuristic = 'manhattan';
    const name = store.meta.algorithms.find(a => a.key === p.algorithm).name;
    const cb = el('input', { type: 'checkbox', id: 'a-' + p.id, ...(p.on ? { checked: '' } : {}) });
    cb.addEventListener('change', () => { p.on = cb.checked; renderParts(); });
    const row = el('div', { class: 'algo-row' }, el('i', { class: 'sw', style: `background:${ALGO_COLORS[p.algorithm]}` }), el('label', { for: 'a-' + p.id }, cb, ' ', name));
    if (INFORMED.includes(p.algorithm)) {
      const sel = el('select', { 'aria-label': name + ' heuristic' }, hs.map(h => el('option', { value: h.key, ...(h.key === p.heuristic ? { selected: '' } : {}) }, h.name)));
      sel.addEventListener('change', () => { p.heuristic = sel.value; renderParts(); });
      row.append(sel, el('button', { class: 'btn sm', title: `Add ${name} variant with another heuristic`, onclick: () => { const used = store.parts.filter(q => q.algorithm === p.algorithm).map(q => q.heuristic), nh = hs.find(h => !used.includes(h.key)); if (!nh) return toast('No more heuristics to add', 'info'); store.parts.splice(store.parts.indexOf(p) + 1, 0, { id: 'p' + Date.now(), algorithm: p.algorithm, heuristic: nh.key, on: true, variant: true }); renderParts(); } }, '+ variant'));
    }
    if (p.variant) row.append(el('button', { class: 'btn sm', 'aria-label': 'Remove variant', onclick: () => { store.parts.splice(store.parts.indexOf(p), 1); renderParts(); } }, '×'));
    box.append(row);
  });
  $('diag-warn').hidden = !(diag && store.parts.some(p => p.on && p.heuristic === 'manhattan'));
}

function setMaze(maze, reachable) {
  store.maze = maze; editView.setMaze(maze); if (maze.seed != null) $('v-seed').value = maze.seed;
  $('unreach').hidden = reachable !== false;
}

async function generate() {
  const body = { rows: +$('v-rows').value, cols: +$('v-cols').value, type: $('v-type').value, density: +$('v-density').value / 100, diagonal: $('v-diag').checked,
    weighted: { enabled: $('v-weighted').checked, terrain_fraction: +$('v-tfrac').value / 100 }, randomize_endpoints: true, ensure_solvable: true };
  if ($('v-seed').value !== '') body.seed = +$('v-seed').value;
  const r = await post('/maze/generate', body); setMaze(r.maze, r.reachable);
}

function bindVisualizer() {
  editView = new MazeView($('edit-canvas'), { editable: true, label: 'Maze editor', onEdit: () => { $('unreach').hidden = true; } });
  for (const [id, out] of [['v-rows', 'o-rows'], ['v-cols', 'o-cols'], ['v-density', 'o-dens'], ['v-tfrac', 'o-tfrac']]) $(id).addEventListener('input', () => { $(out).textContent = $(id).value; });
  $('v-density').disabled = false;
  $('v-type').addEventListener('change', () => { $('v-density').disabled = $('v-type').value !== 'random'; });
  $('v-diag').addEventListener('change', renderParts);
  $('v-newseed').addEventListener('click', () => { $('v-seed').value = Math.floor(Math.random() * 1e6); });
  $('v-gen').addEventListener('click', () => guarded($('v-gen'), generate, $('v-error')));
  $('v-load').addEventListener('click', () => guarded($('v-load'), async () => { const r = await post('/maze/preset', { name: $('v-preset').value }); setMaze(r.maze, r.reachable); }, $('v-error')));
  $('v-rand').addEventListener('click', () => guarded($('v-rand'), async () => { const r = await post('/maze/randomize-endpoints', { maze: store.maze, ensure_solvable: true }); setMaze(r.maze, r.reachable); }, $('v-error')));
  $('v-clrwalls').addEventListener('click', () => { if (store.maze) { store.maze.cells = store.maze.cells.map(c => (c === 1 ? 0 : c)); editView.setMaze(store.maze); } });
  $('v-clrterr').addEventListener('click', () => { if (store.maze) { store.maze.cells = store.maze.cells.map(c => (c >= 2 ? 0 : c)); editView.setMaze(store.maze); } });
  $('tools').addEventListener('click', e => { const b = e.target.closest('[data-tool]'); if (!b) return; editView.tool = b.dataset.tool; document.querySelectorAll('#tools button').forEach(x => x.setAttribute('aria-pressed', x === b)); });
  $('r-speed').addEventListener('input', syncSpeed);
  $('r-start').addEventListener('click', startRace); $('r-pause').addEventListener('click', pauseResume);
  $('r-step').addEventListener('click', stepRace); $('r-reset').addEventListener('click', () => race.reset()); $('r-restart').addEventListener('click', () => race.restart());
}

function raceParts() { return store.parts.filter(p => p.on).slice(0, store.meta?.limits?.race_max_participants || 5).map(({ id, algorithm, heuristic }) => ({ id, algorithm, heuristic })); }

function startRace() {
  if (race.state === 'paused') return race.resume();
  if (race.state === 'ready' || race.state === 'finished') return race.state === 'ready' ? race.run() : null;
  const parts = raceParts(); if (!parts.length) return toast('Select at least one algorithm.', 'error');
  $('summary').textContent = ''; race.o.autorun = true; race.init(store.maze, parts);
}
function pauseResume() { race.state === 'running' ? race.pause() : race.resume(); }
function stepRace() { if (race.state === 'idle') { const parts = raceParts(); if (!parts.length) return; race.o.autorun = false; $('summary').textContent = ''; race.init(store.maze, parts); } else race.step(); }

function onRaceState(s) {
  const busy = s !== 'idle';
  $('edit-wrap').hidden = busy; $('race-mount').hidden = !busy;
  $('maze-fs').disabled = $('tools-fs').disabled = $('algo-fs').disabled = busy;
  $('r-start').disabled = ['initing', 'running', 'finished', 'disconnected'].includes(s);
  $('r-pause').disabled = !['running', 'paused'].includes(s); $('r-pause').lastChild.textContent = s === 'paused' ? ' Resume' : ' Pause';
  $('r-step').disabled = ['initing', 'running', 'finished', 'disconnected'].includes(s);
  $('r-restart').hidden = s !== 'disconnected';
  $('race-status').textContent = { initing: 'Starting race…', running: 'Race running', paused: 'Race paused', finished: 'Race finished', disconnected: 'Disconnected — race discarded' }[s] || '';
  if (s === 'idle') $('summary').textContent = '';
  if (s === 'idle') editView.resize(true);
}

// --- landing hero (a real race from the backend; never simulated here) ---------
let hero;
async function heroDemo() {
  if (hero.raceId || hero.state === 'initing') return;
  try {
    const r = await post('/maze/generate', { rows: 15, cols: 15, type: 'random', density: 0.2, seed: 7, randomize_endpoints: true, ensure_solvable: true });
    hero.init(r.maze, [{ id: 'h1', algorithm: 'bfs' }, { id: 'h2', algorithm: 'astar', heuristic: 'manhattan' }]);
  } catch { /* static illustration stays visible */ }
}

// --- boot -----------------------------------------------------------------------
function boot() {
  const sock = new RaceSocket(), heroSock = new RaceSocket();
  sock.onState(s => { if (s === 'open' && store.conn !== 'connected') connect(); });
  race = new RaceController(sock, { mount: $('race-mount'), cards: $('cards'), getSpeed: () => +$('r-speed').value, onState: onRaceState, say: t => { $('race-status').textContent = t; },
    onError: t => { toast(t, 'error'); $('v-error').textContent = t; }, onSummary: t => { $('summary').textContent = t; }, onReady: m => { $('unreach').hidden = m.reachable !== false; } });
  hero = new RaceController(heroSock, { mount: $('hero-mount'), getSpeed: () => 4, loop: true });
  bindVisualizer(); initBenchmark(); initML(); syncSpeed();
  $('retry').addEventListener('click', connect);
  $('how-btn').addEventListener('click', () => $('how').scrollIntoView({ behavior: 'smooth' }));
  addEventListener('hashchange', route);
  addEventListener('keydown', e => {
    if (current() !== 'visualizer' || e.ctrlKey || e.metaKey || e.altKey) return;
    if (/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
    if (e.key === ' ') { e.preventDefault(); race.state === 'idle' || race.state === 'ready' ? startRace() : pauseResume(); }
    else if (e.key.toLowerCase() === 's') stepRace();
    else if (e.key.toLowerCase() === 'r') race.reset();
    else if (/^[1-5]$/.test(e.key) && !race.active) { const base = store.parts.filter(p => !p.variant)[+e.key - 1]; if (base) { base.on = !base.on; renderParts(); } }
  });
  icons(); route(); connect();
}
boot();
