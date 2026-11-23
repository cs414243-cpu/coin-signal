// v95: 建議只放一點點（例：放約 19%），我可以放多一點嗎？ — pure functions (no DOM, no network).
// backtest/size_up.py → data/sizeup.json: the frozen champion's walk-forward exposures e (= virtual portfolio, "rule") vs
// x15 = min(1, 1.5e), x2 = min(1, 2e) (headline) and trend_full = the trend state alone (0 / 0.5 / 1, no volatility
// scaling), same costs, NT$1M split BTC/ETH. Definitions committed before the first run (98dc7a4; call fix 2d78e2e),
// IS-only result (3c442dd) before any 2024+ number. Moreira & Muir 2017 (JF 72(4)); Barroso & Santa-Clara 2015 (JFE 116(1));
// Harvey et al. 2018 (JPM 45(1)); Cederburg et al. 2020 (JFE 138(1)). Not a signal; the recommendation is unchanged.
// Research only, not investment advice.
import { asofInline, WEEKLY_NOTE } from './fresh.js';
const pc1 = x => !Number.isFinite(x) ? '—' : Math.abs(x) < 0.0005 ? '0.0%' : `${x < 0 ? '−' : ''}${Math.abs(x * 100).toFixed(1)}%`;
const pc0 = x => Number.isFinite(x) ? `${Math.round(x * 100)}%` : '—';
const f2 = x => Number.isFinite(x) ? (x < 0 ? '−' : '') + Math.abs(x).toFixed(2) : '—';
export const wan = x => Number.isFinite(x) ? `${(x / 10000).toFixed(1)} 萬` : '—';
export const RULES = ['rule', 'x15', 'x2', 'trend_full'];
export const LAB = { rule: '照建議比例（現在的做法）', x15: '放 1.5 倍（最多 100%）', x2: '放兩倍（最多 100%）', trend_full: '有建議就放一半／全部（不看最近漲跌多劇烈）' };
const ANS = ['more_is_better', 'more_is_worse', 'same_per_risk', 'unclear'];
const VERD = ['better', 'worse', 'same', 'mixed'];
const S = (D, r, k = 'oos') => D?.rules?.[r]?.[k];
const X = (D, r, k = 'oos') => D?.rules?.[r]?.desc?.[k];

export function valid(D) {
  const v = D?.verdict;
  if (!D || D.is_only || !v?.rules || !ANS.includes(v.answer) || !RULES.slice(1).every(r => VERD.includes(v.rules[r]) && Number.isFinite(v.oos_p_worse?.[r]))) return false;
  return RULES.every(r => ['is_', 'oos'].every(k => ['sharpe', 'cagr', 'maxdd', 'end_per_1m'].every(x => Number.isFinite(S(D, r, k)?.[x]))
      && ['avg_in_coins', 'worst_7d', 'maxdd_nt'].every(x => Number.isFinite(X(D, r, k)?.[x]))))
    && D.now && ['BTC', 'ETH'].every(c => ['e', 'trend3', 'vol30', 'vol30_median'].every(x => Number.isFinite(D.now[c]?.[x])));
}

