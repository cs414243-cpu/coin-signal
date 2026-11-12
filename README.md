# 幣訊號 v20 — BTC/ETH weekly forecast + self-improving model loop + market-move cause log + data-reliability checks + recommendation-change notice + next-week outcomes after each recommendation + forecast freshness / ledger trust check + dated, weekly auto-refreshed backtests + private decision journal + intraday distance to the flip prices + list of tested-and-rejected signals + date-independent tests + plain row for every tested signal + bad-week money line + when-to-trade gap rule + what-time-to-act line (PWA, personal use)
v4 puts one plain 「未來一週預測建議」 card on top (from the current champion model in an append-only forecast ledger), a 「預測成績單」 below it, and moves everything else into 「進階（可不看）」. v3 added 定期定額與再平衡計畫 (DCA + rebalancing planner). v2 added the decision layer (今天怎麼做 / 部位與風險 / 槓桿檢查 / 台幣買幣成本); v1 signals live under 訊號細節. See CHANGELOG.md.
Research only, not investment advice. No keys, no accounts, no trading.

- `app/` static PWA (deploy this folder only). Live data fetched from the phone: Binance data-api USDT → OKX USDT → Kraken USDT → Coinbase USD (daily candles, closed bars only, last 200 checked for gaps/dupes/00:00 UTC; v6 cross-checks the same closed bar against the next source); OKX → Binance fapi → Bybit (funding); alternative.me (F&G); CoinGecko (spot USD/TWD).
- `backtest/fetch_data.py` + `backtest/backtest.py` regenerate `app/data/backtest.json` (rules fixed a priori, 1-day lag, 0.15%/side cost, IS < 2023-01-01 ≤ OOS, kNN analog walk-forward from 2022-01-01, Newey-West + block bootstrap p-values).
- Tests: `node --test tests/` (JS↔Python feature parity), `node tests/e2e.mjs` (headless load + screenshots; needs `python3 -m http.server 8765 --directory app`), `node tests/fallback.mjs` (blocked-source fallbacks + offline cache).
- Refresh stats: `python3 backtest/fetch_data.py && python3 backtest/backtest.py`, then bump `VERSION` in `app/sw.js`.
- v3 DCA/rebalancing data: `python3 backtest/dca_rebalance.py` → `app/data/dca.json` (TWD daily, MAX cost model incl. C#23 premium, rebalancing rules / monthly contribution variants / DCA vs lump sum, IS<2023≤OOS, JS↔Python parity vectors). Tests: `node --test tests/` and `node tests/e2e_v3.mjs` with `python3 -m http.server 8765 --directory app`.
- v2 decision data: `python3 backtest/fetch_max.py` (MAX public order-book snapshot + VIP fees) then `python3 backtest/decision.py` → `app/data/decision.json` (trend/VT backtests, bad-week z5 calibration, liquidation table, TWD weekly panel from research C#21, MAX premium stats from C#23).
- v2 tests: `node --test tests/` (includes `decision.test.mjs`), `node tests/e2e_v2.mjs [url]` (iPhone viewport, writes `screenshots/v2-*.png`).
- v7 recommendation-change stats: `python3 backtest/flip_stats.py [--end YYYY-MM-DD]` → `app/data/flips.json` (champion trend_vt@1 action history from closed Binance bars, 14-day reversal shares, IS<2023≤OOS). Tests: `node --test tests/` (`flips.test.mjs`, JS↔Python event parity) and `node tests/e2e_v7.mjs`.
- v8 next-week outcomes per recommendation: `python3 backtest/action_outcomes.py [--end YYYY-MM-DD] [--rows]` → `app/data/outcomes.json` (next-7-day return after each champion action, full/IS/OOS, overlapping daily starts + non-overlapping weekly, follow-vs-hold after 0.15%/side + 0.27% TWD premium). Tests: `tests/outcomes.test.mjs` (JS↔Python parity, no-lookahead) and `node tests/e2e_v8.mjs`.
- v9 forecast freshness + ledger trust: `python3 forecast/trust_export.py [--out PATH]` → `app/data/trust.json` (read-only; verifies each ledger chain with `common.verify_chain`, `verify_forecast_frames`, frozen model sha256 vs registry; counts/dates/paper values straight from the ledger rows). Run automatically by `daily.sh`/`weekly.sh` and published as `data/trust.json`. The app also re-verifies the published `ledger/*.jsonl` chains on the phone (`app/js/trust.js`). Top card shows one line only when the forecast is ≥ 1 day late (after 09:00 Taipei) or a check fails. Tests: `tests/trust.test.mjs`, `node tests/e2e_v9.mjs` (serve app + `ledger/` like Pages).
- v11 display: the top card no longer shows the champion's weekly up-probability as a percentage (research in `forecast/proposals/P-pup-calibration.md` found it no better than a constant 50%, Brier 0.2523 vs 0.2500). It now says 「漲跌方向：約一半一半，無法預測」. The raw `p_up` stays only under 「進階（可不看）→ 預測模型與自我改善機制」, with a one-line note. Ledger / frozen models / `forecast/*.py` untouched. Tests: `tests/pup.test.mjs`, `node tests/e2e_v11.mjs`.
- v13 「盤中離翻轉價多遠」: the top card shows, per coin, a live ticker price (same source as the daily bars first, then OKX → Kraken → Coinbase; never cached) vs the 50/200-day flip prices from the closed bars, and says the rule only changes on the 08:00 Taipei close. History: `python3 backtest/fetch_hourly.py` (Binance spot 1h → `backtest/data/*_1h.json`) then `python3 backtest/intraday_cross.py [--end YYYY-MM-DD]` → `app/data/intraday.json` (share of intraday crossings still crossed at the close, by Taipei hour; run weekly by `weekly.sh`). Tests: `tests/intraday.test.mjs`, `node tests/e2e_v13.mjs`.
- v14 「試過但沒通過的訊號」: a 進階 card (after 模型驗證) listing every candidate tested against trend_vt@1 with its 2024→ result vs the champion and verdict 沒通過. `python3 backtest/tested_signals.py` (read-only over `forecast/proposals/proto_*_results.json`, `proto_portfolio_risk_diag_posthoc.json`, `P-events-C-rejected.md`) → `app/data/tested_signals.json`; run weekly by `weekly.sh`. Tests: `tests/tested.test.mjs`, `node tests/e2e_v14.mjs`.
- v15 reliability: `backtest/tested_signals.py` adds the P-cross-asset row and, for any future `proto_*_results.json` without a plain-language META row, a generic row built only from that file (`generic: true`, group `new`, verdict 「未採用（說明整理中）」; unreadable files → `errors`, never crashes `weekly.sh`); `tests/tested.test.mjs` warns instead of failing. Old unit tests (`decision`, `fresh`, `journal`, `trust`) now derive dates/amounts from the shipped data instead of hardcoding 2026-11-10/11. `--proposals DIR` is for tests only.
- v16 reliability: `backtest/tested_signals.py` adds the P-drawdown-regime row (「跌深或盤勢轉差時先減碼」, IS lead `dd_own_cut`); `tests/tested.test.mjs` generic-row test no longer assumes zero real unlisted proposals, plus a test that the row's plain reasons hold in `proto_drawdown_regime_results.json` / `_diag_posthoc.json`.
- v17 reliability: `app/data/tested_signals.json` regenerated (P-calendar-cycle row, 15 signals). `tests/tested.test.mjs` runs the generator once (FRESH) and checks coverage on it, so a proposal that lands between weeklies only warns (published rows must still equal the fresh rows; pending rows may wait at most 8 days). e2e scripts use `tests/e2e_net.mjs` `isExternalNetNoise` to tolerate only refused requests to the app's external price APIs (CoinGecko, exchanges, alternative.me); `e2e_v7` adds a CoinGecko-blocked pass; `tests/net.test.mjs` checks the filter.
- v12 「我的決策紀錄」: one tiny link on the top card opens a 進階 card where the user records what he actually did with each recommendation (照建議／沒照做／部分照做, optional % / NT$), stored only in localStorage `cs-v12-journal`. Finished weeks (asof close → target_date close, closed bars only) compare his choice vs the recommendation vs holding, with the v8 cost formula (`outcomes.json` costs); summary uses non-overlapping weeks only. Pure functions `app/js/journal.js`. Tests: `tests/journal.test.mjs` (parity with `backtest/action_outcomes.py`), `node tests/e2e_v12.mjs`.
- v10 backtest refresh: `python3 backtest/refresh_all.py [--end YYYY-MM-DD] [--only a,b] [--no-fetch]` reruns backtest (via `backtest/pin.py`, keeps `backtest.py` byte-identical for the forecast frame hash), decision, dca_rebalance, flip_stats, action_outcomes to the latest closed daily bar; stamps `as_of`/`generated_at` (Taipei); any failing step or sanity check keeps the previous JSON (`backtest/refresh_status.json`). Called by `weekly.sh`. The app shows 「回測資料到 YYYY/MM/DD」 on each backtest card in 進階 and a mild note when > 10 days behind (`app/js/fresh.js`). Tests: `tests/fresh.test.mjs`, `node tests/e2e_v10.mjs`.
- Deploy: copy `app/` to `/workspace/coin-signal-repo` (repo root) and push `main`.


## v4 — self-improving forecast loop (`forecast/`)

```
forecast/
  common.py          data fetch with fallbacks, feature frame (= backtest/backtest.py conventions), hash-chained JSONL, registry, frozen-model loader
  engine.py          scoring (Brier, log loss, hit, 10–90% coverage, 3-quantile pinball ≈ CRPS) + paper-portfolio simulator
  models/*.py        one file per model VERSION, frozen by sha256 in models/registry.json
  models/registry.json
  register.py        register a new model version as a challenger (max 3 active challengers)
  run_daily.py       daily: forecast → ledger, score matured forecasts, paper portfolios, app/data/live.json
  walkforward.py     historical walk-forward of every registered model (2022-01-01 →, cached in reports/walkforward/)
  review_weekly.py   weekly champion/challenger review with pre-registered rules → reports/review-YYYY-MM-DD.md
  daily.sh / weekly.sh   the exact routine entry points (run + git commit + publish live.json & ledger to GitHub Pages)
  ledger/            forecasts.jsonl, scores.jsonl, paper.jsonl, events.jsonl — append-only, sha256 hash chain
  test_forecast.py   tamper detection, frozen-code check, no-lookahead, paper costs, scores, real-ledger integrity
```

### The loop
1. **Every day after the 00:00 UTC (08:00 Taipei) close** — `forecast/daily.sh`:
   - verifies every ledger hash chain (aborts on any edit) and every model file against its frozen sha256 (aborts if changed);
   - refreshes public data: candles Binance data-api → OKX → Kraken → Coinbase (fallbacks only fill missing days), funding OKX → Binance, Fear & Greed alternative.me;
   - each non-retired model forecasts BTC and ETH for the next 7 days: `p_up`, `median`, `q10`, `q90`, `exposure` (0–1 of the coin budget) + a plain-language reason. One row per (asof, coin, model); re-running the same day adds nothing;
   - scores every forecast whose target close exists (`scores.jsonl`);
   - replays one virtual NT$1,000,000 paper portfolio per model from the ledger (50/50 BTC/ETH sleeves, daily rebalance to exposure, 0.15%/side + 0.27% TWD→USDT premium on buys, cash 0%) and appends new days (`paper.jsonl`; a replay that disagrees with a logged day prints a warning);
   - writes `app/data/live.json`, commits the ledger locally, and publishes `data/live.json` + `ledger/` to the public coin-signal repo (git history = external tamper evidence).
2. **Every week** — `forecast/weekly.sh` runs `review_weekly.py` (walk-forward refresh, live comparison, promotion/retirement), refreshes live.json, publishes the report under `ledger/reports/`.
3. **New ideas** come from research → write `models/<id>_v<n>.py` with a fixed SPEC → `python3 register.py <file> --status challenger`. It starts with zero live record and must earn promotion. A registered file can never be edited (the loader refuses); changing a parameter = new version. Retiring is allowed; past rows are never edited.

### Registered models (2026-11-11)
| key | status | exposure (share of the coin budget) | probability / range |
|---|---|---|---|
| `baseline@1` | reference | always 100% (= just hold) | expanding base rate; empirical 10/50/90% of all past 7-day returns |
| `trend_vt@1` | **champion** | `(0.5·[c>MA50] + 0.5·[c>MA200]) × min(1, 30% / vol30)` (C#9, C#10; v2/v3 rule) | up-share / median of past days with the same trend state; 10/90% = weekly vol × empirical z-quantiles |
| `knn@1` | challenger | 1 if p_up > 0.5 else 0 | 150 nearest past days on 7 features (v1 analog) |
| `tsmom@1` | challenger | `(#positive of 30/90/180-day returns ÷ 3) × min(1, 30%/vol30)` (C#10) | up-share of past days with the same count |
| `logit@1` | challenger | `clip((p−0.45)/0.15, 0, 1) × min(1, 30%/vol30)` | L2 logistic regression on d200, d50, mom30, log vol30, expanding refit daily |

All models only read rows whose 7-day outcome was known on the forecast day (`test_no_lookahead` scrambles the future and checks the forecast is identical).

### Promotion rules (pre-registered in `review_weekly.py` RULES on 2026-11-11; a challenger replaces the champion only if ALL hold)
1. ≥ 56 scored live forecasts per coin, paired with the champion on the same days (≥ 8 weeks live).
2. Lower mean live Brier than the champion **and** moving-block bootstrap (block 7 days, 2000 reps) P(better) ≥ 1 − 0.10/k.
3. Higher live paper Sharpe **and** bootstrap P(better) ≥ 1 − 0.10/k.
4. Historical walk-forward (2022-01-01 →) not worse: Brier ≤ champion + 0.002 and Sharpe ≥ champion − 0.10.
5. Live paper max drawdown not worse by > 5 pp; walk-forward max drawdown not worse by > 10 pp.
k = number of candidates in the review (challengers + baseline) → Bonferroni multiple-testing correction. At most one promotion per review. The demoted champion becomes a challenger if a slot is free, else retired. A challenger live ≥ 26 weeks whose Brier is worse than the baseline with P ≥ 0.90 is retired automatically.
Overfitting guards: no tuning on live data (models are frozen; they only fit on past known outcomes), ≤ 3 active challengers, Bonferroni, walk-forward used only as a "not worse" gate, every overlapping 7-day score noted (independent samples ≈ days ÷ 7).

### Commands
- Daily (08:20 Asia/Taipei): `bash /workspace/crypto-predictor/forecast/daily.sh`
- Weekly (Monday 09:00 Asia/Taipei): `bash /workspace/crypto-predictor/forecast/weekly.sh`
- Tests: `cd forecast && python3 test_forecast.py`; `node --test tests/` (includes `live.test.mjs`); UI: `python3 -m http.server 8765 --directory app & node tests/e2e_v4.mjs` (writes `screenshots/v4-*.png`; v2/v3 e2e scripts are superseded because those cards now live inside the collapsed 進階 section).
- Test mode (never touches the real ledger): set `FORECAST_LEDGER`, `FORECAST_REGISTRY`, `FORECAST_LIVE`, `FORECAST_REPORTS` to temp paths; only then is `run_daily.py --asof YYYY-MM-DD` allowed.

## v6 — data reliability & near-flip prices (`app/js/reliability.js`)
- Home (per coin, plain zh-TW): 綠「資料正常」／黃「資料尚未更新」(no yesterday bar at 09:00 Taipei), 「各交易所價格略有差異」(0.5–2%), USDT off-peg >0.5%／紅「資料過期」(12:00 Taipei) or 「各交易所資料不一致」(>2% or different trend3). 「接近翻轉」when the next-close flip price of MA50/MA200 is within 1% (flip = mean of last 49 / 199 closes).
- 進階 → 資料可靠度: source + pair, fetch times, last closed bar, cross-source closes and bps, trend3 on both, flip prices, USDT, fallback order, thresholds.
- Forecast cache fix applied 2026-11-11 14:47 Taipei (`forecast/proposals/P-data-closed-bars-cache-fix.md`): `update_candles` caches and uses only fully closed 00:00 UTC daily bars; a fresher source may overwrite a stale (fetched-before-close) cached bar. Recorded in `events.jsonl` as `type=frame_change` (old `frame_sha256` `45860569…65d1` → `5fc66bc6…bf61`). Past ledger rows, model files and promotion rules were not changed.
- Tests: `tests/reliability.test.mjs`, `tests/e2e_v6.mjs`.

## v5 — market-move causes & indicator tracking (`forecast/events/`)

Idea: the loop also needs *information*. For every big move we record what was known before it (indicators), what was reported (causes, with publish time vs the move), and we test which pre-move indicators actually relate to moves, with multiple-testing correction. Post-hoc news explanations are mostly narrative; only things available **before** a move can become model inputs.

```
forecast/events/
  sources.py         public keyless fetchers (source + url + fetched_at per series; cached in data/, history merged, stale-cache fallback)
  calendar_build.py  FOMC (federalreserve.gov) + CPI/NFP (BLS schedules; past dates from Wayback copies of the BLS archive) → data/calendar.json
  panel.py           daily panel per coin (UTC close) + macro aligned to what was known at that close
  moves.py           big-move detector: |1d| > 2.5× trailing 30d σ  or |7d| > 10%; flags ≤3 days apart = one episode
  eventlog.py        moves/<id>.json + .md (move, indicators before/after, causes w/ URL + publish time + before/during/after, category, confidence)
  snapshot.py        indicators/YYYY-MM-DD.json (null + error when a source fails; never invented)
  fill_causes.py     verify URLs (HTTP 200 or WebFetch-confirmed) and fill a stub; --list shows pending stubs
  analysis.py        252 tests: condition at D-1 → outcome; circular-shift permutation p, BH q, Bonferroni; fixed-threshold abs95 robustness
  publish.py         app/data/events.json (本週要注意 + 進階 cards)
  events_daily.py    daily step (called by daily.sh)      events_weekly.py   weekly summary → reports/events-YYYY-MM-DD.md (called by weekly.sh)
  backfill.py, verify_urls.py, data/backfill_causes.json   one-off historical backfill (2020/2021 →)
  CAUSE_PROTOCOL.md  rules for filling causes      analysis.md   findings (2026-11-11)
forecast/proposals/P-events-*.md   challenger ideas from this module (none registered)
```

**Sources:**
- Working (2026-11-11):
  - Binance / OKX candles and funding
  - OKX OI, long/short ratio, liquidation orders (recent ~14 h only)
  - alternative.me Fear & Greed
  - CoinGecko /global for dominance
  - DefiLlama stablecoins
  - Farside BTC/ETH ETF flows
  - Cboe S&P 500 and VIX
  - Nasdaq API for NDX and GLD (gold proxy)
  - US Treasury 10Y CSV
  - Frankfurter / ECB rates, with DXY computed using the ICE formula
  - open.er-api USD/TWD (current value only)
  - Fed FOMC calendar
  - BLS schedules (read via WebFetch or Wayback; bls.gov returns 403 to scripts)
- Failing or not used: Stooq, FRED and Yahoo chart (blocked from the box); USD/TWD history (the ECB dropped TWD in 2020-10); no keyless liquidation history.

**App (v5):**
- Below the forecast card, a small 「本週要注意」 card lists CPI / FOMC / NFP in the next 7 days, in Taipei time from the official calendars. If nothing is scheduled, it shows the next event.
- It says 「歷史上這類日子波動較大」 only if `vol_claim_supported` is true, i.e. BH q < 0.05 and ratio > 1 for both coins. That is currently false, so it shows dates only.
- 進階 adds 「最近大漲大跌的原因」, which shows:
  - the latest episodes with plain zh-TW causes and source links, each tagged 事前 / 當天 / 事後
  - the 12 largest explained moves
  - indicator findings with sample sizes and q values
  - the macro-day volatility table

### Routine steps
**Daily** (after 08:00 Taipei; the routine agent runs these in order):
1. `bash /workspace/crypto-predictor/forecast/daily.sh`. This runs the forecast and then `events/events_daily.py`, which:
   - writes the indicator snapshot
   - rebuilds the calendar
   - detects new episodes and creates or refreshes stubs for the last 14 days
   - writes `events/data/pending_causes.json` and `app/data/events.json`
   - commits, then publishes `data/live.json` and `data/events.json`
2. If `forecast/events/data/pending_causes.json` lists events, fill each one following `forecast/events/CAUSE_PROTOCOL.md` §3:
   - Use WebSearch for reports on that UTC day, and open every URL.
   - Write a SPEC.json and run `cd forecast/events && python3 fill_causes.py SPEC.json --by "daily routine YYYY-MM-DD"`.
   - Sites that block curl: read the page with WebFetch, then `python3 fill_causes.py --webfetch URL PUBLISHED_AT "TITLE"`, then rerun the spec.
   - Never invent a source. Leave the event as a stub if nothing verifiable is found.
3. If anything was filled: `bash forecast/events/publish.sh` (rebuilds events.json, commits, publishes with the deploy lock).

**Weekly** (Monday 09:00 Taipei): `bash /workspace/crypto-predictor/forecast/weekly.sh`. This:
- runs `events/events_weekly.py`, which reruns `analysis.py` (all tests, BH) and writes `forecast/reports/events-YYYY-MM-DD.md` covering:
  - the week's moves and causes
  - pending stubs
  - category and timing tallies
  - relationships with q < 0.10, with their abs95 robustness
  - macro-day volatility
  - P-events-B re-test triggers
- then runs `review_weekly.py`
- then publishes both reports under `ledger/reports/`

The reviewing agent reads the events report next to the review. If a relationship passes q < 0.05 **and** abs95 for both coins, it may write or refresh a proposal in `forecast/proposals/`. At most one challenger is registered per week via `register.py`. Nothing in the events module registers models.

**Tests:**
- `cd forecast/events && python3 test_events.py`
- `node --test tests/` (includes `events.test.mjs`)
- UI: `python3 -m http.server 8765 --directory app & node tests/e2e_v6.mjs` (writes `screenshots/v6-*.png`; older `e2e_v2`…`e2e_v5` still pass)
- v18 「運氣差的一週」: `backtest/week_risk.py` → `app/data/weekrisk.json` checks the champion's lower 10% edge out of sample (2023+: BTC 9.8%, ETH 11.0% of weeks below it) and the cost of such weeks (follow vs all-in, costs included); top card adds one plain line per coin (edge × suggested share, plus NT$ when holdings are set); 進階 card `#weekrisk`; refresh_all step `weekrisk`; tests `weekrisk.test.mjs`, `e2e_v18.mjs`.
