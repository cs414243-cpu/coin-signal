// v39: 明天早上 8 點收盤如果是…，建議會變成多少（價格對照表，事先想好「如果…就…」）— pure functions (no DOM, no network).
// Each row = the frozen trend_vt@1 rule (flips.js recoRows, parity-tested vs the ledger) run on the phone's closed daily bars
// with one hypothetical next close appended. Same definitions as backtest/price_ladder.py (pre-registered); history of
// one-day moves from data/ladder.json (Binance closed daily bars, 2023→). Not a forecast of direction, not a new signal.
import { recoRows, actionFor, ACTION_ZH, ruleAfter, pastLine } from './flips.js';

export const MOVES = [0.10, 0.05, 0.02, 0, -0.02, -0.05, -0.10];   // = backtest/price_ladder.py MOVES (shown high → low)
export const FLIP_RANGE = 0.15;      // also show the exact flip price of a line when it is within ±15 % of the last close
export const MATCH_TOL = 0.005;      // phone must reproduce the card's exposure for the card's date (same as preclose.js)
const DAY = 86400000;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const usd0 = x => Number.isFinite(x) ? x.toLocaleString('en-US', { maximumFractionDigits: x > 1000 ? 0 : 2 }) : '—';
const pc = e => `${Math.round(e * 100)}%`;
const sg = m => m === 0 ? '不動' : `${m > 0 ? '+' : '−'}${+(Math.abs(m) * 100).toFixed(1)}%`;
const fq = x => !Number.isFinite(x) ? '—' : x < 0.01 ? `${+(x * 100).toFixed(1)}%` : `${Math.round(x * 100)}%`;
const closeMD = s => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + 2); return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`; };

/** Rule result if the next close is x. bars: CLOSED daily bars [{t, c}] ascending. */
export function rowAt(bars, x) { return ruleAfter(bars.map(k => k.c), x); }   // v40: shared with the home line (flips.ruleAfter)

/** f: data/live.json coin (asof, exposure, action, state.trend3). → null (phone not on the card's date / mismatch) | ladder */
export function ladder(f, bars) {
  if (!f?.asof || !Number.isFinite(f.exposure) || !bars || bars.length < 200) return null;
  const R = recoRows(bars), base = R.at(-1);
  if (!base || base.date !== f.asof) return null;                               // 08:00–08:30 window or old data → nothing
  const t3 = f.state?.trend3;
  if (Math.abs(base.exposure - f.exposure) > MATCH_TOL || (Number.isFinite(t3) && t3 !== base.trend3)) return null;
  const closes = bars.map(k => k.c), c = closes.at(-1), n = closes.length;
  const sum = k => closes.slice(n - k).reduce((a, b) => a + b, 0);
  const rows = MOVES.map(m => ({ kind: 'move', move: m, price: c * (1 + m), ...rowAt(bars, c * (1 + m)) }));
  for (const [L, p] of [[50, sum(49) / 49], [200, sum(199) / 199]]) {
    const d = p / c - 1; if (Math.abs(d) > FLIP_RANGE || Math.abs(d) < 1e-9) continue;
    const above = c > sum(L) / L, up = !above;                                    // v40: side that flips it (= reliability.flipLevels above)
    rows.push({ kind: 'flip', line: L, up, move: d, price: p, ...rowAt(bars, pastLine(p, above)) });   // = home 「什麼時候會變」 share
  }
  rows.sort((a, b) => b.price - a.price || (a.kind === 'flip' ? -1 : 1));
  for (const r of rows) { r.action = actionFor(r.exposure, f.exposure); r.changed = r.action !== f.action || Math.abs(r.exposure - f.exposure) >= 0.10; }
  // a bigger jump with the same trend gives LESS (volatility rises): first such pair on the up side, for the note
  let dip = null;
  const ups = rows.filter(r => r.price > c && r.trend3 > 0).sort((a, b) => a.price - b.price);
  for (let i = 1; i < ups.length; i++) if (ups[i].trend3 === ups[i - 1].trend3 && ups[i].exposure < ups[i - 1].exposure - 0.005) { dip = [ups[i - 1], ups[i]]; break; }
  return { date: f.asof, close: c, rows, dip };
}

const what = r => r.exposure < 0.005 ? '先不要放（0%）' : `${ACTION_ZH[r.action]}（放約 ${pc(r.exposure)}）`;
const freqOf = (Fq, m) => !Fq ? NaN : m === 0 ? Fq.flat2 : m >= 0.10 ? Fq.ge10 : m >= 0.05 ? Fq.ge5 : m >= 0.02 ? Fq.ge2 : m <= -0.10 ? Fq.le10 : m <= -0.05 ? Fq.le5 : m <= -0.02 ? Fq.le2 : NaN;

/** Block inside 「看 X 的細節」. Lx = ladder(); D = data/ladder.json (or null; then no history column). */
export function detailBlock(c, Lx, D) {
  if (!Lx) return '';
  const C = D?.coins?.[c], Fq = C?.freq?.oos, sm = C?.oos_small_move_changes;
  const head = `<tr><th>${closeMD(Lx.date)} 早上 8 點<br>${c} 收盤</th><th>建議會是</th>${Fq ? '<th>2023 年起一天<br>漲跌這麼多</th>' : ''}</tr>`;
  const body = Lx.rows.map(r => {
    const px = r.kind === 'flip' ? `${usd0(r.price)} ${r.up ? '以上' : '以下'}<div class="muted small">${sg(r.move)}，${r.line} 日翻轉價</div>` : `${usd0(r.price)}<div class="muted small">${sg(r.move)}</div>`;
    const hist = !Fq ? '' : `<td>${r.kind === 'flip' ? '—' : r.move === 0 ? `±2% 以內 ${fq(Fq.flat2)}` : `${r.move > 0 ? '漲' : '跌'} ${fq(freqOf(Fq, r.move))}`}</td>`;
    return `<tr${r.changed ? ' class="hl"' : ''}${r.kind === 'flip' ? ' data-flip="1"' : ''}><td>${px}</td><td>${r.changed ? `<strong>${esc(what(r))}</strong>` : esc(what(r))}</td>${hist}</tr>`;
  }).join('');
  const any = Lx.rows.some(r => r.changed);
  const notes = [];
  notes.push(any ? '藍色粗體＝跟現在的建議不一樣，到時要照新的建議買賣。' : `在這個範圍內（${sg(MOVES.at(-1))}～${sg(MOVES[0])}），明天的建議都跟現在一樣，不用動手。`);
  // v40: the top card's 「什麼時候會變」 share is now the same number as the flip row (flips.ruleAfter), so no estimate-gap note
  if (Lx.dip) notes.push(`漲越多不一定放越多：收在 ${usd0(Lx.dip[0].price)} 放約 ${pc(Lx.dip[0].exposure)}，收在 ${usd0(Lx.dip[1].price)} 反而只放約 ${pc(Lx.dip[1].exposure)}——一天大漲會讓波動變大，規則就少放一點。`);
  if (sm?.n) notes.push(`2023 年起 ${c} 有 ${fq(sm.share)} 的日子，收盤只要多漲或多跌 2% 建議就會不一樣。`);
  return `<div class="ladder" id="ld-${c}" data-date="${esc(Lx.date)}"><p class="small"><strong>明天收盤如果是…，建議會變成多少</strong>（先想好「如果…就…」，到時不用臨時判斷）</p>
    <div class="scroll"><table class="bt ld">${head}${body}</table></div>
    <p class="small">${esc(notes.join(''))}</p>
    <p class="small muted">只算下一根收盤（${closeMD(Lx.date)} 早上 8 點），用手機抓到的已收完日K、同一套規則算；之後幾天的收盤會讓這張表跟著變。這不是預測會漲會跌，真的變了以每天 08:20 的正式更新為準。${D?.as_of ? `「漲跌這麼多」＝2023 年起每天收盤比前一天的變動（資料到 ${esc(D.as_of)}）。` : ''}</p></div>`;
}
