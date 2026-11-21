// v91: 已經從最高點跌了一半，是不是便宜了？現在買，還是等建議？ — pure functions (no DOM, no network).
// backtest/deep_drop.py → data/deepdrop.json: every time BTC / ETH first closed ≥ 50% (and ≥ 70%) below its all-time-high
// close (Binance from 2017-08-17, Coin Metrics PriceUSD before), compare buying everything that day / buying 1/12 every
// 30 days / following the champion rule, 1 and 2 years later, costs included. Definitions committed before the first
// run (ad37dbb), IS-only (windows ending ≤ 2017) before any later number. Not a signal; the recommendation is unchanged.
// Research only, not investment advice.
import { asofInline, WEEKLY_NOTE } from './fresh.js';
const pc0 = x => Number.isFinite(x) ? `${x < 0 ? '−' : ''}${Math.abs(Math.round(x * 100))}%` : '—';
const pc1 = x => Number.isFinite(x) ? `${x < 0 ? '−' : x > 0 ? '+' : ''}${Math.abs(x * 100).toFixed(1)}%` : '—';
const usd = x => Number.isFinite(x) ? (x >= 100 ? Math.round(x).toLocaleString('en-US') : x >= 10 ? x.toFixed(1) : x.toFixed(2)) : '—';
const per100 = v => Number.isFinite(v) ? Math.round(v * 100).toLocaleString('en-US') : '—';
const slash = s => s ? s.replace(/-/g, '/') : '—';
export const STRATS = ['now', 'dca12', 'rule'];
export const LABEL = { now: '那天全部買進', dca12: '分 12 個月買', rule: '照建議' };
const WIN = ['now', 'dca12', 'rule', 'mixed'];

export function valid(D) {
  if (!D || D.is_only || !Array.isArray(D.events) || !D.verdict || !D.now || !D.pooled) return false;
  if (D.main?.x !== 0.5 || D.main?.h !== 365) return false;
  if (!Object.values(D.verdict).every(v => WIN.includes(v.winner))) return false;
  if (!['BTC', 'ETH'].every(c => Number.isFinite(D.now[c]?.dd) && Number.isFinite(D.now[c]?.price))) return false;
  return D.events.every(e => ['365', '730'].every(h => STRATS.every(s => Number.isFinite(e.h?.[h]?.value?.[s]))));
}

export const main = (D, x = D.main.x) => D.events.filter(e => e.x === x);
export const done = (D, x = D.main.x, h = String(D.main.h)) => main(D, x).filter(e => e.h[h].done);

/** Counts behind the headline (completed events only). */
export function summary(D, x = D.main.x, h = String(D.main.h)) {
  const ev = done(D, x, h);
  const loss = s => ev.filter(e => e.h[h].value[s] < 1).length;
  const worst = s => Math.min(...ev.map(e => e.h[h].value[s]));
  const best = s => Math.max(...ev.map(e => e.h[h].value[s]));
  const fur = ev.map(e => e.h[h].further).filter(Number.isFinite).sort((a, b) => a - b);
  const med = fur.length ? (fur.length % 2 ? fur[(fur.length - 1) / 2] : (fur[fur.length / 2 - 1] + fur[fur.length / 2]) / 2) : NaN;
  const top = s => ev.filter(e => STRATS.every(o => o === s || e.h[h].value[s] > e.h[h].value[o])).length;
  return {
    n: ev.length, all: main(D, x).length, running: main(D, x).length - ev.length,
    loss: Object.fromEntries(STRATS.map(s => [s, loss(s)])), worst: Object.fromEntries(STRATS.map(s => [s, worst(s)])),
    best: Object.fromEntries(STRATS.map(s => [s, best(s)])), top: Object.fromEntries(STRATS.map(s => [s, top(s)])),
    furtherMed: med, furtherMin: fur.length ? fur[0] : NaN,
  };
}

