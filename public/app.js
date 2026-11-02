// Browser code. Secrets and provider requests live on the server, never here.
const $ = id => document.getElementById(id);
let latest = null, requestNumber = 0, debounce, connected = false;
const formatOvers = balls => `${Math.floor(balls / 6)}.${balls % 6}`;
function text(id, value) { $(id).textContent = value; }
function parseOvers(value) {
  if (!/^\d+(?:\.[0-5])?$/.test(value.trim())) throw new Error('Use overs such as 15 or 15.3. The last digit must be 0–5.');
  const [o, b = '0'] = value.split('.'); return Number(o) * 6 + Number(b);
}

function render(data) {
  latest = data;
  text('mode-label', data.mode === 'demo' ? 'DEMO · FICTIONAL MATCH' : 'PROVIDER · SCORE SNAPSHOTS');
  text('mode-description', data.mode === 'demo' ? 'Automatic simulated deliveries every 3 seconds. No real match is being tracked.' : 'Automatic provider polling. Delivery-by-delivery tracking is not yet connected.');
  $('problem').hidden = !data.problem; text('problem', data.problem || '');
  $('demo-controls').hidden = data.mode !== 'demo'; text('toggle', data.running ? 'Pause demo' : 'Play demo');
  text('history-count', data.history.eligibleFirstInnings);
  const s = data.state;
  if (!s) { text('score-status', 'WAITING'); return; }
  text('match-name', s.name); text('venue', s.venue); text('score', `${s.runs}/${s.wickets}`); text('overs', formatOvers(s.balls));
  text('score-status', data.mode === 'demo' ? (s.finished ? 'DEMO COMPLETE' : 'SIMULATED') : (s.finished ? 'COMPLETE' : 'PROVIDER SCORE'));
  text('match-status', s.status); text('run-rate', s.balls ? (s.runs * 6 / s.balls).toFixed(2) : '—'); text('remaining', s.scheduledBalls - s.balls);
  text('projection', s.balls ? (s.runs * s.scheduledBalls / s.balls).toFixed(1) : '—');
  text('activity-type', data.mode === 'demo' ? 'SIMULATED DELIVERIES' : 'SCORE SNAPSHOTS');
  $('chase-detail').hidden = s.innings !== 2;
  if (s.innings === 2) text('chase-detail', `Chasing ${s.target}. Target-aware historical frequencies are not connected in this version.`);
  const events = $('events'); events.replaceChildren();
  if (s.events?.length) for (const e of s.events) {
    const span = document.createElement('span'); span.className = `ball ${e.event === 'W' ? 'wicket' : e.event >= 4 ? 'boundary' : ''}`; span.textContent = e.event; span.title = `After ${formatOvers(e.balls)} overs: ${e.runs}/${e.wickets}`; events.append(span);
  } else { const p = document.createElement('p'); p.className = 'muted'; p.textContent = data.mode === 'demo' ? 'The next simulated ball will appear here.' : 'No verified individual-delivery feed connected.'; events.append(p); }
  text('received', `Received by this server: ${new Date(s.updatedAt).toLocaleTimeString()}.`);
  text('source-delay', data.mode === 'demo' ? 'Demo clock only. Source delay does not apply.' : `Polling every ${data.pollSeconds}s. Provider event time and actual delay are unknown.${data.usage ? ` Local requests today: ${data.usage.count}.` : ''}`);
  if ($('follow').checked) { $('runs').value = s.runs; $('wickets').value = s.wickets; $('scenario-overs').value = formatOvers(s.balls); void analyse(); }
  freshness();
}
function freshness() {
  if (!latest?.state) return;
  if (!connected) { text('connection', 'Reconnecting · score may be stale'); return; }
  if (latest.mode === 'demo') { text('connection', latest.state.finished ? 'Demo complete' : latest.running ? 'Demo connected' : 'Demo paused'); return; }
  const age = (Date.now() - Date.parse(latest.state.updatedAt)) / 1000;
  if (latest.problem || age > Math.max(latest.pollSeconds * 2, 30)) text('connection', 'Score may be stale');
  else text('connection', 'Provider connected · delay unknown');
}

