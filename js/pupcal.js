// v51: 說「X% 會漲」，實際準不準？ — reliability (calibration) table of the champion's weekly up-probability.
// Pure functions (no DOM, no network). Backtest numbers: backtest/pup_reliability.py → data/pupcal.json (frozen trend_vt@1
// recomputed for every day, each day uses only outcomes already known; Brier vs always-50%; Newey–West DM).
// Live part: the public ledger rows the phone already reads for v42 (AN.answerKey rows: p_up, up, status), few samples.
// Research only, not investment advice.
import { asofInline, WEEKLY_NOTE } from './fresh.js';
export const LABELS = ['lt45', '45to50', '50to55', 'ge55'];
export const EDGES = [0, 0.45, 0.5, 0.55, Infinity];
export const BUCKET_ZH = { lt45: '不到 45%', '45to50': '45%～50%', '50to55': '50%～55%', ge55: '55% 以上' };
const pc0 = x => Number.isFinite(x) ? `${Math.round(x * 100)}%` : '—';
const pc1 = x => Number.isFinite(x) ? `${(x * 100).toFixed(1)}%` : '—';
const f4 = x => Number.isFinite(x) ? x.toFixed(4) : '—';
/** 'YYYY-MM-DD' (+ days) → 'M/D' */
const md = (d, plus = 0) => { const t = new Date(Date.parse(d + 'T00:00:00Z') + plus * 86400000); return `${t.getUTCMonth() + 1}/${t.getUTCDate()}`; };
const pv = x => !Number.isFinite(x) ? '—' : x < 0.001 ? '< 0.001' : x.toFixed(x < 0.01 ? 3 : 2);

export function bucketOf(p) {
  if (!Number.isFinite(p)) return null;
  for (let i = 0; i < LABELS.length; i++) if (p >= EDGES[i] && p < EDGES[i + 1]) return LABELS[i];
  return null;
}

/** Plain verdict for one block: worse / no better / better than always-50%. */
export function verdict(B) {
  if (!B || !Number.isFinite(B.brier)) return '';
  const sig = Number.isFinite(B.dm_p) && B.dm_p < 0.05;
  if (B.brier > 0.25) return sig ? '比每次都猜 50% 還差（差距不是運氣）' : '沒有比每次都猜 50% 準（略差，差距可能只是運氣）';
  return sig ? '比每次都猜 50% 準' : '跟每次都猜 50% 差不多（略好，但可能只是運氣，還沒證明）';
}

/** Live ledger rows (AN.answerKey output) → per-coin + pooled bucket counts of the scored ones. */
export function liveBuckets(rows) {
  const R = Array.isArray(rows) ? rows : [];
  const scored = R.filter(r => r.status && r.status !== 'pending' && typeof r.up === 'boolean' && Number.isFinite(r.p_up));
  const pending = R.filter(r => r.status === 'pending');
  const mk = () => Object.fromEntries(LABELS.map(k => [k, { n: 0, up: 0 }]));
  const out = { n: scored.length, pending: pending.length, next: pending.map(r => r.target).filter(Boolean).sort()[0] || null, coins: { BTC: mk(), ETH: mk(), all: mk() }, brier: null, hit: null };
  let sb = 0, sh = 0;
  for (const r of scored) {
    const k = bucketOf(r.p_up); if (!k) continue;
    for (const c of [r.coin, 'all']) { if (!out.coins[c]) continue; out.coins[c][k].n++; if (r.up) out.coins[c][k].up++; }
    sb += (r.p_up - (r.up ? 1 : 0)) ** 2; sh += ((r.p_up > 0.5) === r.up) ? 1 : 0;
  }
  if (scored.length) { out.brier = sb / scored.length; out.hit = sh / scored.length; }
  return out;
}

/** One plain line inside 「看 X 的細節」 (2024 起 = period the model never saw). '' when the file is missing. */
export function detailLine(c, PC) {
  const O = PC?.coins?.[c]?.periods?.oos; if (!O?.buckets) return '';
  const hi = O.buckets.ge55, lo = O.buckets['45to50'];
  if (!hi?.n || !lo?.n) return '';
  return `為什麼說「一半一半」：2024 年起，模型說 ${c} 有 55% 以上會漲的那些週，實際漲的占 ${pc0(hi.up)}；說 45%～50% 的週，實際漲的占 ${pc0(lo.up)}。`
    + `說高說低結果差不多，整體${verdict(O)}，所以不拿它猜漲跌（進階「說 X% 會漲，準不準」）。`;
}

