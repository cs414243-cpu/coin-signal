// v42: 預測成績單「每一筆預測對答案」— each champion forecast's 「一週後價格大概在 A～B 之間」 range next to the price 7 days
// later, built on the phone from the public hash-chained ledger (ledger/forecasts.jsonl + ledger/scores.jsonl; chain is
// verified separately by trust.js). Backtest context from data/bandnoise.json (backtest/band_noise.py: frozen champion
// walk-forward, how often the range really held and how much that share jumps around over only K days).
// Pure functions; no DOM writes. Research only, not investment advice.
import { asofInline, WEEKLY_NOTE } from './fresh.js';   // v44
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
/** candle date D closes at D+1 08:00 Taipei → "M/D" of that morning (same as trust.js closeMD) */
export const closeMD = s => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + 1); return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`; };
const usd = x => Math.round(x).toLocaleString('en-US');
const p0 = x => `${Math.round(x * 100)}%`;
const p1 = x => `${(x * 100).toFixed(1)}%`;
export const MAX_ROWS = 14;

/** JSONL text → rows of the given type (bad lines skipped). */
export function parse(text, type) {
  const out = [];
  for (const l of String(text || '').split('\n')) { if (!l.trim()) continue; try { const r = JSON.parse(l); if (r.type === type) out.push(r); } catch {} }
  return out;
}

/** Join one model's forecasts with their scores. Newest first (by forecast date, then BTC before ETH).
 *  status: 'in' (q10 ≤ realised ≤ q90, = engine.score_one in_band), 'below', 'above', or 'pending' (no score yet). */
export function answerKey(forecasts, scores, model) {
  const S = new Map((scores || []).filter(s => s.model === model).map(s => [s.id, s]));
  const rows = (forecasts || []).filter(f => f.model === model && Number.isFinite(f.price) && Number.isFinite(f.q10) && Number.isFinite(f.q90)).map(f => {
    const s = S.get(f.id), lo = f.price * (1 + f.q10), hi = f.price * (1 + f.q90);
    const r = { id: f.id, coin: f.coin, asof: f.asof, target: f.target_date, price: f.price, lo, hi, q10: f.q10, q90: f.q90, p_up: f.p_up, status: 'pending' };
    if (s && Number.isFinite(s.realized)) {
      r.realized = s.realized; r.actual = Number.isFinite(s.close_target) ? s.close_target : f.price * (1 + s.realized);
      r.status = s.in_band === 1 ? 'in' : s.realized < f.q10 ? 'below' : 'above';
      r.up = s.up === 1; r.hit = s.hit === 1;
    }
    return r;
  });
  rows.sort((a, b) => a.asof !== b.asof ? (a.asof < b.asof ? 1 : -1) : a.coin < b.coin ? -1 : 1);
  return rows;
}

export function summary(rows) {
  const done = rows.filter(r => r.status !== 'pending'), pend = rows.filter(r => r.status === 'pending');
  const n = done.length, inn = done.filter(r => r.status === 'in').length;
  const firstPending = pend.length ? pend.reduce((a, b) => a.target < b.target ? a : b).target : null;
  return { n, in: inn, below: done.filter(r => r.status === 'below').length, above: done.filter(r => r.status === 'above').length,
    share: n ? inn / n : null, pending: pend.length, firstPending };
}

/** Backtest spread of the in-range share for a record of `n` scored forecasts (2 per day → K = ceil(n/2) days). */
export function noise(BN, n) {
  const W = BN?.windows?.all; if (!W?.length || !(n > 0)) return null;
  const K = Math.ceil(n / 2);
  return W.find(w => w.days === K) || [...W].reverse().find(w => w.days <= K) || null;
}

const ST = { in: '✅ 在範圍內', below: '⬇️ 比範圍低', above: '⬆️ 比範圍高' };
function rowHtml(r) {
  const res = r.status === 'pending' ? `<span class="muted">${closeMD(r.target)} 早上 8 點對答案</span>` : `${usd(r.actual)}<div class="small">${ST[r.status]}</div>`;
  return `<tr class="ans-${r.status}"><th>${closeMD(r.asof)} ${esc(r.coin)}<div class="muted small">當時 ${usd(r.price)}</div></th><td>${usd(r.lo)}～${usd(r.hi)}</td><td>${res}</td></tr>`;
}

/** Collapsed block inside 「預測成績單」. rows = answerKey(...), BN = bandnoise.json (may be null). */
export function block(rows, BN) {
  if (!rows?.length) return '';
  const s = summary(rows), O = BN?.overall?.all;
  const bt = O ? `回測（${BN.start.slice(0, 4)} 年起，凍結的程式每天只用當天以前的資料重做，${O.n.toLocaleString('en-US')} 筆）裡，這個範圍實際包住一週後價格 ${p1(O.in_band)}；跌破下緣 ${p1(O.below)}、超過上緣 ${p1(O.above)}${O.below > O.above + 0.01 ? '——跌破下緣比超過上緣常見一些，但差距不大，可能只是運氣' : ''}。` : '';
  let head;
  if (!s.n) head = `<p class="small">首頁「看細節」裡每天都會說「一週後價格大概在 A～B 之間（10 次有 8 次落在這裡）」。這裡把每一筆記下來，一週後直接對答案。第一批要到 <strong>${closeMD(s.firstPending)} 早上 8 點</strong>才對得出答案，現在還在等的有 ${s.pending} 筆。</p>`;
  else {
    const z = noise(BN, s.n);
    const nz = !z ? '' : z.p10 <= 0 && z.p90 >= 1 ? `只有 ${s.n} 筆時，回測裡 0% 到 100% 都很常見，<strong>現在還看不出準不準</strong>。`
      : `回測裡只看 ${z.days} 天（${z.forecasts} 筆）時，這個比例一般在 ${p0(z.p10)}～${p0(z.p90)} 之間跳動；現在的 ${p0(s.share)} ${s.share < z.p10 - 1e-9 ? '<strong>比這個範圍低</strong>，範圍可能訂得太窄，要繼續觀察' : s.share > z.p90 + 1e-9 ? '比這個範圍高，範圍可能訂得太寬' : '在這個範圍裡，還算正常'}。相鄰幾天的預測期間重疊，筆數看起來多，其實沒那麼多。`;
    head = `<p class="small">已經對答案 <strong>${s.n} 筆</strong>：${s.in} 筆落在當時說的範圍內（${p0(s.share)}），比範圍低 ${s.below} 筆、比範圍高 ${s.above} 筆。說好的是 10 次約 8 次。${nz}${s.pending ? `還在等答案的有 ${s.pending} 筆。` : ''}</p>`;
  }
  const show = (s.n ? rows.filter(r => r.status !== 'pending') : rows).slice(0, MAX_ROWS);
  const more = (s.n ? s.n : rows.length) > show.length ? `<p class="small muted">只列最近 ${show.length} 筆，較早的在公開紀錄 <code>ledger/scores.jsonl</code>。</p>` : '';
  return `<details class="answers" id="answers"><summary>每一筆預測對答案（一週價格範圍準不準）</summary>
    ${head}
    <div class="scroll"><table class="bt"><thead><tr><th>哪天說的</th><th>說一週後大概在（美元）</th><th>一週後實際</th></tr></thead><tbody>${show.map(rowHtml).join('')}</tbody></table></div>
    ${more}
    <p class="small muted">${bt}範圍只描述「價格大概會動多大」，不是買賣建議；它包住價格也不代表建議賺錢。資料直接讀這支手機下載的公開預測紀錄（記錄後不能修改）；回測算法 <code>backtest/band_noise.py</code> → <code>data/bandnoise.json</code>${BN?.as_of ? `（${asofInline(BN.as_of)}，${WEEKLY_NOTE}）` : ''}。</p>
  </details>`;
}
