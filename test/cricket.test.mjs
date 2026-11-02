import test from 'node:test';
import assert from 'node:assert/strict';
import { oversToBalls, paceProjection, historicalFrequency, wilson } from '../src/cricket.mjs';
import { initialDemo, advanceDemo } from '../src/demo.mjs';
const state = { runs: 70, wickets: 2, balls: 60, scheduledBalls: 120, competition: 'WBBL', innings: 1 };
test('cricket overs are not decimal overs', () => {
  assert.equal(oversToBalls('15.3'), 93); assert.equal(oversToBalls(15), 90);
  for (const value of ['15.6', '15.30', '-1', 'abc']) assert.throws(() => oversToBalls(value));
});
test('pace threshold rounds up to a reachable whole total', () => {
  assert.equal(paceProjection({ ...state, runs: 100, balls: 90 }).threshold, 134);
  assert.equal(paceProjection({ ...state, runs: 105, balls: 90 }).threshold, 140);
  assert.equal(paceProjection({ ...state, balls: 0 }), null);
  assert.throws(() => paceProjection({ ...state, wickets: 11 }));
});
test('matching is exact, including wickets unless explicitly pooled', () => {
  const rows = [[60,70,2,140,2024],[60,70,2,130,2020],[60,70,3,150,2021],[60,71,2,170,2020],[61,70,2,170,2020]];
  const exact = historicalFrequency(rows,state); assert.equal(exact.n,2); assert.equal(exact.successes,1); assert.equal(exact.threshold,140);
  const pooled = historicalFrequency(rows,state,{poolWickets:true}); assert.equal(pooled.n,3); assert.equal(pooled.successes,2);
  assert.deepEqual(exact.later,{n:1,successes:1});
});
test('custom targets change successes without changing matched cohort', () => {
  const rows = [[60,70,2,140,2024],[60,70,2,150,2021]];
  const result = historicalFrequency(rows,state,{target:145}); assert.equal(result.successes,1);assert.equal(result.n,2);
});
test('no sample is not zero-percent chance', () => {
  const result=historicalFrequency([],state);assert.equal(result.percent,null);assert.equal(result.interval,null);
});
test('unsupported competitions, chases, shortened innings and completed innings never borrow the first-innings sample', () => {
  for(const change of [{competition:'GT20'},{innings:2},{scheduledBalls:90},{wickets:10},{balls:120}]) assert.equal(historicalFrequency([], {...state,...change}).available,false);
});
test('perfect small samples retain uncertainty', () => { const interval=wilson(4,4);assert.ok(interval[0]<60);assert.equal(interval[1],100); });
test('demo never exceeds 20 overs or ten wickets', () => { let s=initialDemo();for(let i=0;i<200;i++)s=advanceDemo(s);assert.ok(s.finished);assert.ok(s.balls<=120);assert.ok(s.wickets<=10);assert.equal(advanceDemo(s),s); });
