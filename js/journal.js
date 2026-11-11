// v12: 我的決策紀錄 — 宗 records what he actually did with each recommendation (照建議／沒照做／部分照做),
// stored ONLY in this phone's localStorage. Results use real CLOSED daily bars (same source the app already fetched):
// start = close of the forecast's candle date (asof), end = close of target_date (asof + 7). Pure functions, no DOM.
// Cost convention identical to backtest/action_outcomes.py (v8 「建議之後一週」): each record is one standalone week that starts
// from cash: buy pays per_side + TWD premium, sell after 7 days pays per_side; only the invested fraction pays.
export const KEY = 'cs-v12-journal';
export const CHOICES = { follow: '照建議', skip: '沒照做', partial: '部分照做' };
export const DEFAULT_COSTS = { per_side: 0.0015, twd_premium: 0.0027 };
const DAY = 86400000;
const MAX_EXPOSURE = 3; // allow up to 300% of the planned budget (user may hold more than planned)

export function load(storage) {
  try { const x = JSON.parse(storage.getItem(KEY) || '[]'); return Array.isArray(x) ? x.filter(valid) : []; } catch { return []; }
}
export function save(storage, list) { try { storage.setItem(KEY, JSON.stringify(list)); return true; } catch { return false; } }
const isDate = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
function valid(e) {
  return e && (e.coin === 'BTC' || e.coin === 'ETH') && isDate(e.asof) && isDate(e.target) && CHOICES[e.choice]
    && Number.isFinite(e.rec_e) && (e.my_e === null || Number.isFinite(e.my_e));
}
export const addDays = (s, n) => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const numOrNull = v => { if (v === null || v === undefined || String(v).trim() === '') return null; const x = parseFloat(String(v).replace(/[,\s%]/g, '')); return Number.isFinite(x) ? x : NaN; };

/**
 * Build a record from the live top-card forecast f (data/live.json coins[c]) and user input.
 * pctText: "實際放了打算投入的錢的幾 %" (optional for follow → recommendation; required for partial; optional for skip).
 * amountText: NT$ actually in this coin after the decision (optional); with a budget it can stand in for the %.
 * Returns {entry} or {error}.
 */
export function makeEntry({ coin, f, choice, pctText, amountText, budget, now = Date.now() }) {
  if (!f || !isDate(f.asof)) return { error: '目前沒有預測資料，沒辦法記錄。' };
  if (!CHOICES[choice]) return { error: '請先選「照建議／沒照做／部分照做」。' };
  const p = numOrNull(pctText), amt = numOrNull(amountText);
  if (Number.isNaN(p)) return { error: '比例請填數字（例如 40）。' };
  if (Number.isNaN(amt) || (amt !== null && amt < 0)) return { error: '金額請填 0 以上的數字。' };
  const B = Number.isFinite(budget) && budget > 0 ? budget : null;
  let my = p !== null ? p / 100 : null;
  if (choice === 'follow' && my !== null && Math.abs(my - f.exposure) <= 0.0005) my = f.exposure; // the pre-filled (rounded) recommendation
  if (my === null && amt !== null && B) my = amt / B;
  if (my === null && choice === 'follow') my = f.exposure;
  if (my === null && choice === 'partial') return { error: '部分照做時，請填實際放了幾 %（或在有設定預算時填金額）。' };
  if (my !== null && (my < 0 || my > MAX_EXPOSURE)) return { error: `比例要在 0～${MAX_EXPOSURE * 100}% 之間。` };
  const target = isDate(f.target_date) ? f.target_date : addDays(f.asof, 7);
  return { entry: { id: `${f.asof}|${coin}`, coin, asof: f.asof, target, rec_action: f.action, rec_action_zh: f.action_zh, rec_e: f.exposure,
    price_usd: f.price_usd, forecast_hash: f.hash || null, choice, my_e: my === null ? null : Math.round(my * 10000) / 10000,
    amount: amt, budget: B, recorded_at: new Date(now).toISOString() } };
}
/** One record per coin per forecast date: a new record for the same id replaces the old one. Sorted by date, then coin. */
export function upsert(list, e) {
  return [...list.filter(x => x.id !== e.id), e].sort((a, b) => a.asof < b.asof ? -1 : a.asof > b.asof ? 1 : a.coin < b.coin ? -1 : 1);
}
export const remove = (list, id) => list.filter(x => x.id !== id);
export const recordedFor = (list, coin, asof) => list.find(x => x.coin === coin && x.asof === asof) || null;

