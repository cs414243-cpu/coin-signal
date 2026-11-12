// v18: 運氣差的一週，我的錢會少多少 — pure functions (no DOM, no network).
// Numbers: today's lower edge (q10) and suggested share come from live.json (the ledger's champion forecast);
// how often weeks really ended below that edge, and what such weeks cost, come from backtest/week_risk.py → data/weekrisk.json.
const pct1 = x => `${(Math.round(Math.abs(x) * 1000) / 10).toFixed(1)}%`;
const p1 = x => x === null || x === undefined ? '—' : `${x > 0 ? '+' : x < 0 ? '−' : ''}${Math.abs(x * 100).toFixed(1)}%`;
const pc0 = x => x === null || x === undefined ? '—' : `${Math.round(x * 100)}%`;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ntd = x => `NT$${Math.round(x).toLocaleString('en-US')}`;

/** "大約 10 週有 1 週" from weekrisk.json (2023 年起 actual share of weeks that ended below the lower edge). */
export function freqText(W, coin) {
  const c = W?.coins?.[coin]; if (!c || !c.every_n_weeks) return null;
  return c.calibrated ? `${W.oos_start.slice(0, 4)} 年起大約 ${c.every_n_weeks} 週有 1 週` : `${W.oos_start.slice(0, 4)} 年起實際約 ${c.every_n_weeks} 週有 1 週，和「10 週 1 週」有落差`;
}

/** Bad-week loss as a share of the money planned for this coin: { e, drop, follow, full } (positive numbers, price move only). */
export function badWeek(f) {
  if (!f || !Number.isFinite(f.q10) || !Number.isFinite(f.exposure)) return null;
  const drop = Math.max(0, -f.q10), e = Math.max(0, Math.min(1, f.exposure));
  return { e, drop, follow: e * drop, full: drop };
}

/** One plain line under each coin on the top card. */
export function homeLine(f, coin, W) {
  const b = badWeek(f); if (!b || b.drop <= 0) return '';
  const fq = freqText(W, coin);
  const head = `運氣差的一週${fq ? `（${fq}）` : ''}：${coin} 會跌超過 ${pct1(b.drop)}。`;
  if (b.e < 0.005) return `${head}建議先不放，所以這筆錢不受影響；全部放進去會少 ${pct1(b.full)} 以上。`;
  return `${head}照建議放 ${Math.round(b.e * 100)}%，你打算投入 ${coin} 的錢會少約 ${pct1(b.follow)} 以上；全部放進去會少 ${pct1(b.full)} 以上。`;
}

/** Same in NT$ when the user has set a budget for the coin (B = money planned for this coin). */
export function moneyText(f, B) {
  const b = badWeek(f); if (!b || b.drop <= 0 || !(B > 0)) return '';
  return b.e < 0.005 ? `運氣差的一週：照建議不受影響（全部放進去約少 ${ntd(B * b.full)} 以上）。`
    : `運氣差的一週：照建議約少 ${ntd(B * b.follow)} 以上（全部放進去約少 ${ntd(B * b.full)} 以上）。`;
}

// ---------- advanced card ----------
function row(lab, s) {
  if (!s?.n) return `<tr><th>${lab}</th><td colspan="3">—</td></tr>`;
  return `<tr><th>${lab}</th><td><strong>${pc0(s.below_q10)}</strong><div class="muted small">${s.n_bad}／${s.n.toLocaleString('en-US')}</div></td>`
    + `<td>照建議 <strong>${p1(s.bad_follow_mean)}</strong><div class="muted small">全部放 ${p1(s.bad_hold_mean)}</div></td>`
    + `<td>照建議 ${p1(s.bad_follow_worst)}<div class="muted small">全部放 ${p1(s.bad_hold_worst)}</div></td></tr>`;
}
export function weekRiskCard(W) {
  if (!W?.coins) return '';
  const coins = ['BTC', 'ETH'].filter(c => W.coins[c]);
  const tables = coins.map(c => { const S = W.coins[c].stats;
    return `<h3>${c}</h3><div class="scroll"><table class="bt"><thead><tr><th>期間</th><th>跌破下緣的比例</th><th>碰到時平均（一週）</th><th>碰到時最慘一週</th></tr></thead><tbody>`
      + row(`${S.oos.start.slice(0, 4)} 起每天`, S.oos.overlap) + row(`${S.oos.start.slice(0, 4)} 起每週`, S.oos.weekly) + row(`${S.is.start.slice(0, 4)} 選規則`, S.is.overlap)
      + `</tbody></table></div>`; }).join('');
  const o = c => W.coins[c]?.stats?.oos?.overlap;
  const sum = coins.map(c => `${c} ${pc0(o(c).below_q10)}（照建議平均 ${p1(o(c).bad_follow_mean)}，全部放 ${p1(o(c).bad_hold_mean)}）`).join('；');
  const off = coins.filter(c => !W.coins[c].calibrated);
  return `<section class="card" id="weekrisk"><h2>運氣差的一週會少多少</h2>
    <p class="small">首頁每個幣都有一句「運氣差的一週」：價格區間的下緣（設計上 10 週大約 1 週會更低），乘上建議放的比例，換算成你打算投入的錢會少多少。這裡檢查這個下緣準不準，以及真的碰到時虧多少。</p>
    <p>${esc(W.oos_start.slice(0, 4))} 年起真的跌破下緣的比例：${sum}。${off.length ? `<strong>${off.join('、')} 的下緣和「10 週 1 週」有落差，首頁會照實際比例寫。</strong>` : '和設計的 10% 接近。'}</p>
    ${tables}
    <p class="small"><strong>重點</strong>：首頁的金額是「至少」會少的錢，真的碰到時通常更多（上表「平均」）。照建議主要的作用是把這種週的虧損縮小，不是保證不虧；2022 年選規則時期跌破下緣的週比較多（大跌年）。</p>
    <p class="small muted">算法：<code>backtest/week_risk.py</code> → <code>data/weekrisk.json</code>（${esc(W.source)}）。每一天的下緣和建議比例只用當天以前的資料，一週＝當天收盤到 7 天後收盤。「每天」把每一天都當起點（相鄰起點重疊 6 天，不是獨立樣本）；「每週一次」只取${esc(W.weekly_anchor)}。虧損已扣成本：${esc(W.costs.note)}。首頁那句只算價格變動、不含手續費。這是過去紀錄，不是預測，也不是投資建議。</p>
  </section>`;
}
