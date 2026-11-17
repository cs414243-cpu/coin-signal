// v68: 「剛大漲／大跌一週之後，一週價格範圍還準嗎」— reads data/bandnoise.json `regime` (backtest/band_noise.py, pre-registered
// 2026-11-17, frozen champion walk-forward, closed bars only). The condition (this close vs the close 7 days earlier) is known
// on the forecast day, so it never uses the future. Descriptive only: it does not change the range or the recommendation.
const DAY = 86400000;
const pc0 = x => `${Math.round(x * 100)}%`;
const pcS = x => `${x > 0 ? '+' : x < 0 ? '−' : ''}${Math.abs(x * 100).toFixed(1)}%`;
const md = s => `${+s.slice(0, 4)}/${+s.slice(5, 7)}/${+s.slice(8, 10)}`;
const ymd = t => new Date(t).toISOString().slice(0, 10);

/** this close / close 7 days earlier − 1, for the candle dated `asof` (closed daily bars {t, c}); null if missing. */
export function r7(bars, asof) {
  if (!Array.isArray(bars) || !asof) return null;
  const by = new Map(bars.map(k => [ymd(k.t), k.c]));
  const a = by.get(asof), b = by.get(ymd(Date.parse(asof + 'T00:00:00Z') - 7 * DAY));
  return Number.isFinite(a) && Number.isFinite(b) && b > 0 ? a / b - 1 : null;
}

/** Which pre-registered group today's forecast falls in, or null when the week was calm (|r7| < threshold). */
export function group(BN, r) {
  const th = BN?.regime?.rule?.threshold ?? 0.10;
  if (r === null || r === undefined || !Number.isFinite(r) || Math.abs(r) < th) return null;
  return r <= -th ? 'big_down' : 'big_up';
}

/** v68: the latest calendar year when this group held worse than calm days that year (report-only robustness). */
function yearNote(G, K, down) {
  const ys = Object.keys(G.years || {}).sort(), y = ys.at(-1), g = y && G.years[y], k = y && K.years?.[y];
  return g && k && g.n >= 7 && g.in_band < k.in_band ? `<strong>但 ${y} 年到現在這種日子只包住 ${pc0(g.in_band)}</strong>（${g.n} 天，平常 ${pc0(k.in_band)}${down ? `；跌到下緣以下 ${pc0(g.below)}` : `；漲到上緣以上 ${pc0(g.above)}`}），不能太放心。` : '';
}
/** Plain sentence for 看細節 under 「一週後價格大概在…」; '' when calm or data missing. */
export function line(BN, coin, r) {
  const g = group(BN, r), R = BN?.regime;
  if (!g || !R?.[g]?.all || !R?.calm?.all) return '';
  const G = R[g], K = R.calm, word = g === 'big_down' ? '大跌' : '大漲';
  const ga = G.all.in_band - K.all.in_band, go = G.oos && K.oos ? G.oos.in_band - K.oos.in_band : null;
  const verdict = ga >= 0 && go !== null && go >= 0
    ? '比平常還常包住：大動之後範圍本來就會放寬，所以現在範圍比較寬是正常的，<strong>不代表會反彈，也不代表會再' + (g === 'big_down' ? '跌' : '漲') + '</strong>'
    : (ga <= -0.05 && go !== null && go <= -0.05 ? '<strong>比平常更常沒包住</strong>，價格比較可能跑到範圍外' : '跟平常差不多');
  const side = g === 'big_down'
    ? `收盤跌到範圍下緣以下的 ${pc0(G.all.below)}（平常 ${pc0(K.all.below)}）`
    : `收盤漲到範圍上緣以上的 ${pc0(G.all.above)}（平常 ${pc0(K.all.above)}）`;
  return `剛${word}一週之後（${coin} 這次收盤比 7 天前 ${pcS(r)}），這個範圍準不準：2022 年起 BTC、ETH 這種日子實際包住 ${pc0(G.all.in_band)}`
    + (G.oos ? `（2024 年起 ${pc0(G.oos.in_band)}）` : '')
    + `，平常 ${pc0(K.all.in_band)}，${verdict}；${side}。`
    + yearNote(G, K, g === 'big_down')
    + `這些日子來自 ${G.all.episodes} 段時間、不是 ${G.all.n} 次獨立的結果；資料到 ${md(BN.as_of)}，每週一自動重算。這是過去紀錄，不是預測。`;
}
