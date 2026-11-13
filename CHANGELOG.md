# 幣訊號 更新紀錄

## v32（2026-11-14）：成績單加一句「現在的差距算不算數」（短期誰贏主要看漲跌）

- 2026-11-14 05:38 台北開始（研究筆記 `/workspace/trading/research/crypto/CRYPTO-20261114-0538-scorecard-noise.md`）。查重：v9（紀錄可信度）、v23（回測過度擬合檢查）都不是在回答「實盤才幾天的差距有多少是運氣」；CHANGELOG v4–v31 沒有。今晚 5 個模型提案已否決，這次做幫解讀的 App 改進。不是新訊號、不改預測規則、不註冊。依據 Tversky & Kahneman 1971 *Psychological Bulletin* 76(2):105–110（doi 10.1037/h0031322，小數法則）、Bailey & López de Prado 2012 *J. Risk* 15(2):3–44（doi 10.21314/jor.2012.255，最短紀錄長度；讀作者版第 4 節）。
- 新回測 `backtest/score_noise.py` → `app/data/scorenoise.json`：讀冠軍與一直抱著的 walk-forward 快取（凍結、每天只用當天以前的資料），2022-01-01 起每天各開一個**全新**虛擬 NT$100 萬，N 天後誰多（N＝1–91 逐日、之後每 7 天到 728）；成本＝成績單同一套（0.15%／邊、買進台幣溢價、第一天買進成本自己付），`--check` 對 24 個隨機視窗與 `engine.paper_sim` 誤差 < 1e−9。猜對率：同樣 K 天（2K 筆）的 10／90 分位，結果須在 as_of 前已知。資料到 2026-11-10。
- 結果（2024→ 起始的視窗；括號 2022→）：照建議贏的比例 2 天 54%（54%）、1 週 51%、4 週 45%、**8 週 44%**（44%）、半年 57%（46%）、1 年 58%（40%）；**幣價跌時贏 90–97%、漲時只贏 0–3%**（8 週內）；8 週差距一般範圍 −21～+21 個百分點。猜對率 28 天一般 30%～66%、91 天 40%～59%。結論：短期誰贏幾乎完全由漲跌決定，和「主要作用是大跌時少虧」一致。
- 首頁「預測成績單」兩個虛擬投資下面加一句（目前）：「照建議領先，但還不算數：這 2 天幣價在跌（一直抱著 −2.81%）。回測裡同樣 2 天的期間，幣價跌時照建議 97% 會贏、漲時只有 3%——短期誰贏主要看漲跌，不代表預測準。拉長到 8 週，照建議贏的期間也只有 44%；它的用處是大跌時少虧。」跟著天數、誰領先、漲跌自動換字，滿 8 週拿掉後半句。11/17 起有到期預測時加猜對率範圍句（在範圍內＝「還看不出準不準」；高／低於範圍＝「筆數還少，可能只是運氣／先不要下結論」）。進階「預測模型與自我改善機制」卡加 6 列表（1 天～1 年、跌時／漲時、差距範圍）與算法說明。
- `scorenoise.json` 暫不接 weekly.sh（不在 11/16 第一次完整週檢討前改例行腳本；長期分布、多一週影響很小，表上標資料日期）；之後可接進 `refresh_all.py`。
- SW `v32-2026-11-14`（快取清單加 `js/scorenoise.js`、`data/scorenoise.json`）；`app.js` 版本 v32。帳本、凍結模型、registry、升級規則、`daily.sh`、`weekly.sh` 都沒動。建議不變 BTC 0、ETH 0。
- 測試：新增 `tests/scorenoise.test.mjs` 7 項（pick；資料形狀；首頁句數字＝資料、抱著 %＝KPI、無術語、領先／落後／漲跌／8 週子句；猜對率三種判斷；進階表；**重跑 `score_noise.py --end 2026-11-10 --check` 與發布檔完全相同**；接線）與 `tests/e2e_v32.mjs`（iPhone 390×844：句子在首頁可見不在摺疊內、數字＝資料、抱著 %＝KPI；進階表 6 列；無水平捲動、免責句、無錯誤；截圖 `screenshots/v32-*.png`）。`home_v31` 版本斷言放寬到 v32。
- 結果：node 188／188；`test_forecast.py` 10／10；`events/test_events.py` OK；`test_refresh_xsrc.py` 4／4；`tests/test_cusum_exit.py` 7／7；`e2e`、`e2e_v2`～`e2e_v14`、`e2e_v18`～`e2e_v24`、`e2e_v26`～`e2e_v32`、`fallback` 本機全過。部署庫 `.lock` 05:40 原子建立。

## v31（2026-11-14）：「什麼時候會變」直接說變成多少（例：建議就會轉為加碼（放約 42%））

- 2026-11-14 04:37 台北開始（研究筆記 `/workspace/trading/research/crypto/CRYPTO-20261114-0437-flip-share.md`）。連續三次模型提案被否決（P-changepoint、P-trailing-stop、P-realized-moments），這次做幫實際決策的 App 改進。先查重：v29 首頁「什麼時候會變」和 v6／v30 黃色「接近翻轉」框只說會轉為「加碼／減碼／空手」，**沒說要放多少**；翻轉後的比例只在進階「這週可能要動手嗎」（v27「建議比例約 X%」）裡。CHANGELOG v4–v30 沒有首頁顯示翻轉後比例、也沒有驗證過這個估計準不準。不改預測規則、不是新訊號、不註冊。
- 首頁：「什麼時候會變：BTC 早上 8 點收盤高於 73,116 美元（比上次收盤+2.3%），建議就會轉為加碼（放約 42%）；盤中碰到不算。」ETH 同（放約 31%）。黃框同樣加上（例：「建議就會轉為加碼（放約 43%；現在 72,750，差 0.51%）」，只在黃框的翻轉線＝同一條時才顯示）。用語與首頁「建議：放你打算投入 X 的錢的 N%」一致：加碼＝「放約 N%」、減碼＝「降到約 N%」、空手＝「先不要放」。數字＝v27 卡同一個估計（`nextmove.js shareAfter`：翻轉後趨勢 × min(1, 30% ÷ 今天的 30 日波動)），用手機抓到的已收完日K算。
- **這個估計準不準（新回測 `backtest/flip_size_check.py`，只用已收完的 Binance 日K）**：2018 年起 BTC 226＋ETH 205＝431 次一階翻轉（資料到 2026-11-12），估的比例和翻轉當天實際比例：差 ≤ 5 個百分點 93.3%（2023 年起 200 次：90.0%）、中位差 0.29 個百分點；BTC OOS 90% 分位 5.7pp、ETH 2.5pp。差超過 15pp 只有 4 次，都是翻轉當天大漲大跌讓 30 日波動跳高（ETH 2026-08-19 單日 +17.5%：估 98%、實際 47%；BTC 2019-04-02 估 100%、實際 51%）；動作字（加碼／減碼／空手）和每日規則不同 5 次（1.2%，同樣是這種日子）。所以首頁寫「約」，進階卡說明這個例外並註明「真的變了以 08:20 每日預測為準」。改用「剛好收在翻轉價時的波動」估，BTC 90% 分位改善（4.0→2.7pp）但中位變差（0.29→0.46），不值得換、沒採用。
- SW `v31-2026-11-14`；`app.js` 版本 v31。帳本、凍結模型、registry、升級規則、`daily.sh`、`weekly.sh` 都沒動。建議不變 BTC 0、ETH 0。
- 測試：新增 `tests/home_v31.test.mjs` 3 項（shareAfter 用語；200 組隨機走勢首頁句＝v27 估計、加碼／減碼／空手用語一致；黃框接線、版本；`flip_size_check.py --end 2026-11-12` 重現卡上 431／93%／90%／ETH 8/19 98→47）與 `tests/e2e_v31.mjs`（iPhone 390×844：首頁句的 N% ＝進階 v27 卡「建議比例約 N%」、無術語；強制接近翻轉時黃框含比例、「什麼時候會變」空白；無水平捲動與錯誤；截圖 `screenshots/v31-near.png`）。`home_v29`（首頁句加上比例）、`home_v30`、`e2e_v29`、`e2e_v30` 的句型／版本斷言放寬到 v31。
- 結果：node 181／181；`test_forecast.py` 10／10；`events/test_events.py` 5／5；`test_refresh_xsrc.py` 4／4；`tests/test_cusum_exit.py` 7／7；ledger verify OK；`e2e`、`e2e_v2`～`e2e_v14`、`e2e_v18`～`e2e_v24`、`e2e_v26`～`e2e_v31`、`fallback` 本機全過。部署後：coin-signal f483f4c（crypto-predictor 303b904），線上 sw `v31-2026-11-14`，`verify_live.py` LIVE CHECK OK、`test_verify_live.py` 11／11、`e2e_v29`／`e2e_v30`／`e2e_v31` 線上也過。部署庫 `.lock` 04:38 原子建立、完成後移除。研究筆記 Drive 1crsF0PgKt-oC3VkN7RmYqPx_jb6AQ4nO。

## 提案 P-realized-moments（2026-11-14，不是 App 版本）：高頻已實現偏態／峰態／跳躍占比當冠軍的「只減碼」覆蓋層 → rejected

- 2026-11-14 03:32 台北開始（研究筆記 `/workspace/trading/research/crypto/CRYPTO-20261114-0332-realized-moments.md`，Drive 1BEt9xZ6WCbBppz0XiCg_usTftQOByDZ2）。先查重：P-vol-estimator／P-calibrated-band 是已實現「波動大小」，P-options-skew 是選擇權隱含偏態，P-intraday-guard 是小時K跌幅；**已實現三階／四階動差與 bipower 跳躍占比沒測過**。依據 Amaya, Christoffersen, Jacobs & Vasquez 2015 *JFE* 118(1):135–167（doi 10.1016/j.jfineco.2015.02.009）、Jia, Liu & Yan 2021 *Finance Research Letters* 39:101536（doi 10.1016/j.frl.2020.101536）、Barndorff-Nielsen & Shephard 2004 *J. Financial Econometrics* 2(1):1–37（doi 10.1093/jjfinec/nbh001），皆核對書目、讀摘要。
- 事先登記在 `forecast/proposals/proto_realized_moments.py` docstring（第一次執行前單獨 commit）。小時K快取 03:35 台北用 `backtest/fetch_hourly.py` 更新到 2026-11-13 18:00 UTC。
- 事先登記 commit 26fef04（03:33 台北），之後才跑 `--is-only` 與完整版各一次。日窗 7 天小時對數報酬（N ≥ 150）；RSK＝√N·Σr³／RV^1.5、RKT＝N·Σr⁴／RV²、JS＝max(0,1−BV/RV)；跟自己過去 365 天分位數比：rsk_hi（> q80）、krt_lo（< q20）、jump_hi（> q80）→ 冠軍 ×0.5，永遠 ≤ 冠軍。
- IS：冠軍 0.723；rsk_hi 0.430、krt_lo 0.558、jump_hi 0.579，**全部不合格**（fallback 領先 jump_hi）。**OOS 2024→ jump_hi 0.611／年化 10.2%／DD −19.3% vs 冠軍 0.836／15.9%／−18.4%（P 0.040、Holm 1.00、WF 不過）→ rejected**；rsk_hi 0.428（P 0.0005，顯著更差）、krt_lo 0.763（P 0.27）。成本每年多 1.0–1.6pp。各動差與下週報酬 Spearman |ρ| ≤ 0.12、方向跨幣跨期不一致；論文是橫斷面結果，沒轉成單幣時序訊號。截斷 400 根差 0；冠軍重建 < 2e−6。
- 今天（日K 11-12）：ETH jump_hi 觸發（JS 0.441 > 門檻 0.256），但冠軍兩幣空手。建議不變 BTC 0、ETH 0。寫在 `forecast/proposals/P-realized-moments.md`。
- `backtest/tested_signals.py` 加 realized_moments 白話列（本機重算到 /tmp：37 項 0 錯誤；`app/data/tested_signals.json` 照原計畫 11/16 weekly.sh 發布）。App 不改（仍 v30），帳本、凍結模型、registry、升級規則、daily.sh、weekly.sh 都沒動，沒註冊。
- 測試：node 178／178、`test_forecast.py` 10／10、`events/test_events.py` OK、`test_refresh_xsrc.py` 4／4、`tests/test_cusum_exit.py` 7／7、`test_verify_live.py` 通過、`verify_live.py` LIVE CHECK OK（線上仍＝v30）。e2e 未重跑（App 沒改）。

## 提案 P-trailing-stop（2026-11-14，不是 App 版本）：移動停損（Le Beau 吊燈停損 chandelier／ATR、Donchian 20 日低點）當冠軍的「只出場」覆蓋層 → rejected

- 2026-11-14 02:35 台北開始（研究筆記 `/workspace/trading/research/crypto/CRYPTO-20261114-0235-trailing-stop.md`，Drive 15eV1IHX4TQv6tn5Av-9BaUaoh7PLuBqY）。先查重：P-intraday-guard 是小時K、相對上一根日收盤的固定 % 跌幅（每天重設），P-drawdown-regime 是回撤分位數減半，P-trend-ensemble 的 Donchian 是獨立進出場；**日K、ATR 尺度、跨日只升不降、附回場規則的移動停損沒測過**。依據 Kaminski & Lo 2014 *J. Financial Markets* 18:234–254（doi 10.1016/j.finmar.2013.07.001，核對書目、讀摘要）、Le Beau chandelier exit（StockCharts ChartSchool；Weintraub《Trading Chicago Style》引述 Le Beau，已讀）。
- **事先登記**（`forecast/proposals/proto_trailing_stop.py` docstring；第一次執行前單獨 commit 55c46ba，02:38 台北；docstring 寫的「~02:50」是撰寫時的預估）：ATR22 Wilder；ce22＝22 日最高 − 3×ATR22；ce_entry＝持有段進場以來最高 − 3×ATR22、只升不降（Le Beau 原版）；dc20＝前 20 根最低。收盤跌破 → 0；回場需 trend3 上升（冠軍重新訊號）且收盤 > 停損；永遠 ≤ 冠軍；p_up 沿用冠軍。判定 candidate／observe／rejected 規則同慣例（IS 2022–23 選模、OOS 2024→、bootstrap ≥ 0.975、Holm、×0.85、const_scale、maxDD、WF）。`--is-only` 先跑。
- IS：冠軍 Sharpe 0.723；ce22 0.635、**ce_entry 0.769／maxDD −13.7%（唯一合格 → 領先）**、dc20 0.559。**OOS 2024→ ce_entry 0.394／年化 4.6%／DD −19.4% vs 冠軍 0.836／15.9%／−18.4%（P(較好) 0.163、Holm 1.00、WF 0.556 不過）** → **rejected**。ce22 OOS 0.997／DD −18.0%（P 0.61），但 IS 不合格、事前不會被選，ATR 倍數 2／3／4 的 IS–OOS 排序相反（×2：IS 0.117、OOS 1.143）；dc20 0.863（P 0.41）。
- 診斷（只報告）：ce_entry 停損中那幾天幣的平均日報酬 BTC +0.105%／ETH +0.195%，**高於**持有日 +0.084%／+0.137%（負的停損溢酬）；日報酬 lag-1 自我相關 OOS BTC −0.053、ETH −0.010（2018–21 約 −0.1）＝短期沒有動能，符合 Kaminski–Lo「沒有動能時停損會降低報酬」。2018-09→2021 三版都低於冠軍（1.703）。截掉 400 根重算差 0；冠軍＝WF 快取 < 2e−6；每天斷言覆蓋層 ≤ 冠軍。
- 今天（日K 11-12）：冠軍兩幣 trend3 = 0、空手，停損不適用。建議不變 BTC 0、ETH 0。
- `backtest/tested_signals.py` 加 trailing_stop 白話列（本機重算到 /tmp：36 項 0 錯誤；`app/data/tested_signals.json` 照原計畫 11/16 weekly.sh 發布）。App 不改（仍 v30），帳本、凍結模型、registry、升級規則、daily.sh、weekly.sh 都沒動，沒註冊。
- 測試：node 178／178、`test_forecast.py` 10／10、`events/test_events.py` 5／5、`test_refresh_xsrc.py` 4／4、`tests/test_cusum_exit.py` 7／7、ledger verify OK、`test_verify_live.py` 11／11、`verify_live.py` LIVE CHECK OK（線上仍＝v30）。e2e 未重跑（App 沒改）。

## v30（2026-11-14）：接近翻轉時，首頁不再把同一個翻轉價講兩次

- 2026-11-14 01:32 台北開始（研究筆記 `/workspace/trading/research/crypto/CRYPTO-20261114-0132-flip-price-dedupe.md`，Drive 1kM_PCKifJgAVsiMdENvHJxk6BJRMpNXE，commit crypto-predictor 9ae149f／coin-signal 2f10571，LIVE CHECK OK）。v29 的 CHANGELOG 自己列的後續：離翻轉價不到 1% 時，首頁每個幣同時有黃色「接近翻轉」框（v6）和新的「什麼時候會變」（v29），兩行講同一個價格、同一個動作。不是新訊號、不改預測規則、不註冊。
- 修正：黃框出現時，「什麼時候會變」那行留空（CSS `.trig:empty` 本來就隱藏）；黃框沒出現（離翻轉價 ≥ 1%，今天就是這樣的常態）時行為與 v29 完全相同。保留黃框是因為它多了台幣換算（MAX 約 NT$）與「差距很小，各交易所可能給不同答案」。黃框文字順手改白話：「規則會轉為」→「建議就會轉為」（與 v29 同一句型），並修掉標點瑕疵（沒有台幣換算時是「美元，，規則」、有時是「美元，（…），規則」，現在是「美元（在 MAX 約 NT$…），建議就會轉為…」）。
- 重看 iPhone 390×844 首頁：外面只剩建議、原因、什麼時候會變（或黃框）；沒有新的術語或重複，沒有其他改動。
- SW `v30-2026-11-14`；`app.js` 版本 v30。帳本、凍結模型、registry、升級規則、`daily.sh`、`weekly.sh` 都沒動。
- 測試：新增 `tests/home_v30.test.mjs`（接線）與 `tests/e2e_v30.mjs`（iPhone 390×844；正常時有「什麼時候會變」、強制把手機快取最後一根收盤移到翻轉價 0.5% 處並擋掉外部 API：黃框出現、「什麼時候會變」為空、翻轉價在可見文字只出現一次、無水平捲動與錯誤；截圖 `screenshots/v30-near.png`）。版本號斷言（e2e_v6～v29、guard／exec_timing／home_v29 等）放寬到接受 v30；`e2e_v6` 黃框句型改新措辭。

## v29（2026-11-14）：首頁回到「一眼看懂」（每個幣只留建議、原因、什麼時候會變；其他收進「看細節」）

- 2026-11-14 00:31 台北開始（研究筆記 `/workspace/trading/research/crypto/CRYPTO-20261114-0031-homepage-progressive-disclosure.md`）。今晚連續四個模型提案（P-gbdt、P-kalman-trend、P-changepoint 否決，P-cusum-exit 前向追蹤），任務建議的未測模型家族都查過已測（ETH／BTC 相對強弱＝P-relative-strength、傳統市場＝P-cross-asset、日曆＝P-calendar-cycle），所以這次做首頁。v4 把首頁縮成只剩「未來一週預測建議」，之後 v5–v28 每版都往首頁卡加一行：線上 v28 首頁卡（空手時）有 **1,323 個字**，每個幣 8 段＋卡底 5 段，和宗要的「最上面簡單、沒術語」越離越遠；CHANGELOG v5–v28 沒有任何一版做過收合整理。不改預測規則、不是新訊號、不註冊、**沒有刪任何內容**。
- 依據：Nielsen (2006)〈Progressive Disclosure〉（NN/g，已讀全文）：先只顯示最重要的少數項目，其他「要的時候再展開」；展開的入口要明顯、標籤要說清楚裡面有什麼；最多兩層。這是溝通修正，不宣稱提高準確度。
- 首頁卡每個幣現在看得到：幣名＋建議大字（空手／加碼／持有／減碼）、資料狀態小標（有問題時的「接近翻轉」黃框也照常出現）、「建議：先不要放（0%）」、原因、**新的一行「什麼時候會變」**（例：「BTC 早上 8 點收盤高於 73,116 美元（比上次收盤 +2.3%），建議就會轉為加碼；盤中碰到不算。」＝v27 同一個翻轉價與距離，用手機抓到的已收完日K算，`nextmove.js triggerLine`）；有放錢時（建議 > 0%）「運氣差的一週會少多少」也留在外面（風險提醒）；填了部位時的金額句照舊。
- 收進每個幣的「看 X 的細節（盤中價、一週價格範圍、過去紀錄）」：盤中價那行（v13／v28）、漲跌方向一半一半（v11）、一週價格範圍（v28 標籤）、空手時的運氣差一週（v18）、過去出現同樣建議後的一週（v8）。收進卡底「更多說明（空手多久、這週動手的機率、要不要每天微調）」：v26 空手多久、v27 這週會不會要動手（含 7 天內發生比例）、v19 不用每天微調／變成先不要放要當天照做、填部位提示。「還沒有證明能贏過一直抱著」那句和決策紀錄按鈕留在外面。預設收合、不記憶；元素 ID 不變，所以每 5 分鐘的即時價更新、金額換算照常。
- 結果（11/14 00:40 台北，兩幣空手）：首頁卡**看得到的字 391／1,323（30%）**，「預測成績單」在 iPhone 第一屏底部就看得到。數字全部是原本頁面上就有的，沒有新數字來源。
- SW `v29-2026-11-14`；`app.js` 版本 v29。帳本、凍結模型、registry、升級規則、`daily.sh`、`weekly.sh` 都沒動。建議不變 BTC 0、ETH 0。
- 測試：新增 `tests/home_v29.test.mjs` 3 項（triggerLine 空狀態、200 組隨機走勢與 v27 首頁句同價格同距離同動作、週檔備援；接線：ID 都在、收合位置、免責句在外、版本）；新增 `tests/e2e_v29.mjs`（iPhone 390×844：兩個細節區和「更多說明」預設收合、外面只看得到建議／原因／什麼時候會變（＝頁面用 nextmove.js 重算）、看得到的字 ≤ 60%、外面沒有術語、打開後 v13／v18／v26／v27／v28 內容都看得到、無水平捲動與主控台錯誤；截圖 `screenshots/v29-home.png`、`v29-home-open.png`）。`e2e_v26`、`e2e_v27` 的「首頁句看得到」改成先打開「更多說明」再檢查（其他斷言不變）。
- 結果：node 177／177；`test_forecast.py` 10／10；`events/test_events.py` OK；`test_refresh_xsrc.py` 4／4；`tests/test_cusum_exit.py` 7／7；ledger verify OK；`e2e`、`e2e_v2`～`e2e_v14`、`e2e_v18`～`e2e_v24`、`e2e_v26`～`e2e_v29`、`fallback` 本機全過（`e2e_v26`／`e2e_v27` 第一次因「首頁句看得到」斷言失敗＝預期，改成先打開「更多說明」後通過）。`test_verify_live.py` 部署前照預期因「原始碼≠部署庫」失敗。
- 部署後檢查：coin-signal d976cfa 已推送（本機 crypto-predictor 6ebda3f）；線上 sw `v29-2026-11-14`；`verify_live.py` LIVE CHECK OK；`test_verify_live.py` 11／11；`e2e_v29`、`e2e_v28`、`e2e_v27` 線上也過。部署庫 `.lock` 00:32 原子建立、完成後移除。研究筆記 Drive 1NAXb3xZtVOR2NUyuefUCobHMhGrW0RGv。

## 提案 P-cusum-exit（2026-11-13，不是 App 版本）：CUSUM「只出場」覆蓋層重新事先登記，只用 2026-11-14 以後的資料前向影子追蹤 → collecting（0 個前向天）

- 2026-11-13 23:31 台北開始（研究筆記 `/workspace/trading/research/crypto/CRYPTO-20261113-2330-cusum-exit-forward.md`，Drive 1NE2jfyVow-w83-JOssPXAhTaGdxvUmnw）。22:36 的 P-changepoint 判定 rejected 後，事後拆解發現好處幾乎全來自「CUSUM 向下警報後 30 天把冠軍投入減半」；那是看過歷史才挑出來的，歷史不能再驗證它，所以照該提案的建議**重新事先登記、只用寫規則時還不存在的資料**。依據 Page 1954 Biometrika 41:100–115（先前已核對書目）與 P-changepoint 的結果／事後拆解檔。
- **事先登記 23:33 台北**（`forecast/proposals/proto_cusum_exit.py` docstring＋`SPEC`，spec sha256 4b13a706…；第一次執行前先單獨 commit 7002514）：標準化日 log 報酬雙邊 CUSUM k 0.5、h 5，警報後狀態 30 根（新警報取代）；狀態 −1 且冠軍有部位 → 冠軍 × 0.5；**沒有向上回補**；成本與冠軍相同（0.15%／邊＋買進 0.27%）。前向起點＝第一根日期 ≥ 2026-11-14 的已收盤日K；損益、警報、事件只算 ≥ 11-14 的K。**最低樣本**：≥ 56 個前向天且 BTC＋ETH ≥ 4 個已完成的有作用向下事件（可能要一年以上；不放寬）。**成功標準**：前向淨報酬 ≥ 冠軍、最大回撤不更深、事件超額總和 > 0 且至少一半 > 0、成本/年 ≤ 冠軍＋1pp。達標也只代表「可以在週檢討提出」；**註冊只能經週檢討＋8 週實測規則，追蹤器與每小時例行永不註冊。**
- 追蹤器輸出 `forecast/proposals/proto_cusum_exit_shadow.json`（每天兩幣的冠軍／覆蓋層投入、CUSUM S+／S−、警報、前向統計；檔名刻意不符合 `proto_*_results.json`，所以 `tested_signals.py` 不列它，**這次不加 tested_signals 列**——它還沒有任何結果）。**沒有接進 daily.sh／weekly.sh、帳本、registry、凍結模型**；週檢討若要看，可在刷新後執行 `python3 proposals/proto_cusum_exit.py` 讀 `status`／`forward.pooled`／`min_sample`（P-cusum-exit.md 有說明）。
- 今天（日K 11-12）：狀態 **collecting**、前向 0 天。BTC CUSUM 狀態 0、S− 2.80／5（上次警報 2026-08-21 向上），約再一天 −5.1% 左右（或幾天累積下跌）才會向下警報；ETH 狀態 0、S− 3.56／5（上次 2026-08-19 向上），約一天 −5.0%。冠軍兩幣空手，所以就算警報，覆蓋層也是 0。建議不變 BTC 0、ETH 0。
- 新增 `tests/test_cusum_exit.py` 7 項：規格凍結（sha256 釘住，改了就失敗）；無偷看（截掉最後 1／7／30／400 根、把後 200 根換成亂數走勢，之前的投入／狀態／S 完全相同）；與 P-changepoint 的只出場序列逐日相同；前向只看 ≥ 起點的K（今天 0 前向天；合成資料把起點前所有列亂改，前向統計一字不差；起點晚一天就少一根）；事件與「只出場」語意（覆蓋層永遠 ≤ 冠軍）；決定性（跑兩次 JSON 相同）；沒有接線（例行腳本、registry 都不提它、原始碼不寫帳本）。
- App 不改（仍 v28），帳本、凍結模型、registry、升級規則、daily.sh、weekly.sh 都沒動，沒註冊。
- 測試：node 174／174、`test_forecast.py` 10／10、`test_verify_live.py` 11／11、`events/test_events.py` 5／5、`test_refresh_xsrc.py` 4／4、`tests/test_cusum_exit.py` 7／7、ledger verify OK、`verify_live.py` LIVE CHECK OK（線上仍＝v28）。commit 7002514（事先登記）／3510053。

## 提案 P-changepoint（2026-11-13，不是 App 版本）：變點偵測（CUSUM／貝氏線上變點 BOCPD）當冠軍的快速出場／回補覆蓋層 → rejected（CUSUM 只出場列觀察）

- 2026-11-13 22:37 台北開始（研究筆記 `/workspace/trading/research/crypto/CRYPTO-20261113-2236-changepoint.md`，Drive 1uKnpWhinvO1ovZKxQ-laeJtrO47K2lcT）。任務建議的新模型家族：已測 HMM（固定狀態）、回撤門檻、盤中跌幅、卡爾曼、波動估計器，**序列變點偵測從沒測過**。依據 Adams & MacKay 2007（arXiv:0710.3742，已讀全文）、Page 1954 Biometrika 41:100–115（核對書目）、Li 2026 ACM CSMT 與 Ding（BOCPD／CUSUM 用在股市，已讀摘要）。
- `forecast/proposals/proto_changepoint.py` 事先登記（~22:45 台北寫在 docstring、先於任何結果；`--is-only` 先跑）：BOCPD Normal-Gamma（μ0 0、κ0 1、α0 1、β0 1e−3、hazard 1/250＝論文值），每天算 cp10（10 天內有變點的機率）、預測波動、目前這段平均報酬；CUSUM 標準化日報酬 k 0.5、h 5、警報後 30 天。版本 cp_gate（剛換到更高波動段→減半）、cp_mean（½ trend3 + ½[段平均 > 0]）、cusum_ovl（向下警報→減半、向上警報且 trend3<1→+0.25vt）；對照 ×0.85、const_scale（c 1.0016）。
- IS 2022–23 三版都不合格（冠軍 Sharpe 0.723；gate 0.673、mean 0.250、cusum 0.712）→ fallback 領先 cusum_ovl。**OOS 2024→ cusum_ovl Sharpe 0.912／年化 17.5%／DD −17.1%／成本 3.01% vs 冠軍 0.836／15.9%／−18.4%／3.23%（P(較好) 0.973、門檻 0.975；Holm 0.081；WF 通過）**；cp_gate 0.758（P 0.050）、cp_mean 0.717／DD −21.1%（Brier 0.25162，DM p 0.36）。IS 不合格＋bootstrap 差一點 → **rejected**。hazard 100／1000 也不比冠軍好。截掉 400 根重算差 0；冠軍＝WF 快取 < 2e−6。
- 偵測延遲（事後標籤，只診斷）：OOS BTC 15 次大跌，7 天內 cp10 響 4 次、CUSUM 5 次；ETH 12 次中 3／2 次——多數大波動事前與當週都抓不到。事後拆解（判定後才跑、不能選模）：好處幾乎全來自「向下警報後 30 天減半」（只出場 IS 0.760、OOS 0.913；只回補 OOS 0.836），但 OOS 只作用 BTC 43 天／ETH 76 天、各 7–8 次警報。若要繼續，須**重新事先登記**「CUSUM 只出場」並只用 11/14 以後資料前向影子追蹤，之後才談註冊與 8 週實測。
- 今天（日K 11-12）：BTC cp10 0.023、CUSUM 狀態 0；ETH cp10 0.154、狀態 0；冠軍兩幣空手、三版也是 0。建議不變 BTC 0、ETH 0。
- `backtest/tested_signals.py` 加 changepoint 白話列（本機重算 35 項 0 錯誤；`app/data/tested_signals.json` 照原計畫 11/16 weekly.sh 發布）。App 不改（仍 v28），帳本、凍結模型、registry、升級規則、daily.sh、weekly.sh 都沒動，沒註冊。
- 測試：node 174／174、`test_forecast.py` 10／10、`test_verify_live.py` 11／11、`events/test_events.py` 5／5、`test_refresh_xsrc.py` 4／4、ledger verify OK、`verify_live.py` LIVE CHECK OK（線上仍＝v28）。commit 418988d。

## 提案 P-kalman-trend（2026-11-13，不是 App 版本）：卡爾曼濾波趨勢（狀態空間平滑趨勢模型，取代或混合 50／200 日均線）→ rejected

- 2026-11-13 21:38 台北開始（研究筆記 `/workspace/trading/research/crypto/CRYPTO-20261113-2138-kalman-trend.md`，Drive 18JNsgJPXV03U-FTsj4IE0d4qduZFeWkN）。選 (a) 新趨勢估計器家族：已測過 tsmom、多均線／Donchian 集成（P-trend-ensemble）、均線長度格點（P-trend-robustness）、盤整程度（P-trend-quality）、HMM（P-regime-hmm），**狀態空間／卡爾曼濾波從沒測過**；(b) 變點偵測與已否決的 HMM 太重疊，(c) 事前訊號已由 v5／P-events-A/B/C 做過，(d) 首頁今天已改 6 版，故不選。依據 Kalman 1960、Harvey 1989、Harvey–Jaeger 1993、Bruder–Dao–Richard–Roncalli 2011（已讀摘要與部分正文）。
- 事前發現：自由 MLE 的 local linear trend（≤2021）斜率變異退化成 ≈0（BTC 7.9e−12、ETH 3.0e−8）＝資料選不出平滑度，所以平滑度事先固定。`forecast/proposals/proto_kalman_trend.py` 事先登記（~21:40 台北寫在 docstring、先於任何結果；`--is-only` 先跑）：log 收盤平滑趨勢模型、單邊濾波，HP 半增益週期對齊 50／200 日（λ 4,021／1,026,767）；kf_slope3（兩條斜率向上各半）、kf_level3（價格在兩條濾波線之上各半）、kf_mix（½ trend3 + ½ kf_slope3），× 冠軍相同波動目標；對照 ×0.85、const_scale（c 0.9875）。
- IS 2022–23 三版都不合格（冠軍 Sharpe 0.723；slope3 0.319、level3 0.250、mix 0.543）→ fallback 領先 kf_mix。**OOS 2024→ kf_mix Sharpe 0.661／年化 11.5%／DD −21.5%／成本 2.69% vs 冠軍 0.836／15.9%／−18.4%／3.23%（P(較好) 0.053）**；kf_slope3 0.436／6.7%／−26.3%（P 0.039），翻轉 BTC 33.5→20.2 次/年、14 天內翻回 71%→38%（少翻轉但轉向太慢）；kf_level3 0.752／DD −19.0%／成本 7.45%（翻轉 65.2 次/年），Brier 0.25065 vs 0.25228（DM p 0.44，仍輸一律 50%）。Holm 全 1.00、WF 2022→ 全不過 → **rejected**。2018-09→2021 slope3 1.845 vs 冠軍 1.703（只有大多空循環好看）。截掉 400 根重算差 0；冠軍＝WF 快取 < 2e−6。
- 今天（日K 11-12）：BTC 快斜率 −0.53%/天、慢斜率 +0.10%/天，ETH −0.73%／+0.04%；冠軍兩幣空手。建議不變 BTC 0、ETH 0。
- `backtest/tested_signals.py` 加 kalman_trend 白話列（本機重算 34 項 0 錯誤；`app/data/tested_signals.json` 照原計畫 11/16 weekly.sh 發布）。App 不改（仍 v28），帳本、凍結模型、registry、升級規則、daily.sh、weekly.sh 都沒動，沒註冊。
- 測試：node 174／174、`test_forecast.py` 10／10、`test_verify_live.py` 11／11、`events/test_events.py` OK、`test_refresh_xsrc.py` 4／4、ledger verify OK、`verify_live.py` LIVE CHECK OK（線上仍＝v28）。commit 8c3ec00。

