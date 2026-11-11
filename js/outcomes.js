// v8: 過去出現同樣建議後，下一週怎麼走 — pure functions (no DOM, no network).
// Mirrors backtest/action_outcomes.py → data/outcomes.json (parity-tested in tests/outcomes.test.mjs).
import { recoRows, ACTION_ZH } from './flips.js';

export const HZ = 7;
export const ACTS = ['add', 'hold', 'reduce', 'out'];
const r100 = x => Math.floor(x * 100 + 0.5);            // same half-up rounding as the Python script
const pct = x => `${r100(x)}%`;
const spct = x => { const v = r100(x); return v === 0 ? '0%' : v > 0 ? `+${v}%` : `−${-v}%`; };

/** Plain one-liner for the top card (identical to outcomes.json coins[c].home[action]). */
export function homeLine(O, coin, action) {
  const st = O?.coins?.[coin]?.stats?.full; if (!st || !ACTION_ZH[action]) return '';
  const o = st.actions[action]?.overlap;
  if (!o || !o.n) return `過去 ${coin} 很少出現『${ACTION_ZH[action]}』，沒有足夠紀錄。`;
  return `過去 ${coin} 出現『${ACTION_ZH[action]}』後的一週：上漲 ${pct(o.up)}，一般落在 ${spct(o.p10)}～${spct(o.p90)}`
    + `（${st.start.slice(0, 4)} 年起共 ${o.n.toLocaleString('en-US')} 天出現過）。這是過去紀錄，不是預測。`;
}

/** Daily rows {date, action, exposure, r} from CLOSED bars [{t,c}] ascending; r = close[t+7]/close[t] − 1 (rows without t+7 dropped). */
export function outcomeRows(candles) {
  const rows = recoRows(candles), out = [];
  for (let i = 0; i + HZ < rows.length; i++) {
    const a = rows[i], b = rows[i + HZ];
    if (b.t - a.t !== HZ * 86400000) throw new Error('gap in daily bars');
    out.push({ date: a.date, action: a.action, exposure: a.exposure, r: b.c / a.c - 1 });
  }
  return out;
}

/** numpy-style (linear) percentile. */
export function percentile(xs, q) {
  const s = [...xs].sort((a, b) => a - b), h = (s.length - 1) * q / 100, lo = Math.floor(h);
  return lo + 1 < s.length ? s[lo] + (h - lo) * (s[lo + 1] - s[lo]) : s[lo];
}
export function summarize(xs) {
  if (!xs.length) return { n: 0 };
  return { n: xs.length, up: xs.filter(x => x > 0).length / xs.length, median: percentile(xs, 50), p10: percentile(xs, 10), p90: percentile(xs, 90),
    mean: xs.reduce((a, b) => a + b, 0) / xs.length };
}

// ---------- advanced card (HTML string; numbers only from outcomes.json) ----------
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const p1 = x => x === null || x === undefined ? '—' : `${x > 0 ? '+' : x < 0 ? '−' : ''}${Math.abs(x * 100).toFixed(1)}%`;
const tpe = t => new Intl.DateTimeFormat('zh-TW', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(t)) + '（台北時間）';
const tf = x => x === null || x === undefined ? '—' : Number(x).toFixed(2);
const P = { full: '全期', is: '樣本內', oos: '樣本外' };

function cell(o, w) {
  if (!o?.n) return '<td>—</td>';
  return `<td>上漲 <strong>${pct(o.up)}</strong><div class="muted small">一般 ${spct(o.p10)}～${spct(o.p90)}｜中位 ${p1(o.median)}｜平均 ${p1(o.mean)}</div><div class="muted small">最慘 5%：${p1(o.p05)}（平均 ${p1(o.es5)}）</div><div class="muted small">${o.n.toLocaleString('en-US')} 天${w?.n !== undefined ? `／不重疊 ${w.n} 週` : ''}${o.n < 100 ? '｜樣本少' : ''}</div></td>`;
}
function fhRow(lab, S) {
  return `<tr><th>${lab}</th>${['full', 'is', 'oos'].map(p => { const o = S[p].all.overlap, w = S[p].all.weekly, t = S[p].test;
    return `<td>照建議 <strong>${p1(o.follow_mean)}</strong>／抱著 ${p1(o.hold_mean)}<div class="muted small">每週平均差 ${p1(w.follow_mean - w.hold_mean)}（不重疊週，t ${tf(t.follow_minus_hold_t_weekly)}）</div><div class="muted small">最慘 5% 的週平均：照建議 ${p1(o.follow_es5)}／抱著 ${p1(o.hold_es5)}</div></td>`; }).join('')}</tr>`;
}

