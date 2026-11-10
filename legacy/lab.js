// === Shared lab helpers ===
import { request, post, pollJob, downloadCsv, el, icons, fmt } from './api.js';
import { store, toast, errText, guarded } from './app.js';
import { MazeView, ALGO_COLORS, algoLabel } from './maze-canvas.js';

const $ = id => document.getElementById(id);
const num = id => Number($(id).value);
const OPTS = [{ algorithm: 'bfs' }, { algorithm: 'dfs' }, { algorithm: 'ucs' }, { algorithm: 'greedy', heuristic: 'manhattan' }, { algorithm: 'astar', heuristic: 'manhattan' }, { algorithm: 'astar', heuristic: 'euclidean' }];
const optKey = o => o.algorithm + (o.heuristic || '');
let charts = {};

function table(cols, rows) {
  return el('table', {}, el('thead', {}, el('tr', {}, cols.map(c => el('th', { scope: 'col' }, c.h)))), el('tbody', {}, rows.map(r => el('tr', {}, cols.map(c => el('td', {}, c.get(r)))))));
}
function checks(box, items, labelOf, on = () => true) {
  box.replaceChildren(...items.map((it, i) => el('label', { class: 'inline' }, el('input', { type: 'checkbox', 'data-i': i, ...(on(it) ? { checked: '' } : {}) }), labelOf(it))));
}
const picked = (box, items) => [...box.querySelectorAll('input:checked')].map(i => items[+i.dataset.i]);
const kv = o => el('dl', { class: 'kv' }, Object.entries(o).map(([k, v]) => [el('dt', {}, k), el('dd', {}, fmt(v, 3))]));

/** Runs a job to completion, driving a progress element; returns the job's result. */
async function runJob(path, body, prog, label) {
  prog.hidden = false; prog.removeAttribute('value'); label.textContent = 'Queued…';
  const { jobId } = await post(path, body);
  const job = await pollJob(jobId, j => { const p = j.progress; if (p?.total) { prog.max = p.total; prog.value = p.done; } label.textContent = `${j.status}${p?.label ? ' · ' + p.label : ''}`; });
  prog.hidden = true;
  if (job.status === 'error') throw Object.assign(new Error(job.error?.message || 'Job failed'), { code: job.error?.code });
  return { job, jobId };
}

// === Benchmark ===
let bench = { jobId: null, sort: ['algorithm', 1], page: 0, res: null, running: null };

export function initBenchmark() {
  checks($('cmp-algos'), OPTS, algoLabel, o => ['bfs', 'astar'].includes(o.algorithm) && o.heuristic !== 'euclidean');
  checks($('b-algos'), OPTS, algoLabel, o => ['bfs', 'astarmanhattan'].includes(optKey(o)));
  checks($('b-sizes'), [15, 30, 50], n => `${n}×${n}`, n => n !== 50);
  checks($('b-types'), ['random', 'backtracker', 'braided'], t => t, t => t !== 'backtracker');
  $('cmp-run').addEventListener('click', () => guarded($('cmp-run'), runCompare, $('cmp-err')));
  $('b-form').addEventListener('submit', e => { e.preventDefault(); guarded($('b-run'), runBatch, $('b-err')); });
  $('b-cancel').addEventListener('click', () => bench.running && post(`/jobs/${bench.running}/cancel`).then(() => toast('Cancelling…')).catch(e => toast(errText(e), 'error')));
  $('csv-sum').addEventListener('click', () => bench.jobId && downloadCsv(bench.jobId, 'summary').catch(e => toast(errText(e), 'error')));
  $('csv-rows').addEventListener('click', () => bench.jobId && downloadCsv(bench.jobId, 'rows').catch(e => toast(errText(e), 'error')));
  $('pg-prev').addEventListener('click', () => { bench.page = Math.max(0, bench.page - 1); renderRows(); });
  $('pg-next').addEventListener('click', () => { bench.page++; renderRows(); });
  window.addEventListener('hashchange', () => { if (location.hash === '#/benchmark') showThumb(); });
}