/** Net one-week return of putting fraction e in at the start close (v8 formula, cost on invested part only). */
export function weekNet(e, r, costs = DEFAULT_COSTS) {
  if (e === null || !Number.isFinite(e) || !Number.isFinite(r)) return null;
  const fee = costs?.per_side ?? DEFAULT_COSTS.per_side, prem = costs?.twd_premium ?? DEFAULT_COSTS.twd_premium;
  return e * ((1 + r) * (1 - fee) / (1 + fee + prem) - 1);
}
/**
 * Evaluate one record against CLOSED daily bars [{t (open ms, 00:00 UTC), c}] ascending.
 * Bar for date D closes at D+1 00:00 UTC (= D+1 08:00 Taipei). Only bars that exist (closed) are used → no lookahead.
 */
export function evaluate(e, bars, costs = DEFAULT_COSTS) {
  const at = d => bars.find(b => new Date(b.t).toISOString().slice(0, 10) === d);
  const s = at(e.asof), z = at(e.target);
  if (!s) return { status: bars.length && bars[0].t > Date.parse(e.asof + 'T00:00:00Z') ? 'old' : 'nodata' };
  if (!z) return { status: 'pending', startClose: s.c };
  const r = z.c / s.c - 1;
  return { status: 'done', startClose: s.c, endClose: z.c, r, mine: weekNet(e.my_e, r, costs), follow: weekNet(e.rec_e, r, costs), hold: weekNet(1, r, costs) };
}
/**
 * Per-coin summary over FINISHED records whose weeks do not overlap (a record starting before the previous counted one ended
 * is skipped, so no day is counted twice). Compounded: Π(1+x) − 1. Records without a known own % count for follow/hold only.
 */
export function summarize(list, barsByCoin, costs = DEFAULT_COSTS) {
  const out = {};
  for (const coin of ['BTC', 'ETH']) {
    const rows = list.filter(x => x.coin === coin).map(e => ({ e, v: barsByCoin[coin] ? evaluate(e, barsByCoin[coin], costs) : { status: 'nodata' } }));
    let lastEnd = null; const used = [], overlap = new Set();
    for (const x of rows) {
      if (x.v.status !== 'done') continue;
      if (lastEnd && x.e.asof < lastEnd) { overlap.add(x.e.id); continue; }
      used.push(x); lastEnd = x.e.target;
    }
    const comp = k => { const xs = used.map(x => x.v[k]).filter(v => v !== null); return xs.length ? xs.reduce((a, v) => a * (1 + v), 1) - 1 : null; };
    const withMine = used.filter(x => x.v.mine !== null);
    const compSub = k => withMine.length ? withMine.reduce((a, x) => a * (1 + x.v[k]), 1) - 1 : null;
    out[coin] = { rows, overlap, n: used.length, nMine: withMine.length, follow: comp('follow'), hold: comp('hold'),
      mine: compSub('mine'), followSame: compSub('follow'), holdSame: compSub('hold'),
      nFollowed: used.filter(x => x.e.choice === 'follow').length };
  }
  return out;
}

