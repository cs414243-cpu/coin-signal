// v55: 留一部分一直抱著？ — pure functions (no DOM, no network).
// v54 showed the frozen rule (trend_vt@1) lags buy-and-hold in every big bull year and helps in down years. The real
// question is often not "rule or hold" but "how much follows the rule and how much just stays held" (core–satellite:
// Amenc, Malaise & Martellini 2004 JPM 31(1); trend following as a diversifier: Hurst, Ooi & Pedersen 2017 JPM 44(1)).
// backtest/core_blend.py → data/blend.json: a fixed grid (hold 0/25/50/75/100%) chosen before the first run, money split
// once and never moved. Not a signal; the recommendation is unchanged and applies to the 照建議 part only.
import { asofInline, WEEKLY_NOTE } from './fresh.js';
const pc0s = x => Number.isFinite(x) ? `${x < 0 ? '−' : x > 0 ? '+' : ''}${Math.abs(Math.round(x * 100))}%` : '—';
const pc1 = x => Number.isFinite(x) ? `${x < 0 ? '−' : x > 0 ? '+' : ''}${Math.abs(x * 100).toFixed(1)}%` : '—';
const dd1 = x => Number.isFinite(x) ? `${x < 0 ? '−' : ''}${Math.abs(x * 100).toFixed(1)}%` : '—';
const sh = x => Number.isFinite(x) ? `${Math.round(x * 100)}%` : '—';
const md = s => s ? `${Number(s.slice(5, 7))}/${Number(s.slice(8, 10))}` : '—';
const HL = h => h === 0 ? '全部照建議' : h === 1 ? '全部一直抱著' : `${Math.round(h * 100)}% 抱著`;

/** rows of a coin ('BTC'/'ETH') or of the mix ('MIX') for a period ('full'/'after'); null if missing. */
export function rowsOf(D, c, per = 'full') {
  const r = c === 'MIX' ? D?.mix?.[per]?.rows : D?.coins?.[per]?.[c]?.rows;
  return Array.isArray(r) && r.length === 5 ? r : null;
}
export const at = (rows, h) => rows?.find(r => r.h === h) ?? null;

/** Does holding more ever end with a higher total than following only? -> 'more' | 'less' | 'mixed'. */
export function totalTrend(rows) {
  const t = rows.map(r => r.total); const up = t.slice(1).every((x, i) => x > t[i]), dn = t.slice(1).every((x, i) => x < t[i]);
  return up ? 'more' : dn ? 'less' : 'mixed';
}

/** One plain line inside 「看 X 的細節」. '' when the file is missing. */
export function detailLine(c, D) {
  const R = rowsOf(D, c, 'full'); if (!R) return '';
  const a = at(R, 0), h = at(R, 0.5), start = D.coins.full[c].start;
  return `如果一開始留一半一直抱著、一半照建議（${start.slice(0, 4)} 年起）：總報酬 ${pc0s(h.total)}（全部照建議 ${pc0s(a.total)}），但最慘跌幅 ${dd1(h.maxdd)}（全部照建議 ${dd1(a.maxdd)}）；現在約 ${sh(h.coin_share_now)} 的錢會在 ${c} 裡。`;
}

function table(title, rows, note = '') {
  const head = '<tr><th>抱著多少</th><th>總報酬</th><th>最慘跌幅</th><th>大漲年<div class="muted small">中間值</div></th><th>下跌年<div class="muted small">中間值</div></th><th>現在在幣裡</th></tr>';
  const body = rows.map(r => `<tr><th>${HL(r.h)}</th><td>${pc0s(r.total)}</td><td>${dd1(r.maxdd)}</td><td>${r.bull?.n ? pc0s(r.bull.median) : '—'}</td><td>${r.down?.n ? pc0s(r.down.median) : '—'}</td><td>${sh(r.coin_share_now)}</td></tr>`).join('');
  return `<h3>${title}</h3>${note}<div class="scroll"><table class="bt"><thead>${head}</thead><tbody>${body}</tbody></table></div>`;
}
const yrs = (rows, k) => { const n = rows[0]?.[k]?.n; return n ? `${n} 年` : '沒有'; };