## 可靠度：修好週一 weekly.sh 的三個問題（2026-11-13，不是 App 版本；11/16 09:00 第一次完整週檢討之前）

- 2026-11-13 20:35 台北開始（研究筆記 `/workspace/trading/research/crypto/CRYPTO-20261113-2035-weekly-reliability-fixes.md`，Drive 1Eub-cFnYVxHrqnsDZepItemNfkFGuSju；commit 03c83b4）。19:37 的彩排找到、cs 決定要在週一前修的三件事：(1) weekly.sh 本機 commit 用一整行 `git add`，任何一個列出的檔不在就**整批不加**、被 `|| true` 吞掉，而且漏了 `app/data/events.json`；(2) 盡力而為的步驟失敗時只印一行，weekly.sh 照樣 **exit 0**（例行會回報「成功」，但卡片停在舊版）；(3) 部署庫的 `.lock` 只等 20 分鐘，週一 08:30 那次每小時例行若佔著鎖到 09:20 以後，weekly 就 `PUBLISH SKIPPED`。不改預測、不是新訊號、不註冊、不動帳本／凍結模型／升級規則。
- 新增 `forecast/routine_lib.sh`（daily.sh、weekly.sh、events/publish.sh 共用）：`take_lock`（用 noclobber 原子建立 `.lock`，內容「誰 台北時間 pid」；等待時寫 `.lock-wanted`，拿到或放棄時刪掉；`.lock` 滿 2 小時＝和每小時例行相同的「過期」規則，記一行後移除；逾時回 3）、`soft`（明確標示的盡力而為步驟：失敗印 `STEP FAILED (best-effort, continuing): …`、記下來、繼續）、`stage_existing`／`commit_local`（每個存在的路徑分別加入，缺的／被 ignore 的各印一行、不讓整批失敗；沒有變動不是錯誤）、`finish`（最後一行 `WEEKLY OK: all steps succeeded` 或 `WEEKLY FAILED: n best-effort step(s) failed: …`，有失敗時 exit 0→2）。
- `weekly.sh`：7 個盡力而為步驟（events_weekly、trust_export、refresh_all、小時K＋intraday、tested_signals、refresh_xsrc、本機 commit）改用 `soft`；核心步驟（review_weekly.py、run_daily.py --no-fetch、部署庫複製／commit）失敗由 ERR trap 印 `WEEKLY FAILED: core step exited N at line L: 指令` 並停止（非 0）。本機 commit 改成逐路徑（含 events.json），部署庫 `git add` 也改逐路徑。鎖：本機週檢討／刷新／commit **不需要鎖**，只有發布前才拿；最多等 `WEEKLY_LOCK_WAIT_MIN`＝100 分鐘（每 30 秒看一次）。exit：0 OK、1 核心步驟／PUBLISH FAILED／LIVE CHECK FAILED、2 有盡力而為步驟失敗（其餘照樣發布）、3 鎖等不到（本機已 commit、線上沒更新）。
- `daily.sh`：同一套鎖（最多 60 分鐘、`.lock-wanted`、2 小時過期）和逐路徑本機 commit（events.json 不在時帳本仍會 commit）；其他步驟與 exit 行為不變。`events/publish.sh`：同一套鎖，仍等 20 分鐘。
- 每小時例行那一側：建議在例行提示加一句「`.lock` 或 `.lock-wanted` 存在且未滿 2 小時就只規劃」（`.lock-wanted` 代表有排程發布在排隊）。
- `forecast/weekly_rehearsal.sh`：顯示新的 STEP／WEEKLY／LOCK／commit 行；`STEP FAILED` 算「步驟退回舊檔」；沒看到 `WEEKLY OK` 就判失敗。
- 測試：新增 `tests/routines.test.mjs`（10 項，在暫存假目錄上跑**真正的** weekly.sh／daily.sh，只換路徑那一行，python 步驟是樁、部署推本機 bare repo）：全部正常→exit 0、本機 commit 含 events.json、遠端收到、再跑一次「nothing changed」；缺 events.json／nextmove.json→各印一行、其他照樣 commit，之後出現會補上；tested_signals 失敗→exit 2＋`WEEKLY FAILED: 1 best-effort step(s) failed`、其他照樣發布；review_weekly 失敗→非 0、`WEEKLY FAILED: core step`、沒發布、沒拿鎖；verify_live 失敗→exit 1；鎖被每小時例行佔著→等待（寫 `.lock-wanted`）、釋放後發布；一直佔著→exit 3、本機 commit 在、別人的鎖不動；3 小時前的鎖→移除後發布（weekly＋daily）；daily 同樣等待、逐路徑 commit；6 個同時搶鎖只有 1 個贏；接線檢查。修改舊接線測試的比對（`|| echo`→`soft`、`git add`→`stage_existing`）：fresh、intraday、trust、xsrc、tested、`test_refresh_xsrc.py`、`test_verify_live.py`。

## 可靠度：週一 weekly.sh 事前彩排（2026-11-13，不是 App 版本；在複本上跑完整刷新＋發布＋線上檢查＋全部測試）

