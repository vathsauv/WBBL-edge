import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const input = process.argv[2];
if (!input) throw new Error('Usage: node scripts/import-history.mjs PATH_TO_EXTRACTED_CRICSHEET_WBBL_JSON');
const records = []; let eligible = 0, archiveMatches = 0;
const dates = [];
for (const file of (await fs.readdir(input)).filter(f => f.endsWith('.json'))) {
  const m = JSON.parse(await fs.readFile(path.join(input, file), 'utf8'));
  archiveMatches++; dates.push(m.info.dates[0]);
  const inn = m.innings?.[0];
  if (m.info.event?.name !== "Women's Big Bash League" || m.info.gender !== 'female') throw new Error('Input contains non-WBBL data.');
  if (!inn || inn.super_over || m.info.overs !== 20 || m.info.outcome.method || inn.target || inn.absent_hurt?.length || inn.miscounted_overs || inn.penalty_runs) continue;
  let runs = 0, balls = 0, wickets = 0; const states = [];
  for (const over of inn.overs) for (const d of over.deliveries) {
    runs += d.runs.total;
    const legal = !d.extras?.wides && !d.extras?.noballs;
    if (legal) balls++;
    wickets += (d.wickets || []).filter(w => !['retired hurt', 'retired not out'].includes(w.kind)).length;
    if (legal && wickets < 10 && balls < 120) states.push([balls, runs, wickets]);
  }
  if (balls > 120 || (balls !== 120 && wickets !== 10)) continue;
  eligible++;
  for (const state of states) records.push([...state, runs, Number(String(m.info.dates[0]).slice(0, 4))]);
}
dates.sort();
const metadata = { source: 'Cricsheet', sourceUrl: 'https://cricsheet.org/downloads/', license: 'Open Data Commons Attribution License v1.0', licenseUrl: 'https://opendatacommons.org/licenses/by/1.0/', competition: 'WBBL', archiveMatches, eligibleFirstInnings: eligible, firstDate: dates[0], lastDate: dates.at(-1), generatedAt: new Date().toISOString(), fields: ['legalBalls', 'runs', 'wickets', 'finalTotal', 'year'], exclusions: 'Shortened, adjusted, incomplete first innings and special scoring/availability cases. Only active first innings; no chases. One observation immediately after each legal delivery.' };
await fs.writeFile(path.join(root, 'data/history.json'), JSON.stringify({ metadata, records }));
console.log(`Imported ${eligible} first innings, ${records.length} active legal-ball states.`);
