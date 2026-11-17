// v70: 用新台幣算，成績還一樣嗎？ — pure functions (no DOM, no network).
// backtest/twd_view.py → data/twdview.json: the frozen champion's walk-forward exposures and "一直抱著", each simulated
// twice with the same costs (forecast/engine.paper_sim): on Binance USDT closes (the app's usual convention, as if 1 USDT
// were always the same NT$) and on closes × MAX USDT/TWD (what 宗 actually sees in NT$). Definitions committed before the
// first run (0e2cf39), IS-only result before any 2024+ number (7a90686). Currency is a separate risk for a foreign-asset
// investor (Perold & Schulman 1988 FAJ 44(3):45–50; Campbell, Serfaty-de Medeiros & Viceira 2010 JF 65(1):87–121).
// Not a signal; the recommendation is unchanged. Research only, not investment advice.
import { asofInline, WEEKLY_NOTE } from './fresh.js';
const pc1 = x => !Number.isFinite(x) ? '—' : Math.abs(x) < 0.0005 ? '0.0%' : `${x < 0 ? '−' : ''}${Math.abs(x * 100).toFixed(1)}%`;
const f2 = x => Number.isFinite(x) ? (x < 0 ? '−' : '') + Math.abs(x).toFixed(2) : '—';
const ymd = s => typeof s === 'string' ? s.replaceAll('-', '/') : '—';
export const P = (D, s, v, k = 'oos') => D?.results?.[s]?.[v]?.pooled?.[k];
const PER = { is_: '2022–23 年', oos: '2024 年起' };

export function valid(D) {
  const v = D?.verdict;
  if (!D || D.is_only || !v?.periods || !['same', 'differs'].includes(v.overall) || !['both', 'one', 'none'].includes(v.rank)) return false;
  const ok = ['champ', 'hold'].every(s => ['usd', 'twd'].every(c => ['is_', 'oos'].every(k => ['sharpe', 'cagr', 'maxdd'].every(m => Number.isFinite(P(D, s, c, k)?.[m])))));
  return ok && ['is_', 'oos'].every(k => Number.isFinite(D.fx_path?.[k]?.u0) && Number.isFinite(D.fx_path?.[k]?.u1))
    && Number.isFinite(D.u_last?.u) && D.now_expo && ['BTC', 'ETH'].every(c => Number.isFinite(D.now_expo[c]));
}

const pair = (D, s, v, k) => `年化 ${pc1(P(D, s, v, k).cagr)}、最慘跌幅 ${pc1(P(D, s, v, k).maxdd)}`;

/** Word for one period of the pre-registered verdict ('same' / better / worse in NT$). */
export function word(D, k) {
  if (D.verdict.periods[k] === 'same') return '差不多';
  return P(D, 'champ', 'twd', k).sharpe > P(D, 'champ', 'usd', k).sharpe ? '台幣算比較好' : '台幣算比較差';
}

/** Plain conclusion (depends only on data + the pre-registered verdict). */
export function headLine(D) {
  const seg = k => `${PER[k]}台幣算 ${pair(D, 'champ', 'twd', k)}（美元算 ${pair(D, 'champ', 'usd', k)}），${word(D, k)}`;
  const head = D.verdict.overall === 'same' ? '<strong>差不多</strong>：兩段換成台幣算都沒有明顯不同。'
    : `<strong>${['oos', 'is_'].filter(k => D.verdict.periods[k] === 'differs').map(k => `${PER[k]}有差，${word(D, k)}`).join('；')}</strong>。`;
  return `${head}照建議做（兩幣各半、含手續費）：${seg('oos')}；${seg('is_')}。`;
}

export function rankLine(D) {
  const k = D.verdict.rank;
  const h = k === 'both' ? '用台幣算，兩段都還是<strong>贏一直抱著</strong>（穩定度較高、最慘跌幅較淺）' : k === 'one' ? '用台幣算，只有一段贏一直抱著' : '用台幣算，兩段都沒有贏一直抱著';
  return `${h}：一直抱著台幣算 2024 年起${pair(D, 'hold', 'twd', 'oos')}，2022–23 年${pair(D, 'hold', 'twd', 'is_')}。`;
}