/** Plain conclusion (depends only on data + the pre-registered verdict). */
export function headLine(D) {
  const a = D.verdict.answer, r = S(D, 'rule'), x = S(D, 'x2'), ri = S(D, 'rule', 'is_'), xi = S(D, 'x2', 'is_');
  const more = x.end_per_1m > r.end_per_1m && xi.end_per_1m > ri.end_per_1m, deeper = x.maxdd < r.maxdd && xi.maxdd < ri.maxdd;
  const gain = more ? '賺得比較多' : '沒有賺得比較多', dd = deeper ? '但最慘的跌幅也深很多' : '最慘跌幅沒有比較深';
  const head = a === 'more_is_better' ? `<strong>過去放多一點比較划算</strong>（兩段都明顯變好；仍只是回測，不保證以後）。`
    : a === 'more_is_worse' ? `<strong>放兩倍${gain}，${dd}；換算成「每冒一分險賺多少」，2022–23 和 2024 年起都比照建議差</strong>（差距不大、不一定是真的）。`
    : a === 'same_per_risk' ? `<strong>放多一點，賺和賠都跟著變大</strong>：換算成「每冒一分險賺多少」差不多，沒有比較划算。`
    : `<strong>說不準</strong>：兩段結果不一致，沒有證明放多一點比較好。`;
  return `${head}2024 年起每 NT$100 萬（兩幣各半、含手續費）：照建議 → ${wan(r.end_per_1m)}（最慘跌幅 ${pc1(r.maxdd)}）；`
    + `放兩倍 → ${wan(x.end_per_1m)}（最慘跌幅 ${pc1(x.maxdd)}）。2022–23：${wan(ri.end_per_1m)}（${pc1(ri.maxdd)}）vs ${wan(xi.end_per_1m)}（${pc1(xi.maxdd)}）。`;
}

/** What "more" really buys: money in coins, worst week, worst drop in NT$. */
export function whyLine(D) {
  const r = X(D, 'rule'), x = X(D, 'x2'), t = S(D, 'trend_full'), ti = S(D, 'trend_full', 'is_'), ri = S(D, 'rule', 'is_'), rr = S(D, 'rule');
  return `<strong>放多一點不會讓建議變準，只是把結果放大</strong>：2024 年起平均放在幣裡的錢從約 ${pc0(r.avg_in_coins)} 變約 ${pc0(x.avg_in_coins)}；`
    + `最慘的一週從 ${pc1(r.worst_7d)} 變 ${pc1(x.worst_7d)}；每 100 萬最慘的時候從少 ${wan(-r.maxdd_nt)} 變少 ${wan(-x.maxdd_nt)}`
    + (Number.isFinite(x.cap_share) ? `（放兩倍時，有建議的日子裡 ${pc0(x.cap_share)} 碰到 100% 上限，所以不是剛好兩倍）。` : '。')
    + `「有建議就放一半／全部」等於不管最近漲跌多劇烈都照放：2024 年起 ${wan(t.end_per_1m)}（最慘 ${pc1(t.maxdd)}），2022–23 穩定度 ${f2(ti.sharpe)}，比照建議的 ${f2(ri.sharpe)} 低；`
    + `2024 年起 ${f2(t.sharpe)} vs ${f2(rr.sharpe)}。照建議的比例，就是在漲跌劇烈的時候先放少一點、平靜的時候放多一點，過去這樣跌得比較淺。`;
}

function table(D) {
  const row = r => { const o = S(D, r), i = S(D, r, 'is_'), x = X(D, r); return `<tr><th>${LAB[r]}</th><td>${wan(o.end_per_1m)}</td><td>${pc1(o.cagr)}</td><td>${pc1(o.maxdd)}</td><td>${pc1(x.worst_7d)}</td><td>${pc0(x.avg_in_coins)}</td><td>${f2(o.sharpe)}</td><td>${f2(i.sharpe)}</td></tr>`; };
  return `<div class="scroll"><table class="bt"><thead><tr><th>怎麼放</th><th>2024 起每 100 萬變成</th><th>年化</th><th>最慘跌幅</th><th>最慘一週</th><th>平均放在幣裡</th><th>穩定度（夏普）</th><th>2022–23 穩定度</th></tr></thead><tbody>
    ${RULES.map(row).join('')}</tbody></table></div>`;
}

export function coinNote(D) {
  const c = k => `${k}：照建議 ${pc1(D.rules.rule.coin[k].oos.maxdd)}、放兩倍 ${pc1(D.rules.x2.coin[k].oos.maxdd)}`;
  return `分開看（2024 年起單一個幣、只供對照）最慘跌幅 ${c('BTC')}；${c('ETH')}。`;
}

