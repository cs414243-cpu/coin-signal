// v36: 照建議進場的每一趟，結果長什麼樣 — pure functions (no DOM, no network).
// History: backtest/trips.py → data/trips.json (champion trend_vt@1, closed Binance daily bars 2018→, daily resize with the
// virtual portfolios' costs). A 趟 = from the first day with money in until the day the recommendation goes back to 0.
// Descriptive past record only (not a signal, not a forecast); OOS = trips that started 2023→.
const p1 = x => x === null || x === undefined || !Number.isFinite(x) ? '—' : `${x > 0 ? '+' : x < 0 ? '−' : ''}${Math.abs(x * 100).toFixed(1)}%`;
const pc0 = x => x === null || x === undefined || !Number.isFinite(x) ? '—' : `${Math.round(x * 100)}%`;
const pp = x => x === null || x === undefined || !Number.isFinite(x) ? '—' : `${Math.round(x * 100)} 個百分點`;
const dd = x => x === null || x === undefined || !Number.isFinite(x) ? '—' : `${Math.round(x)}`;
// candle date D closes at D+1 08:00 Taipei
export const closeMD = s => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + 1); return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`; };
export const COLS = ['start', 'end', 'days', 'close_start', 'close_end', 'coin', 'r', 'worst', 'peak', 'e_start', 'e_max'];
export const tripList = (T, coin) => (T?.coins?.[coin]?.trips || []).map(a => Object.fromEntries(COLS.map((k, i) => [k, a[i]])));

/** One plain line inside 「看 X 的細節」 (2023 年起 numbers). */
export function detailLine(c, T) {
  const s = T?.coins?.[c]?.stats?.oos; if (!s?.n || !s.n_win) return '';
  const nl = s.n - s.n_win;
  return `照建議進場的每一趟（2023 年起 ${c} 共 ${s.n} 趟，已含手續費）：只有 ${s.n_win} 趟賺錢，賺的一般 ${p1(s.win_median)}、要抱一般 ${dd(s.days_win_median)} 天；`
    + `另外 ${nl} 趟多半幾天內就小賠出場，一般 ${p1(s.loss_median)}、最多 ${p1(s.worst)}，最多連賠 ${s.streak_loss} 趟。`
    + `賺錢主要靠最好的 ${s.top_k} 趟（拿掉它們，其他趟合起來 ${p1(s.without_top)}），所以連續小賠是這個方法的正常樣子，不代表它壞了。這是過去紀錄，不是保證。`;
}

function row(lab, s) {
  if (!s?.n) return `<tr><th>${lab}</th><td colspan="5">—</td></tr>`;
  return `<tr><th>${lab}<div class="muted small">${s.n} 趟，每年約 ${dd(s.per_year)} 趟</div></th>`
    + `<td><strong>${pc0(s.win)}</strong><div class="muted small">${s.n_win}／${s.n}</div></td>`
    + `<td>${p1(s.loss_median)}<div class="muted small">最多 ${p1(s.worst)}；一般 ${dd(s.days_loss_median)} 天</div></td>`
    + `<td>${p1(s.win_median)}<div class="muted small">最好 ${p1(s.best)}；一般 ${dd(s.days_win_median)} 天</div></td>`
    + `<td>${p1(s.total)}<div class="muted small">拿掉最好 ${s.top_k} 趟：${p1(s.without_top)}</div></td>`
    + `<td>${s.streak_loss} 趟</td></tr>`;
}
function lastLine(c, C) {
  const t = C?.last; if (!t) return '';
  return `${c} 最近一趟：${closeMD(t.start)} 收盤進場、${closeMD(t.end)} 收盤出場（${t.days} 天），結果 ${p1(t.r)}（同期 ${c} ${p1(t.coin)}；期間最高曾 ${p1(t.peak)}）。`;
}
/** Advanced card 「每一次進場的結果」. */
export function tripsCard(T) {
  if (!T?.coins?.BTC || !T?.coins?.ETH) return `<section class="card" id="trips"><h2>每一次進場的結果</h2><p class="muted small">資料讀不到，稍後再試。</p></section>`;
  const tbl = c => { const S = T.coins[c].stats; return `<div class="scroll"><table class="bt"><thead><tr><th>${c}<div class="muted small">依進場日</div></th><th>賺錢的趟</th><th>賠的趟<div class="muted small">一般</div></th><th>賺的趟<div class="muted small">一般</div></th><th>全部合起來</th><th>最多連賠</th></tr></thead><tbody>
      ${row('2023 年起', S.oos)}${row('2022 年以前', S.is)}${row('全部 2018 起', S.full)}</tbody></table></div>`; };
  const o = T.coins.BTC.stats.oos, e = T.coins.ETH.stats.oos;
  return `<section class="card" id="trips"><h2>每一次進場的結果</h2>
    <p class="small">「一趟」＝建議從 0 變成有投入的那天收盤進場，到建議回到 0 那天收盤全部賣掉，中間每天照建議比例調整。這個方法的樣子是：<strong>大部分趟數小賠、少數幾趟大賺</strong>。2023 年起 BTC ${o.n} 趟只有 ${o.n_win} 趟賺錢、ETH ${e.n} 趟有 ${e.n_win} 趟；但賠的趟最多也只賠 ${p1(Math.abs(Math.min(o.worst, e.worst))).replace('+', '')}，賺的趟一般 ${p1(o.win_median)}（BTC）／${p1(e.win_median)}（ETH）。</p>
    ${tbl('BTC')}${tbl('ETH')}
    <p class="small">怎麼用：① 進場後幾天就被洗出場很常見（賠的趟一般 ${dd(o.days_loss_median)}～${dd(e.days_loss_median)} 天），照做就好，不用加碼攤平。② 連賠好幾趟（2023 年起最多 BTC ${o.streak_loss}、ETH ${e.streak_loss} 趟；2022 年以前最多 ${T.coins.BTC.stats.is.streak_loss} 趟）不代表方法壞了，跳過下一次進場反而可能錯過少數賺錢的那趟——拿掉最好的幾趟，其他合起來是小賠。③ 賺的趟出場時，一般已從最高點吐回約 ${pp(o.giveback_median)}（BTC）／${pp(e.giveback_median)}（ETH）——等確定轉弱才出場的代價，事前就知道會這樣。</p>
    <p class="small">${lastLine('BTC', T.coins.BTC)}${lastLine('ETH', T.coins.ETH)}</p>
    <p class="small muted">算法：<code>backtest/trips.py</code> → <code>data/trips.json</code>（Binance 已收完日K，資料到 ${T.as_of}；定義事先固定在程式說明）。每天照冠軍建議比例調整，買賣各扣 0.15%、買進再扣台幣溢價 0.27%（和虛擬投組相同，兩幣合起來與虛擬投組計算逐日相同）；以「打算放在這個幣的錢」計算，沒投入的錢不算利息。2022 年以前是這套規則設定時看過的期間，2023 年起較能代表實際。這是過去紀錄，不是預測；趟數不多（2023 年起 BTC ${o.n}、ETH ${e.n} 趟），比例誤差大。</p>
  </section>`;
}
