// v37: 照建議的錢，跌下來要多久才回到新高 — pure functions (no DOM, no network).
// History: backtest/underwater.py → data/underwater.json (champion trend_vt@1, closed Binance daily bars 2018→, daily resize
// with the virtual portfolios' costs; "hold" = buy once and keep). 回落 = from a high of the money to the first day back at a
// new high; "big" = fell 10% or more. Descriptive past record only (not a signal, not a forecast).
const p1 = x => x === null || x === undefined || !Number.isFinite(x) ? '—' : `${x > 0 ? '+' : x < 0 ? '−' : ''}${Math.abs(x * 100).toFixed(1)}%`;
const dn = x => x === null || x === undefined || !Number.isFinite(x) ? '—' : `${Math.round(x)}`;
// candle date D closes at D+1 08:00 Taipei
export const closeYMD = s => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + 1); return `${d.getUTCFullYear()}/${d.getUTCMonth() + 1}/${d.getUTCDate()}`; };
const down = x => p1(Math.abs(x)).replace('+', '');   // "12.8%" (always written with 少／跌)

/** One plain line inside 「看 X 的細節」. */
export function detailLine(c, U) {
  const C = U?.coins?.[c]; const f = C?.follow, h = C?.hold; if (!f?.current || !f.n_big) return '';
  const cur = f.current, hc = h?.current;
  const now = cur.days <= 0 || cur.dd >= -0.0005
    ? `照建議放 ${c} 的錢（回測、已含手續費）現在就在最高點。`
    : `照建議放 ${c} 的錢（回測、已含手續費）最高點在 ${closeYMD(cur.peak)} 收盤，到 ${closeYMD(f.last)} 收盤還少 ${down(cur.dd)}，已經 ${cur.days} 天沒回到新高`
      + (hc && hc.dd < -0.0005 ? `（一直抱著 ${c} 則比 ${closeYMD(hc.peak)} 的最高點少 ${down(hc.dd)}）。` : '。');
  const cmp = cur.days > 0 && cur.big
    ? (cur.longer === 0 ? `這次已經比過去每一次都久。` : cur.longer === f.n_big ? `這次到目前還比過去每一次都短。` : `過去 ${f.n_big} 次裡有 ${cur.longer} 次比這次還久。`)
    : '';
  return `${now}2018 年起這種跌超過 10% 的回落有 ${f.n_big} 次，一般要 ${dn(f.days_median)} 天才回到新高、最久 ${dn(f.days_max)} 天${cmp ? '；' + cmp : '。'}`
    + `這個方法跌得比一直抱著少很多，但回到新高常常要好幾個月到一年以上，是正常樣子。這是過去紀錄，不是保證。`;
}

function row(coin, how, s) {
  const lab = `<span class="nowrap">${coin}</span><div class="muted small nowrap">${how}</div>`;
  if (!s?.current) return `<tr><th>${lab}</th><td colspan="4">—</td></tr>`;
  const c = s.current;
  return `<tr><th>${lab}</th>`
    + `<td>${c.days > 0 ? `<strong>−${down(c.dd)}</strong><div class="muted small">${c.days} 天（最高點 ${closeYMD(c.peak)}）</div>` : '在最高點'}</td>`
    + `<td>−${down(s.max_dd)}</td>`
    + `<td>${s.n_big} 次<div class="muted small">一般跌 −${down(s.depth_median)}</div></td>`
    + `<td>一般 ${dn(s.days_median)} 天<div class="muted small">最久 ${dn(s.days_max)} 天</div></td></tr>`;
}
/** Advanced card 「跌下來要多久回來」. */
export function underwaterCard(U) {
  if (!U?.coins?.BTC || !U?.coins?.ETH || !U?.mix) return `<section class="card" id="underwater"><h2>跌下來要多久回來</h2><p class="muted small">資料讀不到，稍後再試。</p></section>`;
  const B = U.coins.BTC, E = U.coins.ETH, M = U.mix;
  const tbl = `<div class="scroll"><table class="bt"><thead><tr><th></th><th>現在比最高點少<div class="muted small">已幾天</div></th><th>2018 起最多少過</th><th>跌超過 10% 的次數</th><th>回到新高要多久</th></tr></thead><tbody>
      ${row('BTC', '照建議', B.follow)}${row('BTC', '一直抱著', B.hold)}${row('ETH', '照建議', E.follow)}${row('ETH', '一直抱著', E.hold)}${row('各一半', '照建議', M.follow)}${row('各一半', '一直抱著', M.hold)}</tbody></table></div>`;
  return `<section class="card" id="underwater"><h2>跌下來要多久回來</h2>
    <p class="small">「回落」＝錢從某天的最高點往下掉，到重新回到那個高點為止。照建議的錢 2018 年起最多少過 −${down(B.follow.max_dd)}（BTC）／−${down(E.follow.max_dd)}（ETH），一直抱著是 −${down(B.hold.max_dd)}／−${down(E.hold.max_dd)}；<strong>但照建議的錢一旦回落，回到新高常常要很久</strong>（跌超過 10% 的回落一般 ${dn(B.follow.days_median)} 天（BTC）／${dn(E.follow.days_median)} 天（ETH））——因為市場轉弱時它多半空手，要等走勢重新轉強才慢慢賺回來。</p>
    ${tbl}
    <p class="small">怎麼用：① 好幾個月沒創新高、甚至超過一年，對這個方法是常見的（BTC 照建議最久 ${dn(B.follow.days_max)} 天）；用「最近幾個月都沒賺」來決定放棄或換方法，正好會在最常見的低潮放棄。② 要判斷方法是不是壞了，看的是「跌得是不是比過去最多的還深」（BTC −${down(B.follow.max_dd)}、ETH −${down(E.follow.max_dd)}），不是「等了多久」。③ 首頁的虛擬投資是 2026/11/11 才開始的，這張卡是同一套算法從 2018 年回測，讓你知道正常的低潮長什麼樣。</p>
    <p class="small muted">算法：<code>backtest/underwater.py</code> → <code>data/underwater.json</code>（Binance 已收完日K，資料到 ${U.as_of}；定義事先固定在程式說明）。每天照冠軍建議比例調整，買賣各扣 0.15%、買進再扣台幣溢價 0.27%（和虛擬投組相同）；一直抱著＝第一天買進後不動；沒投入的錢不算利息。只看每天早上 8 點的收盤。次數不多（BTC ${B.follow.n_big}、ETH ${E.follow.n_big} 次），「一般幾天」誤差很大；2022 年以前是這套規則設定時看過的期間。這是過去紀錄，不是預測。</p>
  </section>`;
}
