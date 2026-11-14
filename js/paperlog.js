// v33: 預測成績單「這兩個數字怎麼來的」— rebuilt on the phone from the public hash-chained ledger (ledger/paper.jsonl).
// Pure functions; no DOM writes. Every number is a difference of two ledger rows (equity, cum_cost), nothing is estimated.
// Paper rules (forecast/common.py, paper_version 1): NT$1,000,000 split 50/50 into a BTC and an ETH half; after each 08:00
// Taipei close each half is set to that day's exposure; 0.15%/side on traded amount, plus the TWD→USDT premium on buys.
export const PAPER = { start_twd: 1_000_000, split: { BTC: 0.5, ETH: 0.5 }, cost_per_side: 0.0015, twd_premium: 0.0027, version: 1 };
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
/** candle date D closes at D+1 08:00 Taipei → "M/D" of that morning (same as trust.js closeMD) */
export const closeMD = s => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + 1); return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`; };
export const ntdS = x => { const r = Math.round(x); return `${r > 0 ? '+' : r < 0 ? '−' : ''}NT$${Math.abs(r).toLocaleString('en-US')}`; };
export const MAX_ROWS = 14;   // longer records: the earliest days are merged into one row so the table stays phone-sized
const p0 = w => `${Math.round(w * 100)}%`;

/** JSONL text → paper rows (bad lines are skipped; the chain itself is verified separately by trust.js). */
export function parse(text) {
  const out = [];
  for (const l of String(text || '').split('\n')) { if (!l.trim()) continue; try { const r = JSON.parse(l); if (r.type === 'paper') out.push(r); } catch {} }
  return out;
}

/** Day-by-day breakdown of one model's virtual portfolio.
 *  Row for close date d: held = weights set at the previous close (what was exposed during the move into d),
 *  change = equity_d − equity_{d−1}; cost = cum_cost_d − cum_cost_{d−1} (paid when re-setting at d's close);
 *  move = change + cost (gain/loss from prices alone); after = weights set at d's close. First row: start from cash. */
export function breakdown(rows, model, start = PAPER.start_twd) {
  const rs = rows.filter(r => r.model === model && (r.paper_version ?? 1) === PAPER.version).sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
  if (!rs.length) return null;
  let eq = start, cc = 0, held = null;
  const days = rs.map((r, i) => {
    const change = r.equity - eq, cost = r.cum_cost - cc;
    const d = { date: r.date, first: i === 0, held, after: { BTC: r.w_BTC, ETH: r.w_ETH }, change, cost, move: change + cost, equity: r.equity };
    eq = r.equity; cc = r.cum_cost; held = d.after; return d;
  });
  const tot = { change: eq - start, cost: cc, move: eq - start + cc };
  return { model, start, end: rs[rs.length - 1].date, first: rs[0].date, equity: eq, days, total: tot };
}

/** True when the ledger breakdown is the same portfolio the scorecard KPI shows (same last date, equity within NT$1). */
export function matchesTrack(B, paper) {
  return !!(B && paper && B.end === paper.end && Math.abs(B.equity - paper.equity) < 1);
}

/** One plain sentence per portfolio: total = 漲跌 + 成本. */
export function sumLine(label, B) {
  return `${label}：NT$${(B.start / 1e4).toFixed(0)} 萬 → NT$${Math.round(B.equity).toLocaleString('en-US')}（${ntdS(B.total.change)}）＝幣價漲跌 ${ntdS(B.total.move)}，加上買賣成本 ${ntdS(-B.total.cost)}。`;
}

const heldTxt = d => d.first ? '一開始是現金' : `BTC ${p0(d.held.BTC)}<br>ETH ${p0(d.held.ETH)}`;
const cell = d => `<span class="nw">${ntdS(d.change)}</span>${d.cost >= 0.5 ? `<div class="muted small nw">成本 ${ntdS(-d.cost)}</div>` : ''}`;

/** Collapsed box under the scorecard. rows = parse(ledger/paper.jsonl); track = live.json track. '' when unavailable
 *  or when the ledger does not match the KPI (never show two different numbers for the same thing). */
export function box(rows, track, champKey, baseKey) {
  if (!rows || !track) return '';
  const C = breakdown(rows, champKey, track.paper_start_twd), H = breakdown(rows, baseKey, track.paper_start_twd);
  if (!matchesTrack(C, track.champion?.paper) || !matchesTrack(H, track.baseline?.paper) || C.first !== H.first) return '';
  const byDate = Object.fromEntries(H.days.map(d => [d.date, d]));
  const agg = ds => ds.reduce((a, d) => ({ change: a.change + d.change, cost: a.cost + d.cost }), { change: 0, cost: 0 });
  const old = C.days.length > MAX_ROWS ? C.days.slice(0, C.days.length - MAX_ROWS + 1) : [];
  const recent = C.days.slice(old.length);
  const oldRow = old.length ? `<tr><th>${closeMD(old[0].date)}～${closeMD(old[old.length - 1].date)}</th><td>較早 ${old.length} 天合計</td><td>${cell(agg(old))}</td><td>${cell(agg(old.map(d => byDate[d.date]).filter(Boolean)))}</td></tr>` : '';
  const trs = oldRow + recent.map(d => { const h = byDate[d.date];
    return `<tr><th>${closeMD(d.date)}</th><td>${heldTxt(d)}</td><td>${cell(d)}</td><td>${h ? cell(h) : '—'}</td></tr>`; }).join('');
  const gap = C.equity - H.equity;
  const gapTxt = `照建議比一直抱著${gap >= 0 ? '多' : '少'} NT$${Math.abs(Math.round(gap)).toLocaleString('en-US')}（漲跌部分 ${ntdS(C.total.move - H.total.move)}、成本部分 ${ntdS(H.total.cost - C.total.cost)}）。`;
  return `<details class="fc-more pl-box" id="pl-box"><summary>這兩個數字怎麼來的（每天放多少、賺賠、成本）</summary>
    <p class="small" id="pl-sum">${sumLine('照建議', C)}<br>${sumLine('一直抱著', H)}<br>${gapTxt}</p>
    <div class="scroll"><table class="bt" id="pl-table"><thead><tr><th>早上 8 點</th><th>照建議放著</th><th>照建議</th><th>一直抱著</th></tr></thead><tbody>${trs}
      <tr class="hl"><th>合計</th><td></td><td>${ntdS(C.total.change)}</td><td>${ntdS(H.total.change)}</td></tr></tbody></table></div>
    <p class="small muted">虛擬 NT$${(C.start / 1e4).toFixed(0)} 萬分成 BTC、ETH 各一半；每一列是那天早上 8 點收盤時的當天賺賠；「照建議放著」是前一天收盤後、每一半裡放在幣上的比例，其餘是現金（不計利息）。每天早上 8 點收盤後照當天建議調整一次，買賣扣 ${(PAPER.cost_per_side * 100).toFixed(2)}% 手續費與滑價，買進再扣台幣買 USDT 的溢價 ${(PAPER.twd_premium * 100).toFixed(2)}%；「一直抱著」只在第一天買一次。第一天收盤才買進，所以只有成本。數字直接從每天公開、記錄後不能修改的虛擬投資紀錄相減，跟上面的金額一致；${esc(closeMD(C.end))} 早上之後的漲跌還沒算進來。</p>
  </details>`;
}