export function nowLine(D) {
  const n = D.now, on = ['BTC', 'ETH'].filter(c => n[c].e >= 0.005);
  const vol = ['BTC', 'ETH'].map(c => `${c} ${pc0(n[c].vol30)}（2018 年起一般 ${pc0(n[c].vol30_median)}）`).join('、');
  const head = on.length === 0 ? '現在：BTC、ETH 建議都是 0（空手），放幾倍都是 0，這張要等下次轉成加碼才用得到。'
    : `現在：${on.map(c => `${c} 建議 ${pc0(n[c].e)}（放兩倍就是 ${pc0(Math.min(1, 2 * n[c].e))}）`).join('、')}。`;
  return `${head}最近 30 天的漲跌劇烈程度（一年換算）：${vol}。首頁「放約多少」已經把這個算進去，`
    + '最近漲跌越劇烈，說的比例越少；之後如果漲跌變平靜，建議的比例會自己變多，不用自己加。';
}

export function you(D) {
  const r = S(D, 'rule'), x = S(D, 'x2');
  return `<strong>對你來說</strong>：① 要放多少，先問自己「最慘那次受不受得了」：2024 年起照建議最慘少 ${pc1(-r.maxdd).replace('−', '')}、放兩倍最慘少約 ${pc1(-x.maxdd).replace('−', '')}；`
    + '② 如果你本來就想多放一點，效果跟把「打算投入的錢」調高差不多——事先決定好再照比例做，不要在轉加碼那天看到在漲才臨時加碼；'
    + '③ 放兩倍、有建議就全部放，都沒有證明比較好；④ 過去的結果不保證未來。';
}

/** Advanced card. */
export function sizeUpCard(D) {
  const id = 'sizeup', h2 = '建議只放一點點，我可以放多一點嗎？';
  if (!valid(D)) return `<section class="card" id="${id}"><h2>${h2}</h2><p class="muted small">資料讀不到，稍後再試。</p></section>`;
  const p = D.verdict.oos_p_worse;
  return `<section class="card" id="${id}"><h2>${h2}</h2>
    <p class="small">轉成加碼時，首頁說的比例有時很小（例如只放一兩成），很容易想「這麼少，乾脆放兩倍，或是一有建議就放一半、全部」。這張用同一份過去的建議算：把每天建議的比例乘 1.5、乘 2（每個幣最多 100%），或是只看趨勢放 0／一半／全部，和照建議比例比。</p>
    <p><strong>結論</strong>：${headLine(D)}</p>
    <p class="small">${whyLine(D)}</p>
    ${table(D)}
    <p class="small">${coinNote(D)}</p>
    <p class="small">${nowLine(D)}</p>
    <p class="small">${you(D)}</p>
    <p class="small muted">算法：<code>backtest/size_up.py</code> → <code>data/sizeup.json</code>（冠軍 trend_vt@1 逐日重做的建議比例、凍結程式碼、每天只用當天以前的資料；Binance 已收完日K；${asofInline(D.as_of)}，${WEEKLY_NOTE}）。兩幣各半、每天照比例調整，買賣 0.15%、買進加台幣溢價 0.27%，沒投入的錢不計利息。「比較好／比較差」事先固定（commit 98dc7a4）：穩定度（夏普）多或少 ${D.sharpe_tol} 以上，2022–23 和 2024 年起兩段都一樣才下結論；正式答案只看「放兩倍」。2024 年起比照建議差的把握：放 1.5 倍 ${pc0(p.x15)}、放兩倍 ${pc0(p.x2)}、有建議就全部放 ${pc0(p.trend_full)}（每日報酬 28 天區塊重抽 ${D.boot.n} 次；50% 左右＝分不出來）。研究：Moreira、Muir 2017 與 Harvey 等人 2018 發現依波動調整部位常能少跌、提高穩定度；Cederburg 等人 2020 發現這個好處在樣本外不一定站得住。</p>
  </section>`;
}
