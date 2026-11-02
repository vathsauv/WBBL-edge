// Cricket overs are notation, not a decimal fraction: 15.3 is 93 balls.
export function oversToBalls(value) {
  const text = String(value).trim();
  if (!/^\d+(?:\.[0-5])?$/.test(text)) throw new Error('Use cricket overs such as 15 or 15.3; the ball digit must be 0–5.');
  const [overs, balls = '0'] = text.split('.');
  return Number(overs) * 6 + Number(balls);
}
export function ballsToOvers(balls) {
  return `${Math.floor(balls / 6)}.${balls % 6}`;
}
export function validateState(state) {
  for (const key of ['runs', 'wickets', 'balls', 'scheduledBalls']) {
    if (!Number.isSafeInteger(state[key]) || state[key] < 0) throw new Error(`${key} must be a non-negative whole number.`);
  }
  if (state.wickets > 10 || state.scheduledBalls < 1 || state.scheduledBalls > 120 || state.balls > state.scheduledBalls) throw new Error('Score or overs are outside a T20 innings.');
  return state;
}
export function paceProjection(state) {
  validateState(state);
  if (!state.balls) return null;
  const projected = state.runs * state.scheduledBalls / state.balls;
  return { projected, threshold: Math.ceil(projected - 1e-9) };
}
export function wilson(successes, n) {
  if (!n) return null;
  const z = 1.96, p = successes / n, d = 1 + z * z / n;
  const center = (p + z * z / (2 * n)) / d;
  const spread = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d;
  return [100 * (center - spread), 100 * (center + spread)];
}
export function historicalFrequency(records, state, { target, poolWickets = false } = {}) {
  validateState(state);
  if (state.competition !== 'WBBL') return { available: false, reason: 'Historical frequencies are WBBL-only. This competition is not verified as WBBL.' };
  if (state.innings !== 1) return { available: false, reason: 'This first version contains first-innings history. A chase needs a separate target-aware model.' };
  if (state.scheduledBalls !== 120) return { available: false, reason: 'The historical sample excludes shortened innings.' };
  if (!state.balls || state.balls >= 120 || state.wickets >= 10) return { available: false, reason: 'Choose an active innings between 0.1 and 19.5 overs.' };
  const threshold = target ?? paceProjection(state).threshold;
  if (!Number.isSafeInteger(threshold) || threshold <= state.runs || threshold > 500) return { available: false, reason: 'The target must be a whole-number total above the current score and no more than 500.' };
  // Match exact runs and legal balls. Never silently widen the score range.
  // Record layout: [legal balls, runs, wickets, final total, calendar year].
  const matches = records.filter(r => r[0] === state.balls && r[1] === state.runs && (poolWickets || r[2] === state.wickets));
  const successes = matches.filter(r => r[3] >= threshold).length;
  const recent = matches.filter(r => r[4] >= 2023);
  return {
    available: true, threshold, n: matches.length, successes,
    percent: matches.length ? 100 * successes / matches.length : null,
    interval: wilson(successes, matches.length), poolWickets,
    later: { n: recent.length, successes: recent.filter(r => r[3] >= threshold).length },
    warning: matches.length < 30 ? 'Small sample: unsuitable as a confident live probability.' : 'Historical frequency, not a calibrated live prediction.'
  };
}
