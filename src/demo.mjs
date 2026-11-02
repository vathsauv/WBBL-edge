// Fictional match. A deterministic sequence makes development reproducible.
export function initialDemo() {
  return { id: 'demo', mode: 'demo', competition: 'WBBL', name: 'Harbour XI vs Valley XI', venue: 'Demo ground', innings: 1, runs: 70, wickets: 2, balls: 60, scheduledBalls: 120, status: 'Simulated innings', updatedAt: new Date().toISOString(), providerTimestamp: null, events: [], finished: false };
}
const deliveries = [1, 0, 2, 1, 4, 0, 1, 'W', 1, 0, 4, 1, 6, 1, 0, 2, 1, 4, 0, 1, 'W', 0, 2, 1];
export function advanceDemo(state) {
  if (state.finished) return state;
  const event = deliveries[(state.balls - 60) % deliveries.length];
  const runs = state.runs + (event === 'W' ? 0 : event);
  const wickets = state.wickets + (event === 'W' ? 1 : 0), balls = state.balls + 1;
  const finished = balls >= state.scheduledBalls || wickets >= 10;
  return { ...state, runs, wickets, balls, finished, status: finished ? 'Simulated innings complete' : 'Simulated innings', updatedAt: new Date().toISOString(), events: [...state.events, { event, balls, runs, wickets }].slice(-12) };
}
