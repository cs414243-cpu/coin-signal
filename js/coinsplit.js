// v58: 要放加密幣的錢，BTC 和 ETH 怎麼分？ — pure functions (no DOM, no network).
// Every card, the virtual portfolio and the ledger assume BTC 50% / ETH 50%. backtest/coin_split.py → data/coinsplit.json:
// a fixed grid (BTC 0/25/50/75/100%, rest ETH) decided before the first run (commit f3ce44a), each part follows its own
// coin's recommendation (frozen champion walk-forward), money split once at the start, costs included, 2022–23 / 2024+
// checked separately. Background: DeMiguel, Garlappi & Uppal 2009 RFS 22(5) (1/N hard to beat out of sample);
// Liu, Tsyvinski & Wu 2022 JF 77(2) (coins move largely together). Not a signal; the recommendation is unchanged.
// Research only, not investment advice.
import { asofInline, WEEKLY_NOTE } from './fresh.js';
export const KEYS = ['0', '25', '50', '75', '100'];
const pc1 = x => Number.isFinite(x) ? `${x < 0 ? '−' : x > 0 ? '+' : ''}${Math.abs(x * 100).toFixed(1)}%` : '—';
const pc0 = x => Number.isFinite(x) ? `${x < 0 ? '−' : x > 0 ? '+' : ''}${Math.abs(Math.round(x * 100))}%` : '—';
const dd1 = x => Number.isFinite(x) ? `${x < 0 ? '−' : ''}${Math.abs(x * 100).toFixed(1)}%` : '—';
const sh2 = x => Number.isFinite(x) ? x.toFixed(2) : '—';
const pct0 = x => Number.isFinite(x) ? `${Math.round(x * 100)}%` : '—';
export const label = k => k === '0' ? '全部 ETH' : k === '100' ? '全部 BTC' : k === '50' ? '各一半' : `BTC ${k}%／ETH ${100 - Number(k)}%`;

export function valid(D) {
  const r = D?.rows; if (!r || D.is_only) return false;
  return KEYS.every(k => r[k]?.is_ && r[k]?.oos && Number.isFinite(r[k].is_.sharpe) && Number.isFinite(r[k].oos.sharpe) && (k === '50' || r[k].verdict));
}

/** key with the highest Sharpe in a period ('is_' | 'oos'). */
export const best = (D, p) => KEYS.reduce((a, k) => D.rows[k][p].sharpe > D.rows[a][p].sharpe ? k : a, KEYS[0]);
/** true when 各一半 has the shallowest worst drop in the period. */
export const baseShallowest = (D, p) => KEYS.every(k => D.rows['50'][p].maxdd >= D.rows[k][p].maxdd);

/** Plain conclusion sentence (depends only on the data's pre-registered verdicts). */
export function headLine(D) {
  const R = D.rows, alt = KEYS.filter(k => k !== '50');
  const better = alt.filter(k => R[k].verdict === 'better'), worse = alt.filter(k => R[k].verdict === 'worse');
  const bi = best(D, 'is_'), bo = best(D, 'oos'), flip = (Number(bi) - 50) * (Number(bo) - 50) < 0;   // BTC-heavier best in one period, ETH-heavier in the other
  const head = better.length ? `<strong>${better.map(label).join('、')}</strong> 在回測裡比各一半好（兩段都好、把握 95% 以上）`
    : `<strong>各一半就好，沒有證明別的分法比較好</strong>${worse.length ? `（${worse.map(label).join('、')} 兩段都比較差）` : ''}`;
  const per = `2022–23 年（拿來定標準的期間）最好的是 ${label(bi)}（報酬／波動比 ${sh2(R[bi].is_.sharpe)}，各一半 ${sh2(R['50'].is_.sharpe)}）；2024 年起（之後檢查）最好的是 ${label(bo)}（${sh2(R[bo].oos.sharpe)}，各一半 ${sh2(R['50'].oos.sharpe)}）`;
  const dd = baseShallowest(D, 'is_') && baseShallowest(D, 'oos') ? '。兩段期間裡，<strong>各一半的最慘跌幅都是最淺的</strong>（兩個幣不會每次一起跌一樣多）' : '';
  return `${head}：${per}${flip ? '——<strong>前後兩段哪個幣比較好是相反的</strong>，事先猜不到' : ''}${dd}。`;
}

/** What it means today (exposures now). */
export function nowLine(D) {
  const b = D.exposure_now?.BTC, e = D.exposure_now?.ETH;
  if (!Number.isFinite(b) || !Number.isFinite(e)) return '';
  const p = x => `${Math.round(x * 100)}%`;
  if (b < 0.005 && e < 0.005) return `現在（${D.as_of} 收盤）兩個幣的建議都是 0，所以不管怎麼分，現在都不放；等哪個幣的建議變成要放，就把分給那個幣的錢照它的比例放進去。`;
  return `現在（${D.as_of} 收盤）建議 BTC 放 ${p(b)}、ETH 放 ${p(e)}：例如分給 BTC 的錢是 NT$10 萬，就放 NT$${Math.round(b * 100000).toLocaleString('en-US')} 進 BTC，其餘先不放；ETH 同理。`;
}

