// v54: 每一年：照建議 vs 一直抱著 — pure functions (no DOM, no network).
// Every other result card shows multi-year totals or rolling windows; people judge a method year by year (Benartzi &
// Thaler 1995 QJE 110(1), myopic loss aversion). Trend following lags in strong bull years and helps in bear years (Hurst,
// Ooi & Pedersen 2017 JPM 44(1)). This card shows each calendar year of the SAME frozen rule (trend_vt@1) next to buying
// and holding — backtest/year_by_year.py → data/years.json (definitions fixed before the first run). Not a signal.
import { asofInline, WEEKLY_NOTE } from './fresh.js';
const pc1 = x => Number.isFinite(x) ? `${x < 0 ? '−' : x > 0 ? '+' : ''}${Math.abs(x * 100).toFixed(1)}%` : '—';
const pc0 = x => Number.isFinite(x) ? `${Math.round(x * 100)}%` : '—';
const dd1 = x => Number.isFinite(x) ? `${x < 0 ? '−' : ''}${Math.abs(x * 100).toFixed(1)}%` : '—';
const md = s => s ? `${Number(s.slice(5, 7))}/${Number(s.slice(8, 10))}` : '—';
const pp = x => Number.isFinite(x) ? `${Math.round(Math.abs(x * 100))} 個百分點` : '—';
const span = S => S?.n ? `${S.years[0]}–${S.years[S.years.length - 1]}` : '—';

/** The year-to-date row of a coin (or of the mix when c === 'MIX'); null when the last year is complete / file missing. */
export function ytd(Y, c) {
  const rows = c === 'MIX' ? Y?.mix?.years : Y?.coins?.[c]?.years; const r = rows?.at?.(-1);
  return r && r.partial && r.year >= 2019 ? r : null;
}

/** One plain line inside 「看 X 的細節」. '' when the file is missing. */
export function detailLine(c, Y) {
  const S = Y?.coins?.[c]?.summary?.full; if (!S?.n) return '';
  const t = ytd(Y, c);
  return `每一年來看：${span(S)} ${S.n} 個完整年，照建議賺得比一直抱著多的只有 ${S.beat} 年，但一年中間最慘的跌幅比較淺的有 ${S.shallower} 年`
    + (t ? `；今年到 ${md(t.last)}：照建議 ${pc1(t.follow.ret)}、一直抱著 ${pc1(t.hold.ret)}` : '') + '。';
}

function rows(list, withExp) {
  return list.map(r => {
    const lab = `${r.year}${r.partial ? `<div class="muted small">${md(r.first)}–${md(r.last)}${r.year === list.at(-1).year ? '（到目前）' : ''}</div>` : ''}${r.period === 'after' ? '<div class="muted small">選定之後</div>' : ''}`;
    const win = r.follow.ret > r.hold.ret;
    return `<tr><th>${lab}</th><td>${win ? '<strong>' : ''}${pc1(r.follow.ret)}${win ? '</strong>' : ''}</td><td>${!win ? '<strong>' : ''}${pc1(r.hold.ret)}${!win ? '</strong>' : ''}</td>`
      + `<td>${dd1(r.follow.dd)}</td><td>${dd1(r.hold.dd)}</td>${withExp ? `<td>${pc0(r.mean_exposure)}</td>` : ''}</tr>`;
  }).join('');
}
function table(title, list, withExp) {
  const head = `<tr><th>年</th><th>照建議</th><th>一直抱著</th><th>照建議<div class="muted small">年內最慘跌</div></th><th>抱著<div class="muted small">年內最慘跌</div></th>${withExp ? '<th>平均放多少</th>' : ''}</tr>`;
  return `<h3>${title}</h3><div class="scroll"><table class="bt"><thead>${head}</thead><tbody>${rows(list, withExp)}</tbody></table></div>`;
}