/** Advanced card 「留一部分一直抱著？」. */
export function blendCard(D) {
  const id = 'blend', h2 = '留一部分一直抱著？照建議和抱著怎麼分';
  const M = rowsOf(D, 'MIX', 'full'), A = rowsOf(D, 'MIX', 'after');
  if (!M || !A || !rowsOf(D, 'BTC') || !rowsOf(D, 'ETH')) return `<section class="card" id="${id}"><h2>${h2}</h2><p class="muted small">資料讀不到，稍後再試。</p></section>`;
  const m0 = at(M, 0), m5 = at(M, 0.5), m1 = at(M, 1), a0 = at(A, 0), a5 = at(A, 0.5), a1 = at(A, 1);
  const st = D.mix.full.start, tr = totalTrend(M), trA = totalTrend(A);
  const trTxt = (tr === 'less' && trA === 'less') ? '這段歷史裡（2018 年起和 2024 年起都是），<strong>抱著越多、總報酬反而越少</strong>，跌幅越深'
    : (tr === 'more' && trA === 'more') ? '這段歷史裡，抱著越多總報酬越多，但跌幅也越深'
    : '這段歷史裡，抱著多少和總報酬沒有一致的方向，但跌幅一定越深';
  const y = m5.ytd, y0 = m0.ytd, y1 = m1.ytd;
  const flat = ['BTC', 'ETH'].every(c => (D.coins.full[c].exposure_now ?? 1) < 0.005);
  return `<section class="card" id="${id}"><h2>${h2}</h2>
    <p class="small">上一張卡看到：遇到大漲年，照建議幾乎一定落後一直抱著。如果你怕錯過大漲，另一種做法是<strong>一開始就把要放加密幣的錢分兩份</strong>：一份買了就一直抱著、其餘照建議做。這裡把「抱著 0%、25%、50%、75%、100%」五種分法都算出來（五種在第一次計算前就固定，沒有事後挑），兩幣各一半、含手續費。</p>
    <p><strong>結論</strong>：抱著的比例越高，大漲年賺越多，但最慘的時候跌越深。兩幣各半、${st.slice(0, 4)} 年起：全部照建議 ${pc0s(m0.total)}、最慘 ${dd1(m0.maxdd)}；一半抱著 ${pc0s(m5.total)}、最慘 <strong>${dd1(m5.maxdd)}</strong>；全部抱著 ${pc0s(m1.total)}、最慘 ${dd1(m1.maxdd)}。${trTxt}。</p>
    <p class="small"><strong>規則選定之後（2024 年起）</strong>：全部照建議 ${pc0s(a0.total)}、最慘 ${dd1(a0.maxdd)}；一半抱著 ${pc0s(a5.total)}、最慘 ${dd1(a5.maxdd)}；全部抱著 ${pc0s(a1.total)}、最慘 ${dd1(a1.maxdd)}。</p>
    ${y && y0 && y1 ? `<p class="small"><strong>今年到 ${md(D.mix.full.last)}</strong>（2018 年就這樣分好的話）：全部照建議 ${pc1(y0.ret)}、一半抱著 ${pc1(y.ret)}、全部抱著 ${pc1(y1.ret)}。${flat ? '回測最後一天建議是空手，所以只有「抱著」那一份還在幣裡：' : ''}一半抱著的話，現在約 <strong>${sh(m5.coin_share_now)}</strong> 的錢在幣裡（抱著的那份漲跌後比例會變）。</p>` : ''}
    <p class="small"><strong>對你來說</strong>：要抱多少，取決於你能忍多深的跌、多怕錯過大漲，沒有哪個比例一定「對」。如果選了一個比例，就<strong>一開始分好、之後固定</strong>，App 的建議只用在「照建議」那一份；不要看最近哪一種贏就改比例——那就是事後挑，等於在追漲殺跌。</p>
    ${table(`兩幣各一半，${st.slice(0, 4)} 年起`, M)}
    ${table('兩幣各一半，2024 年起（選定之後）', A, `<p class="muted small">大漲年 ${yrs(A, 'bull')}、下跌年 ${yrs(A, 'down')}，年數很少。</p>`)}
    <details><summary>BTC、ETH 分開看</summary>
      ${table(`BTC，${D.coins.full.BTC.start.slice(0, 4)} 年起`, rowsOf(D, 'BTC'))}${table(`ETH，${D.coins.full.ETH.start.slice(0, 4)} 年起`, rowsOf(D, 'ETH'))}
      ${table('BTC，2024 年起', rowsOf(D, 'BTC', 'after'))}${table('ETH，2024 年起', rowsOf(D, 'ETH', 'after'))}
    </details>
    <p class="small"><strong>注意</strong>：大漲年／下跌年＝一直抱著那年漲 50% 以上／下跌的完整日曆年，欄位是那幾年報酬的中間值。2024 年起只有 2 個完整年，看看就好。這是過去紀錄，不是預測，也不是新的建議。</p>
    <p class="small muted">算法：<code>backtest/core_blend.py</code> → <code>data/blend.json</code>（Binance 已收完日K，${asofInline(D.as_of)}，${WEEKLY_NOTE}；定義在第一次執行前固定在程式說明）。照建議＝冠軍 trend_vt@1（凍結公式，與每日預測每一天相同），每天早上 8 點收盤照建議比例調整；抱著＝第一天買進後不動。錢在第一天分成兩份、之後不互相搬（不多付手續費，比例會隨漲跌漂移）；兩幣也是一開始各一半、之後不再平衡。買賣各扣 0.15%、買進再扣台幣溢價 0.27%（和虛擬投組相同）；沒放的錢不計利息。最慘跌幅＝從任何高點往下最多跌多少；「現在在幣裡」＝最後一天收盤後放在幣裡的錢占全部的比例。</p>
  </section>`;
}