function bucketRows(C) {
  const O = C?.periods?.oos?.buckets || {}, A = C?.periods?.all?.buckets || {};
  return LABELS.map(k => {
    const o = O[k] || { n: 0 }, a = A[k] || { n: 0 };
    if (!o.n && !a.n) return '';
    const oc = o.n ? `<td><strong>${pc0(o.up)}</strong><div class="muted small">合理範圍 ${pc0(o.lo)}～${pc0(o.hi)}</div></td><td>${o.n}</td>` : '<td colspan="2" class="muted">這段沒說過</td>';
    const ac = a.n ? `<td>${pc0(a.up)}<div class="muted small">平均說 ${pc0(a.mean_p)}</div></td><td>${a.n}</td>` : '<td colspan="2">—</td>';
    return `<tr><th>${BUCKET_ZH[k]}${o.n ? `<div class="muted small">平均說 ${pc0(o.mean_p)}</div>` : ''}</th>${oc}${ac}</tr>`;
  }).join('');
}
function table(title, C) {
  return `<h3>${title}</h3><div class="scroll"><table class="bt"><thead><tr><th>模型說會漲的機率</th><th>2024 年起<br>實際漲的比例</th><th>天數</th><th>2018 年起全部<br>實際漲的比例</th><th>天數</th></tr></thead><tbody>${bucketRows(C)}</tbody></table></div>`;
}
function scoreRows(PC) {
  const P = [['early', '2018–21（資料還少）'], ['is', '2022–23'], ['oos', '2024 年起（沒看過）']];
  const rows = [];
  for (const [c, lab] of [['BTC', 'BTC'], ['ETH', 'ETH'], ['pooled', '合計']]) {
    const S = c === 'pooled' ? PC.pooled : PC.coins[c]?.periods;
    for (const [p, pl] of P) {
      const B = S?.[p]; if (!B) continue;
      rows.push(`<tr><th>${lab}・${pl}</th><td>${f4(B.brier)}</td><td>${pc1(B.hit)}<div class="muted small">每次猜漲 ${pc1(B.hit_up)}</div></td><td>${pv(B.dm_p)}</td><td class="small">${verdict(B)}</td></tr>`);
    }
  }
  return `<div class="scroll"><table class="bt"><thead><tr><th>期間</th><th>準確度分數<div class="muted small">越低越準；猜 50% ＝ 0.2500</div></th><th>方向猜對</th><th>是不是運氣<div class="muted small">p 值，&lt; 0.05 才算數</div></th><th>白話</th></tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
}
function liveBlock(LB) {
  if (!LB) return '<p class="small muted">實盤帳本這次讀不到（不影響上面的回測）。</p>';
  if (!LB.n) return `<p class="small"><strong>實盤帳本（真的每天記下來的預測）</strong>：還沒有可以對答案的——每天早上記下的預測要等 7 天才知道漲跌${LB.next ? `，第一批要等 ${md(LB.next)} 那天收盤（台北 ${md(LB.next, 1)} 早上 8 點），之後每天早上的更新會自動加進來` : ''}；目前 ${LB.pending} 筆在等。</p>`;
  const r = LABELS.filter(k => LB.coins.all[k].n).map(k => `${BUCKET_ZH[k]}：${LB.coins.all[k].n} 筆、實際漲 ${LB.coins.all[k].up} 筆`).join('；');
  return `<p class="small"><strong>實盤帳本（真的每天記下來的預測）</strong>：已經對答案 ${LB.n} 筆（BTC＋ETH），${r}；準確度分數 ${f4(LB.brier)}（猜 50% ＝ 0.2500）、方向猜對 ${pc0(LB.hit)}。<strong>筆數很少，只能看看、不能下結論</strong>（同一週的預測會連在一起，幾十筆其實只有幾週）。${LB.pending ? `另有 ${LB.pending} 筆在等。` : ''}</p>`;
}

/** Advanced card 「說 X% 會漲，準不準」. `LB` = liveBuckets(ANS) or null. */
export function pupCalCard(PC, LB, LIVE) {
  const id = 'pupcal', h2 = '說「X% 會漲」，實際準不準？';
  if (!PC?.coins?.BTC || !PC?.coins?.ETH || !PC?.pooled) return `<section class="card" id="${id}"><h2>${h2}</h2><p class="muted small">資料讀不到，稍後再試。</p></section>`;
  const O = PC.pooled.oos, hi = O?.buckets?.ge55, lo = O?.buckets?.['45to50'];
  const cur = c => { const L = LIVE?.coins?.[c]?.p_up; return Number.isFinite(L) ? L : PC.coins[c].current?.p_up; };
  const curLine = ['BTC', 'ETH'].map(c => { const p = cur(c), k = bucketOf(p), b = PC.coins[c].periods?.oos?.buckets?.[k]; return `${c} ${pc0(p)}${b?.n ? `（2024 年起它說 ${BUCKET_ZH[k]} 的週，實際漲 ${pc0(b.up)}）` : ''}`; }).join('、');
  const rng = ['is', 'oos'].flatMap(p => ['BTC', 'ETH'].map(c => PC.coins[c].periods?.[p])).filter(Boolean);
  const pmin = Math.min(...rng.map(b => b.p_min)), pmax = Math.max(...rng.map(b => b.p_max));
  const par = Math.max(...['BTC', 'ETH'].map(c => PC.coins[c].parity?.max_abs_diff ?? Infinity));
  const needWeeks = Math.ceil((1.96 * 0.5 / 0.05) ** 2);
  return `<section class="card" id="${id}"><h2>${h2}</h2>
    <p class="small">模型每天都會算一個「一週後會漲」的機率（現在 ${curLine}）。首頁只寫「約一半一半」，這裡讓你自己檢查：把過去每一天說過的機率分組，看那些週<strong>實際</strong>漲的比例。說得準的話，說 55% 的那組應該差不多有 55% 的週真的漲。</p>
    <p><strong>結論</strong>：2024 年起（模型設定時沒看過的期間，BTC＋ETH 合計 ${O?.n ?? '—'} 天），說「55% 以上」的週（平均說 ${pc0(hi?.mean_p)}）實際漲 ${pc0(hi?.up)}，說「45%～50%」的週（平均說 ${pc0(lo?.mean_p)}）實際漲 ${pc0(lo?.up)}——<strong>說高說低沒有差別</strong>。準確度分數 ${f4(O?.brier)}，每次都猜 50% 是 0.2500 → ${verdict(O)}。方向猜對 ${pc1(O?.hit)}，跟丟銅板一樣。<strong>這個機率沒有證明有用，請當作一半一半。</strong></p>
    ${table('BTC', PC.coins.BTC)}${table('ETH', PC.coins.ETH)}
    <h3>跟「每次都猜 50%」比</h3>${scoreRows(PC)}
    ${liveBlock(LB)}
    <p class="small"><strong>重點</strong>：① 2018–21 年資料還少時，模型會說出 0%、100% 這種極端數字，結果明顯比猜 50% 差；2022 年後數字都在 ${pc0(pmin)}～${pc0(pmax)} 之間，仍然沒有比較準。② 這<strong>不影響建議放多少</strong>：建議比例看的是價格在不在平均價之上和最近波動，回測的用處是大跌時少虧，不是猜中下週漲跌。③ 要分辨「真的 55%」和「其實 50%」，大約要 ${needWeeks} 個不重疊的週（約 ${(needWeeks / 52).toFixed(1)} 年）；8 週的實盤紀錄看不出機率準不準，所以「合理範圍」都很寬。</p>
    <p class="small muted">算法：<code>backtest/pup_reliability.py</code> → <code>data/pupcal.json</code>（Binance 已收完日K，${asofInline(PC.as_of)}，${WEEKLY_NOTE}；分組與檢定事先固定在程式說明）。每一天用凍結的冠軍模型重算當天的機率（只用 7 天前已知結果的日子，和每天正式預測同一個程式，2022 年起與正式 walk-forward 紀錄${par < 1e-6 ? '相差不到 0.000001' : `最多差 ${Number.isFinite(par) ? par.toFixed(6) : '—'}`}）；「漲」＝7 天後收盤高於當天收盤。準確度分數＝Brier 分數（(機率−結果)² 的平均）；「是不是運氣」＝Diebold–Mariano 檢定（考慮相鄰 7 天重疊）。合理範圍＝95% Wilson 區間，天數除以 7 當作獨立樣本。實盤部分直接讀公開帳本（每天 08:20 更新）。這是過去紀錄，不是預測，也不是買賣建議。</p>
  </section>`;
}
