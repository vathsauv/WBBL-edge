import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { historicalFrequency } from './src/cricket.mjs';
import { initialDemo, advanceDemo } from './src/demo.mjs';
import { fetchMatch, RequestBudget } from './src/provider.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const history = JSON.parse(await fs.readFile(path.join(root, 'data/history.json'), 'utf8'));
const mode = process.env.SCORE_PROVIDER || 'demo';
if (!['demo', 'cricketdata'].includes(mode)) throw new Error('SCORE_PROVIDER must be demo or cricketdata.');
const port = Number(process.env.PORT || 3000), host = process.env.HOST || '127.0.0.1';
const pollSeconds = Math.max(30, Number(process.env.POLL_SECONDS || 120));
const limit = Number(process.env.DAILY_REQUEST_BUDGET || 95);
const scheduledBalls = Number(process.env.SCHEDULED_BALLS || 120);
if (![port, pollSeconds, limit, scheduledBalls].every(Number.isSafeInteger) || port < 0 || port > 65535 || limit < 1 || limit > 100 || scheduledBalls < 1 || scheduledBalls > 120) throw new Error('Invalid port, poll interval, request budget or innings length.');
const budget = new RequestBudget(path.join(root, 'runtime/usage.json'), limit);
const clients = new Set();
let state = mode === 'demo' ? initialDemo() : null;
let problem = mode === 'demo' ? null : 'Waiting for the first provider update.';
let usage = null, running = true, polling = false;

function snapshot() {
  return { mode, state, problem, running: mode === 'demo' ? running : null, usage, pollSeconds: mode === 'demo' ? 3 : pollSeconds, history: history.metadata, serverTime: new Date().toISOString() };
}
function broadcast() {
  const message = `data: ${JSON.stringify(snapshot())}\n\n`;
  for (const client of clients) client.write(message);
}
function json(res, code, data) { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(data)); }
async function poll() {
  if (polling || state?.finished) return;
  polling = true;
  try {
    const result = await fetchMatch({ key: process.env.CRICKETDATA_API_KEY, matchId: process.env.CRICKETDATA_MATCH_ID, budget, competition: process.env.VERIFIED_COMPETITION || '', scheduledBalls });
    state = result.state; usage = result.usage; problem = null;
  } catch (error) { problem = error.message; }
  finally { polling = false; broadcast(); }
}

const files = new Map([['/', ['public/index.html', 'text/html']], ['/app.js', ['public/app.js', 'text/javascript']], ['/styles.css', ['public/styles.css', 'text/css']]]);
const server = http.createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
  try {
    const url = new URL(req.url, 'http://localhost');
    if (req.method === 'GET' && url.pathname === '/health') return json(res, 200, { ok: true });
    if (req.method === 'GET' && url.pathname === '/api/state') return json(res, 200, snapshot());
    if (req.method === 'GET' && url.pathname === '/api/events') {
      if (clients.size >= 20) return json(res, 503, { error: 'Too many preview connections.' });
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
      res.write(`data: ${JSON.stringify(snapshot())}\n\n`); clients.add(res);
      req.on('close', () => clients.delete(res)); return;
    }
    if (req.method === 'GET' && url.pathname === '/api/frequency') {
      if (!url.searchParams.has('runs') || !url.searchParams.has('balls') || !url.searchParams.has('wickets')) return json(res, 400, { error: 'Runs, balls and wickets are required.' });
      const scenario = { runs: Number(url.searchParams.get('runs')), balls: Number(url.searchParams.get('balls')), wickets: Number(url.searchParams.get('wickets')), scheduledBalls: Number(url.searchParams.get('scheduledBalls') || 120), innings: Number(url.searchParams.get('innings') || 1), competition: url.searchParams.get('competition') || '' };
      const target = url.searchParams.has('target') ? Number(url.searchParams.get('target')) : undefined;
      return json(res, 200, historicalFrequency(history.records, scenario, { target, poolWickets: url.searchParams.get('poolWickets') === 'true' }));
    }
    if (req.method === 'POST' && url.pathname.startsWith('/api/demo/')) {
      // Demo controls are local-only mutations. Block cross-site requests.
      const origin = req.headers.origin;
      if (origin && origin !== `http://${req.headers.host}`) return json(res, 403, { error: 'Cross-site controls are blocked.' });
      if (mode !== 'demo') return json(res, 409, { error: 'Demo controls are disabled in provider mode.' });
      if (url.pathname === '/api/demo/toggle') running = !running;
      else if (url.pathname === '/api/demo/reset') { state = initialDemo(); running = false; }
      else if (url.pathname === '/api/demo/next') state = advanceDemo(state);
      else return json(res, 404, { error: 'Unknown control.' });
      broadcast(); return json(res, 200, snapshot());
    }
    const file = files.get(url.pathname);
    if (req.method !== 'GET' || !file) return json(res, 404, { error: 'Not found.' });
    res.writeHead(200, { 'Content-Type': `${file[1]}; charset=utf-8`, 'Cache-Control': 'no-cache' });
    res.end(await fs.readFile(path.join(root, file[0])));
  } catch (error) { json(res, 400, { error: error.message }); }
});

const timer = setInterval(() => { if (mode === 'demo') { if (running && !state.finished) { state = advanceDemo(state); broadcast(); } } else void poll(); }, mode === 'demo' ? 3000 : pollSeconds * 1000);
const heartbeat = setInterval(() => { for (const client of clients) client.write(': heartbeat\n\n'); }, 15000);
server.listen(port, host, () => {
  console.log(`WBBL Edge: http://${host}:${server.address().port} (${mode} mode)`);
  if (mode === 'cricketdata') void poll();
});
function close() { clearInterval(timer); clearInterval(heartbeat); for (const client of clients) client.end(); server.close(); }
process.on('SIGINT', close); process.on('SIGTERM', close);