/** Advanced card 「每一年：照建議 vs 一直抱著」. */
export function yearsCard(Y) {
  const id = 'years', h2 = '每一年：照建議 vs 一直抱著';
  if (!Y?.coins?.BTC || !Y?.coins?.ETH || !Y?.mix) return `<section class="card" id="${id}"><h2>${h2}</h2><p class="muted small">資料讀不到，稍後再試。</p></section>`;
  const B = Y.coins.BTC.summary, E = Y.coins.ETH.summary, M = Y.mix.summary;
  const tB = ytd(Y, 'BTC'), tE = ytd(Y, 'ETH'), tM = ytd(Y, 'MIX');
  const bull = M.bull, down = M.down, aB = B.after, aE = E.after;
  const aRows = Y.coins.BTC.years.filter(r => r.period === 'after' && !r.partial);
  return `<section class="card" id="${id}"><h2>${h2}</h2>
    <p class="small">其他卡片大多是「好幾年加起來」的成績，但實際上大家是一年一年在看。這裡把同一套建議每個日曆年分開算（含手續費），旁邊是一直抱著。</p>
    <p><strong>結論</strong>：照建議<strong>不是每年都賺比較多</strong>——${span(B.full)} ${B.full.n} 個完整年，賺得比一直抱著多的 BTC 只有 <strong>${B.full.beat} 年</strong>、ETH ${E.full.beat} 年、兩幣各一半 ${M.full.beat} 年；但<strong>每一年中間最慘的跌幅都比較淺</strong>（BTC ${B.full.shallower}／${B.full.n} 年、ETH ${E.full.shallower}／${E.full.n} 年）。</p>
    ${tB && tE ? `<p><strong>今年到 ${md(tB.last)}</strong>：照建議 BTC ${pc1(tB.follow.ret)}、ETH ${pc1(tE.follow.ret)}${tM ? `（各一半 ${pc1(tM.follow.ret)}）` : ''}；一直抱著 ${pc1(tB.hold.ret)}／${pc1(tE.hold.ret)}${tM ? `（${pc1(tM.hold.ret)}）` : ''}。今年中間最慘跌幅：照建議 ${dd1(tB.follow.dd)}／${dd1(tE.follow.dd)}，一直抱著 ${dd1(tB.hold.dd)}／${dd1(tE.hold.dd)}。</p>` : ''}
    <p class="small"><strong>哪種年會輸、哪種年會贏</strong>（兩幣各一半）：一直抱著漲 50% 以上的大漲年（${bull.n ? bull.years.join('、') : '—'}）照建議 <strong>${bull.beat}／${bull.n} 年贏</strong>，每年少賺中間值 ${pp(bull.diff_median)}；一直抱著下跌的年（${down.n ? down.years.join('、') : '—'}）照建議 ${down.beat}／${down.n} 年贏，每年多出中間值 ${pp(down.diff_median)}。</p>
    <p class="small"><strong>對你來說</strong>：遇到大漲年，照建議幾乎一定落後一直抱著很多——這是這套方法本來的樣子（用少賺換少虧），不是壞掉。它的好處要在下跌年和「最慘跌幅」才看得到，所以要看好幾年，不要因為某一年輸給抱著就換方法；反過來，今年贏也只是因為今年在跌。</p>
    ${table('兩幣各一半（每年年初各放一半）', Y.mix.years, false)}${table('BTC', Y.coins.BTC.years, true)}${table('ETH', Y.coins.ETH.years, true)}
    <p class="small"><strong>注意</strong>：規則選定之後才發生的完整年只有 ${aB.n} 年（${aRows.map(r => r.year).join('、')}）：BTC 贏 ${aB.beat} 年（${aRows.map(r => `${r.year} ${pc1(r.follow.ret)} vs ${pc1(r.hold.ret)}`).join('；')}）、ETH 贏 ${aE.beat} 年。${aRows.some(r => r.hold.ret < 0 && r.follow.ret < r.hold.ret) ? 'BTC 有一個下跌年照建議也沒有比較好。' : ''}年數很少，「哪種年會贏」是過去的樣子，不是保證。</p>
    <p class="small muted">算法：<code>backtest/year_by_year.py</code> → <code>data/years.json</code>（Binance 已收完日K，${asofInline(Y.as_of)}，${WEEKLY_NOTE}；定義在第一次執行前固定在程式說明）。照建議＝冠軍 trend_vt@1（凍結公式，與每日預測每一天相同），${Y.coins.BTC.first} 起從現金開始、每天早上 8 點收盤照建議比例調整；一直抱著＝同一天買進後不動。買賣各扣 0.15%、買進再扣台幣溢價 0.27%（和虛擬投組相同）；沒放的錢不計利息。每年報酬＝前一年最後一天到當年最後一天；年內最慘跌＝當年從高點往下最多跌多少（年初那天也算高點）。2018 年從 ${md(Y.coins.BTC.first)} 才開始、今年還沒過完，兩者不算進「幾年贏」。2023 年（含）以前是選定這套規則時看過的資料，「選定之後」＝2024 年起。這是過去紀錄，不是預測。</p>
  </section>`;
}
