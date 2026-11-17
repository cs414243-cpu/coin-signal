// v75: 「今天每個方法怎麼說（只有冠軍的建議算數）」— inside the advanced 「預測模型與自我改善機制」 card.
// Today's exposure of every registered model comes from the public hash-chained ledger (ledger/forecasts.jsonl, the
// same rows the scorecard uses; the chain itself is verified by trust.js). The "should I follow the challengers when the
// champion is out?" answer comes from data/peers.json (backtest/peers_export.py ← pre-registered proposal
// P-model-disagreement, variant vote_floor; walk-forward, closed bars only, costs included, OOS 2024+). Pure functions;
// no DOM writes. Research only, not investment advice.
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const p0 = x => `${Math.round(x * 100)}%`;
const p1 = x => `${(x * 100).toFixed(1)}%`;
export const closeMD = s => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + 1); return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`; };
export const CHALLENGERS = ['knn@1', 'tsmom@1', 'logit@1'];
export const NOTE = { 'trend_vt@1': '首頁的建議就是這個', 'knn@1': '只會全放或不放', 'baseline@1': '永遠全放，拿來比較用' };

/** forecast rows → { model: { BTC: exposure, ETH: exposure } } for the forecast date asof[coin] (the champion's card date). */
export function today(rows, asof) {
  const out = {};
  for (const r of rows || []) {
    if (!r || !asof || r.asof !== asof[r.coin] || !Number.isFinite(r.exposure)) continue;
    (out[r.model] ||= {})[r.coin] = r.exposure;
  }
  return out;
}

/** How many challengers want exposure > 0 for a coin (null when any challenger row is missing). */
export function votes(T, coin) {
  let n = 0;
  for (const m of CHALLENGERS) { const e = T[m]?.[coin]; if (!Number.isFinite(e)) return null; if (e > 0) n++; }
  return n;
}

/** One plain line per coin. */
export function coinLine(T, coin, champKey) {
  const ce = T[champKey]?.[coin], v = votes(T, coin);
  if (!Number.isFinite(ce) || v === null) return '';
  if (ce > 0) return v === 3 ? `${coin}：冠軍和 3 個挑戰者都想放一些。` : `${coin}：冠軍說放 ${p0(ce)}；3 個挑戰者裡 ${v} 個想放一些。`;
  if (v === 0) return `${coin}：冠軍和 3 個挑戰者都說先不要放。`;
  return `${coin}：冠軍說先不要放，但 3 個挑戰者裡有 ${v} 個想放一些${v === 3 ? '——正好是下面「過去試過」的那種情況' : ''}。`;
}

/** The vote_floor comparison (OOS). '' when data/peers.json is missing or malformed. */
export function testedLine(P) {
  const v = P?.vote_floor?.OOS, c = P?.champ?.OOS;
  if (!v || !c || ![v.cagr, v.maxdd, c.cagr, c.maxdd].every(Number.isFinite)) return '';
  const worse = v.cagr < c.cagr && v.maxdd <= c.maxdd;
  return `過去試過「冠軍說空手、3 個挑戰者都想放時，先放一點（最多一半）」：${esc(P.periods?.OOS?.[0]?.slice(0, 4) || '2024')} 年起（事先沒看過的期間）年化 ${p1(v.cagr)} vs 只照冠軍 ${p1(c.cagr)}，最慘跌幅 ${p1(v.maxdd)} vs ${p1(c.maxdd)}${worse ? '——跟著挑戰者反而賺得少、跌得深' : ''}。所以首頁只用冠軍；挑戰者要實際記錄滿 8 週、而且明顯比冠軍好，才會換上來。`;
}

/** Whole block (table + lines). '' when the ledger rows for today are unavailable. */
export function block(rows, live, P) {
  if (!live?.coins || !Array.isArray(live.models)) return '';
  const asof = { BTC: live.coins.BTC?.asof, ETH: live.coins.ETH?.asof }, T = today(rows, asof), champ = live.champion?.key;
  if (!T[champ]) return '';
  const cell = (m, c) => Number.isFinite(T[m.key]?.[c]) ? p0(T[m.key][c]) : '—';
  const trs = live.models.filter(m => T[m.key]).map(m => `<tr${m.key === champ ? ' class="hl"' : ''}><th>${esc(m.name)}${NOTE[m.key] ? `<div class="muted small">${esc(NOTE[m.key])}</div>` : ''}</th><td>${cell(m, 'BTC')}</td><td>${cell(m, 'ETH')}</td></tr>`).join('');
  const lines = ['BTC', 'ETH'].map(c => coinLine(T, c, champ)).filter(Boolean).map(s => `<li>${esc(s)}</li>`).join('');
  const tl = testedLine(P), d = asof.BTC ? closeMD(asof.BTC) : '—';
  return `<div id="peers"><h3>今天每個方法怎麼說（只有冠軍的建議算數）</h3>
    <div class="scroll"><table class="bt"><thead><tr><th>方法</th><th>BTC 建議放</th><th>ETH 建議放</th></tr></thead><tbody>${trs}</tbody></table></div>
    ${lines ? `<ul class="small">${lines}</ul>` : ''}
    ${tl ? `<p class="small">${tl}</p>` : ''}
    <p class="small muted">各方法 ${esc(d)} 早上 8 點收盤後的建議，取自公開帳本 <code>ledger/forecasts.jsonl</code>。比較來自提案 P-model-disagreement（${esc(String(P?.tested_at || '—').replace(' Taipei', ' 台北'))} 測試、資料到 ${esc(P?.as_of || '—')}；每天只用當天以前的資料、已扣成本；<code>data/peers.json</code>）。「意見不一致」本身也測過，不能拿來事先判斷漲跌。研究用途，不是投資建議。</p>
  </div>`;
}
