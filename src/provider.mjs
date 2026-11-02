import fs from 'node:fs/promises';
import path from 'node:path';
import { oversToBalls, validateState } from './cricket.mjs';

export function normalizeMatch(data, { competition = '', scheduledBalls = 120 } = {}) {
  if (!data || data.matchType?.toLowerCase() !== 't20') throw new Error('The provider did not return a supported T20 match.');
  const scores = data.score;
  if (!Array.isArray(scores) || !scores.length) throw new Error('No innings score is available yet.');
  if (scores.length > 2) throw new Error('Super Overs are not supported by this version.');
  // The provider supplies regular innings in match order. Reject missing fields.
  const score = scores.at(-1);
  if (score.r === undefined || score.w === undefined || score.o === undefined) throw new Error('The provider response has incomplete score fields.');
  const state = validateState({ runs: score.r, wickets: score.w, balls: oversToBalls(score.o), scheduledBalls });
  return {
    ...state, id: data.id, mode: 'cricketdata', competition,
    name: data.name || 'Selected match', venue: data.venue || 'Venue unavailable',
    innings: scores.length, batting: score.inning || '', status: data.status || 'Score available',
    target: scores.length === 2 ? scores[0].r + 1 : null,
    updatedAt: new Date().toISOString(), providerTimestamp: null,
    events: [], finished: data.matchEnded === true,
    deliveryCoverage: 'Score snapshots only; individual deliveries are not connected.'
  };
}

export class RequestBudget {
  constructor(file, limit = 95) { this.file = file; this.limit = limit; }
  async take(now = new Date()) {
    const day = now.toISOString().slice(0, 10);
    let usage;
    try { usage = JSON.parse(await fs.readFile(this.file, 'utf8')); }
    catch (error) { if (error.code !== 'ENOENT') throw new Error('Usage counter could not be read; polling paused to protect the request budget.'); }
    if (!usage || usage.day !== day) usage = { day, count: 0 };
    if (!Number.isInteger(usage.count) || usage.count < 0) throw new Error('Invalid usage counter.');
    if (usage.count >= this.limit) throw new Error('Local daily request budget reached. Polling will resume after midnight UTC.');
    usage.count++;
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    await fs.writeFile(this.file, JSON.stringify(usage));
    return usage;
  }
}

export async function fetchMatch({ key, matchId, budget, competition, scheduledBalls, fetcher = fetch }) {
  if (!key || !matchId) throw new Error('Set the API key and match ID in the server .env file.');
  const usage = await budget.take();
  const url = new URL('https://api.cricapi.com/v1/match_info');
  url.searchParams.set('apikey', key); url.searchParams.set('id', matchId);
  let response;
  try { response = await fetcher(url, { signal: AbortSignal.timeout(15000) }); }
  catch { throw new Error('Could not reach the score provider. The last received score is retained.'); }
  if (!response.ok) throw new Error(`Score provider returned HTTP ${response.status}.`);
  let body;
  try { body = await response.json(); } catch { throw new Error('Score provider returned invalid JSON.'); }
  // Do not return/log the provider's full response: it can echo the API key.
  if (body.status !== 'success') throw new Error('Provider rejected the request. Check the match ID, API access and provider quota.');
  return { state: normalizeMatch(body.data, { competition, scheduledBalls }), usage };
}