- 2026-11-13 19:37 台北開始。11/16（週一）09:00 是第一次跑「完整」的 weekly.sh：v10 以後加了 spells、nextmove、xsrc、tested_signals（今天 6 個提案、33 列首次上線）等步驟，**從沒有整段實際跑過**；而 weekly.sh 很多步驟失敗時只印一行、照樣 exit 0，週一才發現就要再等一週。任務建議 (a) 虛擬投組卡：v9「紀錄可信度」卡已列每個模型的虛擬投資金額、且只有 3 天，不重做；(b) 做這個。不改預測、不是新訊號、不註冊。依據：Beyer 等《Site Reliability Engineering》(O'Reilly 2016) 第 17 章「Testing for Reliability」（在與正式環境相同的設定上演練、先驗證再發布）、Humble & Farley《Continuous Delivery》(2010)（類正式環境的部署演練）。
- 新增 `forecast/weekly_rehearsal.sh`（手動／例行代理人可在週一前跑；**沒有接進 daily.sh／weekly.sh**）：把 crypto-predictor 與 coin-signal-repo 複製到 `/tmp/weekly-rehearsal.*`，部署庫改推到本機 bare repo（絕不推 GitHub）；**原封不動使用 weekly.sh**，只改兩個路徑變數和最後的 `verify_live.py`（改指向本機 http 伺服器上的彩排網站，同一套 push／source／served／雜湊鏈／首頁＝帳本檢查）；路徑改寫後還有 `/workspace` 就中止。之後在刷新後的複本跑 node 單元測試、`test_forecast.py`、帳本驗證、25 個 iPhone e2e（對彩排網站）。前後比對真實帳本／registry／凍結模型／app/data／reports／backtest/data、兩個 repo 的 HEAD 與 origin、review_weekly.py／daily.sh／weekly.sh 的指紋，不同就 exit 4。另會抓 weekly.sh 自己吞掉的問題：任何步驟「failed／kept previous／WARNING」、本機 weekly commit 沒發生（`git add` 有一個檔不在就整批不加、被 `|| true` 吞掉）、彩排遠端沒收到 weekly commit。測試 hook `REHEARSAL_PRE`（只在複本內執行，例行程序不用）。
- **彩排結果（今天的資料，日K 11-12）：REHEARSAL OK**。weekly.sh rc 0、68–76 秒；events／週檢討（4 個挑戰者全部「不升級」，live 0 筆已評分，第一次評分 11/17）／trust（forecasts 30、chain ok）／refresh_all 9 個資料集全 ok（as_of 2026-11-12）／小時K＋intraday／tested_signals **33 項 0 錯誤**／refresh_xsrc OK（沒有新K）；推送 18 個檔；**LIVE CHECK OK**；node 163／163（含 tested.test，週一發布後警告消失）、test_forecast 10／10、帳本驗證 OK；e2e 25 個全過（`e2e_v14` 33 項、SW v28）。真實系統指紋前後相同。
- 負向檢查（證明真的抓得到）：在複本讓 `tested_signals.py` 一開始就 exit 1 → weekly.sh 自己仍 rc 0、LIVE CHECK OK（＝週一會「看起來成功」但「試過的訊號」卡停在舊版），彩排則判 **REHEARSAL FAILED**（步驟退回舊檔＋node 1 項失敗），exit 1。刪掉 spells.json → refresh_all 會重產，彩排 OK（正確）。
- 找到但**沒改**的（避免週一前動例行腳本）：(1) weekly.sh 本機 commit 的 `git add` 是一整行，任何一個列出的檔不存在就全部不加、被 `|| true` 吞掉（目前所有檔都在，彩排會抓到）；本機 commit 也沒加 `app/data/events.json`（隔天 daily.sh 會補）。(2) 鎖最多等 20 分鐘，若週一 08:36 的每小時例行佔著鎖超過 09:20，weekly 會 `PUBLISH SKIPPED`（exit 3、會通知），刷新的資料要等手動或下週才上線。(3) backtest／decision／dca 的 2018–2022 區塊每次重跑會變一點：只是 bootstrap p 值（0.406→0.400 等，跟樣本長度有關）和 Yahoo 調整後收盤造成 NT$1 差，不是偷看未來。要不要修 (1)(2) 給宗決定。
- 測試修正：`tests/e2e_v13.mjs` 用畫面上四捨五入後的盤中價（如 1,961）重算距離，App 用未四捨五入的價（1,960.6）→ 偶爾差 0.1 個百分點而失敗（v26 也遇過）；改成接受 ±0.5 美元內任何價算出的距離。對線上跑 3 次全過。新增 `tests/rehearsal.test.mjs` 1 項（彩排改寫的兩行仍在 weekly.sh、暫存複本、本機 bare remote、殘留路徑就中止、前後指紋、不含 register／github.io／git push、例行腳本沒呼叫它）。
- App 不改（仍 v28，不需換 SW）；帳本、凍結模型、registry、升級規則、daily.sh、weekly.sh 都沒動，沒註冊。建議不變 BTC 0、ETH 0。
- 研究筆記 `/workspace/trading/research/crypto/CRYPTO-20261113-1937-weekly-rehearsal.md`（Drive 13kpk3EQb7mNct3fu2AAGgW9_jgbKsDuv）；commit 30fee57。
- 結果：node 164／164；`test_forecast.py` 10／10；`events/test_events.py` 5／5；`test_verify_live.py` 11／11；`test_refresh_xsrc.py` 4／4；ledger verify OK；`verify_live.py` LIVE CHECK OK（線上＝v28）；彩排 REHEARSAL OK（含 25 個 e2e）。

## 提案 P-gbdt（2026-11-13，不是 App 版本）：梯度提升樹分類器（機器學習新模型家族，逐月只用已知結果的過去資料重訓）→ rejected

- 2026-11-13 18:37 台北開始（研究筆記 `/workspace/trading/research/crypto/CRYPTO-20261113-1837-gbdt-walkforward.md`，Drive 1MswT3ilm4x5kgy5raizUrIpcoB6MmElg）。任務建議 (a) 資料過期警示已由 v6／v9／v20 涵蓋、(b) 帳本命中率要等 11/17 才有第一筆評分（scores.jsonl 0 列），所以做 (c) 新模型家族：現有挑戰者是線性 logit、最近鄰 knn、tsmom，今天否決的 HMM 是狀態模型，**樹狀集成從沒測過**。依據 Friedman 2001、Ke et al. 2017（LightGBM）、Gu–Kelly–Xiu 2020 RFS、Jaquart–Dann–Weinhardt 2021 JFDS 7:45–66（BTC 分鐘級 GBDT 最好但扣成本為負）、López de Prado 2018（purge）。
- `forecast/proposals/proto_gbdt.py`：事先登記（18:39 台北寫在 docstring、先於任何結果；`--is-only` 先跑）sklearn `HistGradientBoostingClassifier`（200 輪、學習率 0.05、深度 3、葉 ≥ 100、L2 1、不 early stop、random_state 0，未調參），10 個價格特徵（d50、d200、mom7/30/90/180、vol30、7÷30 日波動、rsi14、離一年高點），兩幣合併；2022-01 起每月第一根日K重訓，只用 ≤ d−7 天（標籤已知）的列，59 次、訓練列 2,786→6,316。版本 gb_cut（p<0.45 減半）、gb_reentry（p>0.55 且空手／減碼 +0.25vt）、gb_standalone（vt×1[p>0.5]）、gb_pup_raw、gb_pup_blend、gb_lead_pup；對照 const_scale（c 0.9259）、×0.85。
- IS 2022–23 三版都不合格（冠軍 0.723；cut 0.508、reentry 0.438、standalone −0.603），無領先。**OOS 2024→ gb_cut 0.579／年化 9.3%／DD −19.8%／成本 4.96% vs 冠軍 0.836／15.9%／−18.4%／3.23%（P 0.015，Holm 較差 0.058）**；reentry 0.759／−22.2%（P 0.176）；standalone −0.116／−4.6%／−39.0%（成本 14.2%／年）。上漲機率 Brier：raw IS 0.27341／OOS 0.26144 vs 冠軍 0.25202／0.25228（DM −1.82 p 0.068，變差），blend 0.25416（p 0.442）；OOS 校準 GB 0.36→實際 50.5%、0.67→55.0%（過度自信）；排列重要度 mom30／mom90／rsi14 打亂反而更準＝擬合雜訊。t−1 結論相同；WF 全不過 → **rejected**。冠軍＝WF 快取 < 2e−6、重訓決定性差 0、截掉 400 根抽 4 月重訓差 0。
- 今天（日K 11-12）：GB p_up BTC 0.419、ETH 0.537；冠軍兩幣空手，所以 cut／reentry 都是 0。建議不變 BTC 0、ETH 0。
- `backtest/tested_signals.py` 加 gbdt 白話列（「試過但沒通過的訊號」，本機重算 33 項 0 錯誤；`app/data/tested_signals.json` 照原計畫 11/16 weekly.sh 發布）。App 不改（仍 v28），帳本、凍結模型、registry、升級規則、daily.sh、weekly.sh 都沒動，沒註冊。
- 測試：node 163／163、`test_forecast.py` 10／10、`events/test_events.py` OK、`test_refresh_xsrc.py` 4／4、`test_verify_live.py` 全過、ledger verify OK、`verify_live.py` LIVE CHECK OK（線上仍＝v28）。commit 35681bb。

## v28（2026-11-13）：首頁每個價格都標清楚是「盤中」還是「哪天早上 8 點的收盤」

- 2026-11-13 17:36 台北開始。今天六個疊加訊號都被否決、v26／v27 是決策功能，這次做首頁白話與數字一致性（任務建議清單中的「首頁白話修飾」）。v4–v27 沒做過：v6／v13 加了盤中價、v24 台幣翻轉價、v27 用「比上次收盤 +x%」，但首頁同一張卡上**同時出現兩個價格卻沒說差在哪**：盤中句「BTC 69,081 美元，再漲 5.8% 會碰到翻轉價」，幾行下面價格區間卻寫「現在 $71,460」（其實是 11/13 早上 8 點的收盤），v27 句又寫「比上次收盤 +2.3%」。三個數字都對，但「現在」標錯，看起來像互相矛盾，容易誤判離翻轉價多近。不改預測規則、不是新訊號、不註冊。
- 依據（白話風險溝通）：Gigerenzer & Edwards (2003, BMJ 327:741)「Simple tools for understanding risks」與 Spiegelhalter (2017, Annual Review of Statistics and Its Application 4:31–60)「Risk and uncertainty communication」都強調每個數字要講清楚參考點／參考類別，避免同一畫面出現看似衝突的數字。這是溝通修正，不宣稱提高準確度。
- 改動：
  - 首頁價格區間那行：「現在 $X」→「**M/D 早上 8 點收盤 $X**」（M/D＝預測日期的隔天台北 08:00，就是預測用的那根收盤；`app.js closeLabel`）。
  - 首頁盤中那行：價格後面加「（**比 M/D 早上 8 點收盤 ±x%**）」（`intraday.js closeVs`，＝盤中價 ÷ 手機抓到的最後一根已收完日K收盤 − 1，和預測用的是同一根；差不到 0.05% 寫「差不多」）。例（17:40 台北）：BTC 69,084 美元（比 11/13 早上 8 點收盤 −3.3%），再漲 5.8% 會碰到翻轉價 73,116；ETH 1,941（−3.9%），再漲 10.8% 到 2,150。日K還沒更新時不比較（維持原句）。
  - 數字都是原本就在頁面上的資料，沒有新數字來源；版面沒有變長（每幣只多約 18 個字）。
  - SW `v28-2026-11-13`；`app.js` 版本 v28。
- 帳本、凍結模型、registry、升級規則、`daily.sh`、`weekly.sh` 都沒動。建議不變 BTC 0、ETH 0。
- 測試：新增 `tests/labels_v28.test.mjs` 3 項（closeVs 正負號／四捨五入／日期，200 個隨機價格＝price/lastClose−1；首頁盤中句各分支都帶收盤比較且日期是決定收盤的前一天、日K過期不比較；app.js 不再有「現在 $」、closeLabel 跨年、版本）；`tests/e2e_v28.mjs`（iPhone 390×844：價格區間標「M/D 早上 8 點收盤」且＝live.json 價格、盤中句的 ±x% 用畫面上的盤中價與預測收盤重算、卡片上每個美元價格都有時間／種類標示、無水平捲動與主控台錯誤；截圖 `screenshots/v28-home.png`）。`intraday.test.mjs`、`e2e_v13.mjs` 的盤中句格式更新為允許新括號。
- 結果：node 163／163；`test_forecast.py` 10／10；`events/test_events.py` 5／5；`test_refresh_xsrc.py` 4／4；ledger verify OK；`e2e`、`e2e_v2`～`e2e_v14`、`e2e_v18`～`e2e_v24`、`e2e_v26`～`e2e_v28`、`fallback` 本機全過（`e2e_v13` 第一次因舊格式斷言失敗，更新斷言後通過）。`test_verify_live.py` 部署前照預期因「原始碼≠部署庫」失敗，部署後重跑。
- 部署後檢查：coin-signal a4689fa 已推送（本機 crypto-predictor a594567）；線上 sw `v28-2026-11-13`；`verify_live.py` LIVE CHECK OK（55 檔；tested_signals.json 照原計畫 11/16 weekly.sh 發布、只警告）；`test_verify_live.py` 11／11；`e2e_v28`、`e2e_v13`、`e2e_v27` 線上也過。研究筆記 `/workspace/trading/research/crypto/CRYPTO-20261113-1736-homepage-price-labels.md`（Drive 1nzFplmW7tVF3h5rOjs2fbnDxtwyKwh_1）。

## v27（2026-11-13）：這週可能要動手嗎（離翻轉價多近 → 過去 1／7 天內建議改變的比例＋到時要在 MAX 買賣多少）

- 2026-11-13 16:38 台北開始。今天六個疊加訊號提案都被否決，這次做幫實際決策的 App 改進。CHANGELOG v4–v26 沒有這個功能：v6／v13／v24 只告訴「翻轉價在哪、差幾 %」（且首頁只在差 < 1% 才出現），v7 是變了之後 14 天內翻回，v19 是現在差多少才調，v26 是空手多久；**「離翻轉價這麼遠，這幾天要動手的機會多大、到時要做什麼」**是第一次。不改預測規則、不是新訊號、不註冊。
- 新增 `backtest/next_move.py` → `app/data/nextmove.json`：冠軍 trend_vt@1（沿用 `flip_stats.frame`，Binance 已收完日K 2018-03-04～2026-11-12）每天只用當天以前的收盤算 50／200 日翻轉價（＝App `flipLevels`，最近 49／199 根平均），z＝離最近翻轉價的距離 ÷ 一週典型波動（30 日波動 × √(7/365)），事先固定 4 組（< 0.5／0.5–1／1–2／≥ 2）；結果＝之後第 1 根、1–7 根收盤中趨勢狀態是否和今天不同（沒有滿 7 根的日子不算）。與凍結 walk-forward 快取 1,775 天（2022-01-01～2026-11-10）曝險最大差 5e−7。
- 結果（兩個幣合計，選規則時期 ～2022 → 2023 年起樣本外）：
  - 7 天內建議改變：不到半週 57.1% → **62.8%**（509／810 天）；半週到 1 週 30.1% → 35.1%；1–2 週 14.0% → 11.6%；2 週以上 2.4% → **0.9%**（4／445）。隔天就變：20.0% → 20.9%、3.4% → 3.9%、0.4% → 0.5%、0 → 0。越近越常變，兩段都單調。
  - 用 ～2022 的分組比例去猜 2023 年起：7 天內會不會變 Brier 0.1595 vs 只用平均比例 0.2133（好 25%，2,810 天）；隔天會不會變 0.0586 vs 0.0664（好 12%）。BTC 27%／12%、ETH 24%／11%。相鄰日子 7 天重疊，不是獨立樣本，只是描述性檢查。**只說會不會要動手，不說漲跌。**
  - 現在（11/13 早上 8 點收盤，日K 11-12）：兩幣都空手。BTC 71,460 美元，最近的翻轉價 200 日線 73,115.59（+2.3%，0.46 週典型波動），收盤高於它會轉為加碼（約 42%）；BTC 2023 年起同組 412 天：隔天變 23%、**7 天內變 66%**。ETH 2,019.74，200 日線 2,149.89（+6.4%，0.92 週），轉為加碼（約 31%）；同組 369 天：隔天 3%、**7 天內 34%**。
- App：
  - 首頁：卡片下方一句（空手句之後）「這週會不會要動手：BTC 收盤高於 73,116 美元（比上次收盤+2.3%）就會轉為加碼，過去類似距離 7 天內發生約 66%；ETH 高於 2,150 美元（+6.4%）轉為加碼，約 34%。這是過去紀錄、不是預測……」。填了部位時括號加「到時照你的部位約買 NT$X」（用 v19 同一個 `TB.act`，差 20 個百分點以內寫「可以先不動」）。翻轉價和距離用手機抓到的已收完日K即時算，抓不到時只在檔案日期＝預測日期時用檔案。
  - 進階新增「這週可能要動手嗎」卡（跳轉列「這週要動手嗎」，在「空手要等多久」前）：每個幣的最近翻轉價（美元＋MAX 台幣，v24 匯率）、會轉成什麼、翻轉後建議比例、距離幾週典型波動、同組隔天／7 天內比例、兩條線；**填了部位時「如果真的變了」：打算放的錢、建議會變成放多少、要買／賣多少、在 MAX 的成本**（「買幣成本」卡同一個 `buyCost`／`sellCost`，用使用者的路徑、VIP、掛單設定；例：總資產 NT$200 萬、5%、BTC 60% → BTC 買約 NT$24,948、成本約 NT$150（0.60%）；ETH 約 NT$12,217、NT$75（0.62%））；分組表（～2022／2023～）；Brier 檢查、白話重點與算法（`app/js/nextmove.js`）。頁尾警語不變。
  - SW `v27-2026-11-13`，快取 `js/nextmove.js`、`data/nextmove.json`；`app.js` 版本 v27。
- 每週一自動重算：`backtest/refresh_all.py` 加 `nextmove` 步驟（fail-safe：每幣 > 2,000 天、分組加總＝總數、與凍結冠軍一致、目前狀態有分組，否則保留上一版）；`forecast/weekly.sh` 本機 commit、部署複製清單與 `git add` 加入 `nextmove.json`。今天用 `refresh_all.py --only nextmove --no-fetch` 產生（`refresh_status.json` 還原為原本內容，11/16 weekly 完整重寫）。
- 不註冊；帳本、凍結模型、registry、升級規則、`daily.sh` 都沒動（`weekly.sh` 只加檔名）。建議不變 BTC 0、ETH 0。
- 測試：新增 `tests/nextmove.test.mjs` 7 項（與凍結冠軍一致、分組固定、加總、單調；**用原始日K以 JS 獨立重算每一天的分組與結果＝Python 每格計數**；Brier 檢查 JS 重算；手機公式＝檔案的目前狀態、曝險＝live.json；截到 2025-10-08 重跑＝選規則時期區塊相同、之前每天的分組不變；同日重跑相同；首頁句無術語 < 140 字、數字＝`rateFor`、合成資料「低於…轉為空手」、計畫文字；接線）；`tests/e2e_v27.mjs`（iPhone 390×844：首頁一句、數字＝頁面用同一批已收完日K重算、卡片在進階、資料日期、沒填部位時不出金額、填部位後首頁與卡片金額及 MAX 成本、無水平捲動與主控台錯誤；截圖 `screenshots/v27-*.png`）。`spells.test.mjs` weekly.sh 檢查放寬為允許 spells 後面接新檔名。
- 結果：node 160／160；`test_forecast.py` 10／10；`events/test_events.py` 5／5；`test_verify_live.py` 11／11（部署後）；`test_refresh_xsrc.py` 4／4；ledger verify OK；`e2e`、`e2e_v2`～`e2e_v14`、`e2e_v18`～`e2e_v24`、`e2e_v26`、`e2e_v27`、`fallback` 本機全過。
- 部署後檢查：coin-signal 6e9f6ad 已推送；線上 sw `v27-2026-11-13`；`verify_live.py` LIVE CHECK OK（55 檔；tested_signals.json 照原計畫 11/16 weekly.sh 發布、只警告）；`e2e_v27` 線上也過。研究筆記 `/workspace/trading/research/crypto/CRYPTO-20261113-1638-next-move-odds.md`，Drive 1DT60D3ZG2ATthZPsZpMtQ1hxG45clUeK。

## v26（2026-11-13）：現在空手，通常要等多久？空手期間錯過／避開了多少

- 2026-11-13 15:33 台北開始。前五次（短線反轉、期貨基差、恐懼貪婪、ETF 流量、HMM）都是被否決的疊加訊號，這次改做幫實際決策的 App 改進：兩幣都空手時，回答「通常要等多久才回到有投入、空手期間價格怎麼走」。CHANGELOG v4–v25 沒有這個功能（v7 只有 14 天內翻回比例、v8 是同樣建議後下一週）。不改預測規則、不是新訊號。
- 新增 `backtest/flat_spells.py` → `app/data/spells.json`：冠軍 trend_vt@1（沿用 `flip_stats.frame`，Binance 已收完日K，2018-03 起）每天只用當天以前的價格；「空手期」＝轉成建議 0 那天收盤賣出，到再次建議有投入（減碼或持有）那天收盤買回。與凍結 walk-forward 快取比對 1,775 天（2022-01-01～2026-11-10）曝險最大差 5e−7、空手日 0 天不同。每次空手記錄天數、期間價格、最低／最高、「照建議 vs 一直抱著」（以原本在這個幣的錢 100% 計、扣 0.15%×2＋台幣溢價 0.27%）；依開始日分 2023 年以前（選規則時期）／之後（樣本外）；長度分組（≤7／8–30／>30 天）事先固定。
- 結果（到 2026-11-12 收盤）：
  - BTC 68 次：中位 4 天（一半 2–20 天）、30 天內結束 82%、最長 99 天；結束時價格比開始高 79%；照建議 vs 一直抱著每次平均 −0.55%，最慘一次空手期間 −40.8%。2023 年起 28 次：中位 3 天（2–13）、30 天內 89%、最長 60。
  - ETH 50 次：中位 10.5 天（2–33）、30 天內 72%、最長 167 天；結束時比較高 72%；每次平均 +0.45%，最慘一次 −61.8%。2023 年起 20 次：中位 7 天（1–45）、最長 83。
  - 依長度：≤7 天 BTC 38 次／ETH 23 次，結束時價格 100% 比開始高（中位 +2.1%／+4.2%，含成本平均 −3.5%／−5.8%＝小小錯過上漲）；>30 天 BTC 12／ETH 14 次，期間中位 −12.9%／−19.2%（平均 +14.2%／+20.1%＝避開大跌）。開始時無法知道會是哪一種。
  - 現在：BTC 從 11/13 早上 8 點收盤（日K 11-12，71,460 美元）起空手，今天剛開始，過去 68 次中位 4 天；ETH 從 11/9（日K 11-08，2,127.46）起已 4 天、到 11/13 收盤 2,019.74（−5.1%），過去撐過 4 天的 32 次再等中位 20 天（一半 7–45 天）、7 天內結束 28%、30 天內 63%。
- App：
  - 首頁：只在有幣空手時，卡片下方加一句「空手多久：BTC 今天剛開始（過去一半在 4 天內結束）；ETH 已 4 天、期間 −5.1%（類似情況一半再 20 天內結束）。這是過去紀錄、不是預測……」。目前的空手期用手機抓到的已收完日K即時重算（`flips.js recoRows`，同一規則），抓不到時只在檔案日期＝預測日期時用檔案。
  - 進階新增「空手要等多久」卡（跳轉列「空手要等多久」）：現在的空手期（開始日、天數、期間漲跌／最低、過去撐過同樣天數後還要多久）、全期／選規則時期／2023 年起表、依長度表、白話重點與算法（`app/js/spells.js`）。頁尾警語不變。
  - SW `v26-2026-11-13`，快取 `js/spells.js`、`data/spells.json`；`app.js` 版本字串 v24→v26（v25 漏改）。
- 每週一自動重算：`backtest/refresh_all.py` 加 `spells` 步驟（fail-safe 檢查：每幣 ≥ 20 次、樣本外 > 0、與凍結冠軍一致，否則保留上一版）；`forecast/weekly.sh` 本機 commit、部署複製清單與 `git add` 加入 `spells.json`。其他步驟與順序不變。
- 不註冊；帳本、凍結模型、registry、升級規則、`daily.sh` 都沒動（`weekly.sh` 只加檔名）。建議不變 BTC 0、ETH 0。
- 測試：新增 `tests/spells.test.mjs` 7 項（成本＝common.py、與凍結冠軍一致、每次空手的天數／報酬／成本算式、中位數與比例用 JS 重算、用原始日K以 JS 獨立重推空手期與目前空手期、live.json 空手⇔有目前空手期、截到 2025-10-08 重跑＝前段相同且選規則時期區塊不變、同日重跑完全相同、合成資料、首頁句無術語 < 140 字、SW／refresh_all／weekly.sh 接線）、`tests/e2e_v26.mjs`（iPhone 390×844：首頁只有一句、卡片在進階、數字＝spells.json、無水平捲動與主控台錯誤；截圖 `screenshots/v26-*.png`）。
- 結果：node 153／153；`test_forecast.py` 10／10；`events/test_events.py` 5／5；`test_verify_live.py` 11／11；`test_refresh_xsrc.py` 4／4；ledger verify OK；`e2e`、`e2e_v2`～`e2e_v14`、`e2e_v18`～`e2e_v24`、`e2e_v26`、`fallback` 本機全過（`e2e_v13` 第一次因盤中價四捨五入差 0.1 個百分點失敗、重跑通過，與本版無關）。
- 部署後檢查：coin-signal a865096 已推送；線上 sw `v26-2026-11-13`；`verify_live.py` LIVE CHECK OK（53 檔；tested_signals.json 照原計畫 11/16 weekly.sh 發布、只警告）；`e2e_v26` 線上也過。研究筆記 `/workspace/trading/research/crypto/CRYPTO-20261113-1533-flat-spells.md`，Drive 1vduAN-Nv7wUsFaxwzxsnR7Owbrmwtpp7；crypto-predictor commit 75c4ae6。

## 提案 P-regime-hmm（2026-11-13，不是 App 版本）：隱藏馬可夫體制模型（高斯 HMM 2／3 狀態，逐月只用過去資料重估）→ rejected

- 2026-11-13 14:39 台北開始（研究筆記 `/workspace/trading/research/crypto/CRYPTO-20261113-1439-regime-hmm.md`，Drive 1BIMDYr-LbLZhA4rubvP_YqeHpL6DPLob）。前四次都是疊加訊號且都否決，這次換「不同的模型家族」：用每日報酬的隱藏狀態（平靜／動盪、空頭／中性／多頭）當 (a) 冠軍的曝險疊加或獨立曝險模型、(b) 上漲機率模型（Brier 對冠軍、DM 檢定）。只用冠軍自己的 Binance 日K收盤（無新下載、免金鑰）；coin-signal 沒有 `.lock`，本次只做提案、App 不動。
- `forecast/proposals/proto_regime_hmm.py`：事先登記（14:42 台北，`--is-only` 先跑）statsmodels `MarkovRegression`（狀態相依均值＋變異數＝高斯 HMM），K＝2（依變異數排序）、3（依均值排序）；2019-01 起每月第一根日K用當時以前全部報酬重估，當月每天只用 Hamilton **濾波**機率（不用平滑／Viterbi）；hmm2_hv_cut（下一天動盪機率 > 0.5 減半）、hmm3_bear_cut（空頭 > 0.5 減半）、hmm3_bull_reentry（多頭 > 0.5 且空手／減碼 +0.25vt）、hmm2_standalone（獨立模型：vt×1[7 天預期報酬 > 0]）、hmm_pup（同狀態歷史上漲率）、hmm_pup_raw（模型自己的 Φ(m7/s7)）、hmm_lead_pup。參數快取 `proposals/data_hmm/params.json`（2 幣 × 2 K × 95 個月，0 次失敗）。
- **可重現性修正（揭露）**：第一次完整版的截斷檢查抓到抽樣月份重估參數差 4.36——statsmodels 起始值搜尋用自己的 `rng` 參數、`np.random.seed()` 無效；14:53 改 `fit(rng=YYYYMM+K)`、刪快取全部重估、`--is-only` 與完整版重跑，沒改任何版本／門檻／規則；結論相同、數字差很小（bull_reentry OOS 0.567→0.551）。
- IS 2022–23 四版都不合格（冠軍 0.723；hv_cut 0.598、bear_cut 0.711、bull_reentry 0.499、standalone 0.204），無領先；const_scale c＝0.9739。**OOS 2024→：hv_cut 0.678／年化 11.6%／DD −20.1% vs 冠軍 0.836／15.9%／−18.4%（P 0.055）**；bear_cut 0.809（P 0.079）、bull_reentry 0.551／−27.0%（Holm 較差 0.049）、standalone 0.368／−47.4%；全輸 ×0.85（0.840）與 const_scale（0.837）。Brier：hmm_pup IS 0.25258 vs 0.25202（變差）、OOS 0.25157 vs 0.25228（DM p 0.509）；**hmm_pup_raw IS 0.25136、OOS 0.25070 vs 0.25228（DM p 0.440，Holm 0.660）、WF 0.25097 vs 0.25217**——三段都略好但不顯著、仍輸 50% → 觀察。WF bear_cut 0.770 vs 0.791（容忍內），其餘不合格。t−1、門檻 0.6、每季重估結論相同；截斷（到 2025-10-08，抽 4 個月從頭重估）差 0；冠軍＝WF 快取（< 5e−7）、凍結模型差 0。判定 rejected，不註冊。詳見 `forecast/proposals/P-regime-hmm.md`。
- 描述：K=2 是平靜（年化波動約 33%／49%）vs 動盪（約 105%／137%），兩狀態均值都近 0 → standalone 幾乎天天持有；K=3 的 bear 是崩盤狀態（波動 120–150%），只占 1–4% 的日子，之後下一週 BTC −0.28%、ETH +1.92%（2019→，方向不穩）。濾波狀態每年切換 32–134 次，約為平滑（偷看）版的 1.7–2 倍；「動盪」大多和冠軍已用的 30 日波動重疊，再減半＝重複減碼＋多付成本（4.7% vs 3.2%／年）。
- 今天（日K 11-12，參數 11-01）：BTC 動盪 0.31／空頭 0.03／多頭 0.64、raw p_up 0.526；ETH 0.14／0.07／0.53、0.519；冠軍兩幣空手。bull_reentry 會亮（BTC 0.208、ETH 0.153，已否決不採用）。建議不變 BTC 0、ETH 0。
- `backtest/tested_signals.py` 新增白話列 `regime_hmm`（tweak；試算 32 項 0 錯誤，11/16 weekly.sh 發布）。App 沒改（仍 v25，verify_live LIVE CHECK OK）。19 個核心檔 sha256 前後相同、沒有註冊模型。node 146/146、test_forecast 10/10、test_events 5/5、test_verify_live 11/11、test_refresh_xsrc 4/4、ledger verify OK；commit 1eaf51f（＋changelog 補 commit／Drive id、時間更正）。

## 提案 P-etf-flows（2026-11-13，不是 App 版本）：美國現貨 BTC／ETH ETF 每日淨流量（Farside，疊在冠軍上；ETF 期間內另切 IS／OOS）→ rejected

- 2026-11-13 13:39 台北開始（研究筆記 `/workspace/trading/research/crypto/CRYPTO-20261113-1339-etf-flows.md`，Drive 1OR5FGf_jQdMLwMKWfiokXQ1GuOjxXFGX）。問題：ETF 大量流出／連續流出時要不要減碼、大量流入時要不要加碼或提早買回？與 events/analysis.md、P-events-B（凍結的 ETF 再檢定，約 2028 年初觸發、達標前不做挑戰者）重疊，已在提案檔誠實聲明；本提案不動 P-events-B、不能產生挑戰者。coin-signal 沒有動。
- 資料（公開免金鑰）：Farside `bitcoin-etf-flow-all-data`／`ethereum-etf-flow-all-data` HTML，2026-11-13 05:40 UTC 抓取存 `forecast/proposals/data_etf/`（BTC 729、ETH 591 個美國交易日，2024-01-11／2024-07-23～2026-11-12）；與 events 快取（00:32 UTC）只有 11-12 不同（BTC +3.3→−47.7、ETH −6.7→−8.0，最新一天會修訂）→ 主設定只用美國日期 ≤ t−1，另跑 t−2。**樣本很短**。
- `forecast/proposals/proto_etf_flows.py`：事先登記（13:41 台北，`--is-only` 13:43 先跑）IS 2024-01-12～2025-06-30、OOS 2025-07-01～、ALL 2024-01-12～；etf_out_cut（3 日流量 < 擴張 q10 減半）、etf_persist_cut（連續 ≥ 5 天流出減半）、etf_in_boost（> q90 ×1.25）、etf_in_reentry（> q90 且空手／減碼 +0.25vt）、etf_pup／etf_lead_pup。
- IS 四版都不合格（冠軍 0.982；0.920／0.960／0.935／0.942），無領先；const_scale c＝0.9587。**OOS 規則代表 etf_out_cut 0.291／年化 3.5%／DD −19.0% vs 冠軍 0.413／6.0%／−18.4%（P 0.164）**；in_boost 0.408、in_reentry 0.362（Holm 較差 0.066）；etf_persist_cut 0.542（P 0.983，Holm 0.102，勝 ×0.85 P 0.976、const_scale 0.979）但 IS 較差、事前不會選、只動 3% 日子 → 觀察。etf_pup Brier IS 0.25203 vs 0.25225、OOS 0.25408 vs 0.25217（變差，DM p 0.321）。ALL persist 0.775 vs 0.729、out 0.645。t−2、固定 IS 分位門檻結論相同；截斷（到 2025-10-08）差 0；冠軍＝WF 快取（< 5e−7）、凍結模型差 0。判定 rejected，不註冊。詳見 `forecast/proposals/P-etf-flows.md`。
- 描述：3 日流量 vs 下一週 Spearman −0.03～+0.11；單日大流出之後下一週 BTC IS +1.03%／OOS −1.52%／ALL −0.32%（t −0.80）、ETH +0.73%／−1.08%／−0.62%，方向不穩、不顯著；大流出時冠軍多半已空手。
- 今天（用美國 11-11）：BTC 3 日 −595.8 百萬美元、連續 5 天流出 → persist 亮；ETH 3 日 −330.7（破 q10）、連續 5 天 → out＋persist 亮；冠軍兩幣空手，所有版本投入 0。建議不變 BTC 0、ETH 0。
- `backtest/tested_signals.py` 新增白話列 `etf_flows`（news），`portfolio_row` 改為可讀結果檔的 `oos_label_zh`（本列顯示「2025 年 7 月起」，其他列不變）；試算 31 項 0 錯誤，11/16 weekly.sh 發布。App 沒改（仍 v25，verify_live LIVE CHECK OK）。19 個核心檔 sha256 前後相同、沒有註冊模型。node 146/146、test_forecast 10/10、test_events 5/5、test_verify_live 11/11、test_refresh_xsrc 4/4、ledger verify OK；commit 0114062（＋changelog 補 commit）。

## 提案 P-fear-greed（2026-11-13，不是 App 版本）：加密貨幣恐懼貪婪指數（alternative.me，疊在冠軍上；反向與順勢各兩版）→ rejected

- 2026-11-13 12:35 台北開始（研究筆記 `/workspace/trading/research/crypto/CRYPTO-20261113-1235-fear-greed.md`，Drive 1N3NZAVLGPwa03Yo2VhrW_CGXvl1fJ7Yj）。問題：極度恐懼時冠軍空手／減碼要不要先小量買回、極度貪婪時持有要不要減碼（或反過來順勢）？與 v1 `fng` 訊號、P-events-C「Fear & Greed contrarian」部分重疊，已在提案檔誠實聲明。coin-signal 沒有動。
- 資料（公開免金鑰）：`https://api.alternative.me/fng/?limit=0&format=json`，2026-11-13 04:35 UTC 抓取存 `forecast/proposals/data_fng/fng_full.json`（3,204 天、2018-02-01～2026-11-13、時間戳全 00:00 UTC、缺 4 天沿用前值，與 `backtest/data/fng.json` 完全相同）。`time_until_update` 顯示 d 的值在 d 00:00 UTC 公布（早於 d 收盤），但歷史回補無法驗證 → 主設定 t−1。指數是 BTC 專用，ETH 用同一值；官方成分約一半是 BTC 波動與動能。
- `forecast/proposals/proto_fear_greed.py`：事先登記（12:36 台北，`--is-only` 12:37 先跑）固定官方分類（極度恐懼 ≤ 25、極度貪婪 ≥ 76）：fg_greed_cut（極度貪婪且持有 → 減半）、fg_fear_reentry（極度恐懼且空手／減碼 → +0.25vt，上限 vt）、fg_fear_cut（極度恐懼 → 減半）、fg_greed_boost（極度貪婪且有投入 → ×1.25）、fg_pup／fg_lead_pup（三桶調 p_up）。
- IS 2022–23 **從未出現極度貪婪**（貪婪兩版＝冠軍），四版都不合格（冠軍 0.723；greed_cut 0.723、fear_reentry 0.528、fear_cut 0.723、greed_boost 0.723），無領先；const_scale c＝1.000。**OOS 2024→ 規則代表 fg_greed_cut 0.720／年化 12.5%／DD −18.5% vs 冠軍 0.836／15.9%／−18.4%（P 0.081）**；fear_reentry 0.815（−20.8%，P 0.421）、fear_cut 0.808、greed_boost 0.813，全輸 ×0.85（0.840）；Holm 較好全 1.000、較差 greed_cut 0.414／其餘 0.940。fg_pup Brier IS 0.25145 vs 0.25202、OOS 0.25175 vs 0.25228（DM p 0.581，Holm 0.581），仍輸 50%。WF 2022→ 四版 0.702–0.778 vs 0.791。L0（t 當天）／L2 結論相同；改用 IS 分位門檻（19.9／65）fear_reentry OOS 0.895 但 IS 0.639（非事先選，僅觀察）。截斷（到 2025-10-08）差 0；冠軍＝WF 快取（< 5e−7）、凍結模型差 0。判定 rejected，不註冊。詳見 `forecast/proposals/P-fear-greed.md`。
- 描述（不重疊週、t−1）：Spearman 指數 vs 下週 +0.04～+0.07；極度恐懼後下一週 BTC 2024→ −1.60%（上漲 33%，27 週，t −2.06）、2018-03→ +0.80%（109 週），ETH −1.68%／+0.85%——**方向在不同期間相反**；極度貪婪後 BTC 2018→ +4.44%（t 2.14，主要 2020–21）、2024→ −0.09%（11 週）。極度恐懼時冠軍幾乎都已空手（93／109 週）、極度貪婪時幾乎都持有（39／40），能額外動作的日子很少。
- 今天：主設定用 11/11 的值 29（恐懼，第 32 百分位）→ **沒有旗標亮**；最新值（11/13 00:00 UTC）20 極度恐懼——L0 會亮（fear_reentry 會是 BTC ≈0.21、ETH ≈0.15），已否決不採用。建議不變 BTC 0、ETH 0。
- `backtest/tested_signals.py` 新增白話列 `fear_greed`（news；試算 30 項 0 錯誤，11/16 weekly.sh 發布）。App 沒改（仍 v25，verify_live LIVE CHECK OK）。19 個核心檔 sha256 前後相同、沒有註冊模型。node 146/146、test_forecast 10/10、test_events OK、test_verify_live 11/11、test_refresh_xsrc 4/4、ledger verify OK；commit cbc3ebe（＋changelog 補 commit）。

## 提案 P-futures-basis（2026-11-13，不是 App 版本）：交割期貨年化基差（COIN-M 季度合約 vs 現貨，內插成固定 90 天）→ rejected

- 2026-11-13 11:32 台北開始（研究筆記 `/workspace/trading/research/crypto/CRYPTO-20261113-1132-futures-basis.md`，Drive 19oITsHSMVF-IUzTt8hirOwGR69I9OY1N）。問題：季度期貨比現貨貴很多（過熱）、變便宜或倒掛（恐慌）、一週內急升，能不能事前提醒冠軍減碼／加碼？與 P-perp-positioning 的 basis_hi_cut（USDⓈ-M 最近季度、t 當天）部分重疊，已在提案檔誠實聲明。coin-signal 沒有 `.lock`。
- 資料（公開免金鑰）：`forecast/proposals/data_basis/fetch_basis.py` 從 data.binance.vision 抓 COIN-M `{BTCUSD,ETHUSD}_{YYMMDD}` 1d（各 26 個合約、2020-06 起、616 個 zip，03:31–03:35 UTC，紀錄 `data_basis/fetch_log.txt`；zip 依 .gitignore 不進 git），USDⓈ-M 只做交叉檢查（相關 0.97／0.98）。資料庫沒有 COIN-M 270326 → 9/26 起只有單一合約（今天 τ 43 天）；2023-08-28～31 缺檔沿用前值。
- `forecast/proposals/proto_futures_basis.py`：事先登記（11:39 台北，`--is-only` 11:41 先跑）cm90＝(F/S−1)×365/τ 內插到 90 天，只用 t−1（另跑 t−2）；basis_hi_cut（> IS q90 減半）、basis_lo_cut（< max(q10,0) 減半）、basis_jump_cut（7 日變化 > q90 減半）、basis_lo_boost（×1.25 上限 1）、bs_pup／bs_lead_pup（基差三桶調 p_up）。
- IS 2022–23 四版都不合格（冠軍 0.723；hi 0.611、lo 0.723、jump 0.659、boost 0.719），無領先。**OOS 2024→ 規則代表 basis_hi_cut 0.826／年化 11.5%／DD −13.4% vs 冠軍 0.836／15.9%／−18.4%（P 0.541）**，勝 ×0.85（0.840）P 0.537、const_scale（0.839）0.533——跌幅小是因為 2024 年基差整年偏高、等於一直少放一半；basis_jump_cut 0.395（Holm 較差 0.006，WF 不合格）；lo_cut／lo_boost OOS 0 天觸發（＝冠軍）。bs_pup Brier IS 變差（0.25335 vs 0.25202）、OOS 0.25204 vs 0.25228（DM p 0.814），仍輸 50%。WF hi_cut 0.727 vs 0.791。t−2 hi_cut OOS 0.868 但 IS 0.709（觀察，不採用）；USDⓈ-M 最近季度 0.638、COIN-M 不內插 0.686。截斷（到 2025-10-08）差 0；冠軍＝WF 快取（< 5e−7）、凍結模型差 0。判定 rejected，不註冊。詳見 `forecast/proposals/P-futures-basis.md`。
- 描述：基差 vs 下一週 Spearman BTC +0.007／+0.058／+0.018（IS／OOS／2021-06→）、ETH −0.021／+0.024／+0.007，五分位不單調；基差一週急升且持有時下一週反而偏漲（BTC +3.41%／+2.38%）。與 BIS WP 1087（Schmeling 等，只讀摘要）「高 carry 預告崩跌」在一週、疊加冠軍的設定下沒有重現。
- 今天（基差用 11/11）：BTC 5.93%（第 54 百分位，7 日 +1.04pp）、ETH 4.97%（第 53 百分位，+1.07pp），USDⓈ-M 內插 90 天 6.26%／4.72%；**沒有任何旗標亮**；建議不變 BTC 0、ETH 0。
- `backtest/tested_signals.py` 新增白話列 `futures_basis`（news；試算 29 項 0 錯誤，11/16 weekly.sh 發布）。App 沒改（仍 v25，verify_live LIVE CHECK OK）。19 個核心檔 sha256 前後相同、沒有註冊模型。node 146/146、test_forecast 10/10、test_events 5/5、test_verify_live 11/11、test_refresh_xsrc 4/4、ledger verify OK；commit 45a574f（＋changelog 補 commit）。

## 提案 P-short-reversal（2026-11-13，不是 App 版本）：大波動後的短線反轉（超跌買回／超買減碼：7 日報酬、Wilder RSI、布林 2.5σ）→ rejected

- 2026-11-13 10:33 台北開始（研究筆記 `/workspace/trading/research/crypto/CRYPTO-20261113-1033-short-reversal.md`，Drive 1i-PCesN_Tr57WomkzuUnEdldn66zsyZM）。問題：大跌一週後會不會反彈、大漲一週後會不會回檔？冠軍空手／減碼時要不要先小量買回、持有時要不要先減碼？也是「只用事前訊號研究大波動」的一項。coin-signal 沒有 `.lock`。
- `forecast/proposals/proto_short_reversal.py`：只用冠軍自己的 Binance 日K快取收盤（無新下載、免金鑰），特徵用到 t 收盤（另跑 t−1）。事先登記（10:36 台北，`--is-only` 先跑）os_ret7（7 日報酬 < IS q10）、os_rsi14（Wilder RSI14 < 30）、os_bb（z20 < −2.5）：觸發後 7 天內且冠軍空手／減碼 → 加 0.25×vt（上限 vt）；ob_ret7（> IS q90）、ob_rsi14（> 70）：7 天內且持有 → 減半；sr_pup／sr_lead_pup（7 日報酬極端桶調 p_up）。
- IS 2022–23 唯一合格、領先 os_rsi14 0.755 vs 冠軍 0.723（P 0.689）；**OOS 2024→ 0.789／年化 15.1%／DD −21.2% vs 冠軍 0.836／15.9%／−18.4%（P 0.233）**，輸 ×0.85 0.840（P 0.223）、const_scale 0.841（P 0.197）；os_ret7 0.793、os_bb 0.742、ob_ret7 0.732、ob_rsi14 0.541（P 0.022，Holm 較差 0.158）；Holm 較好全部 1.000。sr_pup Brier OOS 0.25087 vs 0.25228（DM p 0.136，Holm 0.136，聯合 P 0.959 < 0.975），仍輸 50%。WF 2022→ os_rsi14 0.775 vs 0.791；ob 兩版不合格。t−1、3 天窗、加 0.5vt 結論相同；截斷（到 2025-10-08）差 0；冠軍＝WF 快取（< 5e−7）、凍結模型差 0。判定 rejected，不註冊。詳見 `forecast/proposals/P-short-reversal.md`。
- 大波動描述（2018-03→，去重疊事件）：大跌週（IS 最差 10%）之後下一週 BTC 平均 +0.36%（中位 +1.27%，87 次）、ETH −0.90%（中位 +0.76%，101 次），跟平常週差不多；冠軍空手時 BTC +0.01%、ETH −1.16%，沒有可靠反彈（偶有再跌 −36.6%／−45.3%）。大漲週之後反而續漲 BTC +1.51%、ETH +3.13%（t 2.58）。7 日報酬與下一週 Spearman −0.11～+0.11。與 Fičura（2023）「大型幣是週動能、不是反轉」一致。
- 今天（日K 11-12）：BTC ret7 −6.1%、RSI14 29.5（今天首次 < 30）、z20 −2.20；ETH ret7 −9.7%（11/11 −15.2% 觸發 q10）、RSI14 28.1、z20 −2.04。亮：BTC os_rsi；ETH os_ret7、os_rsi（皆已否決，不採用；若採用 os_rsi14 會是 BTC 0.208、ETH 0.153）。建議不變 BTC 0、ETH 0。
- `backtest/tested_signals.py` 新增白話列 `short_reversal`（tweak；試算 28 項 0 錯誤，11/16 weekly.sh 發布）。App 沒改（仍 v25，verify_live LIVE CHECK OK）。19 個核心檔 sha256 前後相同、沒有註冊模型。node 146/146、test_forecast 10/10、test_events 5/5、test_verify_live 11/11、test_refresh_xsrc 4/4、ledger verify OK；commit 59ddae3（＋changelog 補 Drive id）。

## v25（2026-11-13）：「台幣翻轉價＋別家交易所比對」每週一自動更新

- 2026-11-13 09:36 台北開始。v24 的 `app/data/xsrc.json` 沒有任何例行程序更新，卡片 10 天後會標「超過 10 天沒更新」。
- 新增 `backtest/refresh_xsrc.py`（fail-safe，狀態寫在 `backtest/xsrc_refresh_status.json`）：
  1. 把 `backtest/data/xsrc/` 複製到暫存目錄，`fetch_xsrc.py --dir 暫存 --incremental 7` 只抓最後 7 天＋新K並合併（新抓的蓋掉重疊日）；公開免金鑰，請求數從全抓 45 個降到 8 個。
  2. 逐檔檢查原始日K：00:00 UTC、無缺日／重複、歷史起點不變、不變短不變舊、重疊日收盤修訂 ≤ 0.5%、最新K距 Binance 最新收盤 ≤ 2 天、無未收盤K、價格正常（USDT/TWD 25–40、一週跳動上限）。CoinGecko 抓不到只警告並沿用舊檔；其他來源失敗就整批放棄。
  3. `xsrc.py --src 暫存 --out 暫存/xsrc.json` 重算後檢查：無 NaN/inf、結構與舊檔相同、as_of 不倒退且＝Binance 最新收盤日、冠軍檢查＝凍結 trend_vt@1（差 < 1e−6）、不同比例 0–5%、回測夏普／回撤合理、台幣翻轉價＝美元 × 匯率、翻轉價變動 < 2 倍。
  4. 全部通過才用 `os.replace` 換快取與 `app/data/xsrc.json`；任何失敗都不換檔、印 `WARNING: kept previous …`、exit 1（weekly.sh 用 `|| echo` 包住，不會中斷）。
- `fetch_xsrc.py` 加 `--dir`／`--incremental`（不加參數時仍是 v24 的全抓）；`xsrc.py` 加 `--src`。用目前快取重算與 v24 檔案除時間戳外完全相同。
- `forecast/weekly.sh`：在週檢討、`run_daily --no-fetch`、`refresh_all.py`（會更新 xsrc 用到的 Yahoo TWD=X）、`tested_signals.py` 之後才呼叫；本機 commit 加入 `app/data/xsrc.json`、`backtest/data/xsrc`、狀態檔；部署複製清單與 `git add` 加入 `data/xsrc.json`。其他步驟與順序不變。
- 今天實跑一次（09:39 台北）：OK，8 個請求全部成功，各交易所日K仍到 11/12（11/13 的K 11/14 08:00 才收），as_of 仍 2026-11-12，統計數字全部不變，只有抓取時間更新。
- App：進階卡資料來源那行加「每週一自動更新（新資料檢查不過就保留上一版）」；首頁、頁尾不變。SW `v25-2026-11-13`。
- 不註冊；帳本、凍結模型、registry、升級規則、`daily.sh` 都沒動，18 個核心檔 sha256 前後相同（`weekly.sh` 是這次有意修改的唯一例行檔）。
- 測試：新增 `tests/test_refresh_xsrc.py` 4 項（無新K時照常通過；舊快取少 3 根＋舊檔時增量合併後 as_of 前進、數字＝正式檔；缺日、變短、負價、匯率跳動、as_of 倒退、抓取失敗、重算失敗 7 種壞資料都保留舊檔且檔案 sha256 不變；weekly.sh 接線與順序），`tests/xsrc.test.mjs` 加 1 項。
  - 修 `forecast/test_verify_live.py::test_stale_forecast`：原本寫死「預報是 11/11」，今早每日預測後就壞；改成依已發布 live.json 的 asof 計算。
  - 結果：node 146／146；`test_refresh_xsrc.py` 4／4；`test_forecast.py` 10／10；`test_events.py` 5／5；`test_verify_live.py` 11／11；`e2e`、`e2e_v2`～`e2e_v14`、`e2e_v18`～`e2e_v24` 本機全過。
  - 部署後檢查：coin-signal 3479acb 已推送；線上 sw `v25-2026-11-13`、卡片文字已上線；`verify_live.py` LIVE CHECK OK；`e2e_v24` 線上也過。研究筆記 `/workspace/trading/research/crypto/CRYPTO-20261113-0936-xsrc-auto-refresh.md`，Drive 1NYbr49qkViiJQisjl1VZ5MDBfzVuJTqu。
## v24（2026-11-13）：台幣翻轉價＋別家交易所比對

- 2026-11-13 08:30 台北開始（研究筆記 `/workspace/trading/research/crypto/CRYPTO-20261113-0830-xexchange-ntd-flip.md`，Drive 16jU5P61nlDwBw0agMdmXrFMSqhURJ_s6）。v23 稽核結論是不要再調冠軍參數，所以這次做幫實際下單的 App 改進：宗在 MAX 用台幣買，規則看的是 Binance USDT 收盤。
- 不重複：v6 只比對最新一根K（Binance vs OKX/Kraken），研究 1403 只看 2023 起 trend3；v2 是買幣成本；v13 是盤中美元翻轉價。台幣翻轉價、2018 起建議／曝險跨交易所比對、別家價格回測、MAX 台幣K線均線檢查都是第一次。
- 資料（公開免金鑰，`backtest/fetch_xsrc.py` → `backtest/data/xsrc/`，含 `fetch_log.json`，2026-11-13 00:33–00:36 UTC 抓取，45 個請求全部成功）：Coinbase Exchange BTC-USD／ETH-USD、Bitstamp btcusd／ethusd（各 3,375 根，2017-08-17～11-12）、MAX btctwd／ethtwd（3,187）／usdttwd（3,124，2018-04-25 起）、CoinGecko tether→TWD 365 天。全部 00:00 UTC 切日、無缺日。
- 分析（`backtest/xsrc.py` → `app/data/xsrc.json`）：各來源用自己的收盤算冠軍規則（動作照 `run_daily.action_for`）；Binance 版本與凍結模型 30 個抽樣日曝險差 0。
  - **換成別家交易所的價格，建議有 0.9% 的日子不同**（2018-03-05 起 12,700 次比較 120 次；2024 起 41／4,188＝1.0%）。趨勢狀態不同只有 0.47%（2024 起 4 次，0.10%）；動作不同時 55%（2024 起 90%）趨勢狀態其實一樣，只是加碼／減碼幅度剛好跨過 10 個百分點門檻。BTC 1.45–1.48%、ETH 0.38–0.47%。
  - 扣成本回測（paper_sim，每段從空倉起算）：2024 起 Binance 夏普 0.805／年化 15.1%／最慘 −18.2%；Coinbase 訊號 0.781／14.4%／−18.2%；Bitstamp 訊號 0.782／14.5%／−18.2%（價格＋訊號 0.770／0.774）。2018-03～2023：Binance 1.222，別家 1.202–1.231，互有高低。日報酬相關 0.999，差距很小，不改規則、不換資料源。
  - 台幣換算準確度：Binance 收盤 × MAX USDT/TWD vs MAX 自己的台幣收盤，BTC 差中位 0.08%、95% 0.84%（最近一年 0.08%）；ETH 0.08%／1.02%（最近一年 0.11%）。即時匯率＝CoinGecko tether→TWD ×（1＋最近 30 天 MAX 溢價中位 0.255%），最近一年誤差中位 0.17%、95% 0.65%；直接用一週前的 MAX 匯率中位 0.37%。
  - **MAX 台幣K線自己的 200 日線會誤導**：2018 起 BTC 6.3%（2024 起 8.2%）、ETH 3.3%（3.8%）的日子趨勢狀態和規則不同。11/12 收盤：MAX 台幣K線的 BTC 200 日翻轉價 NT$2,340,643，規則換算 NT$2,413,546。
  - 11/12 收盤翻轉價：BTC 200 日線 73,115.59 美元 ≈ NT$2,413,546（+2.3%）、50 日線 80,875.64 ≈ NT$2,669,705；ETH 200 日線 2,149.89 ≈ NT$70,968（+6.4%）、50 日線 2,425.99 ≈ NT$80,082（MAX USDT/TWD 11/12 收盤 33.01）。
- App：
  - 進階新增「台幣翻轉價＋別家交易所比對」卡（跳轉列「台幣翻轉價」）：一行白話「換成別家交易所的價格，建議有 0.9% 的日子不同」、兩幣 50／200 日線翻轉價（美元＋約台幣，用手機當下的日K即時算）、換算匯率與來源、MAX 台幣K線警語、準確度、別家價格回測表、資料來源與日期（`app/js/xsrc.js`）。
  - 首頁：只有原本「接近翻轉」那句（差 < 1% 才出現）後面加「（在 MAX 約 NT$…）」；其他不變。頁尾警語不變。
  - 即時匯率抓不到 CoinGecko 時改用檔案裡最後一根 MAX 收盤並標日期。SW `v24-2026-11-13`，快取 `js/xsrc.js`、`data/xsrc.json`。
- 建議不變（今天 08:20 每日預測已是 BTC 0、ETH 0，這版沒有改預測）。不註冊；帳本、凍結模型、registry、升級規則、`daily.sh`／`weekly.sh` 都沒動，19 個核心檔 sha256 前後相同。`xsrc.json` 不在例行更新裡（要放進 weekly.sh 需另外同意）；卡片有「回測資料到」日期，超過 10 天會標示。
- 測試：
  - 新增 `tests/xsrc.test.mjs`（6 項：用 JS 從原始快取獨立重算比較次數與不同次數、台幣翻轉價＝App `flipLevels` × MAX 收盤、MAX 台幣K線翻轉價、MAX 誤差中位數、匯率後備、白話句、來源紀錄、SW）、`tests/e2e_v24.mjs`（iPhone 390×844，首頁不多字、卡片在進階、台幣＝美元×顯示匯率、擋 CoinGecko 時改用 MAX 收盤、無水平捲動與主控台錯誤；截圖 `screenshots/v24-*.png`）。
  - 修 3 個會隨每日預測變壞的舊測試（`pup.test.mjs`、`e2e_v11.mjs` 寫死 BTC 48%，改讀 live.json；`tradeband.test.mjs` 把 frame 截在資料檔 as_of）。
  - 結果：node 145／145；`test_forecast.py` 10／10；`test_events.py` 5／5；`test_verify_live.py` 11／11；`e2e`、`e2e_v2`～`e2e_v14`、`e2e_v18`～`e2e_v24`、`fallback` 本機全過。
  - 部署後檢查：coin-signal ebca6d2 已推送；線上 sw `v24-2026-11-13`；`verify_live.py` LIVE CHECK OK；`e2e_v24` 線上也過（線上即時匯率 33.02，BTC 200 日線 ≈ NT$2,414,569）。

## v23（2026-11-13）：回測是不是運氣（過度擬合檢查）＋稽核 P-overfit-audit（不是候選訊號、不註冊）

- 2026-11-13 07:37 台北開始（研究筆記 `/workspace/trading/research/crypto/CRYPTO-20261113-0737-overfit-audit.md`，Drive 1lm-GDoEbiICPhHfK6UoF9jfqM1ib0027）。C#6 回測陷阱筆記列過的 DSR／PBO／Reality Check 第一次套用到冠軍與整串提案。
- `forecast/proposals/proto_overfit_audit.py`（事先登記在 docstring，先跑 `--is-only`；結果檔刻意命名 `proto_overfit_audit_report.json`，因為 `tested_signals.py` 讀 `*_results.json`，而稽核不是訊號）：
  - 重建了 400 條日報酬（300 組參數網格＋100 個不重複的被否決對手＋冠軍）。
  - 誠實試驗數 N＝440（300 網格＋100 對手＋4 個 P-events-A＋36 個 C#9/C#10 冠軍前試驗）。
  - 冠軍＝paper_sim（2.8e−7）；截斷檢查差 0；重跑結果完全相同。
- **Deflated Sharpe**：冠軍 2024→ Sharpe 0.851，DSR 0.785；2022→ 0.800，DSR 0.826。N＝10～471 都落在 0.78–0.91，都沒到 0.95 →「有跡象、未證實」。
  - PSR 對 0 是 0.928，對買進持有 0.735。
  - MinTRL 1,325 天（約 3.6 年）。
- **PBO（CSCV，300 組網格，S＝16，12,870 種切法）0.285（中等）**：S＝10／20 為 0.310／0.312，只用 2022–23 為 0.551。用 IS 挑疊加版本的 PBO 是 0.793，比亂挑還差。
- **White RC／Hansen SPA（平穩自助法，平均區塊 28 天，B 2,000）**：100 個對手 2024→ 有 16 個 Sharpe 高於冠軍，但聯合檢定 Sharpe-RC p 0.997、SPA_c 0.921（波動對齊）；網格 0.841；全部 0.949。2022→ 的 SPA_c 為 0.79–0.87。
  - 結論：沒有錯殺。但 Sharpe 只小幅改善的做法驗不出來（RC 10% 門檻需 Sharpe 差 +0.58）。
- 注意：2024→ 對冠軍只是準樣本外（規則在 2026-11-10 才選定），真正乾淨的只有實盤。
- App：進階「預測模型與自我改善機制」卡內新增一行「回測是不是運氣」（`app/js/overfit.js`，數字直接抄自結果檔、測試核對）；首頁不變；SW `v23-2026-11-13`。
- 新增測試：`tests/overfit.test.mjs` 4 項、`tests/e2e_v23.mjs`。
- 建議不變（BTC 0.427、ETH 0）。不註冊，規則／帳本／registry／升級規則都沒動，18 個核心檔 sha256 前後相同。
- `tested_signals.py` 不加列：稽核沒有「領先版本＋IS/OOS Sharpe／Brier」，不符合該表格式；試算仍 27 項、0 錯誤。
- 測試結果：
  - node 139／139；`test_forecast.py` 10／10；`test_events.py` 5／5。
  - `e2e`、`e2e_v2`～`e2e_v14`、`e2e_v18`～`e2e_v23`、`fallback` 本機全過。
  - 部署後檢查：coin-signal 13e3062 已推送；`test_verify_live.py` 11／11；`verify_live.py` LIVE CHECK OK（49 檔）；`e2e_v23` 線上也過。

## 提案 P-trend-quality（2026-11-13，不是 App 版本）：趨勢品質／盤整程度（Kaufman 效率比、Wilder ADX、Lo–MacKinlay 變異數比）→ rejected

- 2026-11-13 06:40 台北開始（研究筆記 `/workspace/trading/research/crypto/CRYPTO-20261113-0640-trend-quality.md`，Drive 14t4aRbkr4oNC13WECNY1pBEu3BTMQpGs）。冠軍是均線趨勢策略、最怕盤整來回翻轉：事前量「行情走得直不直」能否告訴它何時會被甩？也是「只用事前訊號找大波動決策規則」的一項。
- `forecast/proposals/proto_trend_quality.py`：只用冠軍自己的 Binance 日K快取（h/l/c，無新下載、免金鑰），特徵用到 t 收盤（同冠軍；另跑 t−1）。事先登記 er_cut（30 日效率比 < IS 20 百分位減半）、adx_cut（ADX14 < 20 減半）、vr_cut（30 日 VR(5) < IS 20 百分位減半）、clean_boost（效率比 > IS 80 百分位且 30 天上漲 ×1.25）、tq_pup／tq_lead_pup（效率比三分位調 p_up）。
- IS 2022–23 唯一合格、領先 adx_cut 0.838 vs 冠軍 0.723（P 0.885）；**OOS 2024→ 0.556／年化 8.6%／DD −21.0% vs 冠軍 0.851／16.3%／−18.4%（P 0.006，Holm 較差 0.036）**，×0.85 0.855／14.0%／−15.8%（勝它 P 0.004）、const_scale 0.854（P 0.007）；er_cut 0.589（Holm 較差 0.044）、vr_cut 0.831、clean_boost 0.928／−20.0%（非領先、IS 0.715 不合格，P 0.948，Holm 0.312）。tq_pup Brier OOS 0.25159 vs 0.25230（DM p 0.493，IS 變差），仍輸 50%；tq_lead_pup IS 不合格。WF 2022→ adx_cut 0.670、er_cut 0.612 vs 0.800 不合格。t−1（adx_cut OOS 0.469）、VR 用 60 天結論相同；截斷差 0；冠軍＝WF 快取（< 5e−7）。盤整量法確實事先標出「之後 14 天冠軍較常翻轉」（效率比最低三分位 1.25–1.83 次 vs 最高 0.33–0.44 次），但盤整後下一週並不差（OOS ADX<20 後 BTC +1.84%、ETH +6.88%），減碼錯過突破。判定 rejected，不註冊。詳見 `forecast/proposals/P-trend-quality.md`。
- 今天（日K 11-11）：BTC 效率比 0.258、ADX 21.8、VR 0.352；ETH 0.332、25.3、0.458；兩幣 chop_vr 旗標亮（vr_cut 已否決不採用），其他不亮。建議不變 BTC 0.427、ETH 0。
- `backtest/tested_signals.py` 新增白話列 `trend_quality`（tweak；試算 27 項 0 錯誤，11/16 weekly.sh 發布）。App 沒改（仍 v22，verify_live LIVE CHECK OK）。15 個核心檔 sha256 前後相同、沒有註冊模型。node 135/135、test_forecast 10/10、test_events 5/5、test_verify_live 11/11、ledger verify OK；commit 6c4d64f。

## 提案 P-market-breadth（2026-11-13，不是 App 版本）：加密市場廣度（多少山寨幣站在均線上）→ rejected

- 2026-11-13 05:36 台北開始（研究筆記 `/workspace/trading/research/crypto/CRYPTO-20261113-0536-market-breadth.md`，Drive 1c_tEmvcRljMcKFU3-d_8BLD0DAfHpLL9）。「只有比特幣在漲、其他幣沒跟」是否事前預告下一週；也是「只用事前訊號找大波動決策規則」的一項。
- `forecast/proposals/proto_market_breadth.py`：data.binance.vision S3 列表（776 個 *USDT，含 257 個已不交易）＋ data-api.binance.vision 日K（下架幣也有完整歷史），公開免金鑰，快取 `/workspace/trading/research/crypto/data/c_breadth/` 含 fetch_log；排除 BTC/ETH、穩定幣／包裝幣 36、槓桿代幣 50、代幣化股票等 104 → 586 個；逐日宇宙＝有日K、≥ 200 根、30 日成交額中位數 ≥ 200 萬美元（WF 期間平均 150 檔、18.8% 日後下架）。只用日期 ≤ t−1 的廣度（另跑 t−2）。事先登記 weak_cut（b200 < 0.20 減半）、collapse_cut（b50 十天掉 ≥ 30pp 減半）、diverge_cut（自己 30 日漲但 r30 < 0.35 減半）、thrust_boost（Zweig 式 thrust 後 20 天 ×1.25）、bd_pup／bd_lead_pup（b200 三分位調 p_up）。
- IS 2022–23 合格 weak_cut 0.770 與 thrust_boost 0.781 vs 冠軍 0.723，差 < 0.02 取低成本 → 領先 weak_cut；**OOS 2024→ 0.851／年化 15.0%／DD −16.5% vs 冠軍 0.851／16.3%／−18.4%（P 0.499）**，×0.85 0.855／14.0%／−15.8%（勝它 P 0.517）、const_scale 0.853（P 0.524）；collapse_cut 0.652（P 0.020）、diverge_cut 0.755、thrust_boost 0.768／−20.6%；Holm 較好全 1.000。bd_pup Brier OOS 0.25233 vs 0.25230（DM p 0.974），IS 也變差 → bd_lead_pup IS 不合格；仍輸 50%。WF 2022→ weak_cut 0.818 vs 0.800（容忍內），collapse／diverge 不合格。t−2（weak_cut OOS 0.850）、流動性 100 萬（0.855）／500 萬（0.681）、只用現存幣（IS 0.666 就不會合格／OOS 0.843）結論相同；截斷（含切山寨幣資料）差 0；冠軍＝WF 快取（< 5e−7）。廣度主要反映過去（b200 與過去一週 Spearman +0.15～+0.26、與下一週 −0.04～+0.04）；崩跌／背離後 ETH 反而反彈。判定 rejected，不註冊。詳見 `forecast/proposals/P-market-breadth.md`。
- 今天（廣度到 11-10）：宇宙 74 檔，b200 0.432、b50 0.122、r30 0.122、zbt 0.432，四個旗標都沒亮（預覽到 11-11：b200 0.471、b50 0.086，仍無旗標）。建議不變 BTC 0.427、ETH 0。
- `backtest/tested_signals.py` 新增白話列 `market_breadth`（news；試算 26 項 0 錯誤，11/16 weekly.sh 發布）。App 沒改（仍 v22）。15 個核心檔 sha256 前後相同、沒有註冊模型。node 135/135、test_forecast 10/10、test_events 5/5、test_verify_live 11/11、verify_live LIVE CHECK OK。

## 提案 P-kimchi-premium（2026-11-13，不是 App 版本）：韓國溢價（泡菜溢價，Upbit vs Binance）→ rejected

- 2026-11-13 04:30 台北開始（研究筆記 `/workspace/trading/research/crypto/CRYPTO-20261113-0430-kimchi-premium.md`，Drive 1fLuZOPXiSWBINZ5BrTeEuzhDubdTvBbv）。韓國散戶過熱／投降的代理，和已否決的 Coinbase 溢價（美國需求）不同：韓國有資本管制，溢價大得多。也是「只用事前訊號找大波動決策規則」的一項。
- `forecast/proposals/proto_kimchi_premium.py`：Upbit 公開日K KRW-BTC／KRW-ETH（00:00 UTC 切日，同 Binance）÷（Binance USDT 收盤 × Coinbase USDT/USD × Yahoo KRW=X），公開免金鑰，快取 `/workspace/trading/research/crypto/data/c_kimchi/` 含 fetch_log；第二匯率來源 ECB SDMX（FRED DEXKOUS 三次逾時／失敗，未用）。只用日期 ≤ t−1 的溢價（另跑 t−2）；兩幣各用自己的溢價。事先登記 froth_cut（7 日平均溢價百分位 > 0.90 減半）、neg_cut（< 0.10 減半）、spike_cut（一週急升減半）、disc_boost（折價時 ×1.25）、kp_pup／kp_lead_pup（依溢價三分位調 p_up）。
- IS 2022–23 唯一合格、領先 neg_cut 0.930 vs 冠軍 0.723（P 0.957）；**OOS 2024→ 0.792／年化 14.1%／DD −16.8% vs 冠軍 0.851／16.3%／−18.4%（P 0.307）**，×0.85 0.855／14.0%／−15.8%（勝它 P 0.314）；froth_cut 0.817、spike_cut 0.832、disc_boost 0.869（非領先、IS 0.599，P 0.625）；Holm（較好／較差）全 1.000。kp_pup Brier OOS 0.25202 vs 0.25230（DM p 0.809），仍輸 50%；kp_lead_pup IS 合格但 OOS 不過。WF 2022→ 都在容忍內（neg_cut 0.846 vs 0.800，優勢全在 IS 年份）。t−2（neg_cut OOS 0.762）、ECB 匯率（0.842）、不調 USDT（0.787）結論相同；截斷（含切輸入資料）差 0；冠軍＝WF 快取（< 5e−7）。溢價主要反映過去（7 日平均與過去一週報酬 Spearman −0.17～−0.28、與下一週 −0.06～+0.07）；Yahoo vs ECB 匯率日差中位 34 bp（時點不同），Upbit KRW-USDT 本身帶溢價、不能當匯率。判定 rejected，不註冊。詳見 `forecast/proposals/P-kimchi-premium.md`。
- 今天：BTC 溢價 +114 bp（11-11）、7 日平均 +74 bp（百分位 0.58）；ETH +115／+77 bp（0.59）；三個旗標都沒亮（下一次決策預覽百分位 0.67，仍無旗標）。建議不變 BTC 0.427、ETH 0。
- `backtest/tested_signals.py` 新增白話列 `kimchi_premium`（news；試算 25 項 0 錯誤，11/16 weekly.sh 發布）。App 沒改（仍 v22，coin-signal 19d8132，verify_live LIVE CHECK OK）。15 個核心檔 sha256 前後相同、沒有註冊模型。node 135/135、test_forecast 10/10、test_events 5/5、test_verify_live 11/11。

## 提案 P-miner-hashribbon（2026-11-13，不是 App 版本）：比特幣礦工訊號（Hash Ribbon／哈希價格壓力／難度下調）→ rejected

- 2026-11-13 03:35 台北開始（研究筆記 `/workspace/trading/research/crypto/CRYPTO-20261113-0335-miner-hashribbon.md`，Drive 16i8ThQvHZ-wYG46i603r5Ane_OvIvOy2）。承接 C#22（礦工經濟學事件研究），第一次放進冠軍的每日決策測試；也是「只用事前訊號找大波動決策規則」的一項。
- `forecast/proposals/proto_miner_hashribbon.py`：blockchain.com 算力／礦工收入＋mempool.space 難度調整（公開免金鑰，快取 `/workspace/trading/research/crypto/data/c_miner/` 含 fetch_log）；只用日期 ≤ t−1 的礦工資料（另跑 t−2）；只動 BTC、ETH 不變。事先登記 ribbon_cut（投降減半）、ribbon_rec_boost（恢復後 30 天 ×1.5）、cap_new_cut（投降頭 30 天減半）、revstress_cut（哈希價格 30 天變化低於 10 百分位減半）、diff_drop_cut（最近難度下調減半）、mn_pup／mn_lead_pup（依投降狀態調整 BTC p_up）。
- IS 2022–23 領先 cap_new_cut 0.768 vs 冠軍 0.723（P 0.988）；**OOS 2024→ 0.806／年化 14.8%／DD −18.0% vs 冠軍 0.851／16.3%／−18.4%（P 0.247）**，×0.85 0.855／14.0%／−15.8%；ribbon_cut 0.760、rec_boost 0.822、revstress 0.846、diff_drop 0.877（非領先、IS 0.611，P 0.659）；Holm（較好）全 1.000。mn_pup Brier OOS 0.25174 vs 0.25230（DM p 0.340），IS 變差、仍輸 50%；mn_lead_pup IS 不合格。WF 2022→ 都在容忍內但無一較好。t−2 與 mempool 第二來源（投降狀態一致 97.5%）結論相同；截斷（含切礦工資料）差 0；冠軍＝WF 快取（< 5e−7）。2024 後投降日 32.4%（IS 17.5%），投降頭 30 天 IS 偏弱、OOS 反轉。判定 rejected，不註冊。詳見 `forecast/proposals/P-miner-hashribbon.md`。
- 今天：無投降、最近難度 +5.54%；哈希價格 30 天百分位 0.080（revstress 旗標亮，版本已否決不採用）。建議不變 BTC 0.427、ETH 0。
- `backtest/tested_signals.py` 新增白話列 `miner_hashribbon`（news；試算 24 項 0 錯誤，11/16 weekly.sh 發布）。App 沒改（仍 v22，coin-signal 19d8132，verify_live LIVE CHECK OK）。15 個核心檔 sha256 前後相同、沒有註冊模型。node 135/135、test_forecast 10/10、test_events 5/5、test_verify_live 11/11。

## v22（2026-11-13）：盤中急跌要不要先賣（盤中急跌保護）＋提案 P-intraday-guard → rejected

### 為什麼
- 2026-11-13 02:40 台北開始（研究筆記 Drive 1kGPmMeehcnhDPM-P0LBGRNqEWFuxCd7m；coin-signal commit dac371c）。冠軍 trend_vt@1 每天只在台北 08:00 收盤判斷一次，兩次收盤之間急跌時會想「先賣再說」。v13 已說「盤中穿過不算訊號」，但從沒測過盤中先賣到底是好是壞。也是「只用事前訊號找大波動決策規則」的一項。

### 研究（可重現，扣成本，事先登記，2022–23 選 / 2024 年起檢查）
- `forecast/proposals/proto_intraday_guard.py`：同一份冠軍凍結 walk-forward 曝險，Binance 公開 1 小時K（免金鑰快取，到 2026-11-11）。第 1～22 小時收盤觸發、**下一小時收盤成交**、賣出多算 0.10% 滑價（另報 0.30%），下一個 08:00 照冠軍買回，成本同 paper_sim。5 版：fx5 跌 5% 全賣、fx8 跌 8% 全賣、kvol2 跌超過 2 倍日波動全賣、flip 跌破翻轉價照規則減半、trail6 從盤中高點回落 6% 全賣；對照冠軍、冠軍×0.85。
- 2022–23 五版都略勝冠軍（0.723），選中 kvol2 0.790。**2024 年起五版全部較差且顯著**：kvol2 夏普 0.568／年化 10.0%／最大跌幅 −20.6%（冠軍 0.851／16.3%／−18.4%；×0.85 0.854／14.0%／−15.8%），P(勝冠軍) 0.002、P(勝×0.85) 0.002、Holm 較差 p 0.006；fx5 0.560、fx8 0.800（Holm 較差 0.027）、flip 0.656、trail6 0.606；跌幅全部更深、兩幣都較差、成本多 0.4～3.8%/年。2022 年空頭全部有幫忙（+0.5～+4.0%），2023 年後幾乎全部變差。walk-forward 2022 起 fx5／kvol2／trail6 超過容忍。滑價 0.30% 仍全輸。截斷檢查差 0；不保護版＝paper_sim（差 5.6e−9）。
- 急跌之後：到收盤大致一半一半、平均不續跌（全期 BTC 跌 5% 後 43% 收盤更低、ETH 48%）；2022–23 略續跌（ETH 60%），**2024 年起多半小反彈**（BTC 35%／37 次、ETH 39%／95 次收盤更低，平均 +0.56%／+0.51%），都不顯著。約一半急跌日冠軍下一次收盤本來就會減碼 → 保護只是提早幾小時做同一件事，而那幾小時價格平均回升。判定 rejected，不註冊。詳見 `forecast/proposals/P-intraday-guard.md`。

### 新增／修改
- **進階「盤中離翻轉價多遠」卡內一行「盤中急跌要不要先賣」**（首頁不變）：數字是 `app/js/guard.js` 的常數 `GUARD`，抄自 `proto_intraday_guard_results.json`（測試逐一比對），結論「盤中急跌不要慌著先賣，等早上 8 點的建議再動」，附「只有 2022 年大跌那一年有幫上一點忙」「這是回測，不保證未來」。
- `backtest/tested_signals.py` 新增白話列 `intraday_guard`（tweak）；`tested_signals.json` 由 11/16 weekly.sh 重產（試算 23 項、0 錯誤）。
- App 版本 v22、service worker 快取 `v22-2026-11-13`（新增 `./js/guard.js`）。帳本、凍結模型、登記表、升級規則都沒動（18 個核心檔 sha256 前後相同），沒有註冊模型。頁尾警語不變。

### 測試
- 新增 `tests/guard.test.mjs` 4 項（數字＝結果檔、自我檢查、白話無術語與誠實標示、只在進階卡＋版本）與 `tests/e2e_v22.mjs`（iPhone 390×844，首頁不含、進階卡內文字＝函式輸出、SW v22；本機與線上都過）。
- node 135／135；`test_forecast.py` 10／10；`test_events.py` 5／5；`test_verify_live.py` 11／11（部署後）；`e2e`、`e2e_v2`～`e2e_v14`、`e2e_v18`～`e2e_v22`、`fallback` 全過；`verify_live.py` LIVE CHECK OK（48 檔）。

## v21（2026-11-13）：換個設定、換個幣還靈嗎（冠軍穩健度檢查）＋提案 P-trend-robustness

### 為什麼
- 2026-11-13 01:40 台北開始（研究筆記 Drive 1l_Ec2GjT_8z4__Zdx02xHN1EXhc7gahb；coin-signal commit 2cb6c52）。首頁建議全靠冠軍 trend_vt@1（50/200 日平均線＋30% 波動目標＋30 天波動），但從沒檢查過它是不是「剛好調到」的尖峰，也沒在沒看過的幣上試過。

### 研究（可重現，扣成本，事先登記，2022–23 / 2024 年起）
- `forecast/proposals/proto_trend_robustness.py`：(1) 參數格點 快線 30–70 × 慢線 150–250 × 目標波動 25–35% × 波動天數 20–60＝300 組（BTC+ETH 各半，同 paper_sim）；(2) 凍結規則原封不動用在 BNB、XRP、ADA、LTC、DOGE、SOL、LINK、TRX（Binance 公開免金鑰日K，`data_oou/`），對照一直抱著與固定 85%。
- 高原：冠軍 IS 0.723／OOS 0.851；8 個一步鄰居中位差 −0.018／−0.020；冠軍 IS 排第 71 百分位（不是尖峰）；在冠軍 −0.10 以內 IS 56.5%、OOS 44.8% → 判定「中等」（離 50/200 太遠才明顯變差：快線 30/70、慢線 ≥225）。IS 最佳 50/175/30%/60 → OOS 0.900（P 0.68，不顯著）→ 不改參數。300 組中 95.7% 夏普勝兩幣一直抱著（0.485）、100% 最大跌幅較淺。
- 換幣：最大跌幅 8/8 變淺（−23%～−34% vs 抱著 −51%～−88%），夏普只 4/8 勝抱著，等權籃子 夏普 0.691 vs 0.560（P 0.69）、年化 10.1% vs 16.9% → 判定「混合」：少跌可推廣、多賺不可推廣。倖存者偏誤：只測今天還在的大幣。截斷檢查差 0；快速模擬＝paper_sim（差 0）。詳見 `forecast/proposals/P-trend-robustness.md`。

### 新增／修改
- **進階「預測模型與自我改善機制」卡內一行「換個設定、換個幣還靈嗎」**（首頁不變）：數字是 `app/js/robust.js` 的常數 `ROBUST`，抄自 `proto_trend_robustness_results.json`（測試逐一比對），結論「它可靠的用處是大跌時少虧，不是多賺」，固定附倖存者偏誤說明。
- `backtest/tested_signals.py` 新增白話列 `trend_robustness`（tweak）；並修正潛在錯誤：結果檔沒有 Brier 時（如 execution_timing）不再輸出 `brier: null`（否則 11/16 重產後 tested.test 會失敗）。`tested_signals.json` 由 11/16 weekly.sh 重產。
- App 版本 v21、service worker 快取 `v21-2026-11-13`（新增 `./js/robust.js`）。帳本、凍結模型、登記表、升級規則都沒動（27 個核心檔 sha256 前後相同），沒有註冊模型。頁尾警語不變。

### 測試
- 新增 `tests/robust.test.mjs` 4 項（數字＝結果檔、自我檢查、白話無術語與誠實標示、只在進階卡＋版本）與 `tests/e2e_v21.mjs`（iPhone 390×844，首頁不含、進階卡內文字＝函式輸出、SW v21；本機與線上都過）；`exec_timing.test.mjs`、`e2e_v20.mjs` 版本比對放寬到 v2x。
- node 131／131；`test_forecast.py` 10／10；`test_events.py` 5／5；`test_verify_live.py` 11／11（部署後）；`e2e`、`e2e_v2`～`e2e_v14`、`e2e_v18`～`e2e_v21`、`fallback` 全過；`verify_live.py` LIVE CHECK OK（47 檔）。

## v20（2026-11-13）：幾點動手（同一天做完就好，拖到隔天明顯變差）＋提案 P-execution-timing

### 為什麼
- 2026-11-13 00:40 台北開始（研究筆記 Drive 1ykxh9zMIcY7DubtepjW-IY2GKtKpmY6X；coin-signal commit c92ea32）。冠軍的建議在 Binance 日K收盤（台北 08:00）定好、08:20 推播，宗實際動手可能是早上、中午、晚上或隔天。過去所有回測都假設 08:00 當下成交，從來沒算過「晚一點做」差多少。

### 研究（可重現，扣成本，2022–23 選、2024 年起檢查）
- `forecast/proposals/proto_execution_timing.py`：同一份冠軍 trend_vt@1 逐日建議比例（凍結 walk-forward），改用 Binance 公開小時K（免金鑰，已快取到 2026-11-11）在不同時間成交，成本同 `paper_sim`。事先登記 9 種：08:00（＝虛擬投組）、**09:00（實際最早，比較基準）**、12:00、16:00、20:00、24:00、隔天 08:00、09:00–20:00 分 12 次、09:00–隔天 08:00 分 24 次。
- 2024 年起（到 2026-11-10，兩幣各半）：09:00 年化 16.5%、夏普 0.858、最慘 −18.2%；12:00 15.8%、20:00 15.3%、24:00 13.8%（同一天內都不顯著，Holm 最小 0.28）；**隔天 08:00 年化 10.6%、夏普 0.594、最慘 −22.6%（Holm p 0.0035，2022–2026 每一年都較差）**，差距 9 成以上來自趨勢轉向後那幾天；分 24 次 13.0%（顯著較差，成本多 0.84%/年）、分 12 次 15.3%。2022–23 選出的「最好時段」16:00 在 2024 年起 0.799，不比 09:00 好 → 沒有固定比較好的時段。08:00 vs 09:00 沒差（P 0.41）。不分條件的每小時平均報酬前後兩段相關 −0.13／−0.07，不持續（與 Baur 等 2019 一致）。截斷檢查差 0；08:00 版＝paper_sim（差 5.6e−9）；小時K第 23 根＝日K收盤 1,775 天全相同。詳見 `forecast/proposals/P-execution-timing.md`。

### 新增／修改
- **進階「差一點要不要動手」卡內一行「幾點動手」**（首頁不變）：數字是 `app/js/tradeband.js` 的常數 `EXEC_TIMING`，抄自 `proto_execution_timing_results.json`（測試逐一比對）；同一天內差別標「沒有證明，可能只是運氣」。
- `backtest/tested_signals.py` 新增白話列 `execution_timing`（「換個時間或分批買賣」）；`tested_signals.json` 由 11/16 weekly.sh 重產。
- App 版本 v20、service worker 快取 `v20-2026-11-13`。帳本、凍結模型、登記表、升級規則都沒動（30 個核心檔 sha256 前後相同），沒有註冊模型。頁尾警語不變。

### 測試
- 新增 `tests/exec_timing.test.mjs` 4 項（數字＝結果檔、自我檢查、白話無術語與誠實標示、只在進階卡＋版本）與 `tests/e2e_v20.mjs`（iPhone 390×844，首頁不含、進階卡內文字＝函式輸出、SW v20）；舊測試的版本比對放寬到 v2x。
- node 127／127；`test_forecast.py` 10／10；`test_events.py` 5／5；`e2e`、`e2e_v2`～`e2e_v14`、`e2e_v18`、`e2e_v19`、`e2e_v20`、`fallback` 全過。

## 提案 P-coinbase-premium（2026-11-12，不是 App 版本）：Coinbase 溢價（美國現貨需求）→ rejected

- 2026-11-12 23:40 台北。只是研究提案：未註冊模型、App 未改版、首頁不變、沒有推送。用 Coinbase Exchange 公開日K（免金鑰）BTC-USD／ETH-USD／USDT-USD 和 Binance USDT 日K算每日價差 prem＝ln(CB ÷ (BN × USDT/USD))，**只用前一天為止**。事先登記 4 個投入版本（美國最弱減半、連一週負溢價減半、美國最強加碼到最多全倉、漲但美國不買減半）＋依溢價三分位調上漲機率。2022–23 四版都略好、領先＝「漲但美國不買就減半」0.781（冠軍 0.723）；2024 年起 0.828（冠軍 0.851、冠軍×0.85 0.855，P 0.230，兩幣都變差、跌幅 −21.2% vs −18.4%）；「美國最弱就減半」0.859 但 P 0.514、不勝×0.85；其他 0.843／0.847。調上漲機率 Brier 0.25102 vs 0.25230（DM p 0.217，IS 反而較差，仍輸一律 50%）。溢價很小（BTC 2024 日收盤 p5/p95 −1.2／+2.7bp）且主要跟著過去一週價格走（Spearman +0.30）。截斷檢查差 0。今天四個旗標都沒亮，建議不變（BTC 0.427、ETH 0）。詳見 `forecast/proposals/P-coinbase-premium.md`；研究筆記 Drive 12BtOyVfZ-qWfRt2DqkRlkvCyP9mMNWXG。
- `backtest/tested_signals.py` 新增白話列 `coinbase_premium`；`app/data/tested_signals.json` 未重產（試算 20 項、0 錯誤），11/16 weekly.sh 會更新。node 123/123、test_forecast 10/10、test_events 5/5、test_verify_live 11/11。

## v20 可靠度（2026-11-12，不是 App 改版）：每天發布後自動檢查「線上網站＝本機帳本」，對不上就大聲失敗

- 2026-11-12 22:35 台北。所有候選訊號都已測完否決，這輪改做資料可靠度。先檢查 v5–v19：手機端已經有「資料過期，今天先不要依此動作」（v6 各交易所日K、v9 預測晚於 09:00 黃／隔天紅、帳本雜湊手機重算）、即時價抓不到時照常顯示建議並標示（v13），所以 (a) 已涵蓋，不重做首頁。**沒涵蓋的是發布端**：`daily.sh`、`weekly.sh`、`events/publish.sh` 最後一行是 `git commit && git push || echo "nothing to publish"`——推送失敗會被當成「沒東西要發布」、腳本照樣成功結束，每日例行（只在動作改變或失敗時通知）就不會通知；部署庫被鎖 20 分鐘時也是 `exit 0`「下次再發布」，而下次是隔天。用暫存庫模擬推送失敗確認新寫法 rc＝1 並印出「PUBLISH FAILED」（舊寫法同情況 rc＝0）。
- 新腳本 `forecast/verify_live.py`（唯讀；只寫本機 `forecast/reports/live_check.json`，不發布）：(1) 部署庫沒有未提交的變更、本機 HEAD＝GitHub main（`git ls-remote`）；(2) 每天會發布的檔案（live.json、trust.json、events.json、4 個帳本、registry.json、App 程式碼）在原始專案和部署庫逐位元相同，每週才發布的回測 JSON 只警告；(3) 部署庫追蹤的每個檔案（46 個）從 GitHub Pages 抓回來逐位元相同（加 `?v=<commit>` 避開快取，Pages 還在建置時每 30 秒重試、最多 10 分鐘）；(4) 線上檔案內容：4 個帳本雜湊鏈重算通過、live.json 指向線上帳本最後一筆、首頁 BTC／ETH 的建議比例＝帳本那一列、預測日期是最新收完的日K（台北 09:00 之後還是前天的就失敗，和 App 黃燈同一個門檻）。結果碼 0 正常、1 對不上或過期、2 網站連不上。
- `daily.sh`／`weekly.sh`／`events/publish.sh`：推送失敗先 `pull --rebase` 重試一次，仍失敗就印「PUBLISH FAILED」並 `exit 1`；部署庫被鎖改成印「PUBLISH SKIPPED」並 `exit 3`；發布後（先放開鎖）跑 `verify_live.py`，失敗印「LIVE CHECK FAILED」並 `exit 1`，每日例行就會當成失敗通知。
- 2026-11-12 22:40 台北實跑：GitHub main＝本機 2a8bb54、28 個發布檔和原始專案相同、46 個線上檔案相同（第 1 次）、forecasts 20／paper 10／scores 0／events 6 列雜湊鏈通過、首頁 BTC 減碼 0.4273、ETH 空手 0.0＝帳本 2026-11-11 trend_vt@1 列 → LIVE CHECK OK。
- App、首頁、service worker（仍 v19-2026-11-12）、部署庫都沒改；帳本、凍結模型、登記表、升級規則沒動，沒有註冊模型。
- 測試：新增 `forecast/test_verify_live.py` 11 項（本機 HTTP 伺服器提供部署庫暫存複本，不碰真實帳本／部署庫）：完全相同→OK；線上 js 舊版、少一個檔（404）→失敗；帳本竄改（三處一起改，只有雜湊鏈抓得到）＋首頁比例和帳本不同→失敗；台北 08:30 還是前天的預測→OK、09:05→失敗；跨年邊界；本機帳本多一列沒發布→失敗、每週檔只警告；網站連不上→rc 2；暫存 bare remote 模擬未推送、未提交→失敗；三支腳本不再遮蓋推送失敗、放鎖後才檢查、語法通過；只讀（真實帳本／登記表／live.json 前後 sha256 相同、只用 status/rev-parse/ls-remote/ls-files）。node 123／123；`test_forecast.py` 10／10；`test_events.py` 5／5；`e2e`、`e2e_v2`～`e2e_v14`、`e2e_v18`、`e2e_v19`、`fallback` 全過。
- 研究筆記 Drive 1auyoNcHOmqTd8wCVZh82_S57VMlB7Rkh；crypto-predictor commit 0b11e20。
- 限制：只檢查「線上＝本機」，不檢查本機算得對不對（那是 test_forecast／trust 的工作）；手機上的 PWA 可能拿到舊快取，這要靠 App 端的 v9 新鮮度燈。

## 提案 P-wiki-attention（2026-11-12，不是 App 版本）：維基百科瀏覽量（大眾注意力）→ rejected

- 2026-11-12 21:40 台北。先檢查 App：v5–v19 已涵蓋資料可靠度、翻轉價／盤中、建議變更提醒、回測每週更新、白話化、壞週風險、動手門檻，首頁已經很滿，這輪找不到不重複又值得加的首頁改動，所以做最後一個未測的候選。只是研究提案：未註冊模型、App 未改版、首頁不變、沒有推送。用 Wikimedia 公開 API（免金鑰）英文維基「Bitcoin」「Ethereum」每日真人瀏覽量（2015-07→2026-11-11），**只用前一天為止**（發布有延遲）。事先登記 4 個減半規則（查的人暴增、幾乎沒人查、大漲＋湧入、大跌＋湧入）＋依關注程度調上漲機率。2022–23 只有「大漲＋湧入就減半」合格（0.740 vs 冠軍 0.723）；2024 年起 0.692（冠軍 0.851、冠軍×0.85 0.855，BTC、ETH 都變差，P 0.136）；暴增減半 0.751、沒人查減半 0.796、大跌＋湧入 0.849。BTC「大漲＋湧入」後一週平均 +4.42%（13 週）——動能延續，不是過熱。調上漲機率 Brier 0.25093 vs 0.25230（DM p 0.210，不顯著，仍輸一律 50%）。今天 BTC 關注度在過去一年第 91 百分位（被否決的「暴增就減半」會亮），建議不變（BTC 0.427、ETH 0）。詳見 `forecast/proposals/P-wiki-attention.md`；研究筆記 Drive 12SqZrO8GsKQK-vd3hdssT43nFey9EpQV。
- `backtest/tested_signals.py` 新增白話列 `wiki_attention`（「大家在查比特幣、以太幣的人數（維基百科瀏覽量）」）；`app/data/tested_signals.json` 未重產（試算 19 項、0 錯誤），11/16 weekly.sh 會更新。node 123/123、test_forecast 10/10、test_events 5/5。

## 提案 P-options-skew（2026-11-12，不是 App 版本）：選擇權 25-delta 偏斜（put 比 call 貴多少）與 IV 期限結構 → rejected

- 2026-11-12 20:38 台北。只是研究提案：未註冊模型、App 未改版、首頁不變、沒有推送。P-implied-vol 只用 DVOL 水準，沒有用選擇權 smile 形狀，所以不重疊。用 Deribit 公開歷史伺服器（免金鑰）每天 UTC 20:00–24:00 的全部選擇權成交（BTC 3,936、ETH 3,060 次請求，0 失敗），自己重建 30 天 25-delta 風險逆轉 RR25（call IV − put IV）與期限結構 TS（2–10 天 ATM − 14–60 天 ATM），全部早於 Binance 日K收盤。事先登記 5 個版本（特別怕跌／特別追漲／期限倒掛就減半、依 RR25 三分位調上漲機率、加上領先投入）。2022–23 選模期間沒有任何版本贏冠軍（冠軍 0.723；怕跌 0.694、追漲 0.349、倒掛 0.695）。2024 年起：怕跌減半 0.850（幾乎沒動作：極端怕跌 96–99% 發生在冠軍已空手的 2022 年下跌中）、追漲減半 0.456、倒掛減半 0.545（都顯著較差，Holm 0.000／0.002）；冠軍 0.851、冠軍×0.85 0.855。調上漲機率 Brier 0.25152 vs 0.25230（DM p 0.369，IS 反而較差，仍輸一律 50%）。今天三個旗標都沒觸發，建議不變（BTC 0.427、ETH 0）。詳見 `forecast/proposals/P-options-skew.md`；研究筆記 Drive 12nU0QFqx0owEZYwz90saBBJvt4dTMdPM。
- `backtest/tested_signals.py` 新增白話列 `options_skew`；`app/data/tested_signals.json` 未重產，11/16 weekly.sh 會更新（node 123/123）。

## v19（2026-11-12）：差一點要不要動手（不用每天微調；建議是 0 時當天照做）

### 為什麼
- 2026-11-12 19:40 台北開始（研究筆記 Drive 1Txux0eiLsxsosiZFdphVuVj3dc8pyvMT）。上一輪是模型提案，這次做一個直接幫決策的 App 改進。首頁金額句（填了部位才出現）從 v4 起用「差 max(NT$1,000, 2%) 以內不用動」，這個門檻**從來沒測過**；建議比例每天都因波動小幅變，照字面要天天買賣幾百塊，真人做不到。另外 11/12 兩個新提案（永續資金費率、成交量）測完後 App 的「試過但沒通過的訊號」還看不到。

### 研究（可重現，扣成本，2022–23 選、2024 年起檢查）
- 新腳本 `backtest/trade_band.py` → `app/data/tradeband.json`：讀冠軍 trend_vt@1 的逐日 walk-forward 建議比例（凍結程式碼、每天只用當天以前的資料），用 `forecast/engine.paper_sim`（每邊 0.15%＋買進台幣溢價 0.27%，兩幣各半 NT$100 萬）模擬事先登記的 6 種做法：每天調到剛好（＝虛擬投組）、差 2／5／10／20 個百分點以上才調（建議 0 時一律當天全賣）、只每週一看一次。選法事先寫好：2022–23 年夏普不低於每天調 0.02、最大跌幅不多 2 個百分點，取最大的門檻；2024 年起同樣條件再檢查。
- 結果：選中「差 20 個百分點以上才調」，2024 年起夏普 0.859（每天調 0.851）、年化 16.6%（16.3%）、最大跌幅 −18.8%（−18.4%）、成本每年 2.52%（3.22%），每年動手 BTC 36 天、ETH 20 天（每天調＝365 天）。比每天調好的把握 58%，BTC 變好、ETH 變差 → **省事、省成本，沒證明比較會賺**。
- 只每週一看一次（連空手也等到週一）：2024 年起夏普 0.493、年化 8.5%、最大跌幅 −24.7%（把握 0.45%），2022–23 也較差 → 趨勢轉壞時晚幾天賣，就丟掉了規則「大跌少虧」的主要作用。

### 新增／修改
- **首頁金額句**（只在填了部位時）：門檻改讀 `tradeband.json`。差 20 個百分點以內：「和建議差 N 個百分點，在 20 個以內，可以先不動（差超過 20 個或建議變成先不放時再調）」；超過才寫「差 N 個百分點，可以買進／建議賣出約 NT$X」；建議 0 而還有持有：「建議是先不放：全部賣出約 NT$X（建議是 0 時當天照做最重要）」。NT$1,000 最小金額不變。資料讀不到或 2024 年起檢查沒過時，自動回到舊的 2% 說法。
- **首頁卡片底部一行小字**（所有人）：「不用每天微調：你放的比例和建議差 20 個百分點以內可以先不動（2024 年起回測差不多、手續費少一些，沒有證明比較好）。但建議變成『先不要放』時要當天照做：只在每週一才看，2024 年起回測年化只剩 8%（每天看 16%）。」數字全部讀自 `tradeband.json`。
- **進階新卡「差一點要不要動手」**（「運氣差的一週」之後、目錄有連結）：6 種做法的 2024 起年化、夏普（附 2022–23）、最慘跌幅、每年動手天數、成本、比每天調好的把握，標回測資料日期。
- **「試過但沒通過的訊號」重產為 17 項**（補上「永續合約資金費率、期貨比現貨貴多少」與「成交量」兩列）。
- `backtest/refresh_all.py` 新增 tradeband 步驟（失敗時保留舊檔）；`forecast/weekly.sh` 一起提交、發布 `tradeband.json`。Service worker 快取版本 `v19-2026-11-12`（多快取 `js/tradeband.js`、`data/tradeband.json`）；App 版本 v19。帳本、凍結模型、登記表、升級規則、虛擬投組的每天調整都沒動，沒有註冊模型。頁尾警語不變。

### 測試
- 新增 `tests/tradeband.test.mjs` 7 項：成本＝forecast/common.py、期間、選法從數字重新推導相同；每天調＝`paper_sim` 虛擬投組（差 < 1e-6）；不偷看未來（截斷 2025-03-31 後之前每天的決定相同、`--end 2025-06-30` 的 2022–23 區塊相同）；同一終點重跑完全相同；首頁動作（全賣、差不多、先不動、買、賣、舊規則備援、NT$1,000）；首頁小字數字與沒術語；進階卡數字、app.js／sw.js／weekly.sh／refresh_all 接線。
- 新增 `tests/e2e_v19.mjs`（iPhone 390×844）：首頁小字＝函式輸出、進階預設收合；填部位後兩幣金額句＝`act()` 依畫面上的金額重算（BTC「可以先不動」、ETH「全部賣出」）；進階卡位置、6 列、日期；沒有水平捲動與錯誤。截圖 `screenshots/v19-*.png`。
- node 單元測試 123／123；`forecast/test_forecast.py` 10／10、`forecast/events/test_events.py` 5／5；`e2e`、`e2e_v2`～`e2e_v14`、`e2e_v18`、`e2e_v19`、`fallback` 全過。

### 已知限制
- 成本是固定比例、沒有最低手續費，小額帳戶的門檻效果可能更大；稅務申報筆數也沒量化。
- 2024 年起只有約 2.9 年，兩幣方向不一致；不能說門檻規則比較好，只是比較省事。
- `backtest/refresh_status.json` 這次只記了 tradeband 一步（手動跑 `--only tradeband`），11/16 weekly 會完整重寫。

## 提案 P-volume-liquidity（2026-11-12，不是 App 版本）：成交量（量價方向、量縮、Amihud 不流動性、爆量下跌）→ rejected

- 2026-11-12 18:35 台北。只是研究提案：未註冊模型、App 未改版、首頁不變、沒有推送。用本機 Binance 現貨日K 成交量（公開免費），事先登記 4 個「減半」規則＋1 個調上漲機率版本。2022–23 只有「過去 50 天下跌日的量比較大就減半」（obv_cut）合格；2024 年起夏普 0.863（冠軍 0.851、冠軍×0.85 0.855），比冠軍好的把握 50.6%，好處全在 BTC（0.870 vs 0.757），ETH 變差（0.727 vs 0.863）。量縮就減半 0.696、Amihud 0.847、爆量下跌就減半 0.806，都比冠軍差。調上漲機率 Brier 0.25140 vs 0.25230（DM p 0.326，不顯著，仍輸一律猜 50%）。BTC 爆量下跌後一週平均反而上漲。Binance BTC 零手續費期間（2022-07-08→2023-03-22）讓成交量資料有大斷點。今天建議不變（BTC 0.427、ETH 0）。詳見 `forecast/proposals/P-volume-liquidity.md`；研究筆記 Drive 19glp2uAYv2qhrlUUM2HWLwzYSlZcfU2a。
- `backtest/tested_signals.py` 新增白話列 `volume_liquidity`（「成交量（量價配合、量縮、流動性、爆量下跌）」）；`app/data/tested_signals.json` 未重產，11/16 weekly.sh 會更新（node 116/116）。

## v18（2026-11-12）：運氣差的一週，我的錢會少多少

### 為什麼
- 2026-11-12 17:36 台北開始（研究筆記 Drive 1gDEVbyuuef2m6ympP5vpy1oZol28a96k；coin-signal commit d029cee）。前三版都是可靠度修正、上一輪是模型提案，這次做一個直接幫決策的 App 改進。首頁已經有「一週後價格大概在 X～Y（10 次有 8 次）」，但沒有換算成「對我的錢代表什麼」，也從來沒檢查這個下緣準不準。風險控制的第一步是事先知道「壞的一週」大概要承受多少。

### 研究（可重現，扣成本，2023 年起為樣本外）
- 新腳本 `backtest/week_risk.py` → `app/data/weekrisk.json`：讀冠軍 trend_vt@1 的逐日 walk-forward 快取（凍結程式碼、每天只用當天以前的資料；測試確認和帳本記錄的下緣與比例相同），對照 7 天後的實際收盤。
- 下緣（設計上 10% 的週會更低）在 2023 年起真的被跌破的比例：BTC 9.8%（137/1404 天；每週一次不重疊 8.5%）、ETH 11.0%（154/1404；每週 11.4%）——校準良好。2022（選規則時期，大跌年）偏多：BTC 13.7%、ETH 13.4%。事先定的門檻：6%–14% 之外首頁會改寫「和 10 週 1 週有落差」。
- 真的碰到這種週（扣成本）：BTC 照建議平均 -4.0%、全部放 -9.6%；最慘一週 -12.4% vs -26.1%。ETH 照建議平均 -3.6%、全部放 -12.9%；最慘 -13.3% vs -35.6%。首頁的數字是「至少」，碰到時平均會再多。

### 新增
- **首頁每個幣多一句**（不加卡片、不加術語）：「運氣差的一週（2023 年起大約 10 週有 1 週）：BTC 會跌超過 5.5%。照建議放 43%，你打算投入 BTC 的錢會少約 2.4% 以上；全部放進去會少 5.5% 以上。」空手時寫「建議先不放，所以這筆錢不受影響」。數字＝帳本裡冠軍今天的下緣 × 建議比例（只算價格變動）；「幾週有 1 週」讀自 `weekrisk.json`。
- 有填部位時，金額那句下面多一句新台幣：「運氣差的一週：照建議約少 NT$X 以上（全部放進去約少 NT$Y 以上）」。
- 進階新卡「運氣差的一週會少多少」（放在「建議之後一週」後面、目錄有連結）：兩個幣各一張表（2023 起每天／每週一次、2022 選規則時期），標回測資料日期。
- `backtest/refresh_all.py` 新增 weekrisk 步驟（失敗時保留舊檔）；`forecast/weekly.sh` 把 `weekrisk.json` 一起提交、發布。Service worker 快取版本 `v18-2026-11-12`（多快取 `js/weekrisk.js`、`data/weekrisk.json`）；App 版本 v18。帳本、凍結模型、登記表、升級規則都沒動，沒有註冊模型。頁尾警語不變。

### 測試
- 新增 `tests/weekrisk.test.mjs` 7 項：成本＝forecast/common.py、各期間計數、卡片上的說法都成立（照建議在壞週虧得少、碰到時平均比下緣更多、2022 跌破較多）；同一終點重跑完全相同；提早終點（2025-06-30）不會用到之後的結果、2022 區塊不變；walk-forward 快取＝帳本冠軍紀錄；首頁句子數字、空手情況、沒資料檔時仍可顯示、校準失敗時的改寫、沒有術語；新台幣算術；進階卡數字。
- node 單元測試 116／116；`forecast/test_forecast.py` 10／10、`forecast/events/test_events.py` 5／5；`e2e`、`e2e_v2`～`e2e_v14`、新 `e2e_v18`（首頁兩句＝函式輸出、填部位後新台幣句、`.money` 仍是 2 個、進階卡位置與日期、沒有水平捲動與錯誤）、`fallback` 全過。截圖 `screenshots/v18-*.png`。

### 已知限制
- 首頁那句是「這週持有建議比例 7 天」的價格變動，不含手續費，也沒算到週中建議改變；實際碰到時通常比那句更多（進階卡有平均和最慘）。
- 2023 年起只有約 200 個不重疊週，跌破下緣的週只有 17（BTC）／23（ETH）個，平均值仍有誤差。

## 提案 P-perp-positioning（2026-11-12，不是 App 版本）：永續合約資金費率、季度期貨基差（多空擁擠）→ rejected

- 2026-11-12 16:34 台北。只是研究提案：未註冊模型、App 未改版、首頁不變、沒有推送。用 Binance 官方公開資料庫的資金費率（2020→）、季度交割合約與溢價指數，事先登記 5 個版本（資金費率偏高／持續偏高／基差偏高就減半、趨勢向上但資金費率為負就加碼、依資金費率調上漲機率）。2022–23 選模期間沒有任何版本贏冠軍；2024 年起「資金費率偏高就減半」夏普 0.603（冠軍 0.851）。資金費率偏高之後一週平均反而續漲（BTC +2.1%），是趨勢正強而不是擁擠反轉。今天沒有任何規則觸發，建議不變。詳見 `forecast/proposals/P-perp-positioning.md`。
- `backtest/tested_signals.py` 新增白話列 `perp_positioning`（「永續合約資金費率、期貨比現貨貴多少（做多的人擠不擠）」）；`app/data/tested_signals.json` 未重產，11/16 weekly.sh 會更新（node 109/109，只印「尚未發布」警告）。

## v17（2026-11-12）：可靠度修正（試過的訊號補上「減半週期、月初月底、星期幾、月份」、新提案不再弄壞測試、即時價偶發擋請求不再讓測試失敗）

### 為什麼
- 2026-11-12 15:32 台北開始。這次只修可靠度和白話說明，不加新模型、不改首頁。三個問題：(1) 11/12 14:44 測完的 P-calendar-cycle 白話說明已寫進 `backtest/tested_signals.py`，但 `app/data/tested_signals.json` 沒重產，App 的「試過但沒通過的訊號」看不到它；(2) 只要兩次週檢之間有新提案落地，`tests/tested.test.mjs` #88、#92、#95 就失敗（node 102／105），這兩天已連續發生三次；(3) `e2e_v7` 會因 CoinGecko 偶爾擋請求（瀏覽器回報 CORS 錯誤）隨機失敗，但 App 本身已經有備援（改用 MAX 快照估算台幣），是測試把「外部網站拒絕」當成 App 錯誤。

### 修正
- **「試過但沒通過的訊號」新增第 15 項「比特幣減半週期、月初月底、星期幾、月份季節性」**（放在「新聞和研究常提到的指標」）。顯示事先只用 2022–23 選出的「每週四才調整一次」，數字全部讀自 `forecast/proposals/proto_calendar_cycle_results.json`：2024 年起夏普 0.789（冠軍 0.851）、年化 14.9%（16.3%）、最大跌幅 −19.7%（−18.4%），比冠軍差。白話原因每一句都有測試對照結果檔：手續費每年 1.65% vs 冠軍 3.22%；「減半後第二年減半」夏普 0.848、年化 14.6%（只是少放一點）；減半只有 3 次（2016、2020、2024）；2022–23 年月初月底看起來較好、2024 年後兩幣都較差，月份排名和下一週報酬的相關是負的；依月份調上漲機率 Brier 0.2532 vs 0.2523（變差）。`app/data/tested_signals.json` 重產（15 列、`unlisted`／`errors`／`missing` 皆空）。
- **新提案不再弄壞測試**：`tests/tested.test.mjs` 開頭先用產生器對真實提案跑一次（FRESH）。「每個結果檔都有一列」改用 FRESH 檢查；已發布檔少了最新幾列時只印警告（「weekly.sh 會更新」），但 (a) 已發布的每一列必須和 FRESH 完全相同、順序相同，其他欄位（50% 對照、少放一點、早期想法等）也要相同——數字一被改就失敗（已用竄改一個夏普值確認 #2、#5 會失敗）；(b) 待更新的列最多等 8 天（超過代表週檢壞了，測試失敗）。#95（模擬新檔＋壞檔）的基準也改用 FRESH。新增 1 項：日曆那列和結果檔逐項一致、白話原因成立、沒有術語。
- **即時價偶發擋請求不再讓 e2e 失敗**：新檔 `tests/e2e_net.mjs`（`isExternalNetNoise`）只容忍「App 會抓的外部網站（CoinGecko、各交易所、恐懼貪婪指數）拒絕請求」這類網路訊息；App 自己的檔案載入失敗、程式錯誤、其他網站仍然算失敗。`e2e_v2`～`e2e_v12`、`e2e_v14` 改用它（`e2e`、`e2e_v13`、`fallback` 原本就不受影響）。`e2e_v7` 另加第 6 步：故意擋掉 CoinGecko，確認「建議變了」提示和預測卡照常、沒有其他錯誤。新增 `tests/net.test.mjs` 3 項：容忍／不容忍的情況、清單和 App 實際抓的網址一致。
- Service worker 快取版本 `v17-2026-11-12`；App 版本 v17。帳本、凍結模型、登記表、升級規則、提案檔都沒動，沒有註冊模型。首頁、頁尾警語不變。

### 測試
- 修改前：node 單元測試 102／105（`tested` #88、#92、#95 失敗）。
- 修改後：node 單元測試 109／109 全過（`tested` 10 項，含模擬「已發布檔少一列」＝通過並警告、「已發布數字被改」＝失敗；`net` 3 項）。`forecast/test_forecast.py` 10／10、`forecast/events/test_events.py` 5／5。`e2e`、`e2e_v2`～`e2e_v14`、`fallback` 全過；`e2e_v7` 再連跑 3 次全過（每次擋 CoinGecko 的那步都容忍 1 則外部網路訊息）。

## v16（2026-11-12）：可靠度修正（試過的訊號補上「跌深或盤勢轉差時先減碼」的白話說明）

### 為什麼
- 2026-11-12 13:39 台北開始。這次只修可靠度和白話說明，不加新模型、不改首頁。11/12 12:42 測完的 P-drawdown-regime 沒有白話說明，「試過但沒通過的訊號」卡只顯示「新測完的候選訊號（白話說明整理中）」；`app/data/tested_signals.json` 也還沒重產，`tests/tested.test.mjs` #88、#92（資料過期）、#95（測試假設「目前沒有任何未說明的提案」）失敗。

### 修正
- **「試過但沒通過的訊號」新增第 14 項「跌深或盤勢轉差時先減碼」**（放在「調整目前規則的細節」）。顯示事先只用 2022–23 選出的 dd_own_cut（冠軍自己的虛擬帳戶離一年內最高點跌超過樣本內第 80 百分位就減半），數字全部讀自 `forecast/proposals/proto_drawdown_regime_results.json`：2024 年起夏普 0.841（冠軍 0.851）、年化 16.1%（16.3%）、最大跌幅 −18.5%（−18.4%），比冠軍差。白話原因（每一句都有測試對照結果檔）：2022–23 年有用（夏普 0.773 vs 0.723），但 2024 年後幾乎沒觸發（BTC 0%、ETH 0.2% 的日子）；不如直接把冠軍打 85 折（0.855、最大跌幅 −15.8%）；「大起大落就減半」夏普 0.700、成本每年 5.3%（冠軍 3.2%）；調整上漲機率的版本 Brier 0.25112 vs 0.2523（DM p 0.23，不顯著），和單純往歷來上漲比例收（0.25118）一樣，仍輸給一律 50%（0.25000）。
- `app/data/tested_signals.json` 用 `backtest/tested_signals.py` 重產（14 列、`unlisted`／`errors` 皆空）。
- `tests/tested.test.mjs` #95（模擬新結果檔＋壞檔）改成不假設真實資料裡沒有未說明的提案：預期的 `unlisted`／`errors`／「N 個說明整理中」都從已發布的 `tested_signals.json` 推算再加上模擬的那兩檔；檢查內容沒有放寬。新增 1 項：drawdown 那列和結果檔逐項一致、白話原因在結果檔裡成立、白話文字沒有「回撤／體制／HMM／Sharpe／Brier」等術語。
- Service worker 快取版本 `v16-2026-11-12`；App 版本 v16。帳本、凍結模型、登記表、升級規則、提案檔都沒動，沒有註冊模型。首頁、頁尾警語不變。

### 測試
- 修改前：node 單元測試 101／104（`tested` #88、#92、#95 失敗）。
- 修改後：node 單元測試 105／105 全過。`forecast/test_forecast.py` 10／10、`forecast/events/test_events.py` 5／5。`e2e`、`e2e_v2`～`e2e_v14`、`fallback` 全過；`e2e_v7` 第一次因 CoinGecko 暫時擋請求（瀏覽器回報 CORS 錯誤）失敗，重跑 3 次過 2 次，屬外部 API 偶發狀況，和這次修改無關。

### 2026-11-12 14:35 台北：候選模型提案 P-calendar-cycle（未註冊）
- 只做研究、App 沒改：測「比特幣減半週期、月初月底、每週固定哪天調整、月份季節性」能不能改善冠軍 trend_vt@1 → **rejected**（事先選出的「每週四才調整」2024 年起夏普 0.789 vs 冠軍 0.851；「減半後第 2 年減半」0.848 只是少放一點；依月份調上漲機率 Brier 0.2532 較差；減半只有 2–3 輪，樣本太少）；受保護 15 檔 sha256 不變、coin-signal HEAD 420d243 不變；`backtest/tested_signals.py` 已加白話列 `calendar_cycle`（`app/data/tested_signals.json` 未重產，node 102/105：`tested` #88、#92、#95 待 11/16 weekly.sh 重產後通過；暫存副本重產後 105/105）；詳見 `forecast/proposals/P-calendar-cycle.md`。

## v15（2026-11-12）：可靠度修正（試過的訊號補上傳統市場風險訊號、舊測試不再隨日期壞掉）

### 為什麼
- 2026-11-12 11:37 台北開始。這次只修可靠度，不加新模型、不改首頁。兩個問題：(1) 11/12 10:58 測完的 P-cross-asset（美股、美元、美債、VIX）沒有白話說明，「試過但沒通過的訊號」卡不會列它，`tests/tested.test.mjs` 失敗；(2) 5 個舊單元測試寫死 11/10、11/11 的日期或金額，每天 08:20 daily 更新資料後就失敗（不是 App 壞掉，是測試寫法）。

### 修正
- **「試過但沒通過的訊號」新增第 13 項「美股、美元、美債殖利率、VIX（傳統市場的風險訊號）」**（放在「新聞和研究常提到的指標」）。顯示事先只用 2022–23 選出的 xa_usd_cut（美元 20 天漲幅超過 +2.46% 就減半），數字全部讀自 `forecast/proposals/proto_cross_asset_results.json`：2024 年起夏普 0.890（冠軍 0.851）、年化 16.8%（16.3%）、最大跌幅 −18.3%（−18.4%）；比冠軍好的把握 72.9%（規則要約 97.5%），很可能只是運氣。白話原因：好處全來自 ETH（夏普 0.949 vs 0.863）、BTC 反而略差（0.751 vs 0.757）；會改上漲機率的版本在 2022–23 年 Brier 就比冠軍差（0.25216 vs 0.25202）；各訊號和下一週漲跌的相關都小於 0.1。
- **以後新提案沒寫白話說明也不會壞**：`backtest/tested_signals.py` 對沒有說明的結果檔，改成只用它自己的數字產生一列「新測完的候選訊號（白話說明整理中）」，標籤「未採用（說明整理中）」，放在新分組「剛測完、白話說明整理中」，卡片摘要寫「N 個說明整理中」；讀不懂的結果檔列在 `errors`、跳過，不讓產生器當掉（`weekly.sh` 照常）。測試只在這種情況印出警告提醒補說明，不再失敗。另外：如果將來有版本的「比冠軍好的把握」達到門檻，文字不會再寫「很可能只是運氣」，而是「還沒有事先登記並通過 8 週實測，所以沒有採用」。
- **5 個舊測試改成不依賴今天日期**（只改測試，App 行為沒改、沒發現 App 的 bug）：
  - `decision.test`：日K每天變多、`decision.json` 每週才重算 → 改成截到 `decision.json` 自己的 `last_date` 再比對 JS 與 Python 的趨勢狀態和 30 天波動（並檢查日K至少到那天）。
  - `fresh.test`：「壞掉的舊檔會被好的重跑取代」那段，重跑改用 `--end` 固定到發布檔的 `as_of`（不然多一根新K、日期本來就會往前）。
  - `journal.test`：「已記下 M/D 我的決定」「還沒到期（M/D 早上 8 點後有結果）」的日期改從 `live.json` 的 `asof`／`target_date` 算。
  - `trust.test`：新鮮／晚 1 天（黃）／晚 3 天（紅）／晚 2 天的時間點改成相對 `live.json` 的 `asof`；第 N 天、已評分筆數、冠軍虛擬投資金額改從 `trust.json` 算，不再寫死 `NT$999,119`；另加一條「隔天 08:30 還在跑不警告」和「新鮮時顯示『正常』」。
- `e2e_v14.mjs` 接受 v14 以後的版本與「說明整理中」列。Service worker 快取版本 `v15-2026-11-12`；App 版本 v15。帳本、凍結模型、登記表、升級規則、提案檔都沒動，沒有註冊模型。頁尾警語不變。

### 測試
- 修改前：node 單元測試 95／102（7 個失敗：`decision` #8、`fresh` #4、`journal` #6、`trust` #3、#8、`tested` #1、#5）。
- 修改後：node 單元測試 104／104 全過（`tested.test.mjs` 新增 2 項：跨資產那列和結果檔逐項一致、白話原因在結果檔裡成立；模擬一個沒說明的新結果檔＋一個壞掉的結果檔 → 前者出現通用列且數字一致、後者列在 `errors`、產生器正常結束）。`forecast/test_forecast.py` 10／10、`forecast/events/test_events.py` 5／5。`e2e`、`e2e_v2`～`e2e_v14`、`fallback` 全過（`e2e_v13` 第一次跑失敗一次、之後連續 3 次通過，判斷是即時價抓取的偶發狀況）。`weekly.sh` 語法檢查通過；`tested_signals.py` 重跑結果和測試一致。

### 2026-11-12 12:34 台北：候選模型提案 P-drawdown-regime（未註冊）
- 只做研究，不是新版 App：App、帳本、凍結模型、登記表、升級規則、`events.jsonl`、`common.py`、`engine.py`、`review_weekly.py`、`register.py`、`walkforward.py` 都沒動（19 檔前後 sha256 相同），沒有呼叫 `register.py`，coin-signal repo 沒動（HEAD c1356ab）。
- 題目：「帳戶跌深了就少放一點」（回撤控制）和「市場處在高波動狀態就少放一點」（兩狀態體制模型），能不能讓冠軍 trend_vt@1 的一週預測或虛擬投組變好，而且勝過單純「冠軍 ×常數」？全部只用決策當下（日K收盤）已知的資料；體制模型參數只用 2023 年底以前的資料估一次後固定，之後只往前濾波、不回頭修正。
- 事先固定 5 版（12:37 登記）：dd_own_cut（冠軍自己單幣虛擬帳戶離一年內最高點跌超過樣本內第 80 百分位〔BTC 23.2%、ETH 19.5%〕就減半）、dd_px_cut（幣價離一年高點跌超過樣本內第 80 百分位〔約 67%〕就減半）、hmm_cut（兩狀態模型判斷「高波動狀態」機率 > 50% 就減半）、rg_pup（上漲機率＝冠軍與「同一狀態歷來上漲比例」各半）、rg_lead_pup（樣本內最好的投入版＋rg_pup 機率）；對照「冠軍 ×0.9755」（同平均投入）與「冠軍 ×0.85」。
- 只用 2022–23 挑：dd_own_cut 領先（夏普 0.773 vs 冠軍 0.723，只靠 BTC），rg_lead_pup 樣本內合格（Brier 0.25168 vs 0.25202）。hmm_cut 0.531 明顯較差。
- 結果（2024 年起，兩幣合計）：冠軍 夏普 0.851、年化 16.3%、最大跌幅 −18.4%、Brier 0.2523；dd_own_cut 0.841／16.1%／−18.5%（2024 年起幾乎沒觸發：BTC 0 天、ETH 0.2% 的日子；比冠軍好的把握 0.07、比「冠軍 ×0.85」〔0.855／14.0%／−15.8%〕好的把握 0.11）；dd_px_cut 0.849（從未觸發）；hmm_cut 0.700（成本每年 5.3%，常在大跌大漲隔天減碼、錯過反彈）；rg_pup Brier 0.2511（DM p 0.23，不顯著；事後檢查：不分狀態只往歷來上漲比例收也有 0.2512，狀態資訊沒有貢獻；仍比「一律 50%」0.2500 差）。
- 目前（11/11 收盤）：BTC 離一年高點 −27%、冠軍虛擬帳戶回撤 9.3%；ETH −40%、回撤 12.8%；兩幣都在低波動狀態（機率 0.11／0.13）。所有版本都不改今天的建議（BTC 0.427、ETH 空手）。
- 判定 **rejected**：建議 11/16 週檢**不註冊、不採用**。不需要宗做新決定。
- 檔案：`forecast/proposals/P-drawdown-regime.md`、`forecast/proposals/proto_drawdown_regime.py`（以及 `_IS_only.json`、`_results.json`、`_daily.csv`、`_diag_posthoc.json`）；研究筆記 `/workspace/trading/research/crypto/CRYPTO-20261112-1234-drawdown-regime.md`。`forecast/test_forecast.py` 10/10、`forecast/events/test_events.py` 5/5 通過，帳本驗證通過。`backtest/tested_signals.py` 會自動把它列成「說明整理中」（已用暫存輸出確認），但 `app/data/tested_signals.json` 這次沒重產、白話說明也沒加（不改 App），所以 node 單元測試 101／104：`tested.test` #88、#92 要等 11/16 weekly.sh 重產資料後才過，#95 要等補上白話說明列才過。

## v14（2026-11-12）：試過但沒通過的訊號

### 為什麼
- 2026-11-12 09:33 台北開始。從 11/11 起已經測了 12 個候選（穩定幣、DVOL、MVRV、FOMC／CPI、ETH/BTC 強弱、兩幣合計風險……），全部沒通過，但這些結果只在提案檔和研究筆記裡。宗在新聞上看到這些標題時，App 裡沒有地方告訴他「這個我們試過、沒用」。這次改 App，不改模型。

### 新增
- **進階新增「試過但沒通過的訊號」卡**（在「預測模型與自我改善機制」後面，跳轉列「沒通過的訊號」）。首頁完全沒動。
  - 分兩組：「新聞和研究常提到的指標」（6 個）、「調整目前規則的細節」（6 個）。每個一行白話說明是什麼、2024 年起（選模時沒看過的期間，BTC＋ETH 合計）和冠軍比的結果、為什麼沒通過、測試日期，標籤一律「沒通過」。
  - 顯示的是每個提案**事先規則只用 2022–23 選出的版本**；事先規則沒選出任何版本的（DVOL、ETH/BTC 強弱、多速度趨勢）標成「選模期間就沒過」並顯示該提案自己最好的投入版本。看起來比冠軍好一點的（換 60 天波動、差一點不交易、組合版）寫出「比冠軍好的把握 X%（規則要約 97.5%），很可能只是運氣」。
  - 「一再出現的發現：少放一點，結果差不多（未證實，不是建議）」：DVOL 測試的「冠軍 ×0.85」、兩幣合計風險測試的「冠軍 ×0.83」，夏普和冠軍幾乎一樣、跌幅較小、報酬也較少；明寫不是新訊號、沒經過 8 週實測、不是叫宗改比例。另列「沒有任何版本的一週上漲機率勝過一律猜 50%」。
  - 「更早用大漲跌資料檢查過的說法」：P-events-C 的 7 條（暴風雨前的寧靜、穩定幣縮水、CPI／FOMC 波動、恐懼貪婪反向、資金費率、新聞敘事、壓力日減碼），只列結論、不列數字。
- **資料**：`backtest/tested_signals.py`（只讀 `forecast/proposals/proto_*_results.json`、`proto_portfolio_risk_diag_posthoc.json`、`P-events-C-rejected.md`）→ `app/data/tested_signals.json`。每個數字都是 `results[版本].OOS.pooled` 和 `significance` 的原值；新增提案檔會自動出現（沒有白話說明的會列在 `unlisted`，測試會失敗提醒補上）。`weekly.sh` 每週一在 `intraday_cross.py` 之後重跑（失敗保留舊檔）並發布。
- 目前內容（2024 年起，括號＝冠軍）：

| 訊號 | 顯示版本 | 結果 | 判定 |
|---|---|---|---|
| 穩定幣供給增減（USDT＋USDC） | sc_g30_cut | 夏普 0.815（冠軍 0.850）、年化 14.7%（16.3%）、最大跌幅 −18.7%（−18.4%）。 | 比冠軍差。 |
| 選擇權市場的恐慌指數（DVOL 隱含波動） | iv_target | 夏普 0.791（冠軍 0.851）、年化 12.9%（16.3%）、最大跌幅 −16.9%（−18.4%）。 | 比冠軍差。 |
| 鏈上估值 MVRV（價格 vs 持有人平均成本） | mv_floor | 夏普 0.803（冠軍 0.850）、年化 15.3%（16.3%）、最大跌幅 −19.6%（−18.4%）。 | 比冠軍差。 |
| 美國總經公布日（FOMC 利率決議、CPI） | cut50_D_mixed | 夏普 0.776（冠軍 0.850）、年化 14.5%（16.3%）、最大跌幅 −19.4%（−18.4%）。 | 比冠軍差。 |
| ETH／BTC 誰比較強 | rs_ret3 | 夏普 0.819（冠軍 0.850）、年化 16.0%（16.3%）、最大跌幅 −21.1%（−18.4%）。 | 比冠軍差。 |
| 兩個幣合起來的風險（BTC、ETH 幾乎同漲同跌） | pr_cap | 夏普 0.769（冠軍 0.850）、年化 12.3%（16.3%）、最大跌幅 −15.9%（−18.4%）。 | 比冠軍差。 |
| 換一種算波動的方法 | vol60 | 夏普 0.852（冠軍 0.850）、年化 15.9%（16.3%）、最大跌幅 −17.9%（−18.4%）。 | 只比冠軍多一點點，比冠軍好的把握 51.4%（規則要約 97.5%），很可能只是運氣。 |
| 多種速度的趨勢一起看 | donch7 | 夏普 0.542（冠軍 0.850）、年化 7.7%（16.3%）、最大跌幅 −18.9%（−18.4%）。上漲機率誤差 0.25472（冠軍 0.25232，越小越好）。 | 比冠軍差。 |
| 差一點就不交易 | band20 | 夏普 0.869（冠軍 0.850）、年化 17.0%（16.3%）、最大跌幅 −19.4%（−18.4%）。 | 只比冠軍多一點點，比冠軍好的把握 64.4%（規則要約 97.5%），很可能只是運氣。 |
| 把上漲機率校正得更準 | shrink50 | 上漲機率誤差 0.25119（冠軍 0.25232；一律猜 50% 是 0.25000，越小越好）。買賣建議不變，所以投資結果和冠軍一樣。 | 差距可能只是運氣（統計檢定 p＝0.26，要小於 0.05 才算數），而且還是輸給一律猜 50%。 |
| 機率校正＋投入調整一起用 | s50_vol60 | 夏普 0.852（冠軍 0.850）、年化 15.9%（16.3%）、最大跌幅 −17.9%（−18.4%）。上漲機率誤差 0.25119（冠軍 0.25232，越小越好）。 | 只比冠軍多一點點，比冠軍好的把握 51.8%（規則要約 97.5%），很可能只是運氣。 |
| 一週可能漲跌範圍的另一種算法 | HAR-range + rolling conformal per-tail (365d) | 範圍誤差 0.01973（冠軍 0.01997，越小越好），差 1.2%。只影響範圍的顯示，不影響買賣建議。 | 小幅改善但不顯著（多重檢定後 p＝0.66），不值得換。 |

- Service worker 快取版本 `v14-2026-11-12`，並快取 `js/tested.js`、`data/tested_signals.json`。頁尾警語不變。帳本、凍結模型、登記表、升級規則、`forecast/*.py`、提案檔都沒動，沒有註冊模型。

### 測試
- `tests/tested.test.mjs`（6 項）：每個 `proto_*_results.json` 都有一列、全部「沒通過」、沒有一個是已登記模型；每個數字和結果檔獨立重讀一致（有事先選出的版本就必須顯示它）、文字裡的夏普／年化／跌幅／Brier 和數字一致；看起來較好的都低於規則門檻；「少放一點」和「一律猜 50%」的數字和結果檔一致、文字標「未證實，不是建議」「不是叫你改比例」；P-events-C 每列一條；卡片每個訊號一項、跳脫 HTML、沒資料時顯示「資料暫時讀不到」；重跑產生器結果相同、產生器不碰帳本／登記表；接線（只在進階、在模型驗證後、首頁卡沒動、SW v14、`weekly.sh` 重跑並發布、頁尾）。
- `tests/e2e_v14.mjs`（iPhone 390×844）：首頁沒有新內容、進階預設收合；打開進階後卡片在「模型驗證」下一個、12 項全部「沒通過」、每個名稱和結果文字都在、沒有水平捲動、主控台沒有錯誤、`sw.js` 是 v14。截圖 `screenshots/v14-home.png`、`v14-adv-tested.png`、`v14-adv-tested-note.png`。
- `e2e`、`e2e_v2`～`e2e_v13`、`fallback` 全過；`forecast/test_forecast.py` 10／10、`forecast/events/test_events.py` 5／5。node 單元測試 97／102：5 個失敗在**沒改動的 v13 程式上也一樣失敗**（今天 08:20 daily 更新到 11/11 的日K後，`decision.test` #15、`fresh.test` #37、`journal.test` #54、`trust.test` #96／#101 寫死 11/10、11/11 的日期或金額），和 v14 無關，這次沒有改。版本比對放寬：`intraday.test.mjs`、`e2e_v13.mjs` 接受 v13 以後；`intraday.test.mjs` 的 `weekly.sh` 發布行比對允許中間多一個資料檔。

### 已知限制
- 「沒通過」是依目前的升級規則；看起來略好的版本（例如差一點不交易）只是沒被證實，不代表一定比較差。樣本約 150 週，統計力有限。
- 「少放一點」的兩個數字都是事後對照，不是事先登記的版本。

### 2026-11-12 10:40 台北：候選模型提案 P-cross-asset（未註冊）
- 只做研究，不是新版 App：App、帳本、凍結模型、登記表、升級規則、`events.jsonl`、`common.py`、`engine.py`、`review_weekly.py`、`register.py`、`walkforward.py` 都沒動（20 檔前後 sha256 相同），沒有呼叫 `register.py`，coin-signal repo 沒動（HEAD 65fc857）。
- 題目：美股趨勢（S&P 500 對 200 日線、Nasdaq-100 對 50 日線）、美元指數、美國 10 年期殖利率、VIX 這些傳統市場風險訊號，能不能讓冠軍 trend_vt@1 的一週預測或虛擬投組變好？為了不偷看，決策只用**前一個美國交易日（含）以前**的收盤（週末假日沿用最後一個值）。資料：FRED 從本機連不上（全部逾時）、Stooq 是驗證頁，改用 Yahoo（S&P 500、Nasdaq-100、美元指數）、CBOE 官方 VIX、美國財政部官方 10 年期殖利率；原始檔存 `/workspace/trading/research/crypto/data/c_crossasset/`。Yahoo 的 VIX、10 年期和官方資料逐日比對過。
- 事先固定 5 版（10:52 登記）：xa_spx200_cut（S&P 跌破 200 日線就減半）、xa_usd_cut（美元 20 日漲幅超過樣本內第 80 百分位 +2.46% 就減半）、xa_riskoff_cut（五項風險趨避中至少三項就減半）、xa_pup（上漲機率＝冠軍與「同一風險分數組歷來上漲比例」各半）、xa_lead_pup（樣本內最好的投入版＋xa_pup 機率）；另固定對照「冠軍 ×0.951」（和領先版同樣平均投入）。
- 只用 2022–23 挑：xa_usd_cut 領先（夏普 0.852 vs 冠軍 0.723）；但 xa_pup 的 Brier 較差（0.25216 vs 0.25202）→ **唯一可能升級的 xa_lead_pup 在樣本內就不合格**。S&P 跌破 200 日線版 0.393（明顯較差）。
- 結果（2024 年起，兩幣合計）：冠軍 夏普 0.851、年化 16.3%、最大跌幅 −18.4%、Brier 0.2523；xa_usd_cut 0.890／16.8%／−18.3%（比冠軍好的把握 0.73、比「冠軍 ×0.951」0.852／15.6%／−17.6% 好的把握 0.71，規則要 0.975；優勢全在 ETH，BTC 略差；晚一天用就只剩 0.858）；xa_spx200_cut 0.806；xa_riskoff_cut 0.827；xa_pup Brier 0.2515（DM p 0.40，樣本內反而變差，仍比「一律 50%」差）。各訊號對下一週報酬的相關全部接近 0；美元急升後一週 BTC 平均反而 +1.4%、S&P 在 200 日線下的週 BTC +2.5%。→ 加密幣和美股「同一天一起動」，但美股／美元的狀態**不能事先預測**加密幣下一週。拿掉最後 400 根K重算，之前每一天都不變。
- 目前（決策用美國 11/10 收盤）：S&P 500 在 200 日線上 +2.6%、Nasdaq-100 在 50 日線下 −6.2%、美元 20 日 +0.05%、10 年期 4.98%（20 日 −0.23 個百分點）、VIX 19.5（11/11 已降到 17.5）；風險分數 1／5。所有版本都不改今天的建議（BTC 0.427、ETH 空手）。
- 建議 11/16 週檢**不註冊、不採用**；挑戰者也已滿 3 個。不需要宗做新決定。
- 檔案：`forecast/proposals/P-cross-asset.md`、`forecast/proposals/proto_cross_asset.py`（以及 `_IS_only.json`、`_results.json`、`_daily.csv`）；研究筆記 `/workspace/trading/research/crypto/CRYPTO-20261112-1040-cross-asset-risk.md`。`forecast/test_forecast.py` 10/10、`forecast/events/test_events.py` 5/5 通過，帳本驗證通過。

## v13（2026-11-12）：盤中離翻轉價多遠

### 為什麼
- 預測和 v6「接近翻轉」的翻轉價都用**最後一根已收完的日K**（台北早上 8 點）。白天價格一直在動，宗看到大漲大跌時，不知道「現在離翻轉價還有多遠、是不是已經穿過、穿過了算不算數」。前面八個模型提案都沒過，這次改 App。

### 新增
- **首頁每個幣多一行小字**（「未來一週預測建議」卡，資料狀態下面，12.5px）：用手機當下抓的即時價，和前一天收盤算出的 50／200 日線翻轉價比較，台北時間標在前面。
  - 還沒穿過：「盤中 06:45（台北）BTC 74,089 美元，再跌 1.2% 會碰到翻轉價 73,169（200 日線）。規則只看 11/12 早上 8 點收盤，盤中碰到不算數。」（2026-11-12 06:45 台北實測）
  - 已穿過：「盤中 HH:MM（台北）BTC X 美元，已低於 200 日線翻轉價 Y。若 M/D 早上 8 點收盤仍低於，規則會轉為空手；盤中穿過不算訊號。過去（2023 年起）這個時間已穿過的，收盤仍在同一邊約 N%（n 次）。」兩條都穿過時兩個價格一起列。「規則會轉為」＝把即時價當成下一根收盤時 trend3 的變化（和 v6 同一個 `flipAction`）。
  - 抓不到：「盤中價格：抓不到即時價（建議本身不受影響，仍以早上 8 點收盤為準）。」日K不是最新（例如 8 點剛過還沒抓到）時不比較翻轉價。
- **即時價來源**（`app/js/data.js` `fetchTicker`，免金鑰、不快取）：先用日K同一個來源（正常是 Binance 現貨 USDT，讓翻轉價和即時價在同一個市場），失敗依序 OKX USDT → Kraken USDT → Coinbase USD。四個 ticker 端點都有回 CORS 標頭（2026-11-12 06:37 台北實測）。
- **進階新增「盤中離翻轉價多遠」卡**（跳轉列「盤中離翻轉價」，在「資料可靠度」前）：每個幣的即時價來源與抓取時間（台北）、兩條翻轉價各自「再跌／漲 X%」或「盤中已低於／高於」、昨天收盤時的距離；以及過去紀錄表（現在這個整點標亮）、算法和限制。卡片標「回測資料到」日期（v10 規則）。
- **過去紀錄**（`backtest/fetch_hourly.py` → `backtest/data/{BTC,ETH}USDT_1h.json`，Binance 現貨 1 小時K，2017-08-17～；`backtest/intraday_cross.py` → `app/data/intraday.json`）：每天（台北 08:00 開盤）只用前一天以前的收盤算翻轉價，看開盤後第 k 小時的整點收盤價是否已在另一邊，以及當天收盤是否仍在另一邊。整點價格＝那一小時K的收盤；小時K第 23 根收盤和日K收盤 3,372 天逐一相同。BTC＋ETH、50＋200 日線合計，2018-03-05～2026-11-10：

| 台北整點 | 已穿過→收盤仍穿過（2018 起） | 同（2023 起） | 差 < 1% 未穿過→收盤穿過（2018 起） | 同（2023 起） |
|---|---|---|---|---|
| 09:00 | 51%（55／108） | 47%（17／36） | 33%（135／404） | 29%（73／249） |
| 14:00 | 64%（129／201） | 64%（54／84） | 33%（113／338） | 30%（60／203） |
| 20:00 | 71%（198／279） | 62%（79／128） | 31%（105／339） | 29%（55／188） |
| 00:00 | 78%（290／372） | 76%（124／163） | 25%（76／303） | 22%（42／187） |
| 04:00 | 88%（372／424） | 87%（160／184） | 16%（47／287） | 17%（29／175） |
| 07:00 | 94%（409／437） | 95%（190／200） | 12%（35／291） | 7%（12／171） |

  - 解讀：早上剛開盤時穿過，大約一半會在收盤前回來；越接近隔天早上 8 點越可能維持。同一段行情會連續好幾天、好幾個整點出現，次數不是獨立樣本，只當參考；少於 30 次不顯示比例。首頁只在已穿過時顯示「收盤仍在同一邊」那一個數字（優先用 2023 年起）。
- `weekly.sh`（每週一）在 `refresh_all.py` 之後增量更新小時K並重跑 `intraday_cross.py`（失敗保留舊檔），並發布 `data/intraday.json`。
- Service worker 快取版本 `v13-2026-11-12`，並快取 `js/intraday.js`、`data/intraday.json`。頁尾警語不變。帳本、凍結模型、登記表、升級規則、`forecast/*.py`、`backtest/backtest.py` 都沒動，沒有註冊模型。

### 測試
- `tests/intraday.test.mjs`（8 項）：`hourK` 邊界（08:10＝第 1 小時、隔天 08:00 視為日K過期）；400 組隨機價格下 `liveCheck` 的狀態＝把即時價接在已收完日K後面算的 `trend3`、動作＝`flipAction`；兩條都穿過、資料不足、日K過期；首頁文字（台北時間、「若 11/12 早上 8 點收盤仍低於」、「盤中穿過不算訊號」、沒有術語、抓不到／讀取中／過期、樣本 < 30 或沒有檔案時不顯示過去比例）；**`intraday.json` 和 JS 用 App 自己的 `flipLevels` 在同一批 Binance 日K＋小時K重算一致**（兩段期間、23 個整點、4 個計數，誤差 ≤ 1 次，實際 0）；JSON 格式；`fetchTicker` 先試日K來源、被擋就換下一個、全部失敗回報錯誤；接線、SW v13、`weekly.sh` 發布。
- `tests/e2e_v13.mjs`（iPhone 390×844）：首頁兩個幣都有一行 ≤12.5px、沒有術語、進階預設收合；頁面裡用同一批已收完日K和首頁顯示的即時價獨立重算，翻轉價和差距百分比與首頁一致；進階卡有來源、抓取時間（台北）、「不是訊號」、兩段期間、現在整點標亮；**擋掉所有 ticker 請求**時兩個幣都顯示「抓不到即時價」，建議照常顯示；沒有水平捲動、主控台沒有錯誤。截圖 `screenshots/v13-home.png`、`v13-adv-intraday.png`、`v13-adv-history.png`、`v13-home-blocked.png`。
- 舊測試全過：node 單元測試 96／96（含 v13 的 8 項）、`forecast/test_forecast.py` 10／10、`forecast/events/test_events.py` 5／5、`e2e`、`e2e_v2`～`e2e_v12`、`fallback`。版本比對放寬：`journal.test.mjs`、`e2e_v12.mjs` 接受 v12 以後。

### 已知限制
- 即時價是單一交易所的最新成交價；翻轉價很近（< 0.25%）時各交易所可能給不同答案（v6 已在首頁註明）。
- 過去比例用整點價格，手機的即時價可能在整點後最多 59 分鐘；比例沒有分幣、分均線或分距離，只是平均經驗，不是預測，也不改規則。
- 「規則會轉為」只看趨勢這一半；30 日波動到收盤也會小幅變動，實際建議比例以早上 8 點的預測為準。

### 2026-11-12 08:36 台北：候選模型提案 P-implied-vol（未註冊）
- 只做研究，不是新版 App：App、帳本、凍結模型、登記表、升級規則、`events.jsonl`、`common.py`、`engine.py`、`review_weekly.py`、`register.py`、`walkforward.py` 都沒動（20 檔前後 sha256 相同），沒有呼叫 `register.py`，coin-signal repo 沒動（HEAD d5abe76）。
- 題目：選擇權市場的「隱含波動」（Deribit DVOL，市場對未來 30 天波動的預期，BTC、ETH 都從 2021-03-24 開始）能不能讓冠軍 trend_vt@1 的一週預測或虛擬投組變好？資料用 Deribit 免金鑰 API，原始檔存 `/workspace/trading/research/crypto/data/c_dvol/`。用小時線核對：日K的時間是開始時間，收盤和 Binance 日K同一刻（台北 8 點）；當天進行中那列丟掉。和 11/10 抓的副本比，已收完的列沒有被改過。本機 Binance 日K已由今天 08:20 更新到 11/11。
- 事先固定 5 版（08:38 登記）：iv_target（用 DVOL 取代過去 30 天波動來算投入）、vrp_cut（實現波動遠高於隱含時減半）、iv_spike_cut（隱含波動一週急升時減半）、iv_pup（上漲機率＝冠軍與「同一隱含減實現三分位歷來上漲比例」各半）、iv_lead_pup（樣本內最好的投入版＋iv_pup 機率）；另固定對照「冠軍 ×0.85」（和 iv_target 同樣平均投入）。
- 只用 2022–23 挑：**沒有任何版本勝過冠軍**（冠軍夏普 0.723；iv_target 0.698、vrp_cut 0.650、iv_spike_cut 0.457；iv_pup Brier 也較差）→ 依規則在樣本內就失敗。
- 結果（2024 年起，兩幣合計）：冠軍 夏普 0.851、年化 16.3%、最大跌幅 −18.4%、Brier 0.2523；iv_target 0.791／12.9%／−16.9%（P(較好) 0.37）；vrp_cut 0.802；iv_spike_cut 0.704（顯著較差，P 0.017）；iv_pup Brier 0.2513（DM p 0.41，樣本內反而變差，仍比「一律 50%」差）；對照「冠軍 ×0.85」0.855／14.0%／−15.8%，比 iv_target 好 → DVOL 預測波動確實比較準（和之後 30 天實際波動的相關 BTC 0.42 vs 0.15），但用它只是「平均少拿一點」，不是更好的決策。隱含波動一週急升之後一週，BTC 平均反而 +5%（多半是急跌後反彈），所以急升就減碼是錯的方向。晚 1、2 天的版本、拿掉最後 400 根K重算，結論都一樣。
- 目前（11/11 收盤）：DVOL BTC 38.9、ETH 54.8，都在 2021 年以來的低檔（第 13、18 百分位），一週變化不大，沒有壓力訊號。只有 iv_target 會把 BTC 從 0.427 降到 0.385（不採用）；ETH 所有版本都維持空手。
- 建議 11/16 週檢**不註冊、不採用**；挑戰者也已滿 3 個。不需要宗做新決定。
- 檔案：`forecast/proposals/P-implied-vol.md`、`forecast/proposals/proto_implied_vol.py`（以及 `_IS_only.json`、`_results.json`、`_daily.csv`）；研究筆記 `/workspace/trading/research/crypto/CRYPTO-20261112-0840-implied-vol-dvol.md`。`forecast/test_forecast.py` 10/10、`forecast/events/test_events.py` 5/5 通過，帳本驗證通過。

### 2026-11-12 07:40 台北：候選模型提案 P-portfolio-risk（未註冊）
- 只做研究，不是新版 App：App、帳本、凍結模型、登記表、升級規則、`events.jsonl`、`common.py`、`engine.py`、`review_weekly.py`、`register.py` 都沒動（20 檔前後 sha256 相同），沒有呼叫 `register.py`，coin-signal repo 沒動（HEAD 9db29f0）。
- 題目：冠軍 trend_vt@1 把 BTC、ETH 分開調整投入，但兩個幣幾乎同漲同跌（相關係數約 0.85–0.9），合起來的風險會不會超過原本的預算？加一層「看兩幣合起來的風險」的調整，能不能少跌又不少賺？
- 事先固定 4 版（07:40 登記）：pr_cap（合計預期波動超過 21.2% 就兩幣一起縮小）、pr_vt（合計波動目標 22.5%，可放大到每幣上限 1）、pr_corr（30 天相關 > 樣本內第 80 百分位 0.939 就兩幣 ×0.75）、pr_rp（兩幣都持有時按波動倒數分配）。只用 2022–23 挑：pr_cap 領先（夏普 0.762 vs 冠軍 0.723）。
- 結果（2024 年起，兩幣合計）：冠軍 夏普 0.850、年化 16.3%、最大跌幅 −18.4%、最差 5% 週 −4.7%；pr_cap 0.769／12.3%／−15.9%／−3.9%（夏普較好機率 0.35，跌幅較小機率 0.998）；pr_vt 0.491（更差）；pr_corr 0.861（P 0.41，平手、樣本內沒被選上）；pr_rp 0.828。週虧損超過預算線 6.85% 的週數：冠軍 0/149，本來就沒超過。事後對照：直接「建議比例 ×0.83」就有夏普 0.855、最大跌幅 −15.4%，比 pr_cap 好 → pr_cap 只是「少拿一點」，不是更聰明的風控。
- 目前（11/10 收盤）：30 天相關 0.944（偏高），但冠軍只持有 BTC 0.420、ETH 0，合計預期波動 7.8%，pr_cap 不會調整；pr_corr 會把 BTC 降到 0.315（此版回測沒比較好，不採用）。
- 建議 11/16 週檢**不註冊、不採用**；上漲機率和冠軍一樣，依規則本來就不可能升級；挑戰者也已滿 3 個。不需要宗做新決定。
- 檔案：`forecast/proposals/P-portfolio-risk.md`、`forecast/proposals/proto_portfolio_risk.py`（以及 `_IS_only.json`、`_results.json`、`_daily.csv`、`_diag_posthoc.json`）；研究筆記 `/workspace/trading/research/crypto/CRYPTO-20261112-0740-portfolio-risk-overlay.md`。拿掉最後 400 根K重算，之前每一天的持有比例都不變。`forecast/test_forecast.py` 10/10、`forecast/events/test_events.py` 5/5 通過，帳本驗證通過。

## v12（2026-11-12）：我的決策紀錄（只存在這支手機）

### 為什麼
- 前面四次都是候選模型提案、全部沒過（P-combo-calib-exec、P-macro-calendar、P-relative-strength、P-onchain-valuation），模型這邊短期內不會變。對宗的實際決策，更有用的是知道「我真的照做了沒、照做或不照做後來差多少」。App 已經有「建議之後一週」（規則的歷史回放）和「預測成績單」（虛擬 NT$100 萬），但沒有記錄**宗自己實際的選擇**。

### 新增
- **首頁只多一行小字**（「未來一週預測建議」卡，兩個幣下面）：「📝 記下這次我實際怎麼做」；兩個幣都記過這次的建議後改成「📝 已記下 M/D 我的決定（看結果）」。點下去會打開「進階（可不看）」並捲到新卡片。首頁其他內容和用詞不變。
- **進階最上面新增「我的決策紀錄」卡**（跳轉列「我的決策紀錄」）：
  - 每個幣：這次的建議（動作、比例），選「照建議／沒照做／部分照做」，選填「實際放了打算投入的錢的幾 %」和「實際放在這個幣的金額（新台幣）」，按「記下來」。選「照建議」時自動填入建議比例；「部分照做」一定要填比例（或在「我的部位」有總資產和計畫時填金額，自動換算）；「沒照做」可以不填，有填部位時預先帶入目前持有的比例。同一個幣、同一天的建議只留一筆，可以更新、刪除、全部清除。
  - **只存在這支手機的 localStorage（`cs-v12-journal`）**，不會傳到任何地方、沒有帳號、沒有網路請求；換手機或清除網站資料就不見。每筆另存記錄當時的預測雜湊（對得上公開帳本）。
  - 結果表：建議日、幣、建議／我、這週漲跌、**我的做法、照建議、一直抱著**（以「打算投入這個幣的錢」的 % 表示；有記錄當時的預算就另外換算新台幣）。7 天沒到就寫「還沒到期（M/D 早上 8 點後有結果）」。
  - 合計：每個幣只算**不重疊**的已到期週（兩筆 7 天重疊時只算前一筆，標灰），各週連乘；「我的做法」只在有填比例的週計算，並列同樣那些週的照建議、一直抱著。到期少於 8 週時加黃字「到期的週數還很少，這段時間的差別多半是運氣，不能說明誰的做法比較好。」
- **算法**（`app/js/journal.js`，純函式）：起點＝建議依據的那根日K收盤（`live.json` 的 `asof`，台北早上 8 點），終點＝`target_date`（7 天後）收盤；只用手機抓到的**已收完**日K（和首頁同一來源，正常是 Binance 現貨，標在卡片上），終點K還沒收完就是「還沒到期」→ 不偷看未來。報酬＝比例 × ((1+r)(1−0.15%)/(1+0.15%+0.27%) − 1)，成本直接讀 `outcomes.json` 的 `costs`（＝`forecast/common.py`），和 v8「建議之後一週」同一公式：每筆都當成從現金買進、7 天後賣出，長期持有的實際成本會比較低。一直抱著＝100%。
- Service worker 快取版本 `v12-2026-11-12`，並快取 `js/journal.js`。頁尾警語不變。帳本、凍結模型、登記表、升級規則、`forecast/*.py`、`backtest/*.py` 都沒動，沒有註冊模型、沒有推播。

### 測試
- `tests/journal.test.mjs`（7 項）：輸入驗證（照建議預設＝建議比例、部分照做必填、金額 ÷ 預算、0～300%、壞資料）；儲存（同幣同日覆蓋、刪除、壞掉或不認得的 localStorage 會被忽略）；**和 `backtest/action_outcomes.py` 逐筆一致**：用 box 上的 Binance 日K，2026-06-01～11-03 每天當起點（兩幣共 300 多筆），JS 的這週漲跌、照建議、一直抱著和 Python `table()` 差 < 1e-12；**不偷看未來**：終點K之前一律「還沒到期」，之後再多的K都不改變已到期的結果，目前 11/10 的建議仍未到期；合計只算不重疊週且連乘正確；首頁那一行沒有術語、卡片文字和成本說明；`app.js` 只在首頁卡放那一行、卡片在進階、SW v12。
- `tests/e2e_v12.mjs`（iPhone 390×844，App＋`ledger/` 同 GitHub Pages 目錄）：首頁只有一行 ≤12.5px 的小字、沒有術語、進階預設收合；點下去進階打開並捲到卡片；BTC 選照建議自動填 42、存檔後 ✓；ETH 部分照做沒填比例會提示、填 10 後存檔，localStorage 內容正確，首頁變成「已記下 11/11 我的決定」；塞一筆 10/27 BTC「沒照做 100%」：用頁面自己抓的 Binance 已收完日K重算，這週 −4.3%、我的做法 −4.81%（−NT$4,815）、照建議 −2.02%（−NT$2,022）、一直抱著 −4.81%，和表格一致；刪除、全部清除後首頁回到「記下這次我實際怎麼做」；沒有水平捲動、主控台沒有錯誤。截圖 `screenshots/v12-home.png`、`v12-adv-journal.png`、`v12-adv-results.png`。
- 舊測試全過：node 單元測試 88／88（含 v12 的 7 項）、`forecast/test_forecast.py` 10／10、`forecast/events/test_events.py` 5／5、`e2e`、`e2e_v2`～`e2e_v11`、`fallback`。版本比對放寬：`pup.test.mjs`、`e2e_v11.mjs` 接受 v11 以後；`reliability.test.mjs` 的 SW 日期不再固定 11/11；`e2e_v5.mjs`、`e2e_v6.mjs` 原本的 `/v[5-9]/`、`/v[6-9]/` 不接受 v10 以後（之前版本就會失敗），改成接受 v5／v6 以後。

### 已知限制
- 只是宗自己的紀錄：週數少時差別多半是運氣；不能證明模型或宗的做法誰比較好。
- 每筆都是「單獨一週、從現金開始」，每週付一次來回成本，也不跟著每天調整；和虛擬投資（每天調整）的數字不會一樣。
- 只存在這支手機，沒有備份或匯出；用的是手機抓到的最近約 600 根日K（約 1 年 8 個月），太舊的紀錄會顯示「太舊」。

### 2026-11-12 05:37 台北：候選模型提案 P-stablecoin-liquidity（未註冊）
- 只做研究，不是新版 App：App、帳本、凍結模型、登記表、升級規則、`events.jsonl`、`common.py`、`engine.py`、`review_weekly.py` 都沒動（前後 sha256 相同），沒有呼叫 `register.py`，coin-signal repo 沒動。
- 題目：穩定幣（USDT＋USDC）流通量的 30／60 天增減，能不能讓冠軍 trend_vt@1 的一週預測（上漲機率 Brier）或虛擬投組（夏普／最大跌幅）變好？常見說法是「穩定幣變多＝資金進場」。資料：DefiLlama 免金鑰 API（主資料）、CoinMetrics 社群 API `SplyCur`（對照），原始檔存 `/workspace/trading/research/crypto/data/c_stablecoin/`。
- 只用「前一天」以前的供給（DefiLlama 最後一列是當天盤中值，事後會改，最多差 2.5%），另測晚 2、3 天。資料修訂檢查：USDT／USDC 與 11/10 快取完全相同；全市場總量對 Wayback 2025-11～2026-10 舊版在 2024 年後有 1–3% 的改寫（所以只當對照）。2025-11 以前的改寫無法排除。
- 事先固定 5 個版本：sc_g30_cut（30 天縮水就投入減半）、sc_g60_cut（60 天）、sc_g30_tilt（縮水減半、30 天增加 ≥3% 投入 ×1.25）、sc_pup（上漲機率＝冠軍與「同狀態歷來上漲比例」各半）、sc_lead_pup（樣本內最好的投入版＋sc_pup 機率，原則上可同時過 Brier 與夏普）。
- 只用 2022–23 挑：sc_g30_cut 夏普 0.874 領先（冠軍 0.723），sc_lead_pup Brier 0.2514 也比冠軍 0.2520 好 → **第一次有可升級版本在樣本內合格**。
- 結果（2024 年起，兩幣合計）：冠軍 夏普 0.850、年化 16.3%、最大跌幅 −18.4%、Brier 0.2523；sc_g30_cut 0.815／14.7%／−18.7%（P(較好) 0.28）；sc_g60_cut 0.789；sc_g30_tilt 0.863／18.0%／−19.6%（P 0.45，Holm 1.00）；sc_pup／sc_lead_pup Brier 0.2508（DM p 0.17，週檢式 P 0.95 < 門檻 0.975），仍比「一律 50%」的 0.2500 差，而且單純「往 50% 收一半」更好（0.2507）→ 改善是收縮效果、不是穩定幣資訊；sc_lead_pup「兩項都更好」機率 0.35，18 段 8 週視窗兩項同時過 0/18。晚 1 天（lag 2）sc_g30_cut 連樣本內都輸冠軍（0.686）；換成全市場總量或 CoinMetrics 資料，結果大幅搖擺。
- 原因：樣本內 2022 年穩定幣連續縮水 234 天剛好碰上熊市；2024 年後穩定幣大多在增加，縮水時冠軍常已空手，減碼幫不上忙。和文獻一致（Wei 2018、Kristoufek 2021：穩定幣發行不能預測之後的 BTC 報酬，比較像跟著價格走）。
- 目前：USDT＋USDC 2,468 億美元，30 天 −4.1%、距 5 月高點 −7.9%（縮水中）；三個減碼版本會把 BTC 投入從 0.420 減半成 0.210，但這些版本回測比冠軍差，App 不採用。
- 建議 11/16 週檢**不註冊、不採用**；挑戰者也已滿 3 個。不需要宗做新決定。
- 檔案：`forecast/proposals/P-stablecoin-liquidity.md`、`forecast/proposals/proto_stablecoin_liquidity.py`（以及 `_IS_only.json`、`_results.json`、`_daily.csv`）；研究筆記 `/workspace/trading/research/crypto/CRYPTO-20261112-0537-stablecoin-liquidity.md`。拿掉最後 400 根K重算，之前每一天的機率和持有比例都不變。`forecast/test_forecast.py` 10/10、`forecast/events/test_events.py` 5/5 通過，帳本驗證通過。

## v11（2026-11-11）：首頁不再把上漲機率寫成方向建議

### 為什麼
- 研究（`forecast/proposals/P-pup-calibration.md`）發現冠軍 trend_vt@1 的「一週上漲機率」並不比永遠猜 50% 準（2024 年起 Brier 0.2523 vs 0.2500），但首頁每個幣下面都寫「上漲機率約 48%／50%」，看起來像在猜下週漲跌。

### 變更（只改顯示）
- 首頁「未來一週預測建議」每個幣，把「上漲機率約 N%，跟平常差不多／比平常高（低）一點」改成「漲跌方向：約一半一半，無法預測」。帳本、`data/live.json` 裡的 `p_up` 和 `up_text` 都沒改。
- 「進階（可不看）→ 預測模型與自我改善機制」表格下面多一行，列出冠軍算出的原始上漲機率（目前 BTC 48%、ETH 50%），並說明回測顯示它並不比永遠猜 50% 準，所以首頁不把它當方向建議。
- Service worker 快取版本 `v11-2026-11-11`，並快取 `js/pup.js`。頁尾警語不變。帳本、凍結模型、登記表、升級規則和 `forecast/*.py` 都沒動。

### 測試
- `tests/pup.test.mjs`：首頁用詞沒有百分比、進階註記讀 `live.json` 的原始 `p_up`、帳本欄位仍在、SW v11 有快取 `pup.js`。
- `tests/e2e_v11.mjs`（iPhone 390×844）：首頁兩個幣都是這句話、看不到「上漲機率約 N%」、沒有術語、進階註記有原始數字和原因。截圖 `screenshots/v11-home.png`、`v11-adv-pup.png`。
- 舊測試：`tests/e2e_v4.mjs` 改核對新的首頁用詞；`tests/fresh.test.mjs`、`tests/e2e_v10.mjs` 的版本比對放寬到 v11。`tests/live.test.mjs` 仍檢查 `live.json` 的 `up_text`（資料沒改）。

### 2026-11-12 03:34 台北：候選模型提案 P-onchain-valuation（未註冊）
- 只做研究，不是新版 App：App、帳本、凍結模型、登記表、升級規則、`events.jsonl`、`common.py` 和 `engine.py` 都沒動（前後 sha256 相同），沒有呼叫 `register.py`。
- 題目：鏈上估值指標 MVRV（市值 ÷ 實現市值；實現市值≈全體持有人的平均成本）能不能讓冠軍 trend_vt@1 的一週預測（上漲機率 Brier）或虛擬投組（夏普／最大跌幅）變好？資料：CoinMetrics 免費社群 API（不用金鑰；實現市值本身 403，用市值 ÷ MVRV 推回），原始檔存 `/workspace/trading/research/crypto/data/c_onchain/`。依據 Mahmudov & Puell（2018）定義；近年研究（Grobys, Näsman & Sandretto 2026 RIBAF；SSRN 6199098、4719874）認為 MVRV 對 BTC 有預測力，但多是週期／長期擇時。
- 只用「前一天」的 MVRV（台北 08:00 收盤決策時 CoinMetrics 才剛算出前一天），另測晚 2、3 天。資料修訂檢查：本次版本與 11/10 快取、GitHub 2026-03-27／05-24 舊版比對幾乎完全相同（最大差 0.0007%），但 2026-03 以前的改寫無法排除。
- 事先固定 5 個版本（都用 MVRV 在過去 4 年的百分位）：mv_tilt（便宜 <20% 投入 ×1.25、昂貴 >80% 投入減半）、mv_floor（價格低於實現價時至少持有 25%）、mv_rich_cut（>90% 才減半）、mv_pup（上漲機率＝冠軍與「同估值區間歷來上漲比例」各半）、mv_lead_pup（樣本內最好的投入版＋mv_pup 機率，原則上可同時過 Brier 與夏普）。
- 只用 2022–23 挑：mv_floor 夏普 0.761 領先（mv_tilt 0.745、冠軍 0.723）；但 mv_lead_pup 的 Brier 0.2525 **比冠軍 0.2520 差 → 可升級版本在樣本內就沒過**。
- 結果（2024 年起，兩幣合計）：冠軍 夏普 0.850、年化 16.3%、最大跌幅 −18.4%、成本 3.22%/年；mv_floor 0.803／15.3%／−19.6%／3.29%（P(較好) 0.21）；mv_tilt 0.950／17.2%／−16.9%／4.21%（P 0.91，Holm 0.44，不顯著，且不是樣本內選出的）；mv_rich_cut 0.834（P 0.02，Holm 較差 0.10）；mv_pup／mv_lead_pup Brier 0.2518 vs 0.2523（DM p 0.57），仍比「一律 50%」的 0.2500 差；mv_lead_pup「兩項都更好」機率 0.14，18 段 8 週視窗兩項同時過 0/18。晚 2、3 天結論相同。
- 原因：MVRV 是慢速、看好幾年的估值指標，對「下一週」漲跌幾乎沒有預測力（2024 年後等級相關 ≈ 0）。「跌破平均成本就逢低承接」在 2025–26 的 ETH 反而接到下跌。
- 目前：BTC MVRV 1.37（實現價約 US$53,900，百分位 0.28），ETH MVRV 0.94（價格低於實現價約 US$2,171，百分位 0.19）。冠軍 BTC 投入 0.420、ETH 0；只有表現較差的 mv_floor 會在 ETH 放 0.147。
- 建議 11/16 週檢**不註冊、不採用**；挑戰者也已滿 3 個。不需要宗做新決定。
- 檔案：`forecast/proposals/P-onchain-valuation.md`、`forecast/proposals/proto_onchain_valuation.py`（以及 `_IS_only.json`、`_results.json`、`_daily.csv`）；研究筆記 `/workspace/trading/research/crypto/CRYPTO-20261112-0334-onchain-mvrv-valuation.md`。拿掉最後 400 根K重算，之前每一天的機率和持有比例都不變。`forecast/test_forecast.py` 10/10、`forecast/events/test_events.py` 5/5 通過，帳本驗證通過。

### 2026-11-12 02:40 台北：候選模型提案 P-relative-strength（未註冊）
- 只做研究，不是新版 App：App、帳本、凍結模型、登記表、升級規則、`events.jsonl`、`common.py` 和 `engine.py` 都沒動（前後 sha256 相同），沒有呼叫 `register.py`。
- 題目：冠軍 trend_vt@1 對 BTC、ETH 各自判斷趨勢。如果事先看「ETH/BTC 比值」哪個幣比較強，把兩幣合計的投入往較強的幣移（總投入不變、不加槓桿），能不能改善風險調整後報酬？依據 Liu, Tsyvinski & Wu（2022）、Liu & Tsyvinski（2021）、Grobys & Sapkota（2019）、Han, Kang & Ryu（SSRN 4675565）、Moskowitz, Ooi & Pedersen（2012）。
- 事先固定 4 個版本：rs_ma50（比值高於 50 日均線＝ETH 較強）、rs_ma100（100 日均線）、rs_ret3（30／60／90 日相對漲跌三票多數），以及 rs_lead_s50（樣本內最好的傾斜＋上漲機率往 50% 收一半，原則上可同時過「Brier 更好」和「夏普更好」）。都只用前一天收盤已知的資料。
- **誠實聲明**：rs_lead_s50 的上漲機率部分（shrink50）之前已看過 2024 年後的結果，那一半不算乾淨的樣本外。
- 只用 2022–23 挑：三個傾斜版本夏普 0.57／0.67／0.69，**全部比冠軍 0.723 差 → 沒有領先者**（rs_lead_s50 照規則用 ma100）。
- 結果（2024 年起，兩幣合計）：冠軍 夏普 0.850、年化 16.3%、最大跌幅 −18.4%、成本 3.22%/年；rs_ma50 0.852／17.2%／−19.8%／4.39%（P(較好) 0.48）；rs_ma100 0.754／14.6%／−21.1%／4.81%（P 0.19）；rs_ret3 0.819／16.0%／−21.1%／4.84%（P 0.37）；rs_lead_s50 夏普 0.754、Brier 0.2512 vs 0.2523（DM p 0.26），「兩項都更好」的機率 0.16。Holm 校正後沒有一版顯著較好、也沒有顯著較差。18 段 8 週視窗兩項同時過 0/18。
- 原因：扣成本前傾斜只多一點點（OOS 夏普 1.01 → 1.06），但比值訊號一年翻 16–30 次，每年多付 1.2–1.6% 手續費；把投入集中到一個幣，ETH 那半邊最大跌幅從 −19.6% 變 −34.4%（ma100）。比值趨勢對下一週哪個幣漲得多，2022–23 是反向、2024 年後正向，都不顯著。
- 前三版上漲機率和冠軍一樣 → 永遠升不上去；rs_lead_s50 原則上能升，但夏普比冠軍差，實際上不可能。挑戰者也已滿 3 個 → 建議 11/16 週檢**不註冊、不採用**。不需要宗做新決定。目前三個訊號都是「BTC 較強」，冠軍 ETH 投入 0，所以就算採用今天也不會有差別。
- 檔案：`forecast/proposals/P-relative-strength.md`、`forecast/proposals/proto_relative_strength.py`（以及 `_IS_only.json`、`_results.json`、`_daily.csv`）；研究筆記 `/workspace/trading/research/crypto/CRYPTO-20261112-0240-eth-btc-relative-strength.md`。拿掉最後 400 根K重算，之前每一天的機率和持有比例都不變。`forecast/test_forecast.py` 10/10、`forecast/events/test_events.py` 5/5 通過，帳本驗證通過。

### 2026-11-12 01:35 台北：候選模型提案 P-macro-calendar（未註冊）
- 只做研究，不是新版 App：App、帳本、凍結模型、登記表、升級規則、`events.jsonl`、`common.py` 和 `engine.py` 都沒動（前後 sha256 相同），沒有呼叫 `register.py`。
- 題目：美國聯準會利率決議（FOMC）和 CPI 公布日一年前就排定，是少數「事前就知道」的資訊。這些日子 BTC／ETH 是不是比較會動、或有固定方向？在這些日子先把冠軍 trend_vt@1 的投入比例減半，能不能改善風險調整後報酬？日期全部從聯準會官網和 BLS（官網擋程式，改用 Wayback 封存＋WebFetch）抓原始頁解析，只用排定的會議（臨時會議不算），存在 `/workspace/trading/research/crypto/data/c_macro/`；和 events 管線的日曆逐日一致。依據 Johansson & Vilhelmsson（2023）、Benigno & Rosa（2023，NY Fed SR 1052）、Ben Omrane 等（2025）、Lucca & Moench（2015）。
- **誠實聲明**：`events/analysis.md` 已用全期看過「事件日波動比率」，所以波動研究的樣本外不算乾淨；投入規則是第一次測。
- 事先固定 4 個版本（上漲機率都和冠軍一樣）：cut50_D（事件當天減半）、cut50_Dm1D（前一天＋當天）、cut50_DDp1（當天＋隔天）、cut50_D_mixed（只在均線訊號分歧時當天減半）。都在前一天收盤（台北早上 8 點）就決定，不用當天價格。只用 2022–23 挑：只有 **cut50_D_mixed** 比冠軍好（樣本內夏普 0.743 vs 0.723）。
- 波動：FOMC 或 CPI 當天的漲跌幅（已扣掉當時波動高低）2022–23 是平常的 BTC 1.37 倍（t 2.2）、ETH 1.40 倍（t 2.7）；2024 年起只剩 1.07 倍（t 0.5）、1.18 倍（t 1.2）。小時資料顯示公布那一小時確實是平常的 2–5 倍，但只占全天波動約一成。事件日平均反而偏漲（BTC +41、ETH +90 bp，t < 2，方向依事件類型不同），不能當方向訊號。
- 結果（2024 年起，兩幣合計）：cut50_D_mixed vs 冠軍 夏普 0.776／0.850（P(較好) 0.005）、年化 14.5%／16.3%、最大跌幅 −19.4%／−18.4%、Brier 0.2523 相同、成本 3.79%／3.22%/年；其他三版夏普 0.67–0.71、成本 4.9–5.0%/年。減碼的日子剛好錯過上漲，還多付手續費；兩版經 Holm 校正後仍**顯著較差**。整段 walk-forward 只有 cut50_D_mixed 過 wf_not_worse。18 段 8 週視窗兩項同時過 0/18。
- 上漲機率和冠軍一樣 → Brier 相同 → 「實盤 Brier 更好」永遠不過 → **永遠升不上去**；挑戰者也已滿 3 個 → 建議 11/16 週檢**不註冊、不採用**。不需要宗做新決定；App「本週要注意」只列日期、不說波動較大的做法不變。
- 檔案：`forecast/proposals/P-macro-calendar.md`、`forecast/proposals/proto_macro_calendar.py`（以及 `_IS_only.json`、`_results.json`、`_daily.csv`）；研究筆記 `/workspace/trading/research/crypto/CRYPTO-20261112-0135-macro-calendar-fomc-cpi.md`。拿掉最後 400 根K重算，之前每一天的持有比例都不變。`forecast/test_forecast.py` 10/10、`forecast/events/test_events.py` 5/5 通過，帳本驗證通過。

### 2026-11-12 00:35 台北：候選模型提案 P-combo-calib-exec（未註冊）
- 只做研究，不是新版 App：App、帳本、凍結模型、登記表、升級規則、`events.jsonl`、`common.py` 和 `engine.py` 都沒動（前後 sha256 相同），沒有呼叫 `register.py`。
- 題目：之前的提案只改一邊——只改投入比例的 Brier 一定和冠軍一樣，只改上漲機率的夏普一定一樣，所以都永遠過不了「實盤 Brier 更好**且**夏普更好」。這次事先固定 4 個「機率＋交易方式一起改」的組合：s50_band05、s50_band20、s50_vol60（上漲機率往 50% 收一半，再加 5／20 個百分點不交易區間或改用 60 日波動）、platt_band05。依據 Platt（1999）、Gneiting & Raftery（2007）、Gârleanu & Pedersen（2013）、Moreira & Muir（2017）、Diebold & Mariano（1995）、Holm（1979）。
- **誠實聲明**：這些零件都是之前看過 2024 年後結果才挑的，這次的樣本外不是乾淨的保留資料。
- 只用 2022–23 挑（Brier 和夏普都要比冠軍好、跌幅不差超過 5 個百分點，取夏普最高）：**s50_vol60**（樣本內夏普 0.898 vs 冠軍 0.723）。
- 結果（2024 年起，兩幣合計）：s50_vol60 vs 冠軍 夏普 0.852／0.850（P 0.52）、年化 15.9%／16.3%、最大跌幅 −17.9%／−18.4%、Brier 0.2512／0.2523（DM p 0.26）、ECE 0.026／0.042、成本 2.82%／3.22%/年；「兩項都更好」的拔靴機率 0.46，Holm 後都不顯著。樣本外最好的是 s50_band05（夏普 0.875、P 0.91），但不是樣本內挑的，不改選。兩半的效果完全獨立、只是相加。
- 用週檢同一套檢定切 18 段 8 週：**每個版本都是 0/18 段兩項同時過**——這麼小的差別 8 週驗不出來。整段 walk-forward 四個版本都過 wf_not_worse／wf_dd。
- 建議 11/16 週檢**不註冊**（挑戰者已滿 3 個、優勢未證實）。要不要把機率和建議分開評、或把「差距小就不調」當操作習慣，需要宗決定。
- 檔案：`forecast/proposals/P-combo-calib-exec.md`、`forecast/proposals/proto_combo_calib_exec.py`（以及 `_IS_only.json`、`_results.json`、`_daily.csv`）；研究筆記 `/workspace/trading/research/crypto/CRYPTO-20261112-0035-combo-calib-exec.md`。拿掉最後 400 根K重算，之前每一天的機率和持有比例都不變。`forecast/test_forecast.py` 10/10、`forecast/events/test_events.py` 5/5 通過，帳本驗證通過。

## v10（2026-11-11）：回測數字每週自動更新＋每張卡標日期

### 2026-11-11 23:40 台北：候選模型提案 P-pup-calibration（未註冊）
- 只做研究，不是新版 App：App、帳本、凍結模型、升級規則、`events.jsonl` 和 `common.py` 都沒動，沒有呼叫 `register.py`。
- 題目：之前四個提案（區間、趨勢組合、不交易區間、波動估計）都沒改冠軍 trend_vt@1 的「一週上漲機率」，所以 Brier 一樣、永遠過不了「實盤 Brier 更好」。這次只改上漲機率、投入比例和建議完全不變，看能不能讓機率更準。依據是 Brier（1950）、Murphy（1973）分解、Platt（1999）、等調回歸（Zadrozny & Elkan 2002；Niculescu-Mizil & Caruana 2005）、適當評分（Gneiting & Raftery 2007）和用 log 分數合併預測（Hall & Mitchell 2007）。
- 事先固定 6 個版本：shrink50（冠軍和「歷來上漲比例」各一半）、platt（Platt 校正）、isotonic（等調回歸＋平滑）、state4（四種均線狀態、近兩年、平滑）、avg5（5 個登記模型平均）、stack5（5 個模型按 log 分數學權重）。全部只用當天已知結果的資料（7 天前以前）。只用 2022–23 挑：Brier 和 log loss 都比冠軍好的只有 **shrink50**。
- 結果（2024 年起，兩幣合計）：Brier 冠軍 0.2523 → shrink50 0.2512（DM p 0.26、不重疊週 t +0.51、Holm 1.00），校準誤差 ECE 0.042 → 0.026；比冠軍好但**未證實**。其他：platt 0.2506、avg5 0.2509、isotonic 0.2512、stack5 0.2513、state4 0.2564（更差，否決）。
- 重要發現：冠軍說「上漲機率 48%」那些週實際上漲 51.6%，說「54.5%」的週實際 49.9%，方向反了、沒有鑑別力；**永遠猜 50% 的 Brier 0.2500 比所有模型都好**（不顯著）。能改善的版本都是把機率往 50% 拉。也就是說：一週的漲跌方向目前沒有模型能預測。
- 升級規則要「Brier 更好」**而且**「虛擬投資夏普更好」都過；只改機率、建議不變的版本夏普一定一樣，所以**也永遠升不上去**；挑戰者也已滿 3 個 → 建議 11/16 週檢不註冊。要不要改規則（機率和建議分開評）、或首頁上漲機率改成往 50% 收斂的版本，需要宗決定。
- 檔案：`forecast/proposals/P-pup-calibration.md`、`forecast/proposals/proto_pup_calibration.py`（以及 `_IS_only.json`、`_results.json`、`_daily.csv`）；研究筆記 `/workspace/trading/research/crypto/CRYPTO-20261111-2340-pup-calibration.md`。拿掉最後 400 根K重算，之前每一天的機率都不變。`forecast/test_forecast.py` 10/10、`forecast/events/test_events.py` 5/5 通過，帳本驗證通過。

### 為什麼
- 進階裡的回測數字（建議之後一週、建議變化、今天怎麼做、部位與風險、定期定額、槓桿、訊號細節）原本都是手動跑一次，時間一久就變舊，卻看不出來是哪一天的資料。

### 盤點：App 裡來自回測的數字從哪裡來
| 檔案 | 產生程式（v10 起由 `backtest/refresh_all.py` 每週重跑） | 用在 |
|---|---|---|
| `data/backtest.json` | `backtest/pin.py --end E`（＝原封不動執行 `backtest.py`，只把日K截到 E） | 訊號細節（7 個訊號＋相似走勢） |
| `data/decision.json` | `backtest/decision.py --end E` | 今天怎麼做、我的部位與風險（週報酬）、槓桿強平機率、台幣溢價 |
| `data/dca.json` | `backtest/dca_rebalance.py --end E` | 定期定額與再平衡 |
| `data/flips.json` | `backtest/flip_stats.py --end E` | 最近建議變化 |
| `data/outcomes.json` | `backtest/action_outcomes.py --end E` | 建議之後一週（含首頁灰色那一行） |
| `data/live.json` 的回測成績 | `forecast/review_weekly.py`（本來就每週重算，沒動） | 預測成績單、模型驗證 |
| `data/events.json`、`data/trust.json` | `daily.sh`／`weekly.sh`（本來就自動，沒動） | 大漲跌原因、紀錄可信度 |
- 不會自動更新、但 App 上已經標日期的快照：C#23 MAX 台幣溢價表（最後 2026-11-10）、MAX 掛單簿快照（2026-11-11 02:37 UTC＝台北 10:37）。`app.js` 裡的強平事件表（CASCADE）和 `decision.py` 的「研究決策重點」是研究筆記的固定結論（附 C# 編號），不是可重跑的回測。

### 新增
- **`backtest/refresh_all.py`**：E＝`backtest/data` 裡 BTC、ETH 都已收完的最新日K（或 `--end`）。依序重跑上表 5 支程式，成本、樣本內／外切點（2023-01-01）、規則都和原本一樣；每個檔加上 `as_of`（用到的最後一根日K）、`generated_at`（台北時間）、`refresh`（程式與參數），`decision`／`dca` 另有 `as_of_parts`（加密幣、週報酬、溢價、掛單簿各自的日期）。
  - **失敗就保留舊檔**：程式出錯、超時、輸出不是合法 JSON（含 NaN）、日期不等於 E、資料起點改變、欄位消失、日期倒退，任何一項不過就不覆蓋。結果寫在 `backtest/refresh_status.json`；另外記錄「樣本內數字有沒有變」（延長資料不該改到 2023 年以前的結果）。
  - 先更新 Yahoo 的 SPY、AGG、0050.TW、TWD=X 日線到 `backtest/data/yahoo/`（公開、不需金鑰；新檔不完整、比舊的短或舊就不換）。`decision.py` 讀 Yahoo 時**只用已收盤的那一天**（抓取時那天還沒收盤就丟掉），而且全部截到 E。
  - `backtest/backtest.py` **一個字都沒改**：它是每日預測「計算框架雜湊」的一部分，改了會讓帳本檢查失敗。所以用 `backtest/pin.py` 在執行時把讀日K的函式包一層截到 E（資金費率、恐懼貪婪本來就只對齊到日K的日期，等效於在 `load()` 裡加一行截斷）。
- **`weekly.sh`**（每週一 09:00 台北）在週檢討、`trust_export` 之後呼叫 `refresh_all.py`（失敗只印訊息、不影響週檢討），再把 5 個 JSON 一起發布。`daily.sh` 不變（不拖慢每日預測）。
- **進階每張回測卡標題下多一行小字「回測資料到 YYYY/MM/DD」**：建議之後一週、最近建議變化、今天怎麼做、我的部位與風險、定期定額、預測模型與自我改善機制、槓桿、訊號細節。日期比「現在應該有的最新收盤日」（台北 09:00 以後算前一天，和 v9 同一規則）落後**超過 10 天**時，再多一行黃色小字「回測數字超過 10 天沒更新，先當參考就好。」首頁（未來一週預測建議、成績單）完全不變，即使首頁灰色那一行用的資料過期也不在首頁加字，只在進階提醒。
- `app/js/fresh.js`（純函式）、Service worker 快取版本 `v10-2026-11-11`（多快取 `js/fresh.js`）。頁尾警語不變。

### 2026-11-11 22:45 台北實跑（E＝2026-11-10，最新已收盤日K）
- 5 個檔全部成功，`as_of` 都是 2026-11-10；樣本內數字全部沒變（backtest 28 區塊、dca 7 區塊、其他各 2 區塊）。
- **和 v9 一樣的**：`backtest.json`、`flips.json`、`outcomes.json` 的每個數字都相同（v9 本來就算到 11/10）；`live.json` 回測成績沒動。首頁灰色那一行、建議變化次數、各訊號回測都不變。
- **有變的**：
  - `dca.json`：v9 的 0050 在 11/10 那天還沒有收盤價，所以算到 11/09；現在 Yahoo 補上了，算到 11/10。11/10 加密幣下跌，5% 加密＋美股 60／債 40 一次投入的年化：全期 不再平衡 13.7%→13.6%、每月 12.8%→12.7%、每季 13.7%（顯示位數不變，13.72%→13.65%）；2023 起 不再平衡 19.1%→18.9%、每季 18.1%→17.9%、每月 17.7%→17.5%。每月投入 NT$1 萬：本卡計畫 全期 13.1%→13.0%、2023 起 14.6%→14.3%；加趨勢濾網 13.2%→13.0%／14.8%→14.5%。最大跌幅、賣出次數、分批 vs 一次勝率在顯示的位數上不變。Yahoo 還原價的極小修正也讓 10% 加密的「目標 × 趨勢」調整次數變了幾次（例如 66→62），年化變動 ≤0.1 個百分點。
  - `decision.json`：週報酬最後一列（11/09–11/13 這週，資料到 11/10）改用已收盤的 TWD=X 和 Yahoo 修正後的價格：BTC −3.21%→−3.64%、ETH −8.76%→−9.17%、0050 +5.35%→+7.78%、SPY +1.46%→+1.00%；另有 20 個舊週在小數第 5 位的還原價修正。「5% BTC 占整體風險」和「很糟的一週」在顯示的位數上不變。新增 `weekly.data_end`。

### 測試
- `tests/fresh.test.mjs`（7 項）：標示文字和 10／11 天分界、台北 09:00 分界、沒有術語；標示插在卡片標題下、空卡不加；5 個 JSON 都有 `as_of`／台北 `generated_at`／產生參數，App 從舊格式也讀得到同一天；**失敗保留舊檔**（程式失敗、輸出日期錯 → 舊檔逐位元組不變；壞掉的舊檔會被成功的新檔取代；只跑一個時其他檔不動）；釘住同一天重跑和發布的數字完全相同；`verify_forecast_frames`＋`verify_chain` 通過（`backtest.py` 沒改）；只有 `weekly.sh` 呼叫、5 個檔會發布、SW v10、首頁卡沒有日期行。
- `tests/e2e_v10.mjs`（iPhone 390×844）：8 張回測卡的日期都等於各檔 `as_of`、現在沒有提醒；把 `dca`、`outcomes` 改成 31 天前時只有那兩張卡出現提醒、首頁沒變；沒有水平捲動、主控台沒錯誤、頁尾警語在。截圖 `screenshots/v10-adv-plan.png`、`v10-adv-stale.png`、`v10-home.png`。
- 舊測試：`tests/reliability.test.mjs`、`tests/trust.test.mjs` 的 SW 版本與 `weekly.sh` 發布清單比對放寬到 v10（內容不變）。

## v9（2026-11-11）：預測新鮮度與紀錄可信度

### 2026-11-11 21:30 台北：候選模型提案 P-vol-estimator（未註冊）
- 只做研究，不是新版 App：App、帳本、凍結模型、升級規則、`events.jsonl` 和 `common.py` 都沒動，沒有呼叫 `register.py`。
- 題目：冠軍 trend_vt@1 的趨勢訊號不變，只把「30% ÷ 30 日波動」裡的 30 日波動換成其他事前波動估計，看能不能提高風險調整後報酬。依據是波動管理組合（Moreira & Muir 2017）、波動目標（Harvey 等 2018）、HAR（Corsi 2009）、RiskMetrics EWMA（1996）和高低價波動（Parkinson 1980）。
- 事先固定 5 個版本：ewma94（EWMA λ 0.94）、har_pk（HAR＋高低價）、semi60（60 日下檔半波動）、vol60（60 日波動）、blend（vol30、ewma94、har_pk 平均）。只用 2022–23 挑：夏普不低於冠軍 0.02 以上、跌幅不差 5 個百分點以上，取夏普最高 → **vol60**。
- 結果（2024 年起，扣成本，兩幣合計）：vol60 夏普 0.85 vs 冠軍 0.85（0.852 vs 0.850，拔靴 P(較好) 0.51）、年化 15.9% vs 16.3%、最大跌幅 −17.9% vs −18.4%、成本 2.82% vs 3.22%／年，等於打平；樣本內的優勢（0.90 vs 0.72）沒有延續。波動預測最準的 har_pk 風險最低（跌幅 −16.4%、最慘 5% 週 −3.9%）但夏普 0.78、年化 13.1%；ewma94 夏普 0.78、blend 0.80、semi60 0.85 但跌幅 −22.4%。Holm 校正後全部不顯著。
- 五個版本的上漲機率都和冠軍一樣，Brier 完全相同，升級規則要求實盤 Brier 更好，所以**永遠升不上去**；挑戰者也已滿 3 個 → 建議下次週檢（11/16）不註冊。結論：冠軍現在用的 30 日波動不需要換。
- 檔案：`forecast/proposals/P-vol-estimator.md`、`forecast/proposals/proto_vol_estimator.py`（以及 `_IS_only.json`、`_results.json`、`_daily.csv`）；研究筆記 `/workspace/trading/research/crypto/CRYPTO-20261111-2130-vol-estimator-targeting.md`。拿掉最後 400 根K重算，之前每一天的波動估計和比例都不變。`forecast/test_forecast.py` 10/10、`forecast/events/test_events.py` 5/5 通過，帳本驗證通過。

### 新增
- **首頁只在有問題時多一行**（「未來一週預測建議」卡，日期下面、兩個幣上面）：
  - 預測資料晚了 1 天（黃色）：「⚠️ 預測資料已 1 天沒更新，先別照做（下面還是 11/11 早上的建議）。」
  - 晚了 2 天以上（紅色）：「⛔ 預測資料已 N 天沒更新，先別照做（……）。」
  - 帳本檢查沒通過（建置時或這支手機重算時發現不相符）：「⛔ 預測紀錄檢查沒通過，先別照做。」
  - 其他時候什麼都不加。「晚了幾天」＝現在應該有的最新收盤日 − 卡片上預測的收盤日。每日預測 08:20（台北）跑，所以**台北 09:00 以後**才算少一天；08:00～09:00 之間不提醒。
  - 取代 v4 原本「產生時間超過 36 小時」的提醒（那個是看產生時間，週檢討重跑時會被重設，也沒有分黃紅）。
- **進階新增「預測新鮮度與紀錄可信度」卡**（放在「資料可靠度」後面，跳轉列「紀錄可信度」）：
  - 新鮮度：最新預測的收盤日、現在應該要有的收盤日、下一次預計產生的時間。
  - 雜湊鏈：建置時用每日預測同一套檢查（`forecast/common.py` 的 `verify_chain`＋`verify_forecast_frames`）的結果；5 個登記模型的程式碼 sha256 是否和登記時相同。
  - **這支手機自己重算**：打開 App 時讀公開的 `ledger/*.jsonl`，在手機上用同一個公式 sha256(上一筆雜湊＋這一筆內容) 重算每一筆。帳本每一列本來就是排序過的標準 JSON，所以直接把該列的 `"hash"` 欄位拿掉來算，不重新轉換數字，結果和 Python 一致。讀不到檔案時只寫「這次沒辦法自己重算」，不在首頁警告。
  - 每個帳本檔的筆數、建置時／手機上的結果、最後雜湊。
  - 已記錄的實盤預測筆數（模型 × 幣 × 天）、冠軍筆數、第一筆／最新一筆寫入時間（台北）、有沒有缺日。
  - 8 週驗證：今天是第幾天／需要 56 天（數字直接讀 `review_weekly.py` 的 `min_live_days`）、第一批到期日、已評分筆數、照規則最早可以比較的日期。
  - 虛擬投資：每個模型最新一筆的金額、報酬、累計成本、期間；帳本沒有資料時寫「尚無實盤紀錄」。
- **`forecast/trust_export.py` → `app/data/trust.json`**（只讀，不寫帳本、不動模型和升級規則）。`daily.sh`、`weekly.sh` 只加了匯出這一步：跑完預測後執行它（失敗也不影響預測），再把 `trust.json` 和 `live.json` 一起發布。
- Service worker 快取版本 `v9-2026-11-11`，並快取 `js/trust.js` 和 `data/trust.json`（帳本檔不預先快取，每次從網路讀）。

### 真實數字（2026-11-11 20:40 台北，帳本建置時）
- 雜湊鏈全部通過：forecasts 10 筆、scores 0 筆、paper 5 筆、events 6 筆；框架雜湊符合；5 個模型程式碼都和登記時相同。手機端重算的筆數和最後雜湊與 Python 完全一致（forecasts 最後雜湊 `363dc527…`，和 `live.json` 相同）。
- 實盤預測 10 筆（5 個模型 × 2 個幣 × 1 天），冠軍 trend_vt@1 2 筆；收盤日 2026-11-10（台北 11/11 08:00），寫入於台北 11/11 12:37，沒有缺日。
- 8 週驗證：今天第 1 天／56 天；第一批 2026-11-17 收盤到期，已評分 0 筆；照每天記錄、不缺日，第 56 天（2027-01-04）的預測要到 2027-01-11 收盤（台北 1/12 08:00）才到期，之後的週檢討才可能換冠軍。
- 虛擬投資（11/10 一天，金額全部是買進成本）：照建議 NT$999,119（−0.09%）、一直抱著 NT$995,818（−0.42%）、knn NT$995,818、logit NT$999,123、tsmom NT$999,000。
- 新鮮度：**現在正常**（最新 11/10 收盤，符合預期），首頁不會多出那一行。每日預測還沒有自動跑過，第一次是 11/12 08:20；如果那次沒成功，11/12 09:00 以後首頁會出現黃色提醒。

### 測試
- `tests/trust.test.mjs`（9 項）：09:00 台北的分界（含跨年）、黃／紅門檻、首頁那一行的文字和沒有術語、檢查失敗時改成紅色；手機端重算與 Python `verify_chain` 在真實帳本上筆數和最後雜湊一致，改一個數字、對調兩列、拿掉第一列都會被抓到；讀不到檔案時不警告；`trust.json` 的每個數字都和帳本逐列重算一致（筆數、日期、虛擬投資、56 天規則）；`trust_export.py` 在複製的帳本上重跑結果相同、不改任何檔案，改過的副本會報 `LEDGER TAMPERED: paper.jsonl line 4`；進階卡的內容和「尚無實盤紀錄」；`daily.sh`／`weekly.sh` 有匯出並發布、SW v9。
- `tests/e2e_v9.mjs`（iPhone 390×844，用和 GitHub Pages 一樣的目錄：App 在根目錄、帳本在 `ledger/`）：現在首頁沒有多一行；把預測改成晚 1 天出現黃色、晚 3 天出現紅色，都在兩個幣上面；把公開帳本改一個數字時，首頁變成「預測紀錄檢查沒通過」、進階出現 ❌；正常時進階卡的 4 個檔案都是 ✅、數字和 `trust.json` 一致；首頁沒有術語、頁尾警語維持、沒有水平捲動、主控台沒有錯誤。截圖 `screenshots/v9-home.png`、`v9-stale-yellow.png`、`v9-stale-red.png`、`v9-tampered.png`、`v9-adv.png`。
- 既有測試全過：node 單元測試 69／69（含 v9）、`forecast/test_forecast.py` 10／10、`forecast/events/test_events.py` 5／5、`e2e`、`e2e_v2`～`e2e_v8`、`fallback`。`e2e_v8` 和 `outcomes.test.mjs` 的版本檢查改成接受 v8 以後。e2e 要用含 `ledger/` 的目錄跑（只放 `app/` 會讀不到帳本、出現 404）。

### 已知限制
- 手機重算只能證明「發布之後帳本沒被改」，不能證明寫入當時的數字是對的；框架雜湊和模型程式碼的檢查只在建置時做（手機拿不到程式檔）。
- 新鮮度看的是手機的時間；手機時間錯的話，提醒也會錯。
- 帳本、凍結模型、`common.py`、升級規則和 `events.jsonl` 都沒動，也沒有註冊模型。

## v8（2026-11-11）：過去出現同樣建議後，下一週怎麼走

### 2026-11-11 19:40 台北：候選模型提案 P-no-trade-band（未註冊）
- 只做研究，不是新版 App：App、帳本、凍結模型、升級規則、`events.jsonl` 和 `common.py` 都沒動，沒有呼叫 `register.py`。
- 題目：冠軍 trend_vt@1 的訊號不變，只改「什麼時候、調多少」。冠軍每天都把比例調回目標，大多是波動變一點點造成的小額交易。測兩種做法：(1) **不交易區間**：實際比例和目標差不到 5／10／20 個百分點就不動，趨勢狀態改變時一定照做；(2) **確認再動**：新的趨勢狀態要連續 2 或 3 天才採用。依據是交易成本下的「不交易區」理論（Constantinides 1986）、「只往目標調一部分」（Gârleanu & Pedersen 2013）和 Vanguard 的門檻再平衡研究。
- 事先固定 6 個版本，只用 2022–23（樣本內）挑：夏普不低於冠軍 0.02 以上、Brier 不差 0.002 以上、跌幅不差 5 個百分點以上，然後選交易量最低的 → **band20**（差 20 個百分點才調）。「確認再動」三個版本在樣本內就不合格。
- 結果（2024 年起，扣成本，兩幣合計）：
  - band20 成本變少：每年真的有交易的天數 BTC 365 → 36、ETH 365 → 24；交易量少約 2 成；成本每年 3.22% → 2.61%（100 萬約少 6,000 元）。夏普 0.87 vs 冠軍 0.85、年化 17.0% vs 16.3%，Brier 完全相同（預測沒變）；最大跌幅 −19.4% vs −18.4%（差 1 個百分點）。**但沒有顯著**（拔靴 P(較好) 0.64、週報酬差 t 0.46），而且 BTC 變好（0.82 vs 0.76）、ETH 變差（0.80 vs 0.86）。
  - band20 **沒有減少來回**：趨勢一變就照做，所以趨勢翻轉次數和 14 天內翻回的比例不變（BTC 每年 32.8 次、69%）；App 上的建議等級變化只少一點（BTC 33.2 → 29.0 次／年）。
  - 「確認再動」確實少來回（conf2：BTC 趨勢變化 32.8 → 21.0 次／年、翻回 69% → 50%），但賺得少很多：夏普 0.63（conf3 0.39）vs 0.85，拔靴 P(較好) 0.004／0.001，跌幅多 5～8 個百分點。等確認會晚進晚出，2024–26 年晚的代價比省下的來回大。
- 建議**下次週檢（11/16）不註冊**：band20 的上漲機率和冠軍一模一樣，升級規則要求實盤 Brier 必須明顯比冠軍好，所以永遠升不上去；挑戰者也已經滿 3 個。「確認再動」否決。
- 可以給宗決定的另一條路（這次沒做）：把 band20 當成「執行方式」而不是新模型，例如在 App 寫「實際比例和建議差不到 20 個百分點、而且建議沒變，就不用調」，或讓虛擬投資之後照這個方式調（只能往後生效，不能改帳本舊資料）。歷史上大約每年省 0.6% 成本，沒證明多賺。
- 檔案：`forecast/proposals/P-no-trade-band.md`、`forecast/proposals/proto_no_trade_band.py`（以及 `_IS_only.json`、`_results.json`、`_daily.csv`）；研究筆記 `/workspace/trading/research/crypto/CRYPTO-20261111-1940-no-trade-band-hysteresis.md`。拿掉最後 400 根K重算，之前每一天的比例和上漲機率都不變。

### 新增
- **首頁每個幣下面多一行灰字**（「未來一週預測建議」卡，「原因」下面）：依目前的建議，寫出歷史上出現同樣建議後一週的實績。現在顯示：
  - 「過去 BTC 出現『減碼』後的一週：上漲 52%，一般落在 −9%～+12%（2018 年起共 1,596 天出現過）。這是過去紀錄，不是預測。」
  - 「過去 ETH 出現『空手』後的一週：上漲 50%，一般落在 −14%～+14%（2018 年起共 1,105 天出現過）。這是過去紀錄，不是預測。」
  - 「一般落在」＝10 次有 8 次落在這個範圍（第 10～90 百分位）。寫「天」不寫「週」，因為每天都當一次起點，相鄰的週會重疊。
- **進階新增「各種建議之後的一週實績」卡**（放在進階最上面，跳轉列「建議之後一週」）：
  - BTC、ETH 各一張表：加碼／持有／減碼／空手／不分建議 × 全期／樣本內（～2022）／樣本外（2023～），每格有上漲比例、10～90% 範圍、中位數、平均、最慘 5%（第 5 百分位和最慘 5% 的平均）、N 天和不重疊週數，少於 100 天標「樣本少」。
  - 「照建議 vs 一直抱著」表：每週扣成本後的平均報酬、不重疊週的差和 t 值、最慘 5% 週的平均虧損。
  - 白話結論：建議分不出下週漲跌（未證明），也沒證明能多賺；有紀錄支持的是大跌的週少虧，而這主要因為投入比例較低。
- **`backtest/action_outcomes.py` → `app/data/outcomes.json`**（可重現，`--end` 固定最後一根K；`--rows` 另外輸出每日明細，只給測試用）：
  - 建議的算法和 `flip_stats.py` 完全相同（直接重用 `flip_stats.frame`）：比例＝趨勢狀態 × min(1, 30% ÷ 30 日波動)，動作＝`forecast/run_daily.action_for`。第 t 天只用 t 天（含）以前的已收完日K。
  - 一週＝第 t 天收盤到第 t+7 天收盤；沒有第 t+7 根的日子不算。
  - 照建議＝這一週投入建議比例、其餘放現金；一直抱著＝全部投入。每週都從現金開始，買進付 0.15%＋台幣溢價 0.27%、7 天後賣出付 0.15%（數字取自 `forecast/common.py`）。兩邊每週都付一次來回成本，對長期持有偏保守，但兩邊算法相同。
  - 顯著性只用不重疊的週（每週日的日K＝台北週一 08:00 收盤），|t| ≥ 2 才算有差別。
- Service worker 快取版本 `v8-2026-11-11`，並快取 `js/outcomes.js` 和 `data/outcomes.json`。

### 真實數字（Binance 日K，起點 2018-03-04～2026-11-03，最後一根 2026-11-10 收盤）
| | 全期：上漲／一般範圍（N 天） | 樣本外 2023～ |
|---|---|---|
| BTC 加碼 | 49.6%／−8.7%～+12.5%（133） | 56.5%／−6.4%～+13.5%（69） |
| BTC 持有 | 56.9%／−4.6%～+12.7%（383） | 52.1%／−4.9%～+8.8%（332） |
| BTC 減碼 | 51.7%／−9.4%～+11.6%（1,596） | 52.2%／−6.2%～+9.7%（694） |
| BTC 空手 | 52.2%／−9.9%～+9.6%（1,055） | 55.2%／−7.7%～+7.5%（308） |
| ETH 加碼 | 51.8%／−9.4%～+16.4%（110） | 49.0%／−7.7%～+11.8%（51） |
| ETH 持有 | 56.2%／−6.0%～+14.1%（80） | 55.8%／−6.2%～+14.2%（77） |
| ETH 減碼 | 51.1%／−10.8%～+15.6%（1,872） | 49.8%／−9.1%～+10.4%（870） |
| ETH 空手 | 50.4%／−13.7%～+13.7%（1,105） | 50.9%／−11.3%～+10.1%（405） |

- 「持有」和「空手」之後一週的報酬差（不重疊週）：BTC 全期 +1.9%（t 1.76）、樣本內 +9.6%（t 3.31，但「持有」只有 7 週）、樣本外 +0.1%（t 0.09）；ETH 全期 +3.6%（t 1.64）、樣本外 +4.1%（t 1.69，「持有」只有 11 週）。**都沒有到 |t| ≥ 2 的樣本外門檻，分不出漲跌（未證明）。**
- 照建議 vs 一直抱著（每週，扣成本）：BTC 全期 +0.28% vs +0.25%、樣本外 +0.24% vs +0.39%（不重疊週差 −0.22%，t −0.75）；ETH 全期 +0.30% vs +0.33%、樣本外 +0.16% vs +0.08%（差 +0.07%，t 0.15）。**沒證明能多賺。**
- 最慘 5% 週的平均：BTC 照建議 −6.4% vs 抱著 −18.7%（樣本外 −6.4% vs −12.2%）；ETH −6.6% vs −24.9%（樣本外 −6.2% vs −16.9%）。照建議跌得少，主要因為投入比例較低（空手那週是 0%）。
- 附帶觀察（不寫成結論）：「空手」「減碼」之後的一週波動通常比「持有」大，例如 BTC 全期最慘 5%：空手 −14.1%、持有 −6.8%。建議比例本來就有乘上波動調整，所以這是預期中的。

### 測試
- `tests/outcomes.test.mjs`（8 項）：
  - `outcomes.json` 完整性：各建議的天數／週數加總等於「不分」、全期＝樣本內＋樣本外、百分位順序、成本和 `forecast/common.py` 一致、空手的照建議報酬恆為 0。
  - 首頁那一行：JS `homeLine` 和 Python 輸出的文字逐字相同（兩個幣 × 四種建議），目前建議等於帳本 11/10 的冠軍預測（BTC 減碼、ETH 空手），沒有術語。
  - JS 用同樣的已收完日K重算，全期／樣本內／樣本外每種建議的 N、上漲比例、中位數、10／90 百分位、平均都和 Python 一致。
  - 沒有偷看未來：拿掉最後 10 根K，之前每一天的建議和報酬都不變（JS 和 Python 各驗一次），Python 和 JS 的每日明細逐筆一致（各 3,167 筆）。
  - 進階卡內容與結論文字依 `verdict` 產生；SW v8。
- `tests/e2e_v8.mjs`（iPhone 390×844）：兩個幣下面的灰字都看得到、文字等於 `outcomes.json` 目前建議那一行、字小於 13.5px；首頁沒有術語；頁尾警語維持原文；進階卡有 4 張表、全期／樣本內／樣本外、照建議 vs 一直抱著、白話結論；首頁和進階都沒有水平捲動，主控台沒有錯誤。截圖 `screenshots/v8-home.png`、`v8-btc-line.png`、`v8-adv.png`、`v8-adv-conclusion.png`。
- 既有測試全過：node 單元測試 60／60（含 v8）、`forecast/test_forecast.py` 10／10、`forecast/events/test_events.py` 5／5、`e2e`、`e2e_v2`～`e2e_v7`、`fallback`。`e2e_v7` 和 `flips.test.mjs` 的版本檢查改成接受 v7 以後的版本。

### 已知限制
- 每天都當一次起點，相鄰的週有 6 天重疊，所以「天數」看起來很多，但獨立樣本只有不重疊的週（全期 453 週、樣本外 201 週），「加碼」「持有」各只有十幾到幾十週。
- 照建議 vs 一直抱著是「單獨一週、從現金開始」的比法，每週都付來回成本，而且一週內不跟著每天調整；長期每天調整的結果看「預測成績單」和回測。
- 這是用規則重算的歷史，不是當時真的發出的預測（預測帳本從 11/11 才開始記錄）；只用一個交易所、2018 年起的資料。
- 帳本、凍結模型、`common.py`、升級規則和 `events.jsonl` 都沒動，也沒有註冊模型。

## v7（2026-11-11）：建議變更提醒＋最近建議變化

### 2026-11-11 17:40 台北：候選模型提案 P-trend-ensemble（未註冊）
- 只做研究，不是新版 App：App、帳本、凍結模型、升級規則、`events.jsonl` 和 `common.py` 都沒動，沒有呼叫 `register.py`。
- 題目：把好幾種快慢不同的趨勢訊號平均起來（20／50／100／200 日均線、均線交叉、多個天數的 Donchian 突破），變成 0～1 的連續比例，再乘上和冠軍一樣的波動調整 min(1, 30% ÷ 30 日波動)。目的是看能不能減少冠軍「一年變 26.7 次、66% 在 14 天內又變回去」的來回，同時不讓 Brier 和虛擬投資夏普變差。
- 事先固定 6 個版本，只用 2022–23（樣本內）挑主角。結果 6 個都沒過事先定的門檻（Brier 最多差 0.002、跌幅最多差 10 個百分點、變化次數不多於冠軍），所以在看樣本外之前，用同一個排序（樣本內夏普最高、差不到 0.02 就選變化少的）選出 **donch7**（20～360 日共 7 個 Donchian 突破）。
- 結果（2024 年起，扣成本）：
  - 來回確實少很多：BTC 建議等級每年變化 33.2 → 11.2 次，14 天內變回去 71% → 34%；ETH 17.1 → 12.9 次、71% → 53%。交易量約減半，成本每年 3.2% → 1.7%（兩幣合計）。
  - 但賺得比較少：兩幣合計夏普 0.54 vs 冠軍 0.85（拔靴 P(較好) 0.04）、年化 7.7% vs 16.3%，Brier 0.2547 vs 0.2523（DM p 0.09），最大跌幅 −18.9% vs −18.4% 沒有比較好。原因是進場比較慢、平均放的比例比較低。
  - 和挑戰者 tsmom@1 比：夏普差不多（0.54 vs 0.53），Brier 較差，但交易量和來回少很多、最大跌幅較小（−18.9% vs −24.2%）。
  - 含短天數成員的版本（均線 4／6 條、9 個 Donchian、混合）反而比冠軍變得更頻繁。
  - 2018-09～2021 年（不拿來挑選）donch7 夏普 1.75 vs 冠軍 1.70、最大跌幅 −13.1% vs −21.3%，只在那段多空循環表現好。
- 建議**下次週檢（11/16）不註冊**：整段回測 Brier 0.2560 vs 0.2522、夏普 0.50 vs 0.80，過不了升級規則的回測門檻（Brier 最多差 0.002、夏普最多差 0.10）；挑戰者也已經滿 3 個。來回太多的問題，v7 的「建議變了」提醒已經在呈現端處理。重新評估條件寫在提案裡。
- 檔案：`forecast/proposals/P-trend-ensemble.md`、`forecast/proposals/proto_trend_ensemble.py`（以及 `_IS_only.json`、`_results.json`、`_daily.csv`）；研究筆記 `/workspace/trading/research/crypto/CRYPTO-20261111-1740-trend-ensemble-multispeed.md`。`forecast/test_forecast.py` 10/10 通過，帳本驗證通過。

### 新增
- **「建議變了」提醒**（「未來一週預測建議」卡的最上面）：
  - 打開 App 時，把每個幣現在的建議（加碼／持有／減碼／空手，和卡片顯示的一樣，來自預測帳本 `data/live.json`）跟這支手機上次看到的比（localStorage `cs-v7-seen`，存動作、建議比例、趨勢狀態和依據的收盤日）。
  - 有變才顯示一行，例如：「BTC 建議從『持有 100%』改為『減碼 42%』（依 11/11 收盤）。上次看到是 11/10。」下面一行灰字寫歷史紀錄：「歷史上（2018 年起）BTC 這類變化有 66% 在 14 天內又變回去（2023 年起 66%）。這是過去紀錄，不是預測。」
  - 第一次打開只記下，不顯示；沒變就什麼都不顯示。按 ✕ 才算「看過」，重新整理後不會再出現；沒按 ✕ 之前，每次打開都會顯示。
  - 「加碼」只會出現在變化當天，隔天會依比例改顯示持有或減碼。如果比例差不到 10 個百分點、趨勢狀態也沒變，就不算新的變化，不顯示提醒。
  - 灰字的比例依變化種類而定：趨勢狀態變了（穿過 50 或 200 日均線），就用「趨勢翻轉」的比例；趨勢沒變、是波動讓比例跨過 67% 的分界，就用「波動變化」的比例。
  - 圖示角標：支援的話，偵測到變化時呼叫 `navigator.setAppBadge(1)`，按 ✕ 後清除。這只是功能偵測，不會跳出權限詢問，也沒有推播。iOS 上通常要先允許通知，角標才會顯示，所以多半看不到。
- **進階新增「最近建議變化」卡**：每個幣列出最近 10 次建議變化，包括收盤日、從什麼變成什麼、比例、種類、收盤價，以及 14 天內有沒有翻回（是／否／還不到 14 天）。用手機抓到的已收完日K重算，抓不到時改用 `flips.json`。下方有全期、樣本內（～2022）、樣本外（2023～）的翻回比例表。
- **`backtest/flip_stats.py` → `app/data/flips.json`**（可重現，`--end` 可固定最後一根K）：
  - 讀 box 快取的 Binance 日K，只用已收完的K。
  - 規則和冠軍 trend_vt@1 相同：建議比例＝趨勢狀態 × min(1, 30% ÷ 30 日波動)，動作直接呼叫 `forecast/run_daily.action_for`。
  - 每天收盤判斷一次。「翻回」的定義是之後 14 根日K內又回到原狀態；沒滿 14 天、也還沒翻回的，不列入比例。
- Service worker 快取版本 `v7-2026-11-11`，並快取 `js/flips.js` 和 `data/flips.json`。

### 真實數字（Binance 日K，2018-03-04～2026-11-10 收盤，14 天內翻回的比例）
| | 全期 | 樣本內 ～2022 | 樣本外 2023～ |
|---|---|---|---|
| BTC 趨勢翻轉 | 66.4%（154／232，每年 26.7 次） | 66.7%（80／120，24.8 次） | 66.1%（74／112，29.0 次） |
| BTC 波動變化 | 61.0%（25／41，4.7 次） | 42.9%（3／7） | 64.7%（22／34） |
| ETH 趨勢翻轉 | 65.2%（135／207，每年 23.9 次） | 66.9%（79／118，24.4 次） | 62.9%（56／89，23.3 次） |
| ETH 波動變化 | 80.8%（21／26，3.0 次） | 80.0%（4／5） | 81.0%（17／21） |

- 和研究 CRYPTO-20261111-1245 §3.1 對照：每年次數完全相同（BTC 26.7／24.8／29.0、ETH 23.9／24.4／23.3）。翻回比例 BTC 66%／67%／66% 相同；ETH 樣本外是 62.9%，研究寫 62%。差別在研究把 11/8 那次還沒滿 14 天的 ETH 變化算成「沒翻回」（56／90＝62.2%），這裡不列入（56／89）。
- 照首頁每天顯示的字算（包括只出現一天的「加碼」），全期每年 BTC 變 42.7 次、ETH 32.7 次。所以提醒不直接用顯示的字，而是依上面的規則過濾。
- 只算翻回頻率，不算報酬，所以不涉及成本。

### 測試
- `tests/flips.test.mjs`（13 項）：
  - `actionFor` 與 `run_daily.py` 的 `action_for` 一致。
  - 變化偵測：第一次打開、沒變、有變、重新整理後仍顯示、按 ✕ 後不再出現、一天的「加碼」、波動變化、較舊資料、壞掉的 localStorage。
  - 角標有做功能偵測。
  - `flips.json` 完整性：各期加總、和研究數字的差距在 ±0.3 次／±1.5 個百分點內、最新狀態等於帳本 11/10 的冠軍預測（減碼 0.42、空手 0）。
  - JS 和 Python 逐筆一致：BTC 273 筆、ETH 234 筆。
  - 手機抓 600 根K時，最近的變化相同；把最後 10 根拿掉，已確定的翻回結果也不變（沒有偷看未來）。
  - SW v7。
- `tests/e2e_v7.mjs`（iPhone 390×844）：
  - 第一次打開不顯示；沒變也不顯示。
  - 預設上次看到的是不同的動作時，提醒出現在卡片最上面，文字、比例和歷史數字都正確；ETH 沒變就不列。
  - 重新整理後仍在；按 ✕ 後消失，重新整理也不會再出現。
  - 首頁沒有術語（MA、bps、交易所名稱、trend3、樣本外、Brier）；頁尾警語維持原文；沒有水平捲動，主控台沒有錯誤。
  - 進階的「最近建議變化」卡內容正確。
  - 截圖 `screenshots/v7-banner.png`、`v7-dismissed.png`、`v7-recent.png`。
- 既有測試全過：node 單元測試 52／52（含 v7）、`forecast/test_forecast.py` 10／10、`forecast/events/test_events.py` 5／5、`e2e`、`e2e_v2`～`e2e_v6`、`fallback`。`e2e_v6` 和 `reliability.test.mjs` 的版本檢查改成接受 v6 以後的版本。

### 已知限制
- 比較的是「這支手機上次看到的」，不是「昨天」。隔好幾天才打開，中間變過又變回來就不會提醒；換手機或清除網站資料，會當成第一次打開。
- App 沒打開就不會提醒：iOS 不支援背景排程，推播也沒有獲准，所以沒做。
- 翻回比例是 2018 年起單一交易所的歷史紀錄，也只用 14 天這個定義；換交易所或換天數，數字會變。BTC 和 ETH 的「波動變化」樣本少（41 次、26 次），樣本內只有 7 次、5 次，不穩。
- 「最近建議變化」是用歷史資料照規則重算的，不是當時真的發出的預測（預測帳本從 11/11 才開始記錄）。
- 帳本、凍結模型、升級規則和 `events.jsonl` 都沒動，也沒有註冊模型。

## v6（2026-11-11）：資料可靠度標示＋接近翻轉價

### 2026-11-11 15:40 台北：候選模型提案 P-calibrated-band（未註冊）
- 只做研究，不是新版 App：App、帳本、凍結模型、升級規則和 `events.jsonl` 都沒動，沒有呼叫 `register.py`。
- 題目：trend_vt@1 的一週 10–90% 區間能不能用更好的波動預測（RiskMetrics EWMA λ=0.94、Corsi HAR 配日內高低價或報酬平方）或滾動 conformal 校準（CQR、分尾、ACI）變得更準。方向、上漲機率、曝險都不變，所以 Brier 和虛擬投資夏普與冠軍相同。
- **前提修正**：84.3%／84.5% 只是壓力日的覆蓋率。全期 BTC 81.0%（2022–23）／81.1%（2024→），ETH 82.6%／78.9%，本來就接近 80%。
- 結果：
  - conformal 和 ACI 在 OOS 的 pinball 全部比冠軍差，暫不採用。
  - HAR-range 的 OOS pinball：BTC 0.01608 → 0.01575、ETH 0.02385 → 0.02328，合併後 −2.3%（DM +3.28，p 0.001，Holm 0.007）。但 IS 不顯著（p 0.47），不重疊週 t 只有 BTC 1.87、ETH 1.22，而事前用 IS 挑出的變體 OOS 也不顯著（p 0.26）。結論是**未證實的小幅優勢**。
- 建議**下次週檢不註冊**：升級規則只看 Brier 和夏普，只換區間的候選永遠升不上去；挑戰者也已經滿 3 個。要加入「區間品質」的升級條件，必須先經過宗同意。重新評估條件寫在提案裡。
- 檔案：`forecast/proposals/P-calibrated-band.md`、`forecast/proposals/proto_calibrated_band.py`（以及 `_results.json`、`_daily.csv`）；研究筆記 `/workspace/trading/research/crypto/CRYPTO-20261111-1540-calibrated-weekly-band.md`。`forecast/test_forecast.py` 10/10 通過，帳本驗證通過。

### 新增
- **首頁每個幣多一行「資料狀態」**（在「未來一週預測建議」裡，動作下方）：
  - 綠「資料正常」：收盤時間正確、兩個交易所同一根日K收盤差 ≤ 0.5%、趨勢狀態一致。
  - 黃「資料尚未更新」（台北 09:00 還拿不到昨天的日K）、「各交易所價格略有差異」（差 0.5–2%）、「USDT 價格偏離 1 美元」（> 0.5%）。
  - 紅「資料過期，今天先不要依此動作」（台北 12:00 還沒有）或「各交易所資料不一致，今天先不要依此動作」（差 > 2% 或兩邊算出的趨勢狀態不同）。
- **接近翻轉**：價格離 50 日或 200 日均線的翻轉價不到 1% 時，直接寫出價格，例如「BTC 若 11/12 早上 8 點收盤低於 73,169 美元，規則會轉為空手」；不到 0.25% 會加註「各交易所可能給不同答案」。翻轉價＝讓下次收盤剛好等於含它自己的均線（50 日＝最近 49 根平均、200 日＝最近 199 根平均），只用已收完的日K計算。
- 建議比例落在 67% ± 2%（持有／減碼的分界）時提醒「小小的波動就可能改變動作」（只是標示，不改預測規則）。
- 進階新增 **資料可靠度（各交易所比對）** 卡：採用來源與交易對、抓取時間（台北）、最新已收完日K與收盤時間、比對來源、同一根K的兩邊收盤與差距（bps）、兩邊的趨勢狀態、50／200 日線翻轉價與距離、USDT 價格、後備順序與門檻說明。

### 調整
- App 日K後備順序改成和每日預測一樣：**Binance USDT → OKX USDT → Kraken USDT → Coinbase USD**（原本 Kraken 在第二、用 USD 對）。四個端點都有回 CORS 標頭（2026-11-11 實測），iPhone Safari 可直接讀。
- 每個來源除了根數 ≥ 420，還要最近 200 根沒有缺日、重複、都在 00:00 UTC 開盤，否則改用下一個來源。
- 另用「下一個可用來源」的單次請求（最近 300 根）做比對，只比較同一天的已收完K。
- Service worker 快取版本 `v6-2026-11-11`，並快取 `js/reliability.js`。

### 2026-11-11 14:36 台北實測（2026-11-10 收盤＝台北 11/11 08:00）
- BTC：綠「資料正常」；Binance 73,796.06 vs OKX 73,795.80（差 0.0 bps），趨勢狀態都是減碼。**接近翻轉**：200 日線翻轉價 73,168.62（−0.85%），11/12 08:00 收盤低於它就轉空手；50 日線翻轉價 81,351.82（+10.24%）。
- ETH：綠「資料正常」；2,053.21 vs 2,053.17（0.2 bps），都是空手。200 日線翻轉價 2,152.89（+4.85%）、50 日線 2,452.46（+19.45%），不到接近翻轉的門檻。
- USDT 0.999086 美元（CoinGecko）。Binance 被擋時改用 OKX、比對 Kraken USDT：BTC 差 0.5 bps、ETH 2.1 bps，結論相同。

### 沒做的（刻意，v6 當下）
- 沒做網頁推播（iOS 需要推播伺服器和金鑰）；v6 當下帳本、凍結模型、升級規則都沒動，也沒有註冊模型。

### 2026-11-11 14:47 台北：套用每日預測快取修正（pipeline，不是新的 App 版本）
- 先前因為 `common.py` 會進入每筆預測的 `frame_sha256` 而暫緩。這是資料管線正確性問題（未收完日K被快取後，隔日會被當成收盤），不是模型調整，所以仍套用。既有帳本列不改寫。
- `update_candles()` 只快取並使用已收完的 00:00 UTC 日K；寫入時加 `fetched_at`；後備來源可以覆寫「寫入時還沒收完」的過期列，但不覆寫已收完的歷史。全部來源失敗時也會刪掉過期列。
- `events.jsonl` 追加 `type=frame_change`（hash `158adf0d…a05f`，`at=2026-11-11T06:47:11Z`）：`common.py` `404a0027…75e3` → `0242f000…7745`，`frame_sha256` `45860569…65d1` → `5fc66bc6…bf61`。完整性檢查接受事件前的舊 hash、事件後的新 hash。
- 模型檔和升級規則未改。詳見 `forecast/proposals/P-data-closed-bars-cache-fix.md`。

### 研究依據
- `/workspace/trading/research/crypto/CRYPTO-20261111-1403-data-reliability-cross-source.md`（Drive 1R4umMzuoqc7BV1oEk-ZD-1Ks2zYebNsB）：2023 年起換交易所只讓 trend3 不同 0–1 天／1,410 天；把未收完的K當收盤或晚一天沒更新，6–8% 的日子會判斷錯。

### 測試
- `tests/reliability.test.mjs`（10 項）：只留已收完K、台北 09:00／12:00 黃紅門檻、跨來源 0.5%／2%／趨勢不同、缺日／重複／非 00:00 UTC、翻轉價數學（收在翻轉價＝剛好在均線上）、1%／0.25% 門檻、**真實 Binance 快取重算 BTC 200 日翻轉 73,168.62（−0.85%）、ETH +4.85%，與研究 §5c 一致**、後備順序與 `forecast/common.py` 一致、SW v6。
- `tests/e2e_v6.mjs`：iPhone 尺寸，首頁兩個資料狀態徽章、接近翻轉句型、首頁沒有 bps／MA／交易所名稱等術語、進階預設收合、資料可靠度卡內容、**擋掉 Binance 時改用 OKX＋Kraken 比對**、沒有水平捲動和主控台錯誤；截圖 `screenshots/v6-*.png`。
- 既有測試全過：decision、parity、dca、live、events（node）、`forecast/test_forecast.py`、`forecast/events/test_events.py`、`e2e`、`e2e_v2`～`e2e_v5`、`fallback`。`e2e_v2`／`e2e_v3` 自 v4 起工具收進「進階」後會等不到輸入框（在 v5 線上版也一樣失敗），這版讓它們先打開進階；`e2e_v5` 版本檢查改成接受 v5 以後。
- 快取修正另加：`test_update_candles_rejects_unfinished_and_fallback_overwrites_stale`、`test_frame_change_event_allows_new_hash_keeps_old`。

## v5（2026-11-11）：本週要注意＋大漲大跌原因與指標紀錄

### 新增
- **本週要注意**（預測卡下方的小卡）：列出未來 7 天的美國 CPI、聯準會利率決議和非農就業公布時間（台北時間），日期取自聯準會和勞工統計局的官方日程。7 天內沒有的話，就顯示下一個（目前是 12/4 21:30 非農）。
  - 只有當歷史資料經過多重檢定校正後顯著，才會加上「歷史上這類日子波動較大」。目前不顯著，所以只列日期。
- 進階新增 **最近大漲大跌的原因**：
  - 每次大漲跌都附上白話原因和來源連結，並標明來源是在事前、當天還是事後發布的。
  - 2020 年以來最大的 12 次漲跌。
  - 哪些指標跟大漲跌有關（附樣本數和 q 值）。
  - 總經數據公布日的波動對照表。
- **forecast/events/**：
  - 每日指標快照：價格、量、波動、資金費率、未平倉量、恐懼貪婪、市佔率、穩定幣、ETF 流量、美股、美債、黃金、美元指數、台幣匯率、強制平倉。每個欄位都記錄來源和抓取時間。
  - 大漲跌偵測和原因紀錄。
  - 歷史回補：258 次大漲跌，其中 49 次已查好原因。
  - 252 項指標關聯檢定。
  - 新增 3 份提案，**沒有註冊任何模型**。

### 主要發現
- 新聞解釋幾乎都是當天或事後才出現：82 個來源時間裡，事前只有 2 個。
- 只有「會動很大」可以事先看出一點，「方向」看不出來：
  - 標普 500 五天跌 3% 以上之後，BTC 隔天出現極端漲跌的機率是其他日子的 2.3 倍（q=0.054）。
  - ETH 資金費率極低之後是 2.7 倍（q=0.029）。
- CPI 和 FOMC 日的平均漲跌幅是其他日子的 1.2～1.4 倍，但校正後不顯著。

### 調整
- Service worker 快取版本 `v5-2026-11-11`，並快取 `js/events.js` 和 `data/events.json`。

## v4（2026-11-11）：首頁只留「未來一週預測建議」＋自我改善的預測機制

### 新增
- **未來一週預測建議**（最上方）：BTC、ETH 各一段，來自目前冠軍模型（`trend_vt@1`）在預測帳本裡的最新一筆：動作（加碼／持有／減碼／空手）、建議放「打算投入這個幣的錢」的幾 %、上漲機率（和平常比）、一週後 8 成機率的價格區間、一句白話原因。有填部位時直接換算成要買／賣多少新台幣（預算＝總資產 × 加密幣目標 % × BTC/ETH 比例，沿用 v3 設定）。
- **預測成績單**：實盤預測筆數、到期評分、虛擬投資（照建議 vs 一直抱著，各 NT$100 萬），加上 2022 年起的 walk-forward 對照，並清楚寫「紀錄才剛開始、至少 8 週才比較」。
- **forecast/**：模型登記（程式碼 sha256 凍結）、每日預測／評分／虛擬投資的 append-only 雜湊鏈帳本、每週冠軍／挑戰者檢討（事先寫定的升級規則、Bonferroni 校正、最多 3 個挑戰者）。帳本每天推到公開 GitHub（`coin-signal/ledger`）。
- 進階裡新增「預測模型與自我改善機制」卡：各模型實盤與回測成績。

### 調整
- 其他所有內容（今天怎麼做、我的部位、定期定額、槓桿、買幣成本、研究、訊號細節）收進「進階（可不看）」，預設收合，功能不變；BTC／ETH 切換移進進階。
- Service worker 快取版本 `v4-2026-11-11`，並快取 `data/live.json`。

### 2026-11-11 種子預測（as of 2026-11-10 收盤＝台北 11/11 08:00）
- BTC $73,796：減碼，建議放 42%，上漲機率 48%（平常 53%），8 成區間 −5.6%～+7.3%。
- ETH $2,053：空手，建議 0%，上漲機率 50%（平常 51%），8 成區間 −8.3%～+10.6%。

### Walk-forward（2022-01-01～2026-11-10，BTC＋ETH 各半，扣成本）
- baseline（一直抱著）：Brier 0.2513、年化 +0.9%、最大跌幅 −69%。
- trend_vt（冠軍）：Brier 0.2522、年化 +14.7%、最大跌幅 −18%、夏普 0.80。
- knn：0.2568、−12.5%、−64%；tsmom：0.2527、+6.6%、−24%；logit：0.2519、+0.7%、−27%。
- **沒有任何模型的機率預測比基準率好**（Brier 都 ≥ 0.2513）；冠軍的價值在於降低跌幅。

### 測試
- `forecast/test_forecast.py`：雜湊鏈竄改偵測、凍結程式碼檢查、未來資料打亂後預測不變（no lookahead）、虛擬投資成本、評分公式、真實帳本完整性。
- `tests/live.test.mjs`：live.json 與帳本一致（冠軍、最新一筆雜湊、筆數）。
- `tests/e2e_v4.mjs`：iPhone 尺寸檢查首頁第一張卡、進階預設收合、填部位後顯示金額、重整保留、切 ETH、沒有水平捲動和主控台錯誤，截圖 `screenshots/v4-*.png`。

## v3（2026-11-11）：定期定額與再平衡計畫

v2 回答「今天放多少」，v3 回答「每個月怎麼放、什麼時候調回來」。新的可重現回測：`backtest/dca_rebalance.py` → `app/data/dca.json`（新台幣計價、扣成本、2023 年起為樣本外，與 v2 同一切點）。

### 新增
- **定期定額與再平衡計畫**卡：輸入每月投入金額、加密幣目標占總資產（預設 5%）、再平衡區間（預設目標的 ±25%，也可以用 ±百分點）、BTC／ETH 比例，並沿用「我的部位」的總資產與持有數量。會顯示：
  - 目前加密幣占比、區間、狀態（區間內／低於／高於）。
  - 這個月的動作：區間內就照目標比例買（例：月投入 NT$2 萬、目標 5% → 買 NT$1,000）；超出區間才把每個幣買回或賣回目標。賣出時提醒在境內平台可能要報財產交易所得（C#3）。
  - 每筆的成本：沿用 v2 的 MAX 成本模型（溢價、依掛單簿快照算的價差與滑價、VIP 手續費）；新增賣出方向的成本計算。
  - 風險預算檢查：照目標比例，依今天波動算出很糟的一週會讓總資產少多少，超過 v2 的風險預算會警告。
  - 趨勢規則是「減碼／空手」時，同時列出**選項 A 照計畫**與**選項 B 加趨勢濾網**（這個月的定期買進 × 趨勢狀態，少買的改放其他資產）的金額與成本，並寫明回測沒有證明哪個比較好。
- **回測**（可展開，2018-05-01～2026-11-09，每日新台幣價格）：
  - 再平衡規則（一次投入；5%／10% 加密幣，其餘為美股 60/40、0050 或現金）：不再平衡、每年、每季、每月、±25% 區間（每月或每天檢查）。例：5% BTC＋60/40，全期年化 每季 13.7%／不再平衡 13.7%／每月 12.8%，最大跌幅 −22.0%／−24.5%／−22.1%；不再平衡時 BTC 占比最高漂到 25%（10% 版漂到 42%）。樣本內（2018-05～2022）報酬最好的是每季（10.3%），2023 年起變成不再平衡（19.1% vs 每季 18.1%）——**規則之間的報酬差距不穩健**。成本（溢價＋手續費＋價差＋證交稅）每年只拖累 0–23 bp。
  - 3 年滾動視窗 67 個（起點 2018-05～2023-11）：5%＋60/40 不再平衡的最大跌幅比每季淺的只占 6%；但 0050 組合占 40%，所以「再平衡降跌幅」也只在股債組合比較明顯。
  - 每月投入方式（每月 NT$1 萬、從 0 開始）：照比例買永不賣、新錢補不足、本卡計畫（區間）、每季調回、本卡＋趨勢濾網、目標 × 趨勢。5%＋60/40 全期資金加權年化 本卡 13.1%、加濾網 13.2%、照比例永不賣 14.6%（但最大跌幅 −25.2% vs −22.2%，期末 BTC 占比 12.7%）；目標 × 趨勢 12.2%、很糟一週 −2.1% vs −2.3%，賣出 34 次 vs 10 次。
  - 定期定額 vs 一次投入（手上有一筆錢，每天一個起點）：BTC 分 12 個月買、1 年後比，一次投入勝 61%（2023 年起 73%），但分批的結果比較集中（終值標準差 0.72 vs 1.36、最差 5% −37% vs −50%）；ETH 一次投入勝 59%。和 C#12（USDT 計價：61%、0.72 vs 1.47）一致。
- Service worker 快取版本改為 `v3-2026-11-11`，並快取 `data/dca.json`。

### 測試
- `tests/dca.test.mjs`：區間上下限、交易金額（區間內／低於／高於、BTC／ETH 拆分、調整後回到目標）、趨勢濾網只影響定期買進、賣出方向的掛單簿計算、**JS↔Python 一致**（計畫 6 組、成本 24 組：買／賣 × BTC／ETH × 兩條路徑 × 3 種金額），以及 dca.json 完整性（不再平衡漂得最多、成本拖累 < 0.5%、分批結果較集中）。
- `tests/e2e_v3.mjs`：iPhone 尺寸（390×844 @3x）填入部位與計畫、切換區間單位與 BTC／ETH 比例、展開回測、重整後設定還在、切到 ETH，檢查沒有水平捲動和主控台錯誤，截圖 `screenshots/v3-*.png`。原本的 decision／parity 單元測試、`e2e_v2.mjs`、`e2e.mjs`、`fallback.mjs` 仍通過。

### 已知限制
- 現金利率當 0%（台幣定存實際約 1–2%），對「分批」和「現金」組合偏不利。
- SPY／AGG 經複委託的手續費假設和台股相同（0.1425%／邊），沒算換匯成本；實際依券商而定。
- 加密幣成本用 2026-11-11 的 MAX 掛單簿快照（NT$1 萬），過去的價差可能更大；溢價用 C#23 每日資料，只算正值，賣出時不計回收（偏保守）。
- 每月檢查的區間規則在月中可能漂出區間（5% 目標最高到約 9.5%）。
- 2018–2026 加密幣和 0050 都大漲，所有「一次投入」「不再平衡」的好看數字都受這段樣本影響；C#21 的崩盤情境顯示，資產持續下跌時再平衡會一直加碼。

## v2（2026-11-11）：從「預測」改成「決策」

24 篇研究（C#1–C#24）的結論是沒有指標能穩定預測漲跌，所以 v2 改成回答四個實際的決策問題，每個數字都來自公開資料的可重現回測（`backtest/decision.py` → `app/data/decision.json`）。

### 新增
- **今天怎麼做（每個幣）**：趨勢規則狀態（50／200 日均線：持有／減碼／空手），加上依「風險預算」換算的波動調整部位上限。風險預算的意思是「很糟的一週（歷史最差 5%）總資產最多虧幾 %」。倍數 z5 用 2022 年以前的資料估、2023 年起實測：BTC 實際跌破估計的週占 4.1%、ETH 占 4.4%（目標 5%）。附上規則回測：BTC 最大跌幅，2018 年起 −56%、持有 −77%；2023 年起 −26%、持有 −53%。
- **我的部位與風險**：輸入總資產、BTC／ETH 數量、其他資產類型（60/40、0050、現金），會顯示加密幣占總資產與整體風險的比例、依今天波動估的很糟一週、2018 年起以新台幣週報酬回放的最差 5% 週和最差週。資料只存在 localStorage。
- **槓桿／強平檢查**：逐倉、mmr 0.4%。2017 年起每天收盤進場，用 Binance 日 K 最高／最低價算持有 1／7／30／90 天內被強平的比例，並附 C#19 五次清算連鎖的可存活槓桿。例：BTC 10 倍持有 30 天被強平 47%（2023 年起 36%）。
- **台幣買幣成本（MAX）**：USDT 溢價（預設 2026 年平均 0.27%，也可以輸入當下報價，即時換算）、價差與滑價（依 MAX 公開掛單簿快照逐檔計算）、VIP 手續費，可比較「經 USDT」和「直接台幣市場」兩條路徑。例：NT$10 萬經 USDT 合計約 0.62%，直接台幣約 0.48%。
- **24 篇研究的決策重點**卡，每點附研究編號。
- 頂部有快速跳轉列，方便手機單手使用。

### 調整
- v1 的綜合預測和 7 個訊號卡收進最下面的「訊號細節」（可展開），內容不變。
- Service worker 快取版本改為 `v2-2026-11-11`，改成網路優先、4 秒逾時才用快取；新版啟用後會自動重新載入，改版打開就生效。
- CoinGecko 改成一次抓 BTC、ETH、USDT（同時得到美元兌台幣匯率）。抓不到時，用 MAX 快照估算匯率。

### 測試
- `tests/decision.test.mjs`：公式、與研究數字交叉核對（強平距離 3x 33.1%／10x 9.6%／20x 4.6%；2026-11-10 溢價 0.38%；60/40 加 5% BTC 的風險占比）、資料完整性（趨勢規則必須降低最大跌幅、強平機率隨槓桿和天數遞增）、JS↔Python 趨勢狀態一致。
- `tests/e2e_v2.mjs`：headless Chrome 以 iPhone 尺寸（390×844 @3x）模擬輸入、檢查重整後資料還在、沒有水平捲動、主控台沒有錯誤，並輸出截圖 `screenshots/v2-*.png`。
- 原本的 `parity.test.mjs` 和 `fallback.mjs`（資料來源被擋時的備援與離線快取）仍通過。

### 已知限制
- MAX API 不送 CORS 標頭，手機讀不到即時掛單簿，所以價差用快照（重跑 `backtest/fetch_max.py` 更新）。
- 強平機率用的是成交價日 K，沒用標記價（偏保守），也沒算資金費和手續費（偏樂觀）。
- 新台幣週報酬：美元資產和加密幣用 Yahoo TWD=X 換算，加密幣取 UTC 日收盤，跟美股收盤差約 3 小時。

## v1（2026-11-11）
- BTC／ETH 七個訊號，附樣本內外回測和 kNN 綜合預測（walk-forward），部署到 GitHub Pages。
