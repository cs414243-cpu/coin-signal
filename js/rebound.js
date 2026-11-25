// v100: 空手時價格已經從最低點反彈一段了，建議還是 0：要自己先買，還是等建議？ — pure functions (no DOM, no network).
// backtest/rebound_chase.py → data/rebound.json: closed Binance daily bars from 2018, the frozen champion trend_vt@1
// formula (checked against the frozen walk-forward file), trips.sleeve costs. Trigger = the first close in a 空手 spell that
// is ≥ 10% above the spell's lowest close while the suggestion is still 0 (20% reported). Ways over the next 90 days:
// rule (照建議), chase (自己先全部買進放著), bridge (先買、等建議出現後改照建議). Definitions + answer key committed before the
// first run (dd797d0), IS-only results before any 2024+ number (7bcb4da). Trend rules lag sharp rebounds (Daniel &
// Moskowitz 2016 JFE 122(2):221–247, doi 10.1016/j.jfineco.2015.12.003). Research only, not investment advice.
import { asofInline, WEEKLY_NOTE } from './fresh.js';
const pc1 = x => !Number.isFinite(x) ? '—' : Math.abs(x) < 0.0005 ? '0.0%' : `${x < 0 ? '−' : x > 0 ? '+' : ''}${Math.abs(x * 100).toFixed(1)}%`;
const pc0 = x => Number.isFinite(x) ? `${Math.round(x * 100)}%` : '—';
const md = s => { const [, m, d] = s.split('-'); return `${+m}/${+d}`; };
const ymd = s => s.replace(/-/g, '/');
const px = x => Number.isFinite(x) ? x.toLocaleString('en-US', { maximumFractionDigits: x < 100 ? 2 : 0 }) : '—';
export const VERDICTS = ['wait', 'chase', 'unclear', 'too_few'];
const F = ['n', 'rule_mean', 'rule_median', 'chase_mean', 'chase_median', 'bridge_mean', 'bridge_median', 'chase_beats', 'bridge_beats',
  'd_chase', 'd_bridge', 'mdd_rule', 'mdd_chase', 'mdd_bridge', 'mdd_chase_worst', 'below', 'entered'];

export function valid(D) {
  const v = D?.verdict;
  if (!D || D.is_only || !v || !VERDICTS.includes(v.chase) || !VERDICTS.includes(v.bridge) || D.h_main !== 90 || D.tiers?.b10 !== 0.1) return false;
  const P = D.pooled?.b10?.['90'];
  return ['is_', 'oos'].every(k => F.every(f => Number.isFinite(P?.[k]?.[f])) && P[k].n > 0)
    && ['BTC', 'ETH'].every(c => D.coins?.[c]?.current && Array.isArray(D.coins[c].events?.b10));
}
const S = (D, k, tier = 'b10', h = '90') => D.pooled[tier][h][k];
/** compounded per-event difference vs the rule, as a plain percent (exp(mean log ratio) − 1) */
export const gap = d => Math.exp(d) - 1;

export function shortAnswer(D) {
  const v = D.verdict.chase;
  return v === 'wait' ? '等建議：先買常常賺得比較多，但輸的時候賠很多，連續算下來沒有比較好' : v === 'chase' ? '過去先買比較好（仍只是回測）'
    : v === 'too_few' ? '次數太少，說不準' : '說不準：兩段時間結果不一致';
}

export function headLine(D) {
  const i = S(D, 'is_'), o = S(D, 'oos'), v = D.verdict.chase;
  const h = v === 'wait' ? '<strong>照事先定的標準：等建議（差距不大，主要差在風險）。</strong>' : v === 'chase' ? '<strong>過去兩段都是先買比較好（仍只是回測）。</strong>'
    : v === 'too_few' ? '<strong>次數太少，說不準。</strong>' : '<strong>說不準：兩段時間結果相反。</strong>';
  return `${h}反彈 10% 那天自己先全部買進放著，90 天後平均 ${pc1(i.chase_mean)}（2018–23 年）／${pc1(o.chase_mean)}（2024 年起）；照建議 ${pc1(i.rule_mean)}／${pc1(o.rule_mean)}。`
    + `先買比照建議好的次數 ${pc0(i.chase_beats)}／${pc0(o.chase_beats)}——<strong>常常賺得比較多，但輸的時候賠很多</strong>：最慘一次 ${pc1(i.chase_worst.chase)}（${ymd(i.chase_worst.date)}）／${pc1(o.chase_worst.chase)}（${ymd(o.chase_worst.date)}）。`
    + `把每一次的結果連續算下去（同一筆錢一次接一次），先買平均每次比照建議 ${pc1(gap(i.d_chase))}／${pc1(gap(o.d_chase))}，幾乎一樣甚至略少。`;
}

export function riskLine(D) {
  const i = S(D, 'is_'), o = S(D, 'oos');
  return `<strong>先買要先撐過再跌一段</strong>：反彈 10% 之後 90 天內，價格又跌破那次空手期間最低點的有 ${pc0(i.below)}（2018–23）／${pc0(o.below)}（2024 起）。`
    + `這 90 天裡，先買的錢從最高點平均最多少掉 ${pc1(-i.mdd_chase).replace('+', '')}／${pc1(-o.mdd_chase).replace('+', '')}（最慘 ${pc1(i.mdd_chase_worst)}／${pc1(o.mdd_chase_worst)}），照建議只有 ${pc1(-i.mdd_rule).replace('+', '')}／${pc1(-o.mdd_rule).replace('+', '')}。`
    + `建議在 90 天內真的轉成要放的有 ${pc0(i.entered)}／${pc0(o.entered)}，中間大約等 ${i.entry_days_median}／${o.entry_days_median} 天。`;
}