export function conclusion(O) {
  const lines = ['BTC', 'ETH'].map(c => {
    const S = O.coins[c].stats, V = O.verdict.coins[c], ups = ACTS.map(a => S.oos.actions[a].overlap).filter(o => o.n);
    const lo = Math.min(...ups.map(o => o.up)), hi = Math.max(...ups.map(o => o.up));
    const t = S.oos.test, w = S.oos.all.weekly, o = S.oos.all.overlap;
    return `<li><strong>${c}</strong>：2023 年起四種建議之後一週上漲的比例都在 ${pct(lo)}～${pct(hi)} 之間；「持有」和「空手」之後的週報酬差 ${p1(t.hold_minus_out_mean_weekly)}（t ${tf(t.hold_vs_out_t_weekly)}）——`
      + `${V.direction_separates ? '有差別' : '<strong>分不出漲跌（未證明）</strong>'}。照建議比一直抱著每週平均 ${p1(w.follow_mean - w.hold_mean)}（t ${tf(t.follow_minus_hold_t_weekly)}）——${V.follow_beats_hold_return ? '有多賺' : '<strong>沒證明能多賺</strong>'}。`
      + `最慘 5% 的週：照建議平均 ${p1(o.follow_es5)}，一直抱著 ${p1(o.hold_es5)}${V.follow_smaller_worst5 ? '，<strong>照建議跌得少</strong>' : ''}。</li>`;
  }).join('');
  return `<ul class="small">${lines}</ul><p class="small"><strong>白話結論：</strong>建議不能用來猜下週會漲還是會跌——不管是哪種建議，之後一週漲跌大致一半一半。它真正有紀錄支持的用處是「大跌的週少虧」，而這主要是因為投入的比例比較低：跌時少虧，漲時也少賺。所以請把它當作控制風險的工具，不是預測漲跌的工具。</p>`;
}

export function outcomesCard(O) {
  if (!O?.coins) return '';
  const block = c => {
    const S = O.coins[c].stats;
    const rows = ACTS.map(a => `<tr><th>${ACTION_ZH[a]}</th>${['full', 'is', 'oos'].map(p => cell(S[p].actions[a].overlap, S[p].actions[a].weekly)).join('')}</tr>`).join('');
    const head = `<tr><th>出現的建議</th>${['full', 'is', 'oos'].map(p => `<th>${P[p]}<div class="muted small">${S[p].start.slice(0, 7)}～${S[p].end.slice(0, 7)}</div></th>`).join('')}</tr>`;
    return `<h3 class="sub">${c}<span class="muted small">（現在：${esc(O.coins[c].now.action_zh)}）</span></h3>
      <div class="scroll"><table class="bt out-t"><thead>${head}</thead><tbody>${rows}<tr><th>不分建議</th>${['full', 'is', 'oos'].map(p => cell(S[p].all.overlap, S[p].all.weekly)).join('')}</tr></tbody></table></div>
      <div class="scroll"><table class="bt out-t"><thead><tr><th>照建議 vs 一直抱著<div class="muted small">每週，扣成本</div></th>${['full', 'is', 'oos'].map(p => `<th>${P[p]}</th>`).join('')}</tr></thead><tbody>${fhRow('一週報酬平均', S)}</tbody></table></div>`;
  };
  return `<section class="card" id="outcomes"><h2>各種建議之後的一週實績</h2>
    <p class="small">每天收盤時首頁會給一個建議（加碼／持有／減碼／空手）。這裡把歷史上每一天的建議，跟「之後 7 天」的實際漲跌對起來看。</p>
    ${block('BTC')}${block('ETH')}
    <h3 class="sub">結論</h3>
    ${conclusion(O)}
    <p class="small muted">算法：<code>backtest/action_outcomes.py</code> → <code>data/outcomes.json</code>（${esc(O.source)}，產生於 ${tpe(Date.parse(O.generated_at))}，最後一根 ${esc(O.coins.BTC.last_bar)}）。規則與首頁冠軍模型相同（${esc(O.model)}）；第 t 天的建議只用 t 天以前（含）的收盤，一週＝第 t 天收盤到第 t+7 天收盤。「天」＝每天都當一次起點，相鄰兩個起點有 6 天重疊，所以不是獨立樣本；「不重疊週」只取${esc(O.weekly_anchor)}，顯著性（t）用它算，|t| ≥ 2 才算有差別。照建議＝這一週投入建議比例、其餘放現金；一直抱著＝全部投入；${esc(O.costs.note)}（每週都付一次來回成本，對長期持有者偏保守，兩邊同樣算法）。2023 年以前是樣本內、之後是樣本外。「加碼」只出現在變化當天，樣本少。</p>
  </section>`;
}