function showThumb() {
  if (!store.maze) return;
  const v = new MazeView($('cmp-thumb'), { label: 'Current maze' }); v.setMaze(structuredClone(store.maze));
}

async function runCompare() {
  const parts = picked($('cmp-algos'), OPTS).map((o, i) => ({ id: 'c' + i, ...o }));
  if (!parts.length) throw new Error('Select at least one algorithm.');
  const r = await post('/compare', { maze: store.maze, participants: parts, repeats: num('cmp-repeats') });
  $('cmp-out').replaceChildren(r.reachable ? '' : el('p', { class: 'warn' }, 'Goal unreachable — all algorithms exhausted the search.'), table([
    { h: 'Algorithm', get: x => algoLabel(x) }, { h: 'Status', get: x => x.status + (x.reason ? ` (${x.reason})` : '') }, { h: 'Expanded', get: x => fmt(x.expanded) },
    { h: 'Path cost', get: x => fmt(x.path_cost) }, { h: 'Optimality', get: x => fmt(x.optimality, 3) },
    { h: 'Time ms (median ± std)', get: x => `${fmt(x.time_ms?.median, 3)} ± ${fmt(x.time_ms?.std, 3)}` }, { h: 'Repeats', get: x => fmt(x.time_ms?.repeats) }], r.results));
  toast('Comparison complete', 'success');
}

function parseSizes() {
  const sizes = picked($('b-sizes'), [15, 30, 50]).map(n => [n, n]);
  for (const m of $('b-custom').value.matchAll(/(\d+)\s*x\s*(\d+)/gi)) sizes.push([+m[1], +m[2]]);
  return sizes;
}

async function runBatch() {
  const dens = $('b-dens').value.split(',').map(s => parseFloat(s)).filter(x => !isNaN(x));
  const cfg = { sizes: parseSizes(), densities: dens, types: picked($('b-types'), ['random', 'backtracker', 'braided']), weighted: { enabled: false, terrain_fraction: 0.25 }, diagonal: false,
    mazes_per_config: num('b-per'), algorithms: picked($('b-algos'), OPTS), repeats: num('b-rep'), base_seed: num('b-seed'), ensure_solvable: $('b-solv').checked,
    expansion_budget: $('b-budget').value ? num('b-budget') : null, group_by: ['size'] };
  if (!cfg.sizes.length || !cfg.types.length || !cfg.algorithms.length || !dens.length) throw new Error('Choose at least one size, density, type and algorithm.');
  $('b-cancel').disabled = false;
  try {
    const { jobId } = await post('/benchmark/jobs', cfg);
    bench.running = jobId;
    const prog = $('b-prog'), lab = $('b-prog-l'); prog.hidden = false;
    const job = await pollJob(jobId, j => { const p = j.progress; if (p?.total) { prog.max = p.total; prog.value = p.done; } lab.textContent = `${j.status} · ${p?.label || ''}`; });
    prog.hidden = true;
    if (job.status === 'cancelled') { lab.textContent = 'Cancelled.'; return; }
    if (job.status === 'error') throw new Error(job.error?.message || 'Benchmark failed');
    bench = { ...bench, jobId, res: job.result, page: 0, running: null }; lab.textContent = '';
    renderBench(); toast(`Benchmark complete: ${job.result.mazes_total} mazes, ${fmt(job.result.environment?.duration_s, 1)} s`, 'success');
  } finally { bench.running = null; $('b-cancel').disabled = true; $('b-prog').hidden = true; }
}

function renderBench() {
  const r = bench.res; $('b-empty').hidden = true; $('b-results').hidden = false;
  const e = r.environment || {};
  $('b-env').textContent = `Python ${e.python} · ${e.platform} · ${e.cpu_count} CPUs · repeats ${e.repeats} · ${e.started_at} · ${fmt(e.duration_s, 1)} s · mazes ${r.mazes_solvable}/${r.mazes_total} solvable (${r.mazes_unsolvable} unsolvable)`;
  renderSummary(); renderRows(); renderCharts();
}

