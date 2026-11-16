// v53: 每週檢討：這週有沒有換預測方法？ — pure functions (no DOM, no network).
// Renders the weekly review's OWN output (forecast/review_weekly.py → reports/review-YYYY-MM-DD.md, parsed without
// recomputing by forecast/review_export.py → data/review.json, plus ledger promote/retire events and the registry).
// Nothing here decides anything: it only says in plain words what the latest review concluded, why each challenger did not
// (or did) replace the method behind the homepage recommendation, and when the pre-registered 8-week rule first allows a change.
// Research only, not investment advice.
import { reviewLag } from './scoretalk.js';   // v64
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const DAY = 86400000;
const WD = ['日', '一', '二', '三', '四', '五', '六'];
/** 'YYYY-MM-DD' → 'M/D（週X）' */
export const mdw = s => { const d = new Date(s + 'T00:00:00Z'); return `${d.getUTCMonth() + 1}/${d.getUTCDate()}（週${WD[d.getUTCDay()]}）`; };
/** candle date D closes at D+1 08:00 Taipei → "M/D" of that morning */
const closeMD = s => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + 1); return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`; };
/** Taipei calendar date of `now` (ms) */
export const tpeDate = now => new Date(now + 8 * 3600000).toISOString().slice(0, 10);

export const CHECK_ZH = {
  live_8_weeks: '實際紀錄滿 8 週',
  live_brier_better: '實際預測明顯比現在用的準',
  live_sharpe_better: '實際虛擬投資的「賺賠比」明顯比現在用的好',
  live_dd: '實際虛擬投資最大虧損沒有多 5 個百分點以上',
  wf_not_worse: '過去資料重算（回測）的準度和賺賠比不比現在用的差',
  wf_dd: '過去資料重算（回測）最大虧損沒有多 10 個百分點以上',
};
/** Short "what is still missing" words for the table (one per failed check). */
export const FAIL_ZH = {
  live_8_weeks: '實際紀錄還沒滿 8 週',
  live_brier_better: '實際預測沒有明顯比較準',
  live_sharpe_better: '實際虛擬投資沒有明顯比較好',
  live_dd: '實際虛擬投資虧太深',
  wf_not_worse: '用過去資料重算（回測）比現在用的差',
  wf_dd: '回測最大虧損多太多',
};
const LIVE_CHECKS = ['live_brier_better', 'live_sharpe_better', 'live_dd'];
const ROLE_ZH = { champion: '現在用的', reference: '一直抱著（對照組）', challenger: '挑戰者', retired: '已退休' };

/** Plain verdict of the latest review. kind: 'changed' | 'same' | 'dry' | 'none' */
export function verdict(RV) {
  const R = RV?.review;
  if (!R) return { kind: 'none' };
  if (R.dry_run) return { kind: 'dry', date: R.date };
  const pro = (RV.events || []).find(e => e.type === 'promote');
  if (pro) return { kind: 'changed', date: R.date, to: pro.model, from: pro.replaced };
  return { kind: 'same', date: R.date, champ: RV.champion_now };
}

/** Is a newer review overdue? A review runs every Monday 09:00 Taipei; give it until 10:00. Returns the missing Monday or null. */
export function overdue(RV, now) {
  const R = RV?.review; if (!R) return null;
  const t = new Date(now + 8 * 3600000);                       // Taipei wall clock in UTC fields
  const back = (t.getUTCDay() + 6) % 7;                         // days since Monday
  let mon = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate()) - back * DAY);
  if (back === 0 && t.getUTCHours() < 10) mon = new Date(mon.getTime() - 7 * DAY);   // today's run may still be going
  const m = mon.toISOString().slice(0, 10);
  return R.date < m ? m : null;
}

/** "Today's run hasn't happened yet" — Monday before 10:00 Taipei and the latest review is older than today. */
export function pendingToday(RV, now) {
  const t = new Date(now + 8 * 3600000), d = tpeDate(now);
  return t.getUTCDay() === 1 && t.getUTCHours() < 10 && (RV?.review?.date || '') < d ? d : null;
}

const nm = (RV, k) => RV?.names?.[k] ? `「${esc(RV.names[k])}」` : esc(k);

/** One row per candidate: plain name, role, passed n/6, what is still missing. */
export function rows(RV) {
  return (RV?.review?.candidates || []).map(c => {
    const f8 = c.checks.some(x => x.name === 'live_8_weeks' && !x.passed);
    // before 8 weeks the three live comparisons cannot be computed yet: say it once instead of three times
    const fail = c.checks.filter(x => !x.passed && !(f8 && LIVE_CHECKS.includes(x.name))).map(x => x.name === 'live_8_weeks' ? '實際紀錄還沒滿 8 週（實際表現還不能比）' : (FAIL_ZH[x.name] || x.name));
    return { model: c.model, name: RV.names?.[c.model] || c.model, role: ROLE_ZH[RV.status?.[c.model]] || '', passed: c.checks.filter(x => x.passed).length,
      total: c.checks.length, promote: c.promote, missing: fail };
  });
}

export function reviewCard(RV, now = Date.now(), liveScored = 0) {   // v64: liveScored = live.json 冠軍已評分筆數
  const title = '每週檢討：這週有沒有換預測方法？';
  if (!RV?.review) return `<section class="card" id="review"><h2>${title}</h2><p class="small muted">還沒有檢討紀錄（每週一 09:00 台北自動檢討）。</p></section>`;
  const R = RV.review, V = verdict(RV), L = RV.live || {}, need = RV.rule?.min_live_days ?? 56;
  const when = R.written_at ? `${mdw(R.date)} ${R.written_at.slice(11, 16)}（台北）` : mdw(R.date);
  const pend = pendingToday(RV, now), od = overdue(RV, now);
  let lead;
  if (V.kind === 'changed') lead = `<p class="lead"><strong>換了：</strong>${when}的檢討把首頁建議的算法從${nm(RV, V.from)}換成${nm(RV, V.to)}。從這次起首頁建議改用新的算法，放多少的比例可能和之前不一樣；舊的算法照樣每天記錄。</p>`;
  else if (V.kind === 'dry') lead = `<p class="lead"><strong>${when}這份是試算，沒有套用</strong>：首頁建議仍用${nm(RV, RV.champion_now)}。</p>`;
  else lead = `<p class="lead"><strong>沒換。</strong>${when}的檢討：${R.candidates.length} 個候選方法都沒通過，首頁建議繼續用${nm(RV, V.champ)}的算法。對你來說：做法不用因為這次檢討而改變。</p>`;
  const notes = [];
  if (pend) notes.push(`<p class="small">今天 ${mdw(pend)} 09:00 的檢討還沒跑出結果；上面是 ${mdw(R.date)} 那次的結果，跑完後這張卡會自動換成今天的。</p>`);
  else if (od) notes.push(`<p class="warn small">⚠️ ${mdw(od)} 那次的檢討沒有出現（最新的是 ${mdw(R.date)}），可能沒跑成功；首頁建議不受影響。</p>`);
  const tr = rows(RV).map(r => `<tr${r.promote ? ' class="hl"' : ''}><th>${esc(r.name)}<div class="muted small">${esc(r.role)}</div></th><td>${r.passed}／${r.total}</td><td class="small">${r.missing.length ? esc(r.missing.join('；')) : '全部通過'}</td></tr>`).join('');
  const S = L.scored || {}, ch = RV.champion_now, sc = S[ch] || {};
  const nB = sc.BTC ?? 0, nE = sc.ETH ?? 0;
  const enough = nB >= need && nE >= need;
  const timeTxt = enough
    ? `每個幣都已有 ≥ ${need} 天對過答案的實際預測，從現在起每週檢討都可能換（還要其他 5 項都通過）。`
    : `規則要每個方法、每個幣都累積 ${need} 天（${need / 7} 週）對過答案的實際預測。目前已對答案：BTC ${nB} 天、ETH ${nE} 天${L.first_asof && !(nB + nE) && !(liveScored > 0) ? `（第一批 ${closeMD(addDays(L.first_asof, 7))} 早上 8 點對答案）` : ''}${reviewLag(mdw(R.date), nB + nE, liveScored)}。照每天記錄、不缺日，<strong>最早是 ${L.earliest_change_review ? mdw(L.earliest_change_review) : '—'} 09:00 的檢討</strong>才可能換。在那之前每週的結論都會是「沒換」——這是事先定好的規則，不代表現在用的方法比較好。`;
  const wfFail = (R.candidates || []).filter(c => c.checks.some(x => x.name === 'wf_not_worse' && !x.passed)).length;
  const wfTxt = !enough && wfFail ? (wfFail === (R.candidates || []).length
    ? `另外，${wfFail} 個候選方法在「用過去資料重算不比現在用的差」這項也都沒過：就算滿 8 週，照這次的回測也還換不上來（回測每週會用新資料重算）。`
    : `另外，${wfFail} 個候選方法在「用過去資料重算不比現在用的差」這項沒過。`) : '';
  const raw = (R.candidates || []).map(c => `<li><b>${esc(c.model)}</b>：${c.checks.map(x => `${x.passed ? '✅' : '❌'} ${esc(x.detail)}`).join('；')}</li>`).join('');
  return `<section class="card" id="review"><h2>${title}</h2>
    ${lead}${notes.join('')}
    <div class="scroll"><table class="bt"><thead><tr><th>方法</th><th>通過幾項</th><th>還差什麼</th></tr></thead><tbody>${tr}</tbody></table></div>
    <p class="small"><strong>什麼時候才可能換：</strong>${timeTxt}${wfTxt}下一次檢討：${RV.next_review ? mdw(RV.next_review) : '每週一'} 09:00（台北）。</p>
    <p class="small"><strong>要換掉現在用的，6 項都要過：</strong>${Object.values(CHECK_ZH).join('、')}。這 6 項在 2026-11-11 就寫死，不看結果調整；每次最多換 1 個。檢討不會改過去任何一筆紀錄。</p>
    <details class="small muted"><summary>原始檢查（技術）</summary><ul>${raw}</ul><p>來源：公開帳本的 <code>ledger/reports/${esc(R.file)}</code>（由 <code>forecast/review_weekly.py</code> 產生，<code>forecast/review_export.py</code> 只轉成白話、不重算）。冠軍目前 ${esc(ch)}；多重檢定門檻 P ≥ ${esc(R.threshold)}（${esc(R.k)} 個候選）。</p></details>
    <p class="small muted">這是模型管理紀錄，不是買賣建議，也不保證換上來的方法以後比較好。</p>
  </section>`;
}
const addDays = (s, k) => new Date(Date.parse(s + 'T00:00:00Z') + k * DAY).toISOString().slice(0, 10);