// ---------- plain text ----------
const md = s => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + 1); return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`; }; // candle D closes D+1 08:00 Taipei
export const closeMD = md;
const sp = (x, d = 1) => x === null || x === undefined || !Number.isFinite(x) ? '—' : `${x > 0 ? '+' : x < 0 ? '−' : ''}${Math.abs(x * 100).toFixed(d)}%`;
const p0 = x => x === null || x === undefined || !Number.isFinite(x) ? '—' : `${Math.round(x * 100)}%`;
const ntd = x => !Number.isFinite(x) ? '—' : `${x < 0 ? '−' : x > 0 ? '+' : ''}NT$${Math.abs(Math.round(x)).toLocaleString('en-US')}`;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Tiny homepage entry point (one muted line). */
export function homeHint(list, live) {
  const coins = ['BTC', 'ETH'].filter(c => live?.coins?.[c]);
  if (!coins.length) return '';
  const asof = live.coins[coins[0]].asof;
  const done = coins.filter(c => recordedFor(list, c, asof));
  const txt = done.length === coins.length ? `📝 已記下 ${md(asof)} 我的決定（看結果）` : '📝 記下這次我實際怎麼做';
  return `<p class="jr-hint small muted"><a href="#journal" class="jr-go">${txt}</a></p>`;
}

/** 進階 card. live = data/live.json; barsByCoin {BTC: closed bars|null, ETH}; src = label of the price source; budgets {BTC,ETH} (NT$ or null). */
export function journalCard({ list, live, barsByCoin = {}, src = '', budgets = {}, holdPct = {}, costs = DEFAULT_COSTS }) {
  const form = c => {
    const f = live?.coins?.[c]; if (!f) return '';
    const rec = recordedFor(list, c, f.asof);
    const pre = rec ? (rec.my_e === null ? '' : String(Math.round(rec.my_e * 1000) / 10)) : (holdPct[c] ?? '');
    const radio = k => `<label class="jr-opt"><input type="radio" name="jr-choice-${c}" value="${k}"${rec?.choice === k ? ' checked' : ''}> ${CHOICES[k]}</label>`;
    return `<div class="jr-form" data-coin="${c}">
      <p><strong>${c}</strong>｜${md(f.asof)} 的建議：<strong>${esc(f.action_zh)}</strong>，放打算投入的錢的 ${p0(f.exposure)}${rec ? `　<span class="ok-inline">✓ 已記錄（${esc(CHOICES[rec.choice])}）</span>` : ''}</p>
      <div class="jr-opts">${radio('follow')}${radio('skip')}${radio('partial')}</div>
      <div class="form">
        <label>實際放了打算投入的錢的幾 %（照建議可不填）<input type="text" inputmode="decimal" class="jr-pct" value="${esc(pre)}" placeholder="例如 ${Math.round(f.exposure * 100)}"></label>
        <label>實際放在 ${c} 的金額（新台幣，選填）<input type="text" inputmode="decimal" class="jr-amt" value="${esc(rec?.amount ?? '')}" placeholder="例如 50000"></label>
      </div>
      <button type="button" class="jr-save" data-coin="${c}">${rec ? '更新這筆紀錄' : '記下來'}</button> <span class="jr-msg small" data-coin="${c}"></span>
    </div>`;
  };
  const S = summarize(list, barsByCoin, costs);
  const status = v => v.status === 'pending' ? '還沒到期' : v.status === 'old' ? '太舊，抓到的日K不含這天' : v.status === 'nodata' ? '行情還沒載入' : '';
  const rowsHtml = list.slice().reverse().map(e => {
    const v = S[e.coin].rows.find(x => x.e.id === e.id)?.v || { status: 'nodata' };
    const B = e.budget;
    const money = (x) => B && x !== null && x !== undefined ? `<div class="muted small">${ntd(x * B)}</div>` : '';
    const cells = v.status === 'done'
      ? `<td>${sp(v.r)}</td><td>${e.my_e === null ? '—<div class="muted small">沒填比例</div>' : sp(v.mine, 2) + money(v.mine)}</td><td>${sp(v.follow, 2)}${money(v.follow)}</td><td>${sp(v.hold, 2)}${money(v.hold)}</td>`
      : `<td colspan="4" class="muted">${status(v)}${v.status === 'pending' ? `（${md(e.target)} 早上 8 點後有結果）` : ''}</td>`;
    return `<tr${S[e.coin].overlap.has(e.id) ? ' class="muted"' : ''}><td class="nowrap">${md(e.asof)}<div class="muted small">${e.asof.slice(0, 4)}</div></td><td>${e.coin}</td>
      <td>${esc(e.rec_action_zh)} ${p0(e.rec_e)}<div class="muted small">我：${esc(CHOICES[e.choice])} ${p0(e.my_e)}</div></td>${cells}
      <td><button type="button" class="jr-del" data-id="${esc(e.id)}" aria-label="刪除這筆">刪除</button></td></tr>`;
  }).join('');
  const sumLine = c => {
    const s = S[c]; if (!s.n) return '';
    const mineTxt = s.nMine ? `你實際的做法 <strong>${sp(s.mine, 1)}</strong>，同樣 ${s.nMine} 週照建議 ${sp(s.followSame, 1)}、一直抱著 ${sp(s.holdSame, 1)}` : '沒有填比例的週算不出你的結果';
    return `<li>${c}：已到期 ${s.n} 週（不重疊${s.overlap.size ? `，另有 ${s.overlap.size} 筆和前一筆重疊、不列入` : ''}），其中 ${s.nFollowed} 週照建議。${mineTxt}。全部 ${s.n} 週：照建議 ${sp(s.follow, 1)}、一直抱著 ${sp(s.hold, 1)}。</li>`;
  };
  const sums = ['BTC', 'ETH'].map(sumLine).join('');
  const nMax = Math.max(S.BTC.n, S.ETH.n);
  return `<section class="card" id="journal"><h2>我的決策紀錄</h2>
    <p class="small">每次看完建議，記下你實際怎麼做。到期後（7 天）用真實收盤價算：你的做法、照建議、一直抱著，各差多少。<strong>只存在這支手機</strong>（localStorage），不會傳到任何地方；換手機或清除網站資料就會不見。</p>
    ${form('BTC')}${form('ETH')}
    ${list.length ? `<h3 class="sub">結果</h3>
    <div class="scroll"><table class="bt"><thead><tr><th>建議日</th><th>幣</th><th>建議／我</th><th>這週漲跌</th><th>我的做法</th><th>照建議</th><th>一直抱著</th><th></th></tr></thead><tbody>${rowsHtml}</tbody></table></div>
    ${sums ? `<ul class="facts small">${sums}</ul>` : '<p class="small muted">還沒有到期的紀錄。</p>'}
    ${nMax && nMax < 8 ? '<p class="warn small">到期的週數還很少，這段時間的差別多半是運氣，不能說明誰的做法比較好。</p>' : ''}
    <p class="small"><button type="button" class="jr-clear">清除全部紀錄</button></p>` : '<p class="small muted">還沒有紀錄。</p>'}
    <p class="small muted">算法：起點＝建議依據的那天收盤（台北早上 8 點），終點＝7 天後收盤；只用已收完的日K（${esc(src || '行情還沒載入')}）。報酬是「打算投入這個幣的錢」的百分比：比例 × 這週漲跌，每筆都當成從現金買進、7 天後賣出，買進付 ${(costs.per_side * 100).toFixed(2)}%＋台幣溢價 ${(costs.twd_premium * 100).toFixed(2)}%、賣出付 ${(costs.per_side * 100).toFixed(2)}%（和「建議之後一週」同一算法；長期持有實際成本會比較低）。一直抱著＝100%。有設定總資產和計畫時，另外換算成新台幣（用記錄當時的預算）。同一個幣兩筆紀錄的 7 天重疊時，合計只算前一筆。這是你自己的紀錄，不是模型的證明，也不是投資建議。</p>
  </section>`;
}
