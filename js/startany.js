// v49: 如果我今天才開始照做 — pure functions (no DOM, no network).
// Every other result card starts the backtest in 2018 or 2023 and runs to today; a person starts on ONE day. This card
// starts the same frozen rule (trend_vt@1) fresh on every past day and shows the spread of 3-month and 1-year results next
// to buying and holding from the same day — backtest/start_any.py → data/startany.json. Not a signal, not a forecast.
import { asofInline, WEEKLY_NOTE } from './fresh.js';
const pc1 = x => Number.isFinite(x) ? `${x < 0 ? '−' : x > 0 ? '+' : ''}${Math.abs(x * 100).toFixed(1)}%` : '—';
const pc0 = x => Number.isFinite(x) ? `${Math.round(x * 100)}%` : '—';
const dd1 = x => Number.isFinite(x) ? `${x < 0 ? '−' : ''}${Math.abs(x * 100).toFixed(1)}%` : '—';
export const IN_EPS = 0.005;
const HZ = { 91: '3 個月', 365: '1 年' };

/** Start condition to quote: today's official exposure (live.json) if present, else the file's last bar. */
export function nowCond(SA, c, LIVE) {
  const L = LIVE?.coins?.[c]; const e = L && Number.isFinite(L.exposure) ? L.exposure : SA?.coins?.[c]?.current?.exposure;
  if (!Number.isFinite(e)) return null;
  return e < IN_EPS ? 'flat' : 'invested';
}
const condWord = k => k === 'flat' ? '空手' : '有放一部分';

/** One plain line inside 「看 X 的細節」. '' when the file is missing. */
export function detailLine(c, SA, LIVE) {
  const k = nowCond(SA, c, LIVE); const G = SA?.coins?.[c]?.horizons?.['365']?.oos?.[k];
  if (!k || !G) return '';
  return `如果今天才開始照做（現在${condWord(k)}）：2023 年起每一個${condWord(k)}的日子開始照做，一年後賺錢的占 ${pc0(G.follow.pos)}、中間值 ${pc1(G.follow.median)}、最差 ${pc1(G.follow.worst)}；`
    + `同一天買進一直抱著：中間值 ${pc1(G.hold.median)}、最差 ${pc1(G.hold.worst)}（這些起點只來自 ${G.stretches} 段時間，不是 ${G.n} 次獨立的結果）。`;
}

function row(lab, G) {
  if (!G) return `<tr><th>${lab}</th><td colspan="6">—</td></tr>`;
  const cell = (f, h) => `<td><strong>${f}</strong><div class="muted small">抱著 ${h}</div></td>`;
  return `<tr><th>${lab}<div class="muted small">${G.n} 個起點／${G.stretches} 段</div></th>`
    + cell(pc1(G.follow.median), pc1(G.hold.median)) + cell(pc0(G.follow.pos), pc0(G.hold.pos))
    + cell(pc1(G.follow.p10), pc1(G.hold.p10)) + cell(pc1(G.follow.worst), pc1(G.hold.worst))
    + cell(dd1(G.follow.dd_worst), dd1(G.hold.dd_worst)) + `<td>${pc0(G.beat)}</td></tr>`;
}
function table(c, C, k) {
  const head = '<tr><th>開始那天</th><th>之後中間值<div class="muted small">照建議</div></th><th>賺錢的比例</th><th>運氣差<div class="muted small">10 次最差那次</div></th><th>最差</th><th>中間最慘跌</th><th>照建議比抱著好</th></tr>';
  const rows = [];
  for (const h of ['91', '365']) for (const [p, pl] of [['is', '2018–22'], ['oos', '2023 起']]) rows.push(row(`${HZ[h]}後・${pl}`, C.horizons?.[h]?.[p]?.[k]));
  return `<h3>${c}（從${condWord(k)}的日子開始）</h3><div class="scroll"><table class="bt"><thead>${head}</thead><tbody>${rows.join('')}</tbody></table></div>`;
}

/** Advanced card 「今天才開始照做」. */
export function startAnyCard(SA, LIVE) {
  const id = 'startany', h2 = '如果今天才開始照做，3 個月／1 年後會怎樣';
  if (!SA?.coins?.BTC || !SA?.coins?.ETH) return `<section class="card" id="${id}"><h2>${h2}</h2><p class="muted small">資料讀不到，稍後再試。</p></section>`;
  const kB = nowCond(SA, 'BTC', LIVE), kE = nowCond(SA, 'ETH', LIVE);
  const B = SA.coins.BTC.horizons['365'], E = SA.coins.ETH.horizons['365'];
  const gB = B.oos[kB], gE = E.oos[kE], aB = B.oos.all, aE = E.oos.all;
  return `<section class="card" id="${id}"><h2>${h2}</h2>
    <p class="small">其他卡片都是「從 2018（或 2023）年一路照做到今天」的總成績，但你只會從某一天開始。這裡把同一套建議從過去<strong>每一天</strong>重新開始一次（第一天從現金開始、含手續費），看 3 個月和 1 年後的結果有多分散，旁邊是同一天買進一直抱著。</p>
    <p><strong>現在</strong>：BTC ${condWord(kB)}、ETH ${condWord(kE)}。2023 年起從同樣狀態的日子開始照做，<strong>一年後賺錢的占 ${pc0(gB?.follow.pos)}（BTC）／${pc0(gE?.follow.pos)}（ETH）</strong>，中間值 ${pc1(gB?.follow.median)}／${pc1(gE?.follow.median)}，最差 ${pc1(gB?.follow.worst)}／${pc1(gE?.follow.worst)}；一直抱著中間值 ${pc1(gB?.hold.median)}／${pc1(gE?.hold.median)}，最差 ${pc1(gB?.hold.worst)}／${pc1(gE?.hold.worst)}。</p>
    ${table('BTC', SA.coins.BTC, kB)}${table('ETH', SA.coins.ETH, kE)}
    <p class="small"><strong>重點</strong>：① 照建議的結果比較集中：一年內最慘的一次跌幅 BTC ${dd1(gB?.follow.dd_worst)}、ETH ${dd1(gE?.follow.dd_worst)}，一直抱著 ${dd1(gB?.hold.dd_worst)}／${dd1(gE?.hold.dd_worst)}。② 但不一定比一直抱著賺得多：2023 年起不管哪天開始，一年後照建議比抱著好的 BTC 占 ${pc0(aB.beat)}、ETH 占 ${pc0(aE.beat)}——這套方法主要是少虧，不保證多賺。③ 起點雖然有幾百天，但時間大量重疊，從${condWord(kB)}開始的 BTC 只來自 ${gB?.stretches} 段、ETH ${gE?.stretches} 段時間；2023 年後大多是上漲行情，「賺錢比例」不能當成未來的機率。</p>
    <p class="small muted">算法：<code>backtest/start_any.py</code> → <code>data/startany.json</code>（Binance 已收完日K，${asofInline(SA.as_of)}，${WEEKLY_NOTE}；定義事先固定在程式說明）。每個起點從現金開始，每天照冠軍建議比例調整，買賣各扣 0.15%、買進再扣台幣溢價 0.27%（和虛擬投組相同，含第一天買進）；沒放的錢不計利息；只算 3 個月／1 年已經走完的起點。「開始那天」依當天的建議分成空手或有放一部分。2022 年以前是這套規則設定時看過的期間。這是過去紀錄，不是預測。</p>
  </section>`;
}