const coinName = c => c;
export function todayLine(D) {
  const parts = ['BTC', 'ETH'].map(c => {
    const n = D.now[c];
    const crossed = n.crossed50 ? `；${slash(n.crossed50)} 第一次跌破一半，之後又 ${pc1(n.since50_change)}` : '';
    return `${coinName(c)} ${slash(n.date)} 收盤 ${usd(n.price)} 美元，比 ${slash(n.ath_date)} 最高收盤 ${usd(n.ath)} 少 <strong>${pc0(-n.dd)}</strong>${crossed}`;
  });
  const flat = ['BTC', 'ETH'].every(c => D.now[c].rule_expo === 0);
  return `現在：${parts.join('。')}。${flat ? '建議（照趨勢規則）兩個都還是「先不要放」。' : ''}`;
}

export function headLine(D) {
  const S = summary(D);
  const w = D.verdict.now_vs_rule.winner === 'mixed' && D.verdict.dca12_vs_rule.winner === 'mixed' && D.verdict.now_vs_dca12.winner === 'mixed';
  return `<strong>跌一半不代表到底了。</strong>過去 BTC、ETH 第一次跌破一半共 ${S.all} 次（已經滿 1 年的 ${S.n} 次）：`
    + `那天全部買進，1 年後還在賠的有 <strong>${S.loss.now} 次</strong>（最慘剩 ${per100(S.worst.now)} 元／每 100 元）；跌破之後價格又再跌，中間值 ${pc0(S.furtherMed)}、最多 ${pc0(S.furtherMin)}。`
    + `照建議 1 年後賠的有 ${S.loss.rule} 次（最慘剩 ${per100(S.worst.rule)} 元）；分 12 個月買賠 ${S.loss.dca12} 次（最慘剩 ${per100(S.worst.dca12)} 元）。`
    + (w ? '但<strong>沒有一種做法每次都比較好</strong>：全部買進賺最多的 ' + S.top.now + ' 次、分 12 個月 ' + S.top.dca12 + ' 次、照建議 ' + S.top.rule
         + ` 次——${bigLine(D)}照事先定的標準：<strong>說不準哪個好</strong>，照建議的好處是賠得少。`
       : '照事先定的標準，有一種做法在兩段期間都比較好（見下表）。');
}

export function pooledLine(D) {
  const b = D.pooled.BTC['2018+'], e = D.pooled.ETH['2018+'];
  if (!b?.now || !e?.now) return '';
  return `換個問法：已經跌一半以後的<strong>任何一天</strong>買進抱 1 年（2018 年起，BTC ${b.days} 天、ETH ${e.days} 天，天跟天重疊很多，只是描述）：`
    + `BTC 賠錢的天占 ${pc0(b.now.loss_share)}、中間值變 ${b.now.median.toFixed(2)} 倍；ETH 賠錢的天占 ${pc0(e.now.loss_share)}、最差的 1 成天數剩不到 ${per100(e.now.p10)} 元。`
    + `照建議同樣這些天：BTC 賠 ${pc0(b.rule.loss_share)}、ETH 賠 ${pc0(e.rule.loss_share)}，但中間值只有 ${b.rule.median.toFixed(2)}／${e.rule.median.toFixed(2)} 倍。`
    + '差別在：這些天包含很多接近谷底的日子，而<strong>事前不知道哪一天是谷底</strong>——第一次跌破一半那天通常還不是。';
}

export function table(D, x = D.main.x) {
  const rows = main(D, x).map(e => {
    const h = e.h['365'];
    const v = s => `${per100(h.value[s])}`;
    const mark = h.done ? '' : '＊';
    return `<tr><td>${slash(e.date)}${mark}</td><td>${e.coin}</td><td>${pc0(h.further)}</td><td>${v('now')}</td><td>${v('dca12')}</td><td>${v('rule')}</td></tr>`;
  }).join('');
  return `<div class="tbl-wrap"><table class="small"><thead><tr><th>跌破一半</th><th>幣</th><th>之後再跌</th><th>全買</th><th>分12月</th><th>照建議</th></tr></thead><tbody>${rows}</tbody></table></div>
    <p class="small muted">「之後再跌」＝跌破那天之後 1 年內，價格最多再跌多少。右邊三欄＝每投入 100 元，1 年後剩多少（全買＝那天全部買進、分12月＝每 30 天買 1/12；含手續費和台幣溢價）。＊＝還沒滿 1 年，算到 ${slash(D.as_of)}。2017 年 8 月以前用 Coin Metrics 的價格。</p>`;
}