export function bridgeLine(D) {
  const i = S(D, 'is_'), o = S(D, 'oos'), v = D.verdict.bridge;
  return `另一種：<strong>先買、等建議出現後改照建議</strong>——90 天後平均 ${pc1(i.bridge_mean)}／${pc1(o.bridge_mean)}，比照建議好的次數 ${pc0(i.bridge_beats)}／${pc0(o.bridge_beats)}，連續算每次 ${pc1(gap(i.d_bridge))}／${pc1(gap(o.d_bridge))}`
    + (v === 'wait' ? '：<strong>兩段也都沒有比較好</strong>。' : v === 'chase' ? '：兩段都比較好（仍只是回測）。' : '：說不準。');
}

export function b20Line(D) {
  const i = S(D, 'is_', 'b20'), o = S(D, 'oos', 'b20');
  return `反彈 20% 才先買：2018–23 年 ${i.n} 次、2024 年起只有 ${o.n} 次，${D.verdict.b20_chase === 'too_few' ? '次數太少，不下結論' : '見資料檔'}（90 天後平均先買 ${pc1(i.chase_mean)}／${pc1(o.chase_mean)}、照建議 ${pc1(i.rule_mean)}／${pc1(o.rule_mean)}）。`;
}

export function nowLine(D) {
  const parts = ['BTC', 'ETH'].map(c => {
    const x = D.coins[c].current;
    if (!x.flat) return `${c} 資料最後一天（${md(x.date)}）建議不是空手，這張卡不適用`;
    const hit = x.rebound >= 0.1;
    return `${c} 從 ${md(x.spell_start)} 起空手，這段最低收盤 ${px(x.low)}（${md(x.low_date)}），${md(x.date)} 收盤 ${px(x.close)}＝反彈 ${pc1(x.rebound)}；反彈 10% 是 ${px(x.price_b10)}${hit ? '（已經到了）' : '（還沒到）'}`;
  });
  return `現在：${parts.join('；')}。反彈 10% 的價格<strong>不是</strong>建議會變的價格；建議什麼時候會變，看首頁「什麼時候會變」。`;
}

function rowsHtml(D) {
  const L = ['BTC', 'ETH'].flatMap(c => D.coins[c].events.b10.filter(e => Number.isFinite(e.rule90)).map(e => ({ c, ...e })));
  L.sort((a, b) => a.date < b.date ? 1 : -1);
  return L.map(e => `<tr><td>${e.date}</td><td>${e.c}</td><td>${pc1(e.b)}</td><td>${pc1(e.chase90)}</td><td>${pc1(e.bridge90)}</td><td>${pc1(e.rule90)}</td><td>${e.below ? '是' : '否'}</td></tr>`).join('');
}

export function you(D) {
  return '空手時看到價格從低點彈上來，很容易覺得「再不買就來不及」。過去的答案是：先買不是穩賺的捷徑——多數時候比照建議賺得多，但有好幾次在接下來幾週再跌一大段（最慘少掉一半）；'
    + '連續算下來，跟乖乖等建議差不多。如果真的忍不住，也只放一小部分、並先想好跌破這次最低點時要怎麼做；照建議的人則不用猜底。'
    + `次數不多（2018–23 年 ${S(D, 'is_').n} 次、2024 年起 ${S(D, 'oos').n} 次），數字會有誤差；過去不保證未來。建議本身不會因為這張卡改變。`;
}

/** Advanced card. */
export function reboundCard(D) {
  const id = 'rebound', h2 = '空手時價格已經從最低點反彈一段了，建議還是 0：要自己先買嗎？';
  if (!valid(D)) return `<section class="card" id="${id}"><h2>${h2}</h2><p class="muted small">資料讀不到，稍後再試。</p></section>`;
  const i = S(D, 'is_'), o = S(D, 'oos');
  return `<section class="card" id="${id}"><h2>${h2}</h2>
    <p class="small">找出過去每一次「建議空手、價格已經比這次空手期間的最低收盤高 10%，但建議還是 0」的第一天（2018–23 年 ${i.n} 次、2024 年起 ${o.n} 次，BTC、ETH 合起來），比 90 天後：照建議、自己先全部買進放著、先買等建議出現後改照建議（含手續費和台幣溢價）。</p>
    <p><strong>要自己先買嗎？</strong>${headLine(D)}</p>
    <p class="small">${riskLine(D)}</p>
    <p class="small">${bridgeLine(D)}</p>
    <p class="small">${nowLine(D)}</p>
    <details><summary class="small">每一次（反彈 10% 那天，90 天後）</summary>
      <div class="scroll"><table class="bt"><thead><tr><th>那天</th><th>幣</th><th>已反彈</th><th>先買放著</th><th>先買再照建議</th><th>照建議</th><th>又跌破最低點</th></tr></thead><tbody>${rowsHtml(D)}</tbody></table></div>
      <p class="small muted">${b20Line(D)}</p>
    </details>
    <p class="small"><strong>對你來說</strong>：${you(D)}</p>
    <p class="small muted">算法：<code>backtest/rebound_chase.py</code> → <code>data/rebound.json</code>（Binance 已收完日K、2018 年起；冠軍 trend_vt@1 凍結公式，和凍結的逐日重做檔核對相同；每天只用當天以前的價格；${asofInline(D.as_of)}，${WEEKLY_NOTE}）。每天早上 8 點收盤做；買賣 0.15%、買進加台幣溢價 0.27%，沒投入的錢放 USDT、不計利息；算到 90 天後收盤、不扣最後賣出成本。2018–23 年只算 90 天在 2023 年底前結束的次數。判定事先固定（commit dd797d0）：「連續算」的平均差兩段都小於 0＝等建議、都大於 0＝先買、其他＝說不準，每段至少 3 次。研究用途，不是投資建議。</p>
  </section>`;
}
