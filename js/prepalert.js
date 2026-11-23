// v97: 建議快要轉成買進：要不要先把台幣轉進 MAX？ — pure functions (no DOM, no network).
// backtest/prep_alert.py → data/prepalert.json. v90 showed that keeping NT$ in the bank and moving it only when the
// advice goes up is fine if it arrives the same day, but the DAILY TRANSFER LIMIT (MAX new accounts / bank non-designated
// transfers: NT$100k a day) is what hurts. This card tests moving the NT$ for a coin to MAX on the day the home card's
// 「什麼時候會變」 distance (next-close flip up) is D or less. Definitions committed before the first run (9efe3fb), IS-only
// results (2022–23) committed before any 2024+ number; D (3%) was picked on 2022–23 only. Not a signal; the recommendation
// is unchanged. Research only, not investment advice.
import { asofInline, WEEKLY_NOTE } from './fresh.js';
const pc1 = x => !Number.isFinite(x) ? '—' : Math.abs(x) < 0.0005 ? '0.0%' : `${x < 0 ? '−' : ''}${Math.abs(x * 100).toFixed(1)}%`;
const pc0 = x => Number.isFinite(x) ? `${Math.round(x * 100)}%` : '—';
const f2 = x => Number.isFinite(x) ? (x < 0 ? '−' : '') + Math.abs(x).toFixed(2) : '—';
const f3 = x => Number.isFinite(x) ? x.toFixed(3) : '—';
const sgn = x => `${x > 0 ? '+' : '−'}${Math.abs(x * 100).toFixed(1)}%`;
export const wan = x => Number.isFinite(x) ? `${(x / 10000).toFixed(1)} 萬` : '—';
const ANS = ['prep_helps', 'prep_small', 'no_help'];
export const dKey = D => `alert${String(Math.round(D.dstar * 100)).padStart(2, '0')}`;
export const R = (D, k, p = 'oos') => D?.results?.[k]?.[p];

export function valid(D) {
  if (!D || D.is_only || !ANS.includes(D?.verdict?.answer) || !Number.isFinite(D.dstar) || !D.ds?.includes(D.dstar)) return false;
  const keys = ['ready', ...['none', '10', '05'].flatMap(c => [`base_${c}`, `${dKey(D)}_${c}`])];
  return keys.every(k => ['is_', 'oos'].every(p => ['sharpe', 'maxdd', 'end_per_1m'].every(f => Number.isFinite(R(D, k, p)?.[f]))))
    && ['none', '10', '05'].every(c => Number.isFinite(D.results[`${dKey(D)}_${c}`].oos_p_worse_vs_base))
    && Number.isFinite(D.descriptives?.oos?.announced_share) && Number.isFinite(D.descriptives?.oos?.followed_share) && D.now && ['BTC', 'ETH'].every(c => D.now[c]);
}

/** true when the next-close flip on the home card is UPWARD (price must rise past an average) and ≤ D*. */
export function isNear(state, D) {
  const n = state?.near;
  return !!(n && !n.above && Number.isFinite(n.dist) && n.dist <= D.dstar + 1e-12);   // dist can be ≤ 0: the average fell past the close, a flat close already flips it
}

/** Short clause appended to the home 「什麼時候會變」 sentence (or the yellow near-flip box); '' when not near / not helpful. */
export function homeClause(state, D) {
  try { if (!valid(D) || D.verdict.answer === 'no_help' || !isNear(state, D)) return ''; } catch { return ''; }
  return `差不到 ${pc0(D.dstar)}：台幣如果放在銀行，今天先轉進 MAX（見進階「快要買進，先轉台幣」）。`;
}

const end = (D, k) => wan(R(D, k).end_per_1m);
export function headLine(D) {
  const a = D.verdict.answer, k = dKey(D), d = pc0(D.dstar);
  const head = a === 'prep_helps' ? `<strong>有用：首頁寫「差不到 ${d}」那天就先把台幣轉進 MAX，過去把「錢放銀行」少賺的那段大多補回來</strong>，尤其是每天只能轉 10 萬的時候。`
    : a === 'prep_small' ? `<strong>有一點用，但還說不準</strong>：「差不到 ${d}」就先轉，過去數字比較好，但差距可能只是運氣。`
    : `<strong>沒有用</strong>：「差不到 ${d}」就先轉，過去沒有比建議變了才轉好。`;
  return `${head}2024 年起每 NT$100 萬（兩幣各半、含手續費和活儲利息）：每天最多轉 10 萬、放 200 萬時，建議變了才轉 → ${end(D, 'base_05')}；差不到 ${d} 就先轉 → <strong>${end(D, `${k}_05`)}</strong>`
    + `（放 100 萬：${end(D, 'base_10')} → ${end(D, `${k}_10`)}；轉帳不限額：${end(D, 'base_none')} → ${end(D, `${k}_none`)}；台幣一直放 MAX：${end(D, 'ready')}）。`;
}

