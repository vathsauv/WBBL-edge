# WBBL Edge

A cricket web app built as a learning project: automatic score updates, exact-score WBBL historical frequencies, and visible sample sizes. Private GitHub repository intended; this folder has not been uploaded automatically.

## What works now

- Responsive match dashboard with automatic updates sent by the server.
- Fictional match simulation, with pause, reset and next-ball controls.
- Exact-score research at every legal ball in the historical sample, including 15.3 overs.
- Exact wicket-count matching by default; explicit option to pool wicket counts.
- Optional custom final-total threshold, sample counts, approximate 95% interval and 2023–2025 subset.
- Server-side CricketData snapshot adapter, persistent daily request budget, stale/error states and no API key in browser responses.
- Automated tests and a GitHub Actions workflow.

**This is an early development app.** Default mode is simulation, not real match tracking. The provider adapter has been tested against synthetic fixtures, not a real account. It currently fetches score snapshots, not individual deliveries. WBBL coverage and actual delay remain unverified. No betting alerts, automated bets, accounts, public hosting or chase probability model are included.

## Start the app

Requires Node.js 24 or newer. There are no external packages to install.

1. Open this folder in your editor or terminal.
2. Run:

```sh
node --env-file-if-exists=.env server.mjs
```

3. Open http://127.0.0.1:3000 in your browser.
4. Use Ctrl+C in the terminal to stop it.

This is a server-backed app: do not double-click public/index.html. The browser needs the server for updates and historical results. If port 3000 is occupied, set PORT=3001 in .env and restart.

## First learning exercise

Read [docs/lesson-1.md](docs/lesson-1.md). Start with changing one heading. You do not need to understand the whole app at once.

## Connect a real score source

1. Copy .env.example to .env.
2. Keep .env on your computer. It is ignored by Git.
3. Set SCORE_PROVIDER=cricketdata and enter your own CRICKETDATA_API_KEY and CRICKETDATA_MATCH_ID.
4. Verify the competition in the provider response. Only set VERIFIED_COMPETITION=WBBL when the selected fixture is genuinely WBBL. Leave it blank for other competitions; the historical panel will refuse to apply WBBL frequencies.
5. Confirm the innings length. SCHEDULED_BALLS defaults to 120. If overs are reduced, change it and restart; historical frequencies are then disabled. This adapter does not automatically recognise revised overs or DLS targets.
6. Restart the server. Check that the score matches a trusted scorecard and measure delay before relying on it.

At the default 120-second polling interval, three hours consumes roughly 90 polling requests. The local budget defaults to 95 per UTC day and survives restarts. Other activity using the same API key also consumes the provider's allowance. Increasing the local budget does not increase your provider entitlement. Polling faster does not remove upstream delay.

Provider reference: https://cricketdata.org/pricing/ and https://cricketdata.org/how-to-use-cricket-data-api.aspx . API errors are sanitized because upstream responses can echo the key. No actual credentials are included.

## Historical data

Cricsheet WBBL JSON archive, downloaded 2 November 2026: 519 archive matches dated 18 December 2015–13 December 2025. 463 eligible completed standard first innings produce 54,902 active legal-ball states. This is archive coverage, not every WBBL match ever played.

Each record is [legal balls, team runs, wickets, final total, calendar year]. One observation is saved immediately after each legal delivery. Later illegal deliveries sharing that legal-ball count are not included. These are event-time observations, not the final corrected score at the end of an over if a subsequent illegal delivery occurs.

Excluded: shortened/adjusted/incomplete innings, retired/absent-hurt complications flagged in the innings, miscounted overs and penalty-run cases. Active states only; all-outs after the observed state remain in outcomes. Retired hurt/not out do not count as dismissals. See the import script for the executable inclusion rules.

Default final-total threshold = ceiling(current runs × scheduled balls / balls elapsed). Reached means at least that threshold, not finishing on exactly that total. This uses current run rate, not standings net run rate.

These are descriptive historical frequencies. Exact matching creates small samples. Even 4/4 does not mean a guaranteed outcome. The approximate binomial interval and later-season subset do not adjust for player/venue/weather strength, dataset coverage, era changes or dependence between matches. No calibrated prediction model or evidence of profitable betting is claimed.

Data attribution: [Cricsheet](https://cricsheet.org/), adapted into per-delivery historical states. Source data is licensed under [Open Data Commons Attribution License v1.0](https://opendatacommons.org/licenses/by/1.0/). See [DATA-NOTICE.md](DATA-NOTICE.md).

To regenerate from an extracted Cricsheet WBBL JSON archive:

```sh
node scripts/import-history.mjs PATH_TO_EXTRACTED_JSON_FOLDER
```

## Test

```sh
node --test --experimental-test-isolation=none test/cricket.test.mjs test/provider.test.mjs
```

The same checks run in GitHub Actions. Server/API smoke checks can be run while the app is serving:

```sh
node scripts/smoke.mjs
```

## Keep your work on GitHub

Git tracks your local changes. GitHub keeps a remote copy. The .env file and runtime usage counter are excluded. Do not add secrets to HTML, JavaScript, screenshots, commits or repository issues.

1. Create a new repository named wbbl-edge on GitHub and choose **Private**. Leave the remote empty: do not initialize it with a README.
2. In this project folder, set your Git author name/email if your computer does not have them configured. Use your GitHub-provided no-reply email if you prefer.
3. If this folder is not yet a Git repository, run git init -b main.
4. Review git status and git diff before committing.
5. Commit and connect the remote:

```sh
git add .
git commit -m "Build initial cricket tracker and historical explorer"
git remote add origin https://github.com/YOUR_USERNAME/wbbl-edge.git
git push -u origin main
```

Replace YOUR_USERNAME with your actual account. Authenticate through GitHub's browser/credential flow. Never paste a password or access token into code or a remote URL. Check that the GitHub repository displays Private after pushing. Source commits do not deploy a live server.

## Project map

| File | Responsibility |
|---|---|
| public/index.html | Page content and inputs |
| public/styles.css | Appearance and mobile layout |
| public/app.js | Browser updates, controls and research requests |
| server.mjs | Local web server, shared polling and event stream |
| src/cricket.mjs | Cricket arithmetic and historical matching |
| src/demo.mjs | Clearly fictional delivery sequence |
| src/provider.mjs | External score normalization and request budget |
| data/history.json | Derived, attributed WBBL historical states |
| test/ | Meaningful calculation and provider tests |

## Next milestones

1. Connect a verified fixture and record provider delays/errors.
2. Add a verified delivery feed with corrections, deduplication and revised-overs handling.
3. Build target-aware chase research without treating early completed chases as full-20-over totals.
4. Evaluate forecasts on later/unseen matches before adding any opportunity alerts.
5. Add login and production hosting before exposing server controls to other users. Default localhost binding is for personal development, not a public deployment.

Built with HTML, CSS, JavaScript and Node.js. No commercial cricket feed or hosting subscription is included.