function renderSummary() {
  const [key, dir] = bench.sort, rows = [...bench.res.summary].sort((a, b) => (a[key] > b[key] ? 1 : a[key] < b[key] ? -1 : 0) * dir);
  const L = x => algoLabel(x);
  const cols = [['group', 'Group', x => x.group], ['algorithm', 'Algorithm', L], ['success_rate', 'Success %', x => fmt(x.success_rate * 100, 1)], ['expanded_mean', 'Expanded (mean)', x => fmt(x.expanded_mean, 1)],
    ['path_cost_mean', 'Path cost', x => fmt(x.path_cost_mean, 1)], ['optimality_mean', 'Optimality', x => fmt(x.optimality_mean, 3)], ['time_ms_mean', 'Time ms (mean ± std)', x => `${fmt(x.time_ms_mean, 3)} ± ${fmt(x.time_ms_std, 3)}`]];
  const t = table(cols.map(([k, h, g]) => ({ h, get: g })), rows);
  t.querySelectorAll('th').forEach((th, i) => { th.tabIndex = 0; th.role = 'button'; const s = () => { bench.sort = [cols[i][0], bench.sort[0] === cols[i][0] ? -bench.sort[1] : 1]; renderSummary(); }; th.addEventListener('click', s); th.addEventListener('keydown', ev => ev.key === 'Enter' && s()); });
  t.querySelectorAll('tbody tr').forEach((tr, i) => rows[i].within_noise_of_best && tr.lastChild.append(el('span', { class: 'badge', title: 'Within one standard deviation of the fastest: no time winner' }, '≈ within noise')));
  $('b-sum').replaceChildren(t);
}

function renderRows() {
  const rows = bench.res.rows, per = 25, pages = Math.max(1, Math.ceil(rows.length / per)); bench.page = Math.min(bench.page, pages - 1);
  const slice = rows.slice(bench.page * per, bench.page * per + per);
  $('b-rows').replaceChildren(table(['maze_id', 'size', 'density', 'type', 'algorithm', 'heuristic', 'status', 'expanded', 'path_cost', 'optimality', 'time_ms_median'].map(k => ({ h: k, get: r => fmt(r[k], 3) })), slice));
  $('pg-l').textContent = `Page ${bench.page + 1} / ${pages}`;
}

function chart(id, cfg) {
  charts[id]?.destroy();
  if (!window.Chart) return;
  Chart.defaults.color = '#9AA5B1'; Chart.defaults.borderColor = '#2A323D';
  charts[id] = new Chart($(id), { ...cfg, options: { responsive: true, ...cfg.options } });
}

function renderCharts() {
  const S = bench.res.summary, overall = S.filter(s => s.group === 'overall'), base = overall.length ? overall : S;
  const labels = base.map(algoLabel), colors = base.map(s => ALGO_COLORS[s.algorithm]);
  chart('ch-time', { type: 'bar', data: { labels, datasets: [{ label: 'Mean ms', data: base.map(s => s.time_ms_mean), backgroundColor: colors }] },
    options: { plugins: { tooltip: { callbacks: { afterLabel: c => `std ${fmt(base[c.dataIndex].time_ms_std, 3)}` } } } } });
  const groups = [...new Set(S.map(s => s.group))], algos = [...new Set(S.map(algoLabel))];
  chart('ch-exp', { type: 'bar', data: { labels: groups, datasets: algos.map(a => { const s0 = S.find(s => algoLabel(s) === a); return { label: a, backgroundColor: ALGO_COLORS[s0.algorithm], data: groups.map(g => S.find(s => s.group === g && algoLabel(s) === a)?.expanded_mean ?? null) }; }) } });
  chart('ch-opt', { type: 'bar', data: { labels, datasets: [{ label: 'Mean', data: base.map(s => s.optimality_mean), backgroundColor: colors }, { type: 'line', label: 'Min', data: base.map(s => s.optimality_min), showLine: false, pointStyle: 'rectRot', pointRadius: 6, borderColor: '#E6EAF0', backgroundColor: '#E6EAF0' }] }, options: { scales: { y: { min: 0, max: 1.05 } } } });
  const area = s => { const [a, b] = s.split('x').map(Number); return a * b; }, byAlg = {};
  for (const r of bench.res.rows) { const k = algoLabel(r), a = area(r.size); ((byAlg[k] ||= { alg: r.algorithm, m: {} }).m[a] ||= []).push(r.time_ms_median); }
  chart('ch-area', { type: 'line', data: { datasets: Object.entries(byAlg).map(([k, v]) => ({ label: k, borderColor: ALGO_COLORS[v.alg], backgroundColor: ALGO_COLORS[v.alg], borderDash: k.includes('euclid') ? [6, 4] : [], data: Object.entries(v.m).map(([a, t]) => ({ x: +a, y: t.reduce((p, q) => p + q, 0) / t.length })).sort((p, q) => p.x - q.x) })) },
    options: { parsing: false, scales: { x: { type: 'linear', title: { display: true, text: 'cells' } }, y: { title: { display: true, text: 'ms' } } } } });
}

