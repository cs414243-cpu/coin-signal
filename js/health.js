// v83 (2026-11-19): 「預測方法還正常嗎？」— live results (public ledger via data/live.json track.champion, updated every day)
// vs the champion's own frozen walk-forward history over windows of the SAME length (data/health.json ← backtest/model_health.py,
// pre-registered d0444a5, recomputed every Monday). Three checks: 一週價格範圍有沒有包住, 猜漲跌的誤差, 照建議虛擬投資的最大跌幅.
// Verdict per check (fixed before the first run): share of past windows as bad or worse ≥ 5% 正常; 1–5% 少見; < 1% 異常
// (drawdown also 異常 if worse than the worst drawdown of the whole history). Homepage: one line only when a check is 異常
// and (drawdown, or ≥ 7 scored days). Descriptive only: never changes the recommendation.
// Why: model monitoring against the model's own reference distribution (Gama et al. 2014 ACM Comput. Surv. 46(4):44,
// doi 10.1145/2523813, concept-drift detection); range checks = interval-forecast coverage (Christoffersen 1998 Int. Econ. Rev.
// 39(4):841–862, doi 10.2307/2527341); drawdown vs history = Bailey & López de Prado 2015 J. Risk 18(2) (doi 10.21314/jor.2015.317, stop-outs:
// judge a loss against the strategy's own downside distribution, not a fixed number), here only as a description. Research only, not investment advice.
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pc0 = x => `${Math.round(x * 100)}%`;
const pc1 = x => `${(x * 100).toFixed(1)}%`;
const ddS = x => `${x < 0 ? '−' : ''}${(Math.abs(x) * 100).toFixed(1)}%`;
export const LEVEL_ZH = { ok: '正常', rare: '少見，但過去也發生過', abnormal: '異常（超出過去的範圍）', early: '還沒有資料' };
export const ICON = { ok: '🟢', rare: '🟡', abnormal: '🔴', early: '⚪' };

export function valid(H) {
  return !!(H && H.schema === 1 && H.model === 'trend_vt@1' && H.cov && H.brier && H.dd && H.cov_counts && H.thresholds);
}
const lvl = (tail, H) => tail < H.thresholds.abnormal ? 'abnormal' : tail < H.thresholds.ok ? 'rare' : 'ok';
const capK = (H, K) => Math.min(Math.max(1, K), H.kmax);
const tailText = t => t == null ? null : t < 0.01 ? '不到 1%' : t < 0.05 ? `約 ${pc1(t)}` : `約 ${pc0(t)}`;

/** Range check: live n scored forecasts (2 per day), cov = live in-band share. */
export function rangeCheck(H, n, cov) {
  if (!(n >= 1) || cov == null) return { level: 'early' };
  const K = capK(H, Math.round(n / 2)), N = 2 * K, k = Math.round(cov * n), kk = Math.round(cov * N);
  const cnt = H.cov_counts[K];
  if (cnt) {
    const tot = cnt.reduce((a, b) => a + b, 0), tail = cnt.slice(0, kk + 1).reduce((a, b) => a + b, 0) / tot;
    return { K, n, k, cov, tail, level: lvl(tail, H) };
  }
  const t = H.cov[K]; const level = t.c1 != null && cov <= t.c1 + 1e-9 ? 'abnormal' : t.c5 != null && cov <= t.c5 + 1e-9 ? 'rare' : 'ok';
  return { K, n, k, cov, tail: null, level };
}

/** Brier check: live mean Brier over n forecasts. */
export function brierCheck(H, n, brier) {
  if (!(n >= 1) || brier == null) return { level: 'early' };
  const K = capK(H, Math.round(n / 2)), t = H.brier[K];
  const level = brier > t.b99 ? 'abnormal' : brier > t.b95 ? 'rare' : 'ok';
  let tail = null; const p = H.brier_pct?.[K];
  if (p) { let i = 0; while (i < 100 && p[i + 1] <= brier) i++; tail = brier < p[0] ? 1 : (100 - i) / 100; }
  return { K, brier, tail, level, b95: t.b95 };
}

/** Drawdown check: live paper days and max drawdown (≤ 0). */
export function ddCheck(H, days, maxdd) {
  if (!(days >= 1) || maxdd == null) return { level: 'early' };
  const L = capK(H, days), t = H.dd[L], worst = H.overall.paper_maxdd;
  const level = maxdd < worst - 1e-9 || maxdd < t.d1 ? 'abnormal' : maxdd < t.d5 ? 'rare' : 'ok';
  return { L, days, maxdd, level, d5: t.d5, min: t.min, worst };
}

/** All three + overall + homepage flag. track = LIVE.track. */
export function checks(H, track) {
  if (!valid(H) || !track?.champion) return null;
  const s = track.champion.scores || {}, p = track.champion.paper || {};
  const R = rangeCheck(H, s.n, s.coverage_10_90), B = brierCheck(H, s.n, s.brier), D = ddCheck(H, p.days, p.maxdd);
  const order = ['early', 'ok', 'rare', 'abnormal'];
  const overall = [R, B, D].map(x => x.level).reduce((a, b) => order.indexOf(b) > order.indexOf(a) ? b : a, 'early');
  const minD = H.thresholds.home_min_days ?? 7;
  const home = D.level === 'abnormal' || ((R.level === 'abnormal' && R.K >= minD) || (B.level === 'abnormal' && B.K >= minD));
  return { R, B, D, overall, home };
}

