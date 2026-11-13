// v26: 現在空手，通常要等多久？空手期間錯過／避開了多少？ — pure functions (no DOM, no network).
// History: backtest/flat_spells.py → data/spells.json (champion trend_vt@1, closed Binance daily bars, 2018→, costs included).
// Current spell: recomputed on the phone from the closed daily bars (flips.js recoRows = same rule), else taken from the file.
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const p1 = x => x === null || x === undefined || !Number.isFinite(x) ? '—' : `${x > 0 ? '+' : x < 0 ? '−' : ''}${Math.abs(x * 100).toFixed(1)}%`;
const pc0 = x => x === null || x === undefined ? '—' : `${Math.round(x * 100)}%`;
const dd = x => x === null || x === undefined ? '—' : `${Math.round(x)}`;
const usd = x => `${x >= 1000 ? Math.round(x).toLocaleString('en-US') : x.toFixed(2)} 美元`;
// candle date D closes at D+1 08:00 Taipei
export const closeMD = s => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + 1); return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`; };
const DAY = 86400000;
const dayDiff = (a, b) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / DAY);
export const COLS = ['start', 'end', 'days', 'close_start', 'close_end', 'r', 'low', 'high', 'adv', 'e_before'];
export const spellList = (S, coin) => (S?.coins?.[coin]?.spells || []).map(a => Object.fromEntries(COLS.map((k, i) => [k, a[i]])));

const quant = (xs, p) => {   // numpy.quantile default (linear)
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b), h = (s.length - 1) * p, lo = Math.floor(h);
  return lo + 1 < s.length ? s[lo] + (h - lo) * (s[lo + 1] - s[lo]) : s[lo];
};
/** Same as flat_spells.remaining: completed spells that lasted longer than d days → how many more days. */
export function remaining(spells, d) {
  const rem = spells.filter(x => x.days > d).map(x => x.days - d);
  if (!rem.length) return { d, n: 0 };
  const share = k => Math.round(rem.filter(x => x <= k).length / rem.length * 1e4) / 1e4;
  return { d, n: rem.length, median: quant(rem, 0.5), p25: quant(rem, 0.25), p75: quant(rem, 0.75), within7: share(7), within30: share(30) };
}

/** Current 空手 spell from recommendation rows (flips.js recoRows; ascending, closed bars only).
 *  -> null (not 空手 now) | { start, days, closeStart, closeLast, last, r, low, truncated } */
export function currentSpell(rows) {
  if (!rows?.length || rows[rows.length - 1].level !== 'out') return null;
  let s = rows.length - 1;
  while (s > 0 && rows[s - 1].level === 'out') s--;
  const seg = rows.slice(s), a = rows[s], z = rows[rows.length - 1];
  return { start: a.date, days: dayDiff(a.date, z.date), closeStart: a.c, closeLast: z.c, last: z.date, r: z.c / a.c - 1,
           low: Math.min(...seg.map(x => x.c)) / a.c - 1, truncated: s === 0, src: 'live' };
}
/** Spell from the weekly file (fallback when the phone has no daily bars). */
export function fileSpell(S, coin) {
  const c = S?.coins?.[coin]?.current; if (!c) return null;
  return { start: c.start, days: c.days_so_far, closeStart: c.close_start, closeLast: c.close_last, last: S.coins[coin].last_bar, r: c.r_so_far,
           low: c.low, truncated: false, src: 'file' };
}
/** Pick the spell to show: live rows if they reach the forecast's date, else the file only if it is for exactly that date. */
export function pickSpell(S, coin, rows, asof) {
  const live = rows?.length ? rows[rows.length - 1] : null;
  if (live && (!asof || live.date >= asof)) {
    const cur = currentSpell(rows);
    if (cur && cur.truncated) { const f = fileSpell(S, coin); if (f && f.start < cur.start) return { ...cur, start: f.start, closeStart: f.closeStart, days: dayDiff(f.start, cur.last), r: cur.closeLast / f.closeStart - 1, low: Math.min(cur.low, f.low), truncated: false }; }
    return cur;
  }
  if (S?.coins?.[coin]?.last_bar === asof) return fileSpell(S, coin);
  return undefined;   // unknown
}

const sinceTxt = sp => sp.days <= 0 ? '今天剛開始' : `已 ${sp.days} 天`;
/** One short plain sentence for the top card (only when at least one coin is 空手). cur: {BTC: spell|null|undefined, ETH: …} */
export function homeSentence(S, cur, live) {
  if (!S?.coins) return '';
  const parts = [];
  for (const c of ['BTC', 'ETH']) {
    const sp = cur[c], f = live?.coins?.[c];
    if (!f || f.action !== 'out' || !sp) continue;
    const L = spellList(S, c), R = remaining(L, sp.days);
    if (!R.n) { parts.push(`${c} ${sinceTxt(sp)}，已比過去每一次都久`); continue; }
    const tail = sp.days <= 0 ? `過去一半在 ${dd(R.median)} 天內結束` : `類似情況一半再 ${dd(R.median)} 天內結束`;
    parts.push(`${c} ${sinceTxt(sp)}${sp.days > 0 ? `、期間 ${p1(sp.r)}` : ''}（${tail}）`);
  }
  if (!parts.length) return '';
  return `空手多久：${parts.join('；')}。這是過去紀錄、不是預測，細節在進階「空手要等多久」。`;
}

// ---------- advanced card ----------
function statRow(lab, s) {
  if (!s?.n) return `<tr><th>${lab}</th><td colspan="4">—</td></tr>`;
  return `<tr><th>${lab}<div class="muted small">${s.n} 次</div></th><td><strong>${dd(s.days_median)} 天</strong><div class="muted small">一半在 ${dd(s.days_p25)}–${dd(s.days_p75)} 天，最長 ${s.days_max}</div></td>`
    + `<td>${pc0(s.within['7'])}／${pc0(s.within['30'])}</td><td>${pc0(s.share_higher)}<div class="muted small">中位 ${p1(s.r_median)}</div></td>`
    + `<td>${p1(s.adv_mean)}<div class="muted small">最慘一次期間 ${p1(s.worst_r)}</div></td></tr>`;
}
function bucketRow(lab, b) {
  if (!b?.n) return `<tr><th>${lab}</th><td colspan="3">—</td></tr>`;
  return `<tr><th>${lab}</th><td>${b.n}</td><td>${p1(b.r_median)}<div class="muted small">結束時比較高 ${pc0(b.share_higher)}</div></td><td>${p1(b.adv_mean)}</td></tr>`;
}
function nowBlock(S, c, sp, f) {
  if (sp === undefined) return `<p class="small muted">現在的空手期：手機還沒抓到最新日K，等一下再看。</p>`;
  if (!sp) return `<p class="small">現在${f ? `建議「${esc(f.action_zh)}」` : ''}，沒有在空手。</p>`;
  const L = spellList(S, c), R = remaining(L, sp.days);
  const head = `<p class="spell-now">從 <strong>${closeMD(sp.start)}</strong> 早上 8 點收盤起空手，${sp.days <= 0 ? '今天剛開始' : `<strong>已 ${sp.days} 天</strong>`}。${sp.days <= 0 ? `開始時收盤 ${usd(sp.closeStart)}` : `開始時 ${usd(sp.closeStart)}，${closeMD(sp.last)} 收盤 ${usd(sp.closeLast)}，這段期間 <strong>${p1(sp.r)}</strong>（最低 ${p1(sp.low)}）${sp.r < 0 ? '＝目前為止避開了這段下跌' : sp.r > 0 ? '＝目前為止錯過了這段上漲' : ''}`}。</p>`;
  const rest = R.n ? `<p class="small">${sp.days <= 0 ? `過去 ${R.n} 次空手：中位 <strong>${dd(R.median)} 天</strong>` : `過去空手超過 ${sp.days} 天的 ${R.n} 次：再等中位 <strong>${dd(R.median)} 天</strong>`}才回到有投入（一半落在 ${dd(R.p25)}–${dd(R.p75)} 天）；7 天內結束 ${pc0(R.within7)}、30 天內 ${pc0(R.within30)}。</p>`
    : `<p class="small warn">已經比過去每一次空手都久，歷史沒有可比的例子。</p>`;
  return head + rest + (sp.src === 'file' ? `<p class="small muted">（用每週預先算好的資料，最新 ${esc(S.coins[c].last_bar)}）</p>` : '');
}
export function spellsCard(S, cur, live) {
  if (!S?.coins) return '';
  const coins = ['BTC', 'ETH'].filter(c => S.coins[c]);
  const blocks = coins.map(c => { const C = S.coins[c], St = C.stats;
    return `<h3 class="sub">${c}</h3>${nowBlock(S, c, cur[c], live?.coins?.[c])}
      <div class="scroll"><table class="bt"><thead><tr><th>期間</th><th>空手多久（中位）</th><th>7／30 天內結束</th><th>結束時價格比開始高</th><th>照建議 vs 一直抱著（每次平均）</th></tr></thead><tbody>`
      + statRow(`全期 ${St.full.first.slice(0, 4)}～`, St.full) + statRow('選規則時期 ～2022', St.is) + statRow('之後 2023～', St.oos) + `</tbody></table></div>
      <div class="scroll"><table class="bt"><thead><tr><th>依長度（全期）</th><th>次數</th><th>空手期間價格（中位）</th><th>照建議 vs 一直抱著</th></tr></thead><tbody>`
      + bucketRow('7 天以內', St.full.buckets.short) + bucketRow('8–30 天', St.full.buckets.mid) + bucketRow('超過 30 天', St.full.buckets.long) + `</tbody></table></div>`; }).join('');
  const B = c => S.coins[c].stats.full;
  const line = coins.map(c => `${c} 一半在 ${dd(B(c).days_median)} 天內結束、${pc0(B(c).within['30'])} 在 30 天內`).join('；');
  const longTxt = coins.map(c => `${c} ${p1(B(c).buckets.long.r_median)}`).join('、');
  const shortTxt = coins.map(c => `${c} ${p1(B(c).buckets.short.adv_mean)}`).join('、');
  return `<section class="card" id="spells"><h2>空手要等多久</h2>
    <p id="spells-line">過去的空手：${line}。</p>
    ${blocks}
    <p class="small"><strong>重點</strong>：短的空手（7 天以內）結束時價格幾乎都比開始時高，等於小小錯過一點上漲（含來回手續費平均 ${shortTxt}）；長的空手（超過 30 天）多半避開了大跌（期間價格中位 ${longTxt}）。<strong>開始空手時沒辦法知道這次會是短的還是長的</strong>，所以規則不會因為「等很久」或「錯過一點」就提早買回；平均下來空手不一定比一直抱著賺，它的作用是躲開少數幾次很深的下跌。</p>
    <p class="small muted">算法：<code>backtest/flat_spells.py</code> → <code>data/spells.json</code>（${esc(S.source)}；${esc(S.model)}）。「空手」＝建議比例 0；從轉成空手那天的收盤（台北早上 8 點）算到再次建議有投入（減碼或持有）那天的收盤，每天只用當天以前的價格，不偷看。「照建議 vs 一直抱著」：以原本放在這個幣的錢 100% 計算，已扣${esc(S.costs.note.replace(/；以.*$/, ''))}；正數＝空手避開了下跌，負數＝錯過了上漲。2023 年以前是選規則時看過的時期，之後才算樣本外；次數不多（每個幣幾十次），只是過去紀錄、不是預測，也不是投資建議。每週一自動重算。</p>
  </section>`;
}