const LBL = { ready: '一直放 MAX（＝虛擬投資）', base: '變了才轉', alert: d => `差不到 ${d} 就先轉` };
const CAPL = { none: '轉帳不限額', '10': '每天最多轉 10 萬（放 100 萬）', '05': '每天最多轉 10 萬（放 200 萬）' };
function table(D) {
  const k = dKey(D), d = pc0(D.dstar);
  const row = (key, label) => {
    const o = R(D, key), i = R(D, key, 'is_'), pw = D.results[key].oos_p_worse_vs_base;
    return `<tr><th>${label}</th><td>${end(D, key)}</td><td>${pc1(o.maxdd)}</td><td>${f2(o.sharpe)}</td><td>${wan(i.end_per_1m)}</td><td>${Number.isFinite(pw) ? pc0(pw) : '—'}</td></tr>`;
  };
  const rows = [row('ready', LBL.ready)];
  for (const c of ['none', '10', '05']) rows.push(`<tr><th colspan="6" class="muted">台幣放銀行・${CAPL[c]}</th></tr>`, row(`base_${c}`, LBL.base), row(`${k}_${c}`, LBL.alert(d)));
  return `<div class="scroll"><table class="bt"><thead><tr><th>做法</th><th>2024 起每 100 萬變成</th><th>最慘跌幅</th><th>穩定度（夏普）</th><th>2022–23 每 100 萬變成</th><th>比「建議變了才轉」差的把握</th></tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
}

export function howOften(D) {
  const o = D.descriptives.oos, d = pc0(D.dstar), k = dKey(D);
  const yrs = (D.years?.is_ || 0) + (D.years?.oos || 0);
  const idle = yrs > 0 ? D.idle_days?.[`${k}_none`] / 2 / yrs : NaN;
  return `<strong>多常出現、多常是虛驚</strong>：2024 年起每個幣一年約 ${Math.round(o.alert_episodes_per_year_per_coin)} 次變成「差不到 ${d}」（大約兩週多一次），之後 7 天內真的轉成買進的占 ${pc0(o.followed_share)}，其他是虛驚。`
    + `要買的日子有 ${pc0(o.announced_share)} 前一天就出現「差不到 ${d}」；其他多半是錢本來就在 MAX（剛賣出還沒轉回、或前幾天的提醒）或一天就漲過去。`
    + (Number.isFinite(idle) ? `虛驚時錢先放在 MAX 沒有利息，過去平均每個幣一年約 ${Math.round(idle)} 天這樣空等；少拿的利息已經算進上表。` : '');
}

export function nowLine(D, states) {
  const d = pc0(D.dstar);
  const parts = ['BTC', 'ETH'].map(c => {
    const s = states?.[c];
    if (s?.near && Number.isFinite(s.near.dist)) return s.near.above ? `${c} 下一個變化是往下（不用先轉）` : `${c} 還要 ${sgn(s.near.dist)}${isNear(s, D) ? '（<strong>已經差不到 ' + d + '</strong>）' : ''}`;
    const n = D.now[c]; return n.upward ? `${c} 還要 ${sgn(n.dist)}（${D.as_of} 收盤算）` : `${c} 下一個變化是往下`;
  });
  const any = ['BTC', 'ETH'].some(c => states?.[c] ? isNear(states[c], D) : D.now[c].alert);
  return `現在：${parts.join('；')}。${any ? '台幣放在銀行的話，<strong>今天就先把那個幣打算放的錢轉進 MAX</strong>。' : `都還沒到 ${d}，不用先轉；等首頁那句「差不到 ${d}」出現再轉。`}`;
}

export function you(D) {
  const d = pc0(D.dstar), k = dKey(D);
  const isW = R(D, `${k}_none`, 'is_').sharpe < R(D, 'base_none', 'is_').sharpe, ooW = R(D, `${k}_none`).sharpe < R(D, 'base_none').sharpe;
  const free = isW !== ooW ? '差別很小，而且兩段不一致（2024 起先轉比較好、2022–23 反而略差），可以不必特別先轉' : isW ? '先轉反而略差，不必特別先轉' : '差別比較小，但先轉兩段都沒有變差';
  return `<strong>對你來說</strong>：① 台幣放在銀行的話，看首頁「什麼時候會變」：要再漲的幅度<strong>不到 ${d}</strong> 時，首頁和 iPhone 行事曆那一則會多一句「差不到 ${d}」，那天就把那個幣打算放的台幣轉進 MAX；`
    + `② 已經把 MAX 入金帳號設成約定轉入、也不是新戶上限的話（上表「轉帳不限額」），${free}；`
    + '③ 虛驚時錢先留在 MAX，連續 7 天都沒有再出現、建議也還是 0，再轉回銀行（出金費沒算）；錢放在交易所有風險，見「幣放哪裡」；'
    + '④ 這不改建議本身：真的要買還是等早上 8 點收盤、建議變了才買。過去的結果不保證未來。';
}

/** Advanced card (states = phone's nextmove states per coin, optional). */
export function prepAlertCard(D, states = null) {
  const id = 'prepalert', h2 = '建議快要轉成買進：要不要先把台幣轉進 MAX？';
  if (!valid(D)) return `<section class="card" id="${id}"><h2>${h2}</h2><p class="muted small">資料讀不到，稍後再試。</p></section>`;
  const k = dKey(D), d = pc0(D.dstar);
  const better = R(D, `${k}_none`).sharpe > R(D, 'ready').sharpe ? `「差不到 ${d} 就先轉」看起來比一直放 MAX 還多一點，是多拿了活儲利息加上運氣，沒有證明比較好。` : '';
  return `<section class="card" id="${id}"><h2>${h2}</h2>
    <p class="small">接「錢放銀行來得及嗎」：錢放銀行、建議變了才轉，問題出在<strong>每天能轉的上限</strong>（MAX 新戶、轉到非約定帳戶都是每天 10 萬）。首頁「什麼時候會變」每天都寫還要漲多少 %。這張用同一份過去的建議測：那個 % 一變成 ${d} 以內，就先把那個幣打算放的台幣轉進 MAX，會不會比較好。</p>
    <p><strong>結論</strong>：${headLine(D)}</p>
    ${table(D)}
    <p class="small">${howOften(D)}</p>
    <p class="small">${better}「${d}」是只用 2022–23 年從 3%、5%、10% 裡挑的（2022–23 三種上限平均穩定度：3% ${f3(D.is_sharpe_avg['03'])}、5% ${f3(D.is_sharpe_avg['05'])}、10% ${f3(D.is_sharpe_avg['10'])}），2024 年起的數字是挑完之後才算的。</p>
    <p class="small">${nowLine(D, states)}</p>
    <p class="small">${you(D)}</p>
    <p class="small muted">算法：<code>backtest/prep_alert.py</code> → <code>data/prepalert.json</code>（冠軍 trend_vt@1 逐日重做的建議比例、凍結程式碼、每天只用當天以前的資料；Binance 已收完日K；${asofInline(D.as_of)}，${WEEKLY_NOTE}）。「差不到 ${d}」＝首頁「什麼時候會變」那條線是往上（要漲過平均價），而且離上次收盤 ≤ ${d}；當天轉、隔天早上 8 點前到；每天最多轉總額的 10%／5%（兩幣按需要分）。賣出都準時（幣在 MAX，賣完的錢先留 MAX，沒買沒提醒滿 7 天才轉回銀行）。買賣 0.15%、買進加台幣溢價 0.27%；銀行的錢照臺灣銀行活儲機動利率按日計、不扣稅；轉帳費、出金費、國定假日沒算。「差的把握」＝2024 年起 28 天區塊重抽 2,000 次，穩定度比「建議變了才轉」低的比例。定義在第一次執行前就 commit（9efe3fb），2022–23 的結果在看 2024 年後的數字之前先 commit。這不是新訊號，不改建議。</p>
  </section>`;
}
