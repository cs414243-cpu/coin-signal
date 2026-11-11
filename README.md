# 幣訊號 v4 — BTC/ETH weekly forecast + self-improving model loop (PWA, personal use)
v4 puts one plain 「未來一週預測建議」 card on top (from the current champion model in an append-only forecast ledger), a 「預測成績單」 below it, and moves everything else into 「進階（可不看）」. v3 added 定期定額與再平衡計畫 (DCA + rebalancing planner). v2 added the decision layer (今天怎麼做 / 部位與風險 / 槓桿檢查 / 台幣買幣成本); v1 signals live under 訊號細節. See CHANGELOG.md.
Research only, not investment advice. No keys, no accounts, no trading.

- `app/` static PWA (deploy this folder only). Live data fetched from the phone: Binance data-api → Kraken → OKX → Coinbase (daily candles); OKX → Binance fapi → Bybit (funding); alternative.me (F&G); CoinGecko (spot USD/TWD).
- `backtest/fetch_data.py` + `backtest/backtest.py` regenerate `app/data/backtest.json` (rules fixed a priori, 1-day lag, 0.15%/side cost, IS < 2023-01-01 ≤ OOS, kNN analog walk-forward from 2022-01-01, Newey-West + block bootstrap p-values).
- Tests: `node --test tests/` (JS↔Python feature parity), `node tests/e2e.mjs` (headless load + screenshots; needs `python3 -m http.server 8765 --directory app`), `node tests/fallback.mjs` (blocked-source fallbacks + offline cache).
- Refresh stats: `python3 backtest/fetch_data.py && python3 backtest/backtest.py`, then bump `VERSION` in `app/sw.js`.
- v3 DCA/rebalancing data: `python3 backtest/dca_rebalance.py` → `app/data/dca.json` (TWD daily, MAX cost model incl. C#23 premium, rebalancing rules / monthly contribution variants / DCA vs lump sum, IS<2023≤OOS, JS↔Python parity vectors). Tests: `node --test tests/` and `node tests/e2e_v3.mjs` with `python3 -m http.server 8765 --directory app`.
- v2 decision data: `python3 backtest/fetch_max.py` (MAX public order-book snapshot + VIP fees) then `python3 backtest/decision.py` → `app/data/decision.json` (trend/VT backtests, bad-week z5 calibration, liquidation table, TWD weekly panel from research C#21, MAX premium stats from C#23).
- v2 tests: `node --test tests/` (includes `decision.test.mjs`), `node tests/e2e_v2.mjs [url]` (iPhone viewport, writes `screenshots/v2-*.png`).
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