export function deeperLine(D) {
  const S = summary(D, 0.7);
  if (!S.n) return '';
  return `跌了<strong>七成</strong>才買呢？過去 ${S.n} 次（已滿 1 年）：1 年後全部買進賠 ${S.loss.now} 次、分 12 個月賠 ${S.loss.dca12} 次、照建議賠 ${S.loss.rule} 次；跌越深再買，賠的次數比較少，但等不等得到七成事前不知道：${noSeventy(D)}`;
}

export function deepDropCard(D) {
  const id = 'deepdrop', h2 = '已經從最高點跌了一半，是不是便宜了？現在買，還是等建議？';
  if (!valid(D)) return `<section class="card" id="${id}"><h2>${h2}</h2><p class="muted small">資料讀不到，稍後再試。</p></section>`;
  const S = summary(D);
  return `<section class="card" id="${id}"><h2>${h2}</h2>
    <p class="small">${todayLine(D)}</p>
    <p><strong>結論</strong>：${headLine(D)}</p>
    ${table(D)}
    <p class="small">${pooledLine(D)}</p>
    <p class="small">${deeperLine(D)}</p>
    <p class="small"><strong>如果還是想先買</strong>：先想好「買了之後再跌 ${pc0(S.furtherMed)}」（過去的中間值）時你會怎麼做；只用賠掉也不影響生活的錢，分批比一次全買晃得少（買了之後 1 年內帳面最多少掉，中間值：全部買進 ${pc0(medDD(D, 'now'))}、分 12 個月 ${pc0(medDD(D, 'dca12'))}、照建議 ${pc0(medDD(D, 'rule'))}）。這張卡不會改變首頁的建議。</p>
    <p class="small muted">算法：<code>backtest/deep_drop.py</code> → <code>data/deepdrop.json</code>（Binance 已收完日K，2017-08-17 以前用 Coin Metrics Community Data 的價格；照建議＝冠軍 trend_vt@1 同一個公式逐日算、每天只用當天以前的資料；${asofInline(D.as_of)}，${WEEKLY_NOTE}）。「跌一半」＝收盤比之前最高收盤少 50% 以上的第一天，回到新高後才重新算。買賣 0.15%、買進加台幣溢價 0.27%，沒投入的錢不計利息。定義和判定事先固定（commit ad37dbb）：2017 年以前結束的 ${D.verdict.now_vs_rule.IS.n} 次和之後的 ${D.verdict.now_vs_rule.OOS.n} 次，兩段都要有 ${Math.round(D.win_share * 100)}% 以上的次數比較好才算「比較好」。次數很少，只能當參考。</p>
  </section>`;
}

export function medDD(D, s, h = String(D.main.h)) {
  const v = done(D).map(e => e.h[h].maxdd[s]).sort((a, b) => a - b);
  if (!v.length) return NaN;
  return v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2;
}

/** Events where buying everything ended ≥ 2× the rule after 1 year (the rebounds the rule only partly caught). */
export function bigLine(D, h = String(D.main.h)) {
  const big = done(D).filter(e => e.h[h].value.now >= 2 * e.h[h].value.rule);
  if (!big.length) return '';
  return `大漲的那幾次（${big.map(e => `${e.date.slice(0, 4)} 年 ${e.coin}`).join('、')}）照建議因為放得少，1 年後只有全部買進的一小部分。`;
}

/** Finished episodes (a later 50% event of the same coin exists → a new high came first) that never reached −70%. */
export function noSeventy(D) {
  const ev = main(D).filter(e => main(D).some(o => o.coin === e.coin && o.date > e.date));
  const miss = ev.filter(e => !main(D, 0.7).some(o => o.coin === e.coin && o.ath_date === e.ath_date));
  return `已經結束的 ${ev.length} 次跌破一半裡，有 ${miss.length} 次沒跌到七成就回頭創新高（${miss.map(e => `${e.date.slice(0, 4)} ${e.coin}`).join('、')}）。`;
}