export function whyLine(D) {
  const o = D.fx_path.oos, i = D.fx_path.is_, sw = D.twd_rise_91d;
  const dir = x => x >= 0 ? `台幣貶 ${pc1(x)}` : `台幣升 ${pc1(-x)}`;
  let t = `差別全部來自匯率（MAX 早上 8 點 1 USDT 換多少台幣）：2024 年初 ${o.u0.toFixed(2)} → ${ymd(o.end)} ${o.u1.toFixed(2)}（${dir(o.chg)}）；2022 年初 ${i.u0.toFixed(2)} → 2023 年底 ${i.u1.toFixed(2)}（${dir(i.chg)}）。台幣貶值時，手上的幣換回台幣比較多。`;
  if (sw && Number.isFinite(sw.chg) && sw.chg < 0) t += `這是匯率運氣，不是方法的本事；台幣升值時會反過來，例如 ${ymd(sw.start)} ${sw.u0.toFixed(2)} → ${ymd(sw.end)} ${sw.u1.toFixed(2)}（3 個月台幣升 ${pc1(-sw.chg)}）。`;
  return t;
}

function table(D) {
  const rows = [['champ', 'usd', '照建議・美元'], ['champ', 'twd', '照建議・台幣'], ['hold', 'usd', '抱著・美元'], ['hold', 'twd', '抱著・台幣']];
  const row = ([s, v, l]) => { const o = P(D, s, v), i = P(D, s, v, 'is_'); return `<tr><th class="nw">${l}</th><td>${pc1(o.cagr)}</td><td>${pc1(o.maxdd)}</td><td>${f2(o.sharpe)}</td><td>${pc1(i.cagr)}／${pc1(i.maxdd)}</td></tr>`; };
  return `<div class="scroll"><table class="bt"><thead><tr><th>做法</th><th>2024 起年化</th><th>最慘跌幅</th><th>穩定度（夏普）</th><th>2022–23 年化／最慘</th></tr></thead><tbody>${rows.map(row).join('')}</tbody></table></div>`;
}

export function nowLine(D) {
  const zero = ['BTC', 'ETH'].filter(c => D.now_expo[c] < 0.005);
  const u = `最新 1 USDT ≈ ${D.u_last.u.toFixed(2)} 台幣（MAX，${ymd(D.u_last.date)}）。`;
  if (zero.length === 2) return `現在 BTC、ETH 建議都是 0：空手的錢如果放台幣，匯率怎麼動都不影響你；放在 USDT 就會跟著匯率動（見「留 USDT 還是換台幣」）。${u}`;
  return `現在手上有幣的部分（${['BTC', 'ETH'].map(c => `${c} ${Math.round(D.now_expo[c] * 100)}%`).join('、')}）台幣價值會跟著匯率動。${u}`;
}

export function you(D) {
  const same = D.verdict.overall === 'same';
  return `${same ? 'App 其他卡的成績用台幣看也大致適用' : 'App 其他卡的成績是美元算的，實際台幣結果會多一層匯率起伏'}；匯率不是這套方法能預測的，不要因為「最近台幣算比較好」就多放。過去的結果不保證未來。`;
}

/** Advanced card. */
export function twdViewCard(D) {
  const id = 'twdview', h2 = '用新台幣算，成績還一樣嗎？';
  if (!valid(D)) return `<section class="card" id="${id}"><h2>${h2}</h2><p class="muted small">資料讀不到，稍後再試。</p></section>`;
  return `<section class="card" id="${id}"><h2>${h2}</h2>
    <p class="small">App 的成績都用 USDT（美元）價格算，等於假設 1 美元永遠換一樣多台幣。你是用台幣買賣：手上有幣時，台幣價值還會跟著匯率動；空手放台幣時就不受匯率影響。這張卡把同一份過去的建議、同樣的手續費，改用 MAX 每天早上 8 點的 USDT／台幣價格換成台幣再算一次。</p>
    <p><strong>結論</strong>：${headLine(D)}</p>
    <p class="small">${rankLine(D)}</p>
    ${table(D)}
    <p class="small muted">表裡「美元」＝App 平常的算法，「台幣」＝換成台幣再算。</p>
    <p class="small">${whyLine(D)}</p>
    <p class="small">${nowLine(D)}</p>
    <p class="small"><strong>對你來說</strong>：${you(D)}</p>
    <p class="small muted">算法：<code>backtest/twd_view.py</code> → <code>data/twdview.json</code>（冠軍 trend_vt@1 逐日重做的建議比例、凍結程式碼、每天只用當天以前的資料；Binance 已收完日K；MAX USDT/TWD 日K，離 Yahoo 匯率超過 3% 的 ${D.bad_ticks} 天用前一天；${asofInline(D.as_of)}，${WEEKLY_NOTE}）。台幣算＝幣價 × 當天 MAX 匯率；買賣 0.15%、買進加溢價 0.27%（MAX 匯率已含溢價，等於多扣，偏保守），沒投入的錢放台幣、不計利息。「差不多」事先固定（commit 0e2cf39）：穩定度差不到 ${D.sharpe_tol}、最慘跌幅差不到 ${Math.round(D.dd_tol * 100)} 個百分點。</p>
  </section>`;
}