async function analyse() {
  const number = ++requestNumber;
  try {
    const runs = Number($('runs').value), wickets = Number($('wickets').value), balls = parseOvers($('scenario-overs').value);
    const follow = $('follow').checked, tracker = latest?.state;
    // Manual exploration is explicitly WBBL first-innings, independent of a live match.
    const params = new URLSearchParams({ runs, wickets, balls, scheduledBalls: follow && tracker ? tracker.scheduledBalls : 120, competition: follow && tracker ? tracker.competition : 'WBBL', innings: follow && tracker ? tracker.innings : 1, poolWickets: $('pool-wickets').checked });
    if ($('target').value !== '') params.set('target', $('target').value);
    const response = await fetch(`/api/frequency?${params}`); const result = await response.json();
    if (number !== requestNumber) return;
    if (!response.ok || result.error) throw new Error(result.error || 'Could not load historical results.');
    if (!result.available) throw new Error(result.reason);
    text('frequency-title', `HISTORICAL FREQUENCY · FINAL ${result.threshold}+`);
    text('frequency', result.percent === null ? 'No sample' : `${result.percent.toFixed(1)}%`);
    text('frequency-count', `${result.successes} of ${result.n} comparable innings reached ${result.threshold}+.`);
    $('frequency-bar').value = result.percent ?? 0;
    text('interval', result.interval ? `Approx. 95% interval: ${result.interval[0].toFixed(1)}–${result.interval[1].toFixed(1)}%.` : 'No matching historical innings. No probability has been estimated.');
    text('sample-warning', result.warning);
    text('matching', result.poolWickets ? 'Exact runs and legal balls; ALL wicket counts pooled. Wicket situations differ.' : 'Exact runs, legal balls AND wicket count. No wider score range was used.');
    text('recent', `2023–2025 subset: ${result.later.successes}/${result.later.n} reached the target. Subsets can be very small.`);
    text('scenario-state', follow ? 'Following tracker score. Demo scores use real historical observations for illustration.' : 'Manual WBBL first-innings exploration. This does not change the tracker.');
  } catch (error) {
    if (number !== requestNumber) return;
    text('frequency', '—'); text('frequency-count', error.message); $('frequency-bar').value = 0;
    text('frequency-title', 'HISTORICAL FREQUENCY'); text('interval', ''); text('recent', ''); text('matching', ''); text('scenario-state', '');
    text('sample-warning', 'No reliable historical percentage is available for this selection.');
  }
}

document.querySelectorAll('[data-page]').forEach(button => button.addEventListener('click', () => {
  for (const page of document.querySelectorAll('.page')) page.hidden = page.id !== button.dataset.page;
  for (const nav of document.querySelectorAll('[data-page]')) { nav.classList.toggle('active', nav === button); if (nav === button) nav.setAttribute('aria-current', 'page'); else nav.removeAttribute('aria-current'); }
  document.querySelector('header h1').textContent = { tracker: 'Match centre.', research: 'Research notes.', learn: 'Build & learn.' }[button.dataset.page];
}));
$('scenario').addEventListener('submit', event => { event.preventDefault(); void analyse(); });
for (const id of ['runs', 'wickets', 'scenario-overs']) $(id).addEventListener('input', () => { $('follow').checked = false; clearTimeout(debounce); debounce = setTimeout(analyse, 250); });
$('follow').addEventListener('change', () => { if ($('follow').checked && latest) render(latest); else void analyse(); });
$('pool-wickets').addEventListener('change', analyse);
for (const id of ['toggle', 'next', 'reset']) $(id).addEventListener('click', async () => { try { const response = await fetch(`/api/demo/${id}`, { method: 'POST' }); const result = await response.json(); if (!response.ok) throw new Error(result.error); render(result); } catch (error) { $('problem').hidden = false; text('problem', error.message); } });

// EventSource reconnects automatically if the local connection is interrupted.
const events = new EventSource('/api/events');
events.onopen = () => { connected = true; text('connection', 'Connected to local server'); freshness(); };
events.onmessage = event => { render(JSON.parse(event.data)); };
events.onerror = () => { connected = false; text('connection', 'Reconnecting · score may be stale'); };
setInterval(freshness, 5000);
void analyse();
