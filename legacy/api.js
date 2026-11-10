// === REST, WebSocket, polling and DOM helpers ===
export class ApiError extends Error {
  constructor(code, message, details, status) { super(message); Object.assign(this, { code, details, status }); }
}

/** JSON request against /api; parses the {error:{code,message,details}} envelope. */
export async function request(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch('/api' + path, { method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
  } catch { throw new ApiError('NETWORK', 'Backend not reachable.', null, 0); }
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* non-JSON body */ }
  if (!res.ok) { const e = (data && data.error) || {}; throw new ApiError(e.code || 'INTERNAL', e.message || res.statusText, e.details, res.status); }
  return data;
}

export const post = (path, body) => request(path, { method: 'POST', body });
let counter = 0;
export const rid = () => 'r' + (++counter);

/** Polls a job every 500 ms until it leaves queued/running. */
export async function pollJob(jobId, onProgress, shouldStop = () => false) {
  for (;;) {
    const job = await request('/jobs/' + jobId);
    onProgress?.(job);
    if (['done', 'error', 'cancelled'].includes(job.status) || shouldStop()) return job;
    await new Promise(r => setTimeout(r, 500));
  }
}

/** Downloads GET /api/jobs/{id}/csv?table=... as a file. */
export async function downloadCsv(jobId, table) {
  const res = await fetch(`/api/jobs/${jobId}/csv?table=${table}`);
  if (!res.ok) throw new ApiError('INTERNAL', 'CSV download failed', null, res.status);
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(await res.blob()), download: `pathfinder-${table}.csv` });
  a.click(); URL.revokeObjectURL(a.href);
}

/** WebSocket with heartbeat (20 s) and exponential back-off (0.5 s → 5 s). */
export class RaceSocket {
  constructor() { this.ws = null; this.handlers = {}; this.listeners = []; this.delay = 500; this.hb = null; }
  on(type, fn) { this.handlers[type] = fn; return this; }
  onState(fn) { this.listeners.push(fn); return this; }
  isOpen() { return this.ws?.readyState === WebSocket.OPEN; }
  emit(s) { this.listeners.forEach(f => f(s)); }
  connect() {
    if (this.ws && this.ws.readyState <= 1) return;
    this.emit('connecting');
    const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws/race`);
    this.ws = ws;
    ws.onopen = () => { this.delay = 500; this.hb = setInterval(() => this.send({ type: 'ping' }), 20000); this.emit('open'); };
    ws.onmessage = e => { try { const m = JSON.parse(e.data); this.handlers[m.type]?.(m); } catch { /* ignore malformed */ } };
    ws.onclose = () => {
      clearInterval(this.hb); this.emit('closed');
      setTimeout(() => this.connect(), this.delay); this.delay = Math.min(5000, this.delay * 2);
    };
  }
  send(msg) { if (!this.isOpen()) return false; this.ws.send(JSON.stringify(msg)); return true; }
}

/** Tiny safe DOM builder: strings become text nodes, never HTML. */
export function el(tag, attrs = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') n.className = v; else if (k.startsWith('on')) n.addEventListener(k.slice(2), v); else n.setAttribute(k, v);
  }
  for (const c of kids.flat()) if (c !== false && c != null) n.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return n;
}
export const icons = () => window.lucide?.createIcons();
export const fmt = (x, d = 2) => x == null ? '—' : typeof x === 'number' ? (Number.isInteger(x) ? String(x) : x.toFixed(d)) : String(x);