function table(D) {
  const R = D.rows;
  const head = '<tr><th>一開始怎麼分</th><th>2024 起總報酬<div class="muted small">照建議</div></th><th>報酬／波動比<div class="muted small">2024 起（2022–23）</div></th><th>最慘跌幅<div class="muted small">2024 起（2022–23）</div></th><th>一直抱著<div class="muted small">2024 起總報酬／最慘</div></th><th>比各一半好的把握</th></tr>';
  const row = k => { const x = R[k], o = x.oos, i = x.is_;
    return `<tr${k === '50' ? ' class="hl"' : ''}><th>${label(k)}</th><td>${pc1(o.total)}</td><td>${sh2(o.sharpe)}（${sh2(i.sharpe)}）</td><td>${dd1(o.maxdd)}（${dd1(i.maxdd)}）</td><td>${pc0(o.hold_total)}／${dd1(o.hold_maxdd)}</td><td>${k === '50' ? '—' : pct0(x.oos_p_better)}</td></tr>`; };
  return `<div class="scroll"><table class="bt"><thead>${head}</thead><tbody>${KEYS.map(row).join('')}</tbody></table></div>`;
}

function yearTable(D) {
  const R = D.rows, ys = (R['50'].years || []).map(y => y.year);
  if (!ys.length) return '';
  const cell = (k, y) => { const v = (R[k].years || []).find(z => z.year === y); return v ? pc1(v.ret) : '—'; };
  const head = `<tr><th>照建議，每一年</th>${ys.map(y => `<th>${y}${(R['50'].years.find(z => z.year === y) || {}).partial ? '<div class="muted small">到目前</div>' : ''}</th>`).join('')}</tr>`;
  return `<div class="scroll"><table class="bt"><thead>${head}</thead><tbody>${KEYS.map(k => `<tr${k === '50' ? ' class="hl"' : ''}><th>${label(k)}</th>${ys.map(y => `<td>${cell(k, y)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

/** Advanced card 「要放加密幣的錢，BTC 和 ETH 怎麼分？」. */
export function coinSplitCard(D) {
  const id = 'coinsplit', h2 = '要放加密幣的錢，BTC 和 ETH 怎麼分？';
  if (!valid(D)) return `<section class="card" id="${id}"><h2>${h2}</h2><p class="muted small">資料讀不到，稍後再試。</p></section>`;
  return `<section class="card" id="${id}"><h2>${h2}</h2>
    <p class="small">這個 App 的建議、虛擬投資和其他卡片，都假設要放加密幣的錢 BTC、ETH 各一半。這裡比較一開始把錢分成 <strong>BTC 0／25／50／75／100%</strong>（其餘給 ETH），每一份照自己那個幣的建議做（每天只用當天以前的資料），含手續費；分法在第一次計算前就固定，不是事後挑的。</p>
    <p><strong>結論</strong>：${headLine(D)}</p>
    ${table(D)}
    <p class="small">每一年（2022 年初分好、之後不再調兩幣比例）：</p>
    ${yearTable(D)}
    <p class="small">${nowLine(D)}</p>
    <p class="small"><strong>對你來說</strong>：照各一半最簡單，也和這個 App 所有數字、虛擬投資一致；想多放 BTC 或多放 ETH 都可以，但過去紀錄沒有證明哪一種比較好。<strong>不要因為最近哪個幣漲得多就改比例</strong>——上表的兩段期間，好的那一邊剛好相反。這是過去紀錄，不保證未來。</p>
    <p class="small muted">算法：<code>backtest/coin_split.py</code> → <code>data/coinsplit.json</code>（冠軍 trend_vt@1 凍結 walk-forward，Binance 已收完日K，${asofInline(D.as_of)}，${WEEKLY_NOTE}）。每個分法在期間第一天分好錢、之後兩幣之間不搬錢；每次買賣 0.15%、買進再加台幣溢價 0.27%（和虛擬投組相同），沒放的錢不計利息。2022–23 與 2024 起各自從現金重新開始（所以各一半 2024 起的數字和從 2022 年一路算下來的 ${sh2(D.rows['50'].parity_oos_sharpe_continuous)} 略不同）。報酬／波動比＝年化 Sharpe；把握＝28 天區塊拔靴法 2,000 次（Holm 多重比較校正後 ${KEYS.filter(k => k !== '50').map(k => sh2(D.rows[k].holm_p)).join('／')}）。判斷標準事先固定：兩段都比各一半高 0.02 以上且把握 ≥ 95% 才算「比較好」，兩段都低 0.02 以上才算「比較差」，其他都是「差不多」。</p>
  </section>`;
}