// === ML Lab ===
export async function initML() {
  $('rg-train').addEventListener('click', () => guarded($('rg-train'), trainReg, $('rg-err')));
  $('rg-demo').addEventListener('click', () => guarded($('rg-demo'), demoReg, $('rg-err')));
  $('rg-heat').addEventListener('change', () => regView?.setHeat($('rg-heat').checked ? heat : null));
  $('cl-train').addEventListener('click', () => guarded($('cl-train'), trainCls, $('cl-err')));
  $('cl-demo').addEventListener('click', () => guarded($('cl-demo'), demoCls, $('cl-err')));
  try { // restore previously trained state
    const s = await request('/ml/status');
    if (s.regression?.metrics?.models) renderReg(s.regression.metrics);
    else if (s.regression) $('rg-out').replaceChildren(el('p', {}, `A regression model was trained at ${s.regression.trained_at}. Train again to see full metrics.`));
    if (s.classification?.metrics?.model) renderCls(s.classification.metrics);
    else if (s.classification) $('cl-out').replaceChildren(el('p', {}, `A classifier was trained at ${s.classification.trained_at}. Train again to see full metrics.`));
  } catch { /* backend offline: empty state stays */ }
}

async function trainReg() {
  const { job } = await runJob('/ml/regression/jobs', { n_mazes: num('rg-n'), samples_per_maze: num('rg-s'), test_size: num('rg-t'), seed: num('rg-seed') }, $('rg-prog'), $('rg-pl'));
  if (job.status === 'done') { renderReg(job.result); toast('Regression trained', 'success'); }
}

function renderReg(r) {
  const d = r.dataset, M = r.models, rowsOf = [['Linear', M.linear], ['Tree', M.tree], ['Manhattan baseline', r.baseline_manhattan]].filter(x => x[1]);
  const out = [el('p', { class: 'muted' }, `Dataset: ${d.rows} rows from ${d.mazes} mazes · train ${d.train_rows} / test ${d.test_rows} rows · features: ${(d.features || []).join(', ')}`),
    table([{ h: 'Model', get: x => x[0] }, { h: 'MAE', get: x => fmt(x[1].mae, 3) }, { h: 'R²', get: x => fmt(x[1].r2, 3) }, { h: 'Overestimate %', get: x => fmt(x[1].overestimate_fraction * 100, 1) }], rowsOf)];
  if (M.linear?.coefficients) out.push(el('h4', {}, 'Linear coefficients'), kv({ ...M.linear.coefficients, intercept: M.linear.intercept }));
  $('rg-out').className = ''; $('rg-out').replaceChildren(...out);
}

let regView = null, heat = null;
async function demoReg() {
  const r = await post('/ml/regression/astar-compare', { maze: store.maze, model: $('rg-model').value, alpha: 1.0, include_heatmap: true });
  const rows = [['A* Manhattan', r.manhattan], ['A* learned', r.learned]], o = r.overestimates || {};
  $('rg-demo-out').replaceChildren(table([{ h: 'Heuristic', get: x => x[0] }, { h: 'Expanded', get: x => fmt(x[1].expanded) }, { h: 'Path cost', get: x => fmt(x[1].path_cost) }, { h: 'Optimality', get: x => fmt(x[1].optimality, 3) }, { h: 'Status', get: x => x[1].status }], rows),
    el('p', { class: 'muted' }, `Inference ${fmt(r.inference_ms, 2)} ms · h > true cost on ${fmt(o.count)} cells (${fmt((o.fraction_of_reachable || 0) * 100, 1)}%), max overestimate ${fmt(o.max_overestimate)}`));
  regView ||= new MazeView($('rg-canvas'), { label: 'Maze with learned heuristic heatmap' });
  regView.setMaze(structuredClone(store.maze)); heat = r.heatmap?.predicted || null; regView.setHeat($('rg-heat').checked ? heat : null);
}