/** Homepage line: '' unless the pre-registered homepage rule fires. */
export function homeLine(H, track) {
  const c = checks(H, track); if (!c?.home) return '';
  const which = [c.D.level === 'abnormal' && '照建議的虛擬投資跌得比過去同樣長度的時期都深', c.R.level === 'abnormal' && c.R.K >= 7 && '一週價格範圍落空的次數比過去多很多', c.B.level === 'abnormal' && c.B.K >= 7 && '猜漲跌錯得比過去多很多'].filter(Boolean).join('、');
  return `<p class="small health-home">🔴 預測方法最近的表現超出過去的正常範圍（${esc(which)}）。這不代表要反著做，而是規則可能不適合最近的行情：先別加大金額，等每週一的檢討。<a href="#health">看檢查</a></p>`;
}

function rowR(R, H) {
  if (R.level === 'early') return '<li>一週價格範圍有沒有包住：還沒有對答案的預測。</li>';
  const t = tailText(R.tail);
  return `<li>${ICON[R.level]} <b>一週價格範圍有沒有包住</b>：實盤 ${R.k}／${R.n} 筆包住（${pc0(R.cov)}；過去平均 ${pc0(H.overall.coverage)}）。過去任選同樣 ${R.K} 天，包住這麼少或更少的時候${t ? t : (R.level === 'ok' ? '超過 5%' : R.level === 'rare' ? '在 1～5% 之間' : '不到 1%')}${R.cov < 0.5 ? '——大跌或大漲的一週，兩個幣、連續幾天常常一起落空，所以不算稀奇' : ''}。→ <b>${LEVEL_ZH[R.level]}</b></li>`;
}
function rowB(B) {
  if (B.level === 'early') return '<li>猜漲跌的誤差：還沒有對答案的預測。</li>';
  const t = tailText(B.tail);
  return `<li>${ICON[B.level]} <b>猜漲跌的誤差</b>（越小越好，一直說 50% 會是 0.25）：實盤 ${B.brier.toFixed(3)}。過去同樣 ${B.K} 天，誤差更大的時候${t ? t : (B.level === 'ok' ? '超過 5%' : B.level === 'rare' ? '在 1～5% 之間' : '不到 1%')}。→ <b>${LEVEL_ZH[B.level]}</b></li>`;
}
function rowD(D) {
  if (D.level === 'early') return '<li>照建議虛擬投資的最大跌幅：還沒有資料。</li>';
  return `<li>${ICON[D.level]} <b>照建議虛擬投資最大跌幅</b>：實盤 ${ddS(D.maxdd)}（${D.days} 天）。過去同樣 ${D.L} 天，20 次裡大約有 1 次跌超過 ${ddS(D.d5)}，最慘 ${ddS(D.min)}；整段歷史最慘 ${ddS(D.worst)}。→ <b>${LEVEL_ZH[D.level]}</b></li>`;
}

export function conclusion(c) {
  const days = Math.max(c.R.K || 0, 0);
  if (c.overall === 'abnormal') return '結論：<b>有一項超出過去的範圍</b>。規則可能不適合最近的行情——建議照常顯示，但先別加大金額，等每週一檢討（換不換方法仍照 8 週的規則）。';
  if (c.overall === 'rare') return '結論：<b>有一項少見，但過去也發生過</b>，還不算失靈；照常就好，繼續看。';
  if (c.overall === 'ok') return `結論：<b>目前沒有失靈的跡象</b>${days < 56 ? `——但實盤才 ${days} 天的答案，只能抓出很誇張的問題；要到 8 週才說得準` : ''}。`;
  return '結論：還沒有資料可以檢查。';
}

export function healthCard(H, track) {
  const head = '<section class="card" id="health"><h2>預測方法還正常嗎？（實盤 vs 過去同樣長度的時期）</h2>';
  const c = checks(H, track);
  if (!c) return `${head}<p class="small muted">資料讀不到，暫時無法檢查。</p></section>`;
  return `${head}
    <p class="small">什麼時候該懷疑這個 App？不是「這週賠了」就算——而是實盤結果<b>比這個方法自己過去 4 年的同樣長度的時期還差</b>。每天用公開紀錄重新檢查三件事：</p>
    <ul class="small health-list">${rowR(c.R, H)}${rowB(c.B)}${rowD(c.D)}</ul>
    <p class="small">${conclusion(c)}</p>
    <p class="small muted">判斷規則事先寫好：過去同樣長度的時期，跟現在一樣差或更差的比例 ≥ 5% 算正常、1～5% 算少見、不到 1% 算異常（最大跌幅比整段歷史最慘還深也算異常）。只有「異常」才會在首頁成績單提醒（範圍和誤差要至少 7 天的答案）。只是檢查，不改建議、不換方法。</p>
    <p class="small muted">算法：冠軍 trend_vt@1 從 ${esc(H.start)} 起每天的 walk-forward 預測（凍結程式、只用當天以前的資料）到 ${esc(H.as_of)}，一週後實際收盤；所有重疊的同長度時期都算（彼此不獨立，所以只是描述，不是顯著性檢定）；虛擬投資用跟實盤一樣的成本（每邊 0.15%＋買進時台幣溢價）。資料每週一重算（backtest/model_health.py）。研究用途，不是投資建議。</p>
  </section>`;
}
