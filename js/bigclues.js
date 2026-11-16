// v65: 「有沒有辦法事先知道下週會大漲或大跌？」 — the repeated, unadopted big-move clues from old proposals, checked for
// replication across ALL tested indicators (2022–23 vs 2024+) and against plain 30-day volatility.
// Pure functions (no DOM, no fetch). Data: data/bigclues.json ← backtest/bigmove_clues.py (pre-registered, commit e51c3c4;
// reads forecast/proposals/proto_*_results.json signal_study + closed Binance daily bars). Descriptive only: 尚未證實、不影響建議.
import { asofInline, WEEKLY_NOTE } from './fresh.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const pc0 = x => x === null || x === undefined || !Number.isFinite(x) ? '—' : `${Math.round(x * 100)}%`;
// plain names for indicators (fallback: proposal id); direction words come from the sign of the spread
export const NAMES = {
  'margin_positioning:lsr_z': 'Bitfinex 借錢做多比借錢放空多',
  'model_disagreement:disp': '幾個預測方法的意見很分歧',
  'btc_eth_correlation:rho90': 'BTC 和 ETH 最近 90 天走得很像',
};
export const nameOf = (p, g) => NAMES[`${p}:${g}`] || `提案 ${p} 的指標 ${g}`;
const TERC = { low: '偏低', mid: '中間', high: '偏高' };

export function valid(D) {
  return !!(D && !D.is_only && D.coins?.BTC?.vol?.OOS && D.coins?.ETH?.vol?.OOS && Array.isArray(D.coins.ETH.replicated));
}

export function headLine(D) {
  const E = D.coins.ETH, B = D.coins.BTC;
  const lead = (E.verdict === 'candidate' || B.verdict === 'candidate') ? '有一點可能，但還要另外正式測試，現在不影響建議' :
    (E.verdict === 'vol_like' || B.verdict === 'vol_like') ? '目前沒有：看起來有用的線索，都沒有比「最近波動大」更準' : '目前沒有';
  return `${lead}。過去 ${D.n_proposals} 個提案測過的 ${E.n_features} 個指標裡，ETH 在 2022–23 年和 2024 年以後「方向一樣」的只有 ${E.agree}／${E.n_both}（${pc0(E.agree_share)}），跟丟銅板差不多；兩段都明顯（大漲大跌比例差 ${Math.round(D.min_spread * 100)} 個百分點以上）的只有 ${E.n_rep} 個，純靠運氣本來就會出現約 ${E.chance_expected} 個。BTC 是 ${B.n_rep} 個（運氣約 ${B.chance_expected} 個）。`;
}

export function table(D) {
  const R = D.coins.ETH.replicated;
  if (!R.length) return '';
  const row = x => `<tr><td>${esc(nameOf(x.proposal, x.group))}</td><td>${x.IS.s > 0 ? '偏高時較多' : '偏高時較少'}</td><td>${pc0(x.IS.low)} → ${pc0(x.IS.high)}</td><td>${pc0(x.OOS.low)} → ${pc0(x.OOS.high)}</td></tr>`;
  return `<p class="small">ETH 兩段都成立的 ${R.length} 個（下週漲跌超過 ${Math.round(D.big * 100)}% 的比例，指標最低三分之一 → 最高三分之一）：</p>
    <div class="scroll"><table class="bt"><thead><tr><th>指標</th><th>大漲大跌</th><th>2022–23</th><th>2024 起</th></tr></thead><tbody>${R.map(row).join('')}</tbody></table></div>`;
}

export function volLine(D) {
  const v = D.coins.ETH.vol, b = D.coins.BTC.vol;
  return `連最直覺的「最近 30 天波動大，下週比較容易大漲大跌」也不穩：ETH 在 2022–23 年，波動最高那三分之一的時候，下週漲跌超過 ${Math.round(D.big * 100)}% 的比例是 ${pc0(v.IS.high)}（波動最低時 ${pc0(v.IS.low)}）；2024 年起反過來，${pc0(v.OOS.high)}（最低時 ${pc0(v.OOS.low)}）。BTC 2022–23 年 ${pc0(b.IS.high)}／${pc0(b.IS.low)}，2024 年起 ${pc0(b.OOS.high)}／${pc0(b.OOS.low)}。`;
}

export function baseLine(D) {
  const v = D.coins.ETH.vol, b = D.coins.BTC.vol;
  const nE = Math.round(1 / v.OOS.all), nB = Math.round(1 / b.OOS.all);
  return `不管指標怎麼說，大漲大跌本來就常見：2024 年起，ETH 每週漲跌超過 ${Math.round(D.big * 100)}% 的比例是 ${pc0(v.OOS.all)}（大約每 ${nE} 週 1 次），BTC 是 ${pc0(b.OOS.all)}（大約每 ${nB} 週 1 次）。現在（${esc(v.now.date.slice(5).replace('-', '/'))} 收盤）ETH 30 天波動 ${pc0(v.now.vol30)}（2022–23 年的${TERC[v.now.tercile] || '—'}那一段）、BTC ${pc0(b.now.vol30)}（${TERC[b.now.tercile] || '—'}那一段）。`;
}

export function you() {
  return '下週會不會大漲大跌，目前沒有可靠的方法事先知道，這些線索<strong>尚未證實、不影響建議</strong>。比較實際的做法是：放進去的錢，要能承受某一週突然漲跌 10% 以上；首頁的建議比例本來就會在波動變大時自動放少一點。';
}

export function bigCluesCard(D) {
  const id = 'bigclues', h2 = '有沒有辦法事先知道下週會大漲或大跌？（線索整理，尚未證實）';
  if (!valid(D)) return `<section class="card" id="${id}"><h2>${h2}</h2><p class="muted small">資料讀不到，稍後再試。</p></section>`;
  const E = D.coins.ETH;
  return `<section class="card" id="${id}"><h2>${h2}</h2>
    <p class="small">之前好幾個被否決的提案都順帶發現「某個指標偏高時，ETH 下週比較常大漲或大跌」。這張卡把所有測過的指標放在一起，檢查這種線索在 2022–23 年和 2024 年以後是不是都成立，免得只記住剛好說中的那幾個。</p>
    <p><strong>結論</strong>：${headLine(D)}</p>
    ${table(D)}
    <p class="small">${volLine(D)}</p>
    <p class="small">${baseLine(D)}</p>
    <p class="small"><strong>對你來說</strong>：${you()}</p>
    <p class="small muted">算法：<code>backtest/bigmove_clues.py</code> → <code>data/bigclues.json</code>（${asofInline(D.as_of)}，${WEEKLY_NOTE}）。來源＝各提案結果檔裡用 2022–23 年切成三等分的事前指標，看「下一個 7 天」漲跌是否超過 ${Math.round(D.big * 100)}%（每 7 天取 1 次）；ETH ${E.n_features} 個、BTC ${D.coins.BTC.n_features} 個指標。判斷標準事先固定（commit e51c3c4）：兩段方向一致的比例低於 ${Math.round(D.a_min * 100)}% 或兩段都明顯的少於 ${D.min_clues} 個＝「目前沒有」。兩段大小的排名相關 ${E.spearman < 0 ? '−' : ''}${Math.abs(E.spearman).toFixed(2)}（0＝毫無關係）。「運氣本來就會出現幾個」是事後加的對照。指標之間互相重疊、用同一批週，實際的運氣成分更大。</p>
  </section>`;
}