async function trainCls() {
  const { job } = await runJob('/ml/classification/jobs', { n_mazes: num('cl-n'), test_size: num('cl-t'), seed: num('cl-seed'), criterion: $('cl-crit').value, tolerance: num('cl-tol') }, $('cl-prog'), $('cl-pl'));
  if (job.status === 'done') { renderCls(job.result); toast('Classifier trained', 'success'); }
}

function renderCls(r) {
  const d = r.dataset, m = r.model, b = r.baseline, total = Object.values(d.class_distribution).reduce((p, q) => p + q, 0) || 1;
  const dist = el('div', { class: 'distbar', role: 'img', 'aria-label': 'Class distribution' }, Object.entries(d.class_distribution).map(([k, v]) => el('span', { style: `flex:${v};background:${ALGO_COLORS[k] || '#888'}`, title: `${k}: ${v}` }, v ? `${k} ${v}` : '')));
  const cm = m.confusion_matrix, max = Math.max(1, ...cm.matrix.flat());
  const cmT = el('table', { class: 'cm' }, el('thead', {}, el('tr', {}, el('th', {}, 'actual ↓ / predicted →'), cm.labels.map(l => el('th', { scope: 'col' }, l)))),
    el('tbody', {}, cm.matrix.map((row, i) => el('tr', {}, el('th', { scope: 'row' }, cm.labels[i]), row.map(v => el('td', { style: `background:rgba(61,214,198,${(v / max * .75).toFixed(2)})` }, v))))));
  const imp = el('canvas', { role: 'img', 'aria-label': 'Feature importances' });
  $('cl-out').className = '';
  $('cl-out').replaceChildren(el('p', { class: 'muted' }, `${d.mazes} mazes · train ${d.train} / test ${d.test} · criterion ${d.criterion}, tolerance ${d.tolerance}`), dist,
    ...(r.warnings || []).map(w => el('p', { class: 'warn' }, w)),
    table([{ h: 'Metric', get: x => x[0] }, { h: 'Decision tree', get: x => fmt(x[1], 3) }, { h: `Majority baseline (${b.predicted_class})`, get: x => fmt(x[2], 3) }],
      [['Accuracy', m.accuracy, b.accuracy], ['Macro F1', m.macro_f1, b.macro_f1], ['Macro precision', m.macro_precision, null], ['Macro recall', m.macro_recall, null]]),
    el('h4', {}, 'Confusion matrix'), el('div', { class: 'scroll' }, cmT), el('h4', {}, 'Feature importances'), imp, el('h4', {}, 'Tree rules'), el('pre', {}, m.rules || ''));
  const ents = Object.entries(m.feature_importances || {}).sort((p, q) => q[1] - p[1]);
  charts.imp?.destroy(); if (window.Chart) charts.imp = new Chart(imp, { type: 'bar', data: { labels: ents.map(e => e[0]), datasets: [{ label: 'Importance', data: ents.map(e => e[1]), backgroundColor: '#3DD6C6' }] }, options: { indexAxis: 'y', responsive: true } });
}

async function demoCls() {
  const r = await post('/ml/classification/predict', { maze: store.maze, run_actual: $('cl-actual').checked });
  const parts = [el('p', {}, `Predicted best algorithm: `, el('b', {}, r.predicted)), kv(r.probabilities || {})];
  if (r.actual) parts.push(el('p', {}, `Actual best: `, el('b', {}, r.actual.label), r.correct ? ' — prediction correct' : ' — prediction wrong'));
  $('cl-demo-out').replaceChildren(...parts);
}
