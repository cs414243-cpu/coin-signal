import { buildRows, completedOnly, rulePositions, analog, STATE, FEATURES, DAY } from './signals.js';
import { fetchCandles, fetchCheck, fetchFunding, fetchFng, fetchSpot, fetchPrices, fetchTicker, CANDLE_ORDER, PAIR } from './data.js';
import * as RL from './reliability.js';
import * as DX from './decision.js';
import { weekCard, eventsCard } from './events.js';
import * as FL from './flips.js';
import * as OC from './outcomes.js';
import * as WR from './weekrisk.js';
import * as TR from './trust.js';
import * as FR from './fresh.js';
import * as PU from './pup.js';
import * as JR from './journal.js';
import * as ID from './intraday.js';
import * as TS from './tested.js';
import * as TB from './tradeband.js';
import * as RB from './robust.js';
import * as OF from './overfit.js';
import * as GD from './guard.js';
import * as XS from './xsrc.js';
import * as SP from './spells.js';
import * as NM from './nextmove.js';

const $ = s => document.querySelector(s);
const TZ = 'Asia/Taipei';
const fmtTime = t => new Intl.DateTimeFormat('zh-TW', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(t)) + '（台北時間）';
const fmtDate = t => new Intl.DateTimeFormat('zh-TW', { timeZone: TZ, month: 'numeric', day: 'numeric' }).format(new Date(t));
const pct = (x, d = 1) => x === null || x === undefined || Number.isNaN(x) ? '—' : `${x > 0 ? '+' : ''}${(x * 100).toFixed(d)}%`;
const pct0 = (x, d = 0) => x === null || x === undefined || Number.isNaN(x) ? '—' : `${(x * 100).toFixed(d)}%`;
const usd = x => x === null || x === undefined || Number.isNaN(x) ? '—' : '$' + x.toLocaleString('en-US', { maximumFractionDigits: x > 1000 ? 0 : 2 });
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pv = p => p === null || p === undefined || Number.isNaN(p) ? '—' : p < 0.001 ? '< 0.001' : p.toFixed(3);

const VERDICT = { edge: ['有優勢', 'v-edge'], risk: ['只降風險', 'v-risk'], weak: ['不顯著', 'v-weak'], none: ['無優勢', 'v-none'] };
const ORDER = ['ma50', 'ma200', 'mom30', 'fund7', 'fng', 'vol', 'rsi'];

let BT = null, coin = localStorage.getItem('coin') || 'BTC';

function currentValue(key, r) {
  switch (key) {
    case 'ma200': return `價格 ${usd(r.c)}｜200 日均線 ${usd(r.ma200)}（${pct(r.d200)}）`;
    case 'ma50': return `價格 ${usd(r.c)}｜50 日均線 ${usd(r.ma50)}（${pct(r.d50)}）`;
    case 'mom30': return `過去 30 天 ${pct(r.mom30)}`;
    case 'fund7': return Number.isNaN(r.fund7) ? '資金費率暫時抓不到' : `年化 ${pct(r.fund7)}（每 8 小時約 ${(r.fund7 / 1095 * 100).toFixed(4)}%）`;
    case 'fng': return Number.isNaN(r.fng) ? '指數暫時抓不到' : `${r.fng} 分（0 = 極度恐懼，100 = 極度貪婪）`;
    case 'vol': return `30 日年化波動 ${pct0(r.vol30)}，高於過去一年 ${pct0(r.volpct)} 的日子`;
    case 'rsi': return `RSI ${Number.isNaN(r.rsi14) ? '—' : r.rsi14.toFixed(1)}`;
  }
}

function stateRow(st, label, base, name) {
  if (!st || !st.n || st.n < 20) return `<tr><td>${esc(name)}</td><td colspan="4">樣本太少</td></tr>`;
  const sig = st.up_p < 0.05;
  return `<tr><td>${esc(name)}</td><td>${pct0(st.up)}<span class="muted">（基準 ${pct0(base)}）</span></td><td>${pct(st.median)}</td><td>${st.n}<span class="muted">／約 ${st.n_eff} 週</span></td><td class="${sig ? 'sig' : 'nsig'}">${pv(st.up_p)}</td></tr>`;
}

function btTable(b) {
  const row = (lab, x) => !x ? '' : `<tr><th>${lab}<div class="muted small nowrap">${x.start.slice(0, 7)}～${x.end.slice(0, 7)}</div></th>
    <td>${pct(x.strat.cagr)}<div class="muted small">持有 ${pct(x.bh.cagr)}</div></td>
    <td>${x.strat.sharpe.toFixed(2)}<div class="muted small">持有 ${x.bh.sharpe.toFixed(2)}</div></td>
    <td>${pct(x.strat.maxdd, 0)}<div class="muted small">持有 ${pct(x.bh.maxdd, 0)}</div></td>
    <td>${x.hit_long_up === null ? '—' : pct0(x.hit_long_up)}<div class="muted small">基準 ${pct0(x.base_up)}</div></td>
    <td class="${x.sharpe_boot_p < 0.05 ? 'sig' : 'nsig'}">${pv(x.sharpe_boot_p)}</td></tr>`;
  return `<div class="scroll"><table class="bt"><thead><tr><th>期間</th><th>年化報酬</th><th>夏普值</th><th>最大跌幅</th><th>持有週上漲率</th><th>p 值</th></tr></thead>
    <tbody>${row('樣本外', b.oos)}${row('樣本內', b.is)}${row('全期', b.full)}</tbody></table></div>
    <p class="small muted">樣本外週數 ${b.oos?.n_weeks ?? '—'}，持有部位 ${pct0(b.oos?.strat.exposure)} 的時間，每年進出約 ${b.oos?.strat.trades_per_yr ?? '—'} 次。報酬已扣每次進出 0.15%（手續費加滑價）。p 值是「夏普值其實沒贏過持有」的機率（區塊自助法），小於 0.05 才算顯著。</p>`;
}

function signalCard(key, sig, r, pos) {
  const state = STATE[key](r);
  const [vtxt, vcls] = VERDICT[sig.verdict.level];
  const st = sig.states;
  const cur = state ? `<tr class="cur"><td colspan="5">現在：<strong>${esc(sig.labels[state])}</strong></td></tr>` : '';
  const curRows = state ? [['全期', st.full], ['樣本內', st.is], ['樣本外', st.oos]].map(([n, t]) => stateRow(t.states[state], sig.labels[state], t.base_up, n)).join('') : '';
  const allStates = Object.keys(sig.labels).map(s => stateRow(st.full.states[s], sig.labels[s], st.full.base_up, sig.labels[s])).join('');
  const posTxt = pos === null ? '—' : pos ? '規則：持有' : '規則：空手';
  const oosSame = state && st.is.states[state]?.up_diff !== undefined && st.oos.states[state]?.up_diff !== undefined
    ? Math.sign(st.is.states[state].up_diff) === Math.sign(st.oos.states[state].up_diff) : null;
  const warn = sig.verdict.level !== 'edge' ? `<p class="warn">⚠️ ${esc(sig.verdict.text)}</p>` : `<p class="ok">${esc(sig.verdict.text)}</p>`;
  return `<article class="card signal">
    <div class="sig-head"><h3>${esc(sig.name)}</h3><span class="badge ${vcls}">${vtxt}</span></div>
    <p class="value">${currentValue(key, r)}</p>
    <p class="state">${state ? esc(sig.labels[state]) : '資料不足'} <span class="pos ${pos ? 'on' : 'off'}">${posTxt}</span></p>
    ${warn}
    <h4>過去處於「${state ? esc(sig.labels[state]) : '—'}」時，一週後</h4>
    <div class="scroll"><table class="states"><thead><tr><th></th><th>上漲機率</th><th>中位報酬</th><th>樣本</th><th>p 值</th></tr></thead><tbody>${cur}${curRows}</tbody></table></div>
    ${oosSame === false ? '<p class="small warn-inline">樣本內和樣本外的方向相反：這個狀態的「偏多／偏空」不穩定。</p>' : ''}
    <details><summary>規則回測（扣成本，對比單純持有）</summary>
      <p class="small">規則：${esc(sig.rule)}。規則是事先固定的常見用法，沒有拿資料調參數。</p>
      ${btTable(sig.backtest)}
    </details>
    <details><summary>所有狀態（全期）</summary>
      <div class="scroll"><table class="states"><thead><tr><th>狀態</th><th>上漲機率</th><th>中位報酬</th><th>樣本</th><th>p 值</th></tr></thead><tbody>${allStates}</tbody></table></div>
      <p class="small muted">7 天報酬每天滾動計算會彼此重疊，所以「約 N 週」才是比較接近真實的獨立樣本數；p 值已用 Newey-West 方法校正重疊。</p>
    </details>
  </article>`;
}

function outlookCard(c, r, a, live) {
  const ev = c.analog.eval;
  const skill = ev.brier_skill > 0 && ev.ic_p < 0.05;
  const trendKeys = ['ma50', 'ma200', 'mom30'];
  const pos = rulePositions(live.rows);
  const nUp = trendKeys.filter(k => pos[k] === 1).length;
  return `<section class="card outlook">
    <h2>未來一週展望</h2>
    <div class="big">
      <div><div class="label">相似日子一週後上漲</div><div class="num">${pct0(a.up)}</div><div class="muted small">基準（所有日子）${pct0(a.baseUp)}</div></div>
      <div><div class="label">中位報酬</div><div class="num">${pct(a.median)}</div><div class="muted small">8 成落在 ${pct(a.p10, 0)} ～ ${pct(a.p90, 0)}</div></div>
    </div>
    <p class="small">做法：用 ${a.usedFeatures.length} 個指標（均線距離、30 天動能、波動分位、RSI、恐懼貪婪、資金費率）找出 2020 年以來最像今天的 ${a.k} 個日子，看它們一週後怎麼走。最像的幾天：${a.dates.join('、')}。</p>
    ${skill ? '' : `<p class="warn">⚠️ <strong>這個綜合預測在樣本外沒有預測力。</strong>2022 年起逐日只用當時已知資料重做（walk-forward），預測準確度比「永遠猜基準率」還差（Brier 技能分數 ${ev.brier_skill.toFixed(3)}，0 以下代表更差；AUC ${ev.auc.toFixed(2)}，0.5 等於亂猜）。照它「上漲機率 > 50% 才持有」操作，年化 ${pct(ev.strat.cagr)}，單純持有 ${pct(ev.bh.cagr)}。最誠實的一週上漲機率估計就是基準率 <strong>${pct0(a.baseUp)}</strong>，而且每週漲跌幅度可能很大。</p>`}
    <p class="trend">趨勢類規則（研究中唯一較站得住的一類，主要價值是減少大跌）：3 條中 <strong>${nUp}</strong> 條目前是「持有」。</p>
    <details><summary>綜合預測的樣本外檢驗</summary>
      <table class="bt"><tbody>
        <tr><th>期間</th><td>${ev.start}～${ev.end}（${ev.n_weeks} 個獨立週）</td></tr>
        <tr><th>Brier 技能分數</th><td>${ev.brier_skill.toFixed(4)}（模型 ${ev.brier}／基準 ${ev.brier_base}）</td></tr>
        <tr><th>AUC</th><td>${ev.auc}</td></tr>
        <tr><th>預測中位數與實際報酬的等級相關</th><td>${ev.rank_ic}（p = ${pv(ev.ic_p)}）</td></tr>
        <tr><th>預測上漲 > 50% 時實際上漲率</th><td>${pct0(ev.hit_long_up)}（基準 ${pct0(ev.base_up)}）</td></tr>
        <tr><th>照預測操作 vs 持有</th><td>年化 ${pct(ev.strat.cagr)} vs ${pct(ev.bh.cagr)}；夏普 ${ev.strat.sharpe} vs ${ev.bh.sharpe}；最大跌幅 ${pct(ev.strat.maxdd, 0)} vs ${pct(ev.bh.maxdd, 0)}；p = ${pv(ev.sharpe_boot_p)}</td></tr>
      </tbody></table>
      <h4>校準：預測機率 vs 實際上漲率</h4>
      <table class="bt"><thead><tr><th>預測區間</th><th>天數</th><th>平均預測</th><th>實際</th></tr></thead><tbody>
        ${ev.calibration.map(b => `<tr><td>${b.bin}</td><td>${b.n}</td><td>${pct0(b.pred)}</td><td>${pct0(b.actual)}</td></tr>`).join('')}
      </tbody></table>
    </details>
  </section>`;
}

function chart(rows) {
  const d = rows.slice(-365), W = 340, Hh = 150, P = 4;
  const vals = d.flatMap(r => [r.c, r.ma50, r.ma200]).filter(v => !Number.isNaN(v));
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const x = i => P + i * (W - 2 * P) / (d.length - 1), y = v => Hh - P - (v - lo) / (hi - lo) * (Hh - 2 * P);
  const path = k => d.map((r, i) => Number.isNaN(r[k]) ? '' : `${i && !Number.isNaN(d[i - 1][k]) ? 'L' : 'M'}${x(i).toFixed(1)},${y(r[k]).toFixed(1)}`).join('');
  return `<svg viewBox="0 0 ${W} ${Hh}" class="chart" role="img" aria-label="近一年價格與均線">
    <path d="${path('ma200')}" fill="none" stroke="#f5a524" stroke-width="1.4"/>
    <path d="${path('ma50')}" fill="none" stroke="#7aa2ff" stroke-width="1.4"/>
    <path d="${path('c')}" fill="none" stroke="#e8ecf3" stroke-width="1.6"/></svg>
    <div class="legend small"><span class="lg c">價格</span><span class="lg m50">50 日均線</span><span class="lg m200">200 日均線</span><span class="muted">近 365 天（${fmtDate(d[0].t)}～${fmtDate(d[d.length - 1].t)}）</span></div>`;
}

async function loadLive(sym, force) {
  const key = `live-${sym}`;
  const cached = JSON.parse(localStorage.getItem(key) || 'null');
  if (!force && cached && 'check' in cached && Date.now() - cached.at < 10 * 60 * 1000) return { ...cached, fromCache: true };
  // v6: primary candles, then a second source for the cross-check (in parallel with funding / F&G / spot)
  const pc = fetchCandles(sym).then(async cd => [cd, cd.data ? await fetchCheck(sym, cd.source) : null]);
  const [[cd, ck], fd, gd, spot] = await Promise.all([pc, fetchFunding(sym), fetchFng(), fetchSpot(sym)]);
  if (!cd.data) {
    if (cached) return { ...cached, fromCache: true, stale: true, errors: cd.errors };
    throw new Error('所有行情來源都連不上：' + cd.errors.join('；'));
  }
  const live = { at: Date.now(), candles: cd.data, candleSrc: cd.source, candleAt: cd.fetchedAt,
    check: ck && ck.data ? { source: ck.source, bars: ck.data, at: ck.fetchedAt } : null, checkErrors: ck ? ck.errors : [], funding: fd.data, fundingSrc: fd.source, fng: gd.data, fngSrc: gd.source, spot,
    errors: [...cd.errors, ...fd.errors, ...gd.errors] };
  try { localStorage.setItem(key, JSON.stringify(live)); } catch {}
  return live;
}

// ======================= v2: decision layer =======================
const VERSION = 'v27';
const ntd = x => x === null || x === undefined || !Number.isFinite(x) ? '—' : `${x < 0 ? '−' : ''}NT$${Math.abs(Math.round(x)).toLocaleString('en-US')}`;
const pctS = (x, d = 1) => x === null || x === undefined || !Number.isFinite(x) ? '—' : `${x < 0 ? '−' : ''}${Math.abs(x * 100).toFixed(d)}%`;
const SKEY = 'cs-v2-settings';
const DEFAULTS = { budget: 2, total: '', btc: '', eth: '', rest: '6040', lev: 3, levDays: 7, levSide: 'long', amt: 100000, route: 'usdt', vip: 0, maker: false, quote: '', dcaM: 10000, dcaW: 5, dcaBand: 25, dcaMode: 'rel', dcaBtc: 100 };
let S = { ...DEFAULTS, ...(() => { try { return JSON.parse(localStorage.getItem(SKEY) || '{}'); } catch { return {}; } })() };
const saveS = () => { try { localStorage.setItem(SKEY, JSON.stringify(S)); } catch {} };
const num = v => { const x = parseFloat(String(v).replace(/,/g, '')); return Number.isFinite(x) ? x : null; };
let DEC = null, PRICES = null, DCA = null;
const CTX = {};
const GECKO = { BTC: 'bitcoin', ETH: 'ethereum' };

function usdTwd() {
  if (PRICES?.bitcoin?.usd && PRICES?.bitcoin?.twd) return { v: PRICES.bitcoin.twd / PRICES.bitcoin.usd, src: 'CoinGecko' };
  const b = DEC.max.books.usdttwd; const mid = (b.asks[0][0] + b.bids[0][0]) / 2;
  return { v: mid / (1 + (DEC.premium.last ?? 0)), src: 'MAX 快照估算' };
}
function twdPrice(coin) {
  const p = PRICES?.[GECKO[coin]]?.twd;
  if (p) return p;
  const c = CTX[coin]; return c ? c.priceUsd * usdTwd().v : null;
}
const sideTxt = { long: '做多', short: '做空' };
const fmtDay = s => s ? s.replace(/^(\d{4})-0?(\d+)-0?(\d+)$/, '$1/$2/$3') : '—';

// ---------- 今天怎麼做 ----------
function decisionCard(coin) {
  const ctx = CTX[coin], r = ctx.r, c = DEC.coins[coin];
  const tr = DX.trendState(r);
  if (tr === null) return `<section class="card" id="today"><p class="warn">資料不足，算不出趨勢狀態。</p></section>`;
  const [lab, cls] = DX.TREND_LABEL[tr];
  const side = (d, n) => `${n} 日均線${d > 0 ? '之上' : '之下'}（${pct(d)}）`;
  const f = c.backtest.full, o = c.backtest.oos;
  const row = (name, k, cur) => `<tr${cur ? ' class="hl"' : ''}><th>${name}</th><td>${pct(f[k].maxdd, 0)}</td><td>${pct(o[k].maxdd, 0)}</td><td>${pct(f[k].cagr, 0)}</td><td>${pct(o[k].cagr, 0)}</td><td>${pct(f[k].worst_week, 0)}</td></tr>`;
  return `<section class="card decide" id="today">
    <div class="row"><div><div class="label">今天怎麼做｜${coin}</div><div class="state-big ${cls}">${lab}</div></div>
      <div class="right"><div class="num sm">${usd(ctx.priceUsd)}</div><div class="muted small">${twdPrice(coin) ? '約 ' + ntd(twdPrice(coin)) : ''}</div><div class="muted small">依據 ${fmtTime(r.t + DAY)} 收盤</div></div></div>
    <p class="why">價格在${side(r.d50, 50)}、${side(r.d200, 200)}。<span class="muted">規則：兩條都在上＝持有；只在一條之上＝部位減半；兩條都跌破＝空手。每天收盤（台北早上 8 點）檢查一次。</span></p>
    <label class="inline">我的風險預算：很糟的一週，總資產最多虧 <input type="number" inputmode="decimal" data-k="budget" value="${esc(S.budget)}" min="0.5" max="20" step="0.5"> %</label>
    <div id="dec-out"></div>
    ${chart(ctx.rows)}
    <details><summary>這條規則過去的表現（扣成本）</summary>
      <div class="scroll"><table class="bt"><thead><tr><th></th><th>最大跌幅<div class="muted small">2018 起</div></th><th>最大跌幅<div class="muted small">2023 起</div></th><th>年化<div class="muted small">2018 起</div></th><th>年化<div class="muted small">2023 起</div></th><th>最差一週</th></tr></thead>
      <tbody>${row('一直持有', 'bh')}${row('趨勢規則（本卡）', 'trend3', true)}${row('趨勢＋波動調整', 'trend3_vt')}${row('只看 50 日線', 'ma50')}</tbody></table></div>
      <p class="small">重點是<strong>少跌</strong>，不是多賺：2023 年起趨勢規則年化 ${pct(o.trend3.cagr)}，一直持有 ${pct(o.bh.cagr)}；夏普值差異的 p 值 ${pv(o.trend3.sharpe_boot_p)}（大於 0.05＝統計上不顯著）。每年大約進出 ${o.trend3.trades_per_yr} 次，已扣每次 0.15% 成本。「趨勢＋波動調整」是把部位再乘上 min(1, 30% ÷ 30 日波動)，和本卡的建議部位同一個邏輯。</p>
      <p class="small muted">${f.bh.start}～${f.bh.end}，Binance 現貨日 K；2023 年以前是樣本內、之後是樣本外。規則是事先固定的常見用法，沒有拿資料調參數（C#9、C#10）。</p>
    </details>
  </section>`;
}
function decOut(coin) {
  const ctx = CTX[coin], r = ctx.r, c = DEC.coins[coin], bwm = c.bad_week;
  const tr = DX.trendState(r); if (tr === null) return '';
  const budget = (num(S.budget) ?? 2) / 100;
  const bw = DX.badWeek(r.vol30, bwm.z5), mw = DX.maxWeight(budget, r.vol30, bwm.z5), sw = mw * tr;
  const total = num(S.total), px = twdPrice(coin);
  const holdQty = num(S[coin.toLowerCase()]) ?? 0;
  let money = '';
  if (total && px) {
    const target = sw * total, have = holdQty * px, diff = target - have;
    const act = Math.abs(diff) < total * 0.005 ? '和建議差不多，不用動' : diff > 0 ? `最多可再加 ${ntd(diff)}` : `建議減少 ${ntd(-diff)}`;
    money = `<p class="money">以總資產 ${ntd(total)} 計：建議上限 <strong>${ntd(target)}</strong>（約 ${(target / px).toFixed(coin === 'BTC' ? 4 : 3)} ${coin}）。你目前 ${ntd(have)}（${pctS(have / total)}），<strong>${act}</strong>。</p>`;
  } else money = `<p class="small muted">到下方「我的部位」輸入總資產和持有數量，這裡會直接換算成金額。</p>`;
  return `<div class="kpis">
      <div><div class="label">建議上限（占總資產）</div><div class="num">${pctS(sw, sw < 0.1 ? 1 : 0)}</div></div>
      <div><div class="label">30 日波動（年化）</div><div class="num sm">${pct0(r.vol30)}</div><div class="muted small">2023 起中位 ${pct0(bwm.vol30_oos_median)}</div></div>
      <div><div class="label">很糟的一週</div><div class="num sm dn">${pctS(bw, 0)}</div><div class="muted small">依目前波動</div></div>
    </div>
    ${money}
    <p class="small">怎麼算：很糟的一週（歷史最差 5%）大約是「${Math.abs(bwm.z5).toFixed(2)} × 週波動」。${coin} 現在大約 ${pctS(bw, 1)}，要讓這一週只虧總資產 ${pctS(budget, 1)}，${coin} 最多放 ${pctS(mw, 1)}；再乘上趨勢狀態 ${tr * 100}% → <strong>${pctS(sw, 1)}</strong>。${tr === 0 ? '趨勢規則現在是空手，所以建議是 0。' : ''}這是只持有 ${coin} 時的上限；同時持有 BTC 和 ETH，請看下面「我的部位」的合計。</p>
    <p class="small muted">檢驗：用 2022 年以前的資料估這個倍數，拿 2023 年起的 ${bwm.n_oos_weeks} 週來實測，真的跌得比估計還深的週占 ${pctS(bwm.oos_hit5, 1)}（目標 5%）。最差一週紀錄 ${pctS(bwm.r7_min, 0)}（${fmtDay(bwm.r7_min_date)} 起）。</p>`;
}

// ---------- 我的部位與風險 ----------
function riskCard() {
  const opts = Object.entries(DX.REST).map(([k, v]) => `<option value="${k}"${S.rest === k ? ' selected' : ''}>${v.name}</option>`).join('');
  return `<section class="card" id="risk"><h2>我的部位與風險</h2>
    <p class="small muted">只存在這支手機（localStorage），不會傳到任何地方。</p>
    <div class="form">
      <label>總資產（新台幣，含股票、存款、加密幣）<input type="text" inputmode="decimal" data-k="total" value="${esc(S.total)}" placeholder="例如 3000000"></label>
      <label>持有 BTC 數量<input type="text" inputmode="decimal" data-k="btc" value="${esc(S.btc)}" placeholder="例如 0.05"></label>
      <label>持有 ETH 數量<input type="text" inputmode="decimal" data-k="eth" value="${esc(S.eth)}" placeholder="例如 1"></label>
      <label>其他資產主要是<select data-k="rest">${opts}</select></label>
    </div>
    <div id="risk-out"></div></section>`;
}
function riskOut() {
  const total = num(S.total), qb = num(S.btc) ?? 0, qe = num(S.eth) ?? 0;
  const pb = twdPrice('BTC'), pe = twdPrice('ETH');
  const ref = DX.portfolio({ total: 100, btcTwd: 5, ethTwd: 0, rest: '6040' }, DEC.weekly);
  const refTxt = `<p class="small muted">參考：股債 60/40 裡放 5% BTC，占整體風險 ${pctS(ref.riskCrypto, 0)}（本 App 用 ${DEC.weekly.start.slice(0, 4)} 年起新台幣週報酬計算；C#21 用 2015 年起美元日報酬算出 14%）。比例小，風險不小。</p>`;
  if (!total || !pb || !pe) return `<p class="small">輸入總資產和持有數量後，這裡會顯示：加密幣占你整體風險多少、很糟的一週大約虧多少錢。</p>${refTxt}`;
  const bt = qb * pb, et = qe * pe;
  if (bt + et > total) return `<p class="warn">加密幣市值 ${ntd(bt + et)} 已超過你填的總資產，請檢查數字。</p>`;
  const P = DX.portfolio({ total, btcTwd: bt, ethTwd: et, rest: S.rest }, DEC.weekly);
  const P3 = DX.portfolio({ total, btcTwd: bt, ethTwd: et, rest: S.rest }, DEC.weekly, DEC.conventions.oos_start);
  const z5 = (DEC.coins.BTC.bad_week.z5 + DEC.coins.ETH.bad_week.z5) / 2;
  const now = DX.badWeekNow(P.w, P.C, CTX.BTC?.r.vol30 ?? NaN, CTX.ETH?.r.vol30 ?? NaN, z5);
  const budget = (num(S.budget) ?? 2) / 100;
  const over = Math.abs(now) > budget;
  return `<div class="kpis">
      <div><div class="label">加密幣占總資產</div><div class="num sm">${pctS(P.w[0] + P.w[1])}</div><div class="muted small">${ntd(bt + et)}</div></div>
      <div><div class="label">占整體風險</div><div class="num sm ${P.riskCrypto > 0.5 ? 'dn' : ''}">${pctS(P.riskCrypto, 0)}</div><div class="muted small">2023 起 ${pctS(P3.riskCrypto, 0)}</div></div>
      <div><div class="label">很糟的一週（依今天波動）</div><div class="num sm dn">${ntd(now * total)}</div><div class="muted small">${pctS(now)}</div></div>
    </div>
    <p class="${over ? 'warn' : 'ok'}">${over ? `⚠️ 超出你的風險預算（${pctS(budget)}）約 ${(Math.abs(now) / budget).toFixed(1)} 倍。如果真的遇到很糟的一週，你能接受虧 ${ntd(Math.abs(now) * total)} 嗎？不能的話就該降低部位。` : `在你的風險預算（${pctS(budget)}，約 ${ntd(budget * total)}）之內。`}</p>
    <table class="bt"><tbody>
      <tr><th>用你現在的比例回放 ${P.start.slice(0, 4)} 年起 ${P.n} 週</th><td></td></tr>
      <tr><th>很糟的一週（最差 5%）</th><td>${pctS(P.p5)}｜${ntd(P.p5 * total)}</td></tr>
      <tr><th>最差的一週</th><td>${pctS(P.worst)}｜${ntd(P.worst * total)}<div class="muted small">截至 ${fmtDay(P.worstDate)} 那週</div></td></tr>
      <tr><th>整體年化波動</th><td>${pctS(P.volAnn, 0)}</td></tr>
      <tr><th>風險來源</th><td>BTC ${pctS(P.riskBtc, 0)}、ETH ${pctS(P.riskEth, 0)}、其他 ${pctS(1 - P.riskCrypto, 0)}</td></tr>
    </tbody></table>
    ${refTxt}
    <p class="small muted">「占整體風險」是各資產對總波動的貢獻（共變異數拆解）。很糟的一週「依今天波動」用目前的 30 日波動加上歷史相關係數；「回放」直接拿過去每一週的真實漲跌套用你現在的比例。${esc(DEC.weekly.note)}。其他資產若選台股，匯率影響已含在內。</p>`;
}

// ---------- v3: 定期定額與再平衡計畫 ----------
const RULE_NAME = { none: '不再平衡', A: '每年', Q: '每季', M: '每月', bandM: '±25% 區間（每月檢查）', bandD: '±25% 區間（每天檢查）' };
const CONTRIB_NAME = {
  fixed_none: '照比例買，永遠不賣', steer_none: '新錢補不足的那邊，永遠不賣', plan_band: '<strong>本卡計畫</strong>：區間內照比例買，超出才調回',
  fixed_Q: '照比例買＋每季調回', trend_buys: '本卡計畫＋趨勢濾網（只減少新買）', trend_target: '目標比例 × 趨勢狀態（趨勢轉弱就賣）',
};
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
function costParams() {
  const v = DEC.max.vip.find(x => String(x.level) === String(S.vip)) ?? DEC.max.vip[0];
  const fee = S.maker ? v.maker : v.taker;
  const fx = usdTwd();
  const live = num(S.quote) ? DX.premiumFromQuote(num(S.quote), PRICES?.bitcoin?.twd && fx.src === 'CoinGecko' ? fx.v : null, PRICES?.tether?.usd) : null;
  return { fee, premium: live ?? DEC.premium.by_year['2026'].mean, route: S.route === 'twd' ? 'twd' : 'usdt', maker: !!S.maker, live: live !== null };
}
function planCard() {
  const sel = (k, arr) => `<select data-k="${k}">${arr.map(([v, t]) => `<option value="${v}"${String(S[k]) === String(v) ? ' selected' : ''}>${t}</option>`).join('')}</select>`;
  return `<section class="card" id="plan"><h2>定期定額與再平衡計畫</h2>
    <p class="small muted">用上面「我的部位」的總資產與持有數量，加上你每月要投入的錢，算出這個月該買多少、是否超出區間要調回。存在這支手機。</p>
    <div class="form">
      <label>每月投入（新台幣，全部資產合計）<input type="text" inputmode="decimal" data-k="dcaM" value="${esc(S.dcaM)}" placeholder="例如 10000"></label>
      <label>加密幣目標占總資產（%）<input type="text" inputmode="decimal" data-k="dcaW" value="${esc(S.dcaW)}" placeholder="例如 5"></label>
      <label>再平衡區間 ±<input type="text" inputmode="decimal" data-k="dcaBand" value="${esc(S.dcaBand)}"></label>
      <label>區間單位${sel('dcaMode', [['rel', '% 相對（25＝目標的 ±25%）'], ['abs', '百分點（2＝目標 ±2pp）']])}</label>
      <label>BTC 占加密幣（%，其餘 ETH）<input type="text" inputmode="decimal" data-k="dcaBtc" value="${esc(S.dcaBtc)}"></label>
    </div>
    <div id="plan-out"></div></section>`;
}
function tradeTable(p, cp) {
  const rows = [['BTC', p.btc], ['ETH', p.eth]].filter(([, x]) => Math.abs(x) >= 1);
  if (!rows.length) return { html: '<p class="small">這個月不用買賣加密幣。</p>', cost: 0 };
  let tot = 0, unfilled = false;
  const tr = rows.map(([c, x]) => {
    const k = x > 0 ? DX.buyCost({ twd: x, coin: c, route: cp.route, fee: cp.fee, premium: cp.premium, maker: cp.maker }, DEC.max.books)
      : DX.sellCost({ twd: -x, coin: c, route: cp.route, fee: cp.fee, maker: cp.maker }, DEC.max.books);
    tot += Math.abs(x) * k.total; unfilled ||= !k.filled;
    return `<tr><th>${x > 0 ? '買' : '賣'} ${c}</th><td>${ntd(Math.abs(x))}</td><td>${pctS(k.total, 2)}</td><td>${ntd(Math.abs(x) * k.total)}</td></tr>`;
  }).join('');
  return { cost: tot, html: `<div class="scroll"><table class="bt cost"><thead><tr><th></th><th>金額</th><th>成本率</th><th>成本</th></tr></thead><tbody>${tr}
    <tr class="hl"><th>合計</th><td></td><td></td><td>${ntd(tot)}</td></tr></tbody></table></div>
    ${unfilled ? '<p class="warn">金額超過快照裡的掛單深度，實際滑價會更大，建議分批或改用掛單。</p>' : ''}` };
}
function planOut() {
  const total = num(S.total), qb = num(S.btc) ?? 0, qe = num(S.eth) ?? 0, pb = twdPrice('BTC'), pe = twdPrice('ETH');
  const monthly = Math.max(0, num(S.dcaM) ?? 0), target = clamp((num(S.dcaW) ?? 5) / 100, 0, 1);
  const band = Math.max(0, (num(S.dcaBand) ?? 25) / 100), mode = S.dcaMode === 'abs' ? 'abs' : 'rel', share = clamp((num(S.dcaBtc) ?? 100) / 100, 0, 1);
  const bt = planBacktest(target);
  if (!total || !pb || !pe) return `<p class="small">到「我的部位」輸入總資產和持有數量，這裡會算出這個月的買賣金額和成本。</p>${bt}`;
  const bT = qb * pb, eT = qe * pe;
  if (bT + eT > total) return `<p class="warn">加密幣市值 ${ntd(bT + eT)} 已超過你填的總資產，請檢查數字。</p>${bt}`;
  const p = DX.plan({ total, btc: bT, eth: eT, monthly, target, band, mode, btcShare: share });
  const cp = costParams();
  const tA = tradeTable(p, cp);
  const stTxt = { inside: ['ok', '在區間內'], below: ['warn', '低於區間'], above: ['warn', '高於區間'] }[p.status];
  const say = p.status === 'inside' ? `在區間內，不用調整。這個月照目標比例買：加密幣 ${ntd(p.crypto)}，其餘 <strong>${ntd(p.rest)}</strong> 放其他資產。`
    : p.status === 'below' ? `低於區間下緣，調回目標 ${pctS(target, 1)} 要買進加密幣 <strong>${ntd(p.crypto)}</strong>${p.crypto > monthly ? `（比每月投入多 ${ntd(p.crypto - monthly)}，差額要從其他資產撥）` : `，其餘 ${ntd(p.rest)} 放其他資產`}。`
    : `高於區間上緣，調回目標 ${pctS(target, 1)} 要賣出加密幣 <strong>${ntd(-p.crypto)}</strong>（換成其他資產），這個月的新錢也全部放其他資產。在台灣境內平台賣出可能產生財產交易所得（C#3）。`;
  // risk budget check (v2 logic): bad week of the target crypto weight at today's vol, no diversification credit
  const budget = (num(S.budget) ?? 2) / 100;
  const bwB = CTX.BTC ? Math.abs(DX.badWeek(CTX.BTC.r.vol30, DEC.coins.BTC.bad_week.z5)) : NaN;
  const bwE = CTX.ETH ? Math.abs(DX.badWeek(CTX.ETH.r.vol30, DEC.coins.ETH.bad_week.z5)) : NaN;
  const lossT = target * (share * bwB + (1 - share) * bwE);
  const riskTxt = Number.isFinite(lossT) ? `<p class="${lossT > budget ? 'warn' : 'small'}">${lossT > budget ? '⚠️ ' : ''}照目標 ${pctS(target, 1)}，依今天波動，加密幣在很糟的一週大約讓總資產少 ${pctS(lossT, 1)}（${ntd(lossT * (total + monthly))}，沒扣分散效果）${lossT > budget ? `，<strong>超過你的風險預算 ${pctS(budget, 1)}</strong>。目標比例可能太高。` : `，在風險預算 ${pctS(budget, 1)} 之內。`}</p>` : '';
  // trend interaction: show both options, no single answer
  const tb = DX.trendState(CTX.BTC?.r), te = DX.trendState(CTX.ETH?.r);
  const weak = (share > 0 && tb !== null && tb < 1) || (share < 1 && te !== null && te < 1);
  const lab = t => t === null ? '—' : DX.TREND_LABEL[t][0];
  let trend = '';
  if (weak) {
    const pb2 = DX.trendFiltered(p, tb, te);
    const tB = tradeTable(pb2, cp);
    trend = `<div class="warn"><p>⚠️ 趨勢規則現在是 BTC <strong>${lab(tb)}</strong>、ETH <strong>${lab(te)}</strong>。定期定額和趨勢濾網會給出不同答案，兩個都列出來，<strong>沒有哪個被證明比較好</strong>：</p>
      <p><strong>選項 A｜照計畫</strong>（定期定額不看趨勢）：如上表，成本 ${ntd(tA.cost)}。</p>
      <p><strong>選項 B｜加趨勢濾網</strong>：${p.status === 'inside' ? `這個月的定期買進 × 趨勢狀態（持有 100%／減碼 50%／空手 0%），少買的 ${ntd(pb2.rest - p.rest)} 改放其他資產。` : '區間調回不受濾網影響（和回測一致），所以這個月和選項 A 相同。'}</p>
      ${p.status === 'inside' ? tB.html : ''}
      <p class="small">回測比較見下方「每月投入方式」表：兩者差距很小、在不同組合與期間互有勝負。濾網比較像「暫停加碼」，不是預測。</p></div>`;
  } else trend = `<p class="small muted">趨勢規則目前 BTC ${lab(tb)}、ETH ${lab(te)}：趨勢濾網不會改變這個月的計畫。</p>`;
  return `<div class="kpis">
      <div><div class="label">加密幣目前占比</div><div class="num sm">${pctS(p.w, 1)}</div><div class="muted small">${ntd(bT + eT)}</div></div>
      <div><div class="label">區間</div><div class="num sm">${pctS(p.lo, 1)}～${pctS(p.hi, 1)}</div><div class="muted small">目標 ${pctS(target, 1)}</div></div>
      <div><div class="label">狀態</div><div class="num sm ${p.status === 'inside' ? '' : 'dn'}">${stTxt[1]}</div><div class="muted small">調整後 ${pctS(p.w_after, 1)}</div></div>
    </div>
    <p class="money">${say}</p>
    ${tA.html}
    <p class="small muted">成本用上面「台幣買幣成本」的設定（${cp.route === 'usdt' ? '經 USDT' : '直接台幣'}、${cp.maker ? '掛單' : '吃單'}、USDT 溢價 ${pctS(cp.premium, 2)}${cp.live ? '，你輸入的報價' : '，2026 年平均'}），依 MAX 掛單簿快照計算。賣出時溢價不算成本（若還在大致拿得回來）。BTC／ETH 依 ${Math.round(share * 100)}／${Math.round((1 - share) * 100)} 分配。</p>
    ${riskTxt}
    ${trend}
    ${bt}`;
}
function planBacktest(target) {
  if (!DCA) return '';
  const wk = target <= 0.075 ? 5 : 10, rest = ['6040', 'tw50', 'cash'].includes(S.rest) ? S.rest : '6040', key = `${wk}_${rest}`;
  const cv = DCA.conventions, F = DCA.rebal.full[key], O = DCA.rebal.oos[key], I = DCA.rebal.is[key], R = DCA.roll[key];
  const base = DCA.rebal.full[`0_${rest}`].M, baseO = DCA.rebal.oos[`0_${rest}`].M;
  const bp = x => x === null || x === undefined ? '—' : Math.abs(x) < 0.00005 ? '≈0' : `${(x * 1e4).toFixed(0)} bp`;
  const rr = (n, f, o) => `<tr><th>${n}</th><td>${pct(f.cagr)}</td><td>${pct(o.cagr)}</td><td>${pct(f.maxdd, 0)}</td><td>${pct(o.maxdd, 0)}</td><td>${pct(f.p5_week, 1)}</td><td>${pctS(f.w_max, 0)}</td><td>${bp(f.cost_drag)}</td></tr>`;
  const rules = ['none', 'A', 'Q', 'M', 'bandM', 'bandD'];
  const best = (P) => rules.reduce((a, r) => P[r].cagr > P[a].cagr ? r : a, 'none');
  const t1 = `<div class="scroll"><table class="bt"><thead><tr><th>${wk}% 加密＋${esc(DCA.rest_name[rest])}</th><th>年化<div class="muted small">全期</div></th><th>年化<div class="muted small">2023 起</div></th><th>最大跌幅<div class="muted small">全期</div></th><th>最大跌幅<div class="muted small">2023 起</div></th><th>很糟一週<div class="muted small">最差 5%</div></th><th>加密最高占比</th><th>成本拖累<div class="muted small">每年</div></th></tr></thead><tbody>
    ${rules.map(r => rr(RULE_NAME[r], F[r], O[r])).join('')}
    <tr class="muted"><th>不放加密幣（對照）</th><td>${pct(base.cagr)}</td><td>${pct(baseO.cagr)}</td><td>${pct(base.maxdd, 0)}</td><td>${pct(baseO.maxdd, 0)}</td><td>${pct(base.p5_week, 1)}</td><td>0%</td><td>—</td></tr></tbody></table></div>
    <p class="small">樣本內（${I.Q.start.slice(0, 7)}～2022）報酬最高的是「${RULE_NAME[best(I)]}」，2023 年起變成「${RULE_NAME[best(O)]}」：<strong>各種再平衡規則之間的報酬差距不穩健，排名會換</strong>。3 年滾動視窗（${R ? `${R.n} 個，起點 ${R.first.slice(0, 7)}～${R.last.slice(0, 7)}` : '—'}）：不再平衡的最大跌幅比每季再平衡淺的只占 ${R ? pctS(R.rules.none.shallower_dd_than_q, 0) : '—'}；±25% 區間（每月檢查）年化贏過每季的占 ${R ? pctS(R.rules.bandM.beat_q_cagr, 0) : '—'}。比較站得住的只有一點：<strong>不再平衡，加密幣占比會一路漂到 ${pctS(F.none.w_max, 0)}</strong>，風險已經不是你原本設定的 ${wk}%。成本（含溢價、價差、手續費、證交稅）每年只拖累幾 bp，不是重點（與 C#21 一致）。</p>`;
  const C = DCA.contrib.full[key], CO = DCA.contrib.oos[key];
  const cr = n => `<tr${n === 'plan_band' ? ' class="hl"' : ''}><th>${CONTRIB_NAME[n]}</th><td>${pct(C[n].xirr)}</td><td>${pct(CO[n].xirr)}</td><td>${pct(C[n].maxdd, 0)}</td><td>${pct(C[n].p5_week, 1)}</td><td>${C[n].sells}</td><td>${pctS(C[n].w_end, 1)}</td></tr>`;
  const t2 = `<div class="scroll"><table class="bt"><thead><tr><th>每月 NT$1 萬、目標 ${wk}%</th><th>資金加權年化<div class="muted small">全期</div></th><th>同左<div class="muted small">2023 起</div></th><th>最大跌幅</th><th>很糟一週</th><th>賣出次數</th><th>期末加密占比</th></tr></thead><tbody>
    ${Object.keys(CONTRIB_NAME).map(cr).join('')}</tbody></table></div>
    <p class="small">本卡計畫 vs 加趨勢濾網：資金加權年化 全期 ${pct(C.plan_band.xirr)} vs ${pct(C.trend_buys.xirr)}、2023 年起 ${pct(CO.plan_band.xirr)} vs ${pct(CO.trend_buys.xirr)}；最大跌幅 ${pct(C.plan_band.maxdd, 1)} vs ${pct(C.trend_buys.maxdd, 1)}。差距很小，換成其他比例或資產組合時方向也會變，這裡也沒做顯著性檢定，<strong>不能說加濾網比較好</strong>。「目標 × 趨勢」很糟一週 ${pct(C.trend_target.p5_week, 1)}（本卡 ${pct(C.plan_band.p5_week, 1)}），但賣出 ${C.trend_target.sells} 次（本卡 ${C.plan_band.sells} 次，每次賣出都可能要報稅）、年化 ${pct(C.trend_target.xirr)}：等於用 v2 的趨勢規則管整個部位，主要是少跌、不是多賺（C#10）。</p>`;
  const cn = coin.toLowerCase(), L = k => DCA.dca_lump[`${cn}_${k}`];
  const lr = (n, x) => `<tr><th>${n}</th><td>${pctS(x.full.ls_win, 0)}</td><td>${pctS(x.oos.ls_win, 0)}</td><td>${pct(x.full.ls_mean, 0)}／${pct(x.full.dca_mean, 0)}</td><td>${pct(x.full.ls_p5, 0)}／${pct(x.full.dca_p5, 0)}</td><td>${pctS(x.full.ls_loss, 0)}／${pctS(x.full.dca_loss, 0)}</td></tr>`;
  const a = L('12_12');
  const t3 = `<div class="scroll"><table class="bt"><thead><tr><th>${coin}，手上有一筆錢</th><th>一次買勝率<div class="muted small">全期</div></th><th>同左<div class="muted small">2023 起</div></th><th>平均報酬<div class="muted small">一次／分批</div></th><th>最差 5%<div class="muted small">一次／分批</div></th><th>虧損機率<div class="muted small">一次／分批</div></th></tr></thead><tbody>
    ${lr('分 6 個月買，1 年後', L('6_12'))}${lr('分 12 個月買，1 年後', a)}${lr('分 12 個月買，2 年後', L('12_24'))}</tbody></table></div>
    <p class="small">一次買進在 ${pctS(a.full.ls_win, 0)} 的起點贏（2023 年起 ${pctS(a.oos.ls_win, 0)}），因為加密幣這段期間大致上漲、分批的錢有一段時間沒在場上；分批的好處是結果比較集中（終值標準差 ${a.full.dca_sd.toFixed(2)} vs ${a.full.ls_sd.toFixed(2)}、最差 5% ${pct(a.full.dca_p5, 0)} vs ${pct(a.full.ls_p5, 0)}）。哪種起點會贏事前無法知道（C#12）。起點每天一個、彼此重疊，獨立樣本只有約 ${a.full.n_indep} 個年度（2023 年起約 ${a.oos.n_indep} 個），勝率數字的誤差很大。</p>`;
  return `<details><summary>回測：再平衡規則、每月投入方式、分批 vs 一次（扣成本）</summary>
    <h4>再平衡規則（${cv.start.slice(0, 7)} 一次投入，全期～${cv.end}）</h4>${t1}
    <h4>每月投入方式（從 0 開始，每月 1 日投入）</h4>${t2}
    <h4>定期定額 vs 一次投入（只看 ${coin}）</h4>${t3}
    <p class="small muted">算法（<code>backtest/dca_rebalance.py</code> → <code>data/dca.json</code>）：每日新台幣價格（Binance 日收盤 × Yahoo TWD=X；0050、SPY、AGG 用 Yahoo 還原收盤價）。加密買進成本＝當天 MAX USDT 溢價（只算正的，C#23）＋手續費與價差 ${pctS(cv.c_buy, 2)}（MAX 快照、NT$${cv.ref_twd.toLocaleString('en-US')}、經 USDT、VIP 0 吃單）；賣出 ${pctS(cv.c_sell, 2)}；股票／ETF 手續費 ${pctS(cv.stock_fee, 4)}＋賣出證交稅 ${pctS(cv.etf_tax, 1)}（SPY／AGG 複委託假設相同費率，實際依券商、換匯成本未計）；現金利率 0%。區間檢查用前一天收盤、隔天執行，趨勢狀態也用前一天收盤（不偷看）。2023 年起是樣本外（與 v2 同一切點），各規則是事先固定的常見做法（C#12、C#21），沒有用資料調參數。沒有計入稅、交易所倒閉風險（C#4）、提領費用。</p>
  </details>`;
}

// ---------- 槓桿檢查 ----------
const CASCADE = [
  ['2020-03-12', '6.0 倍', '前 24 小時進場只剩 1.99 倍'],
  ['2021-05-19', '4.2 倍', 'ETH 2.8 倍；ETH 永續成交價一度比指數低 28%'],
  ['2022-06-18（Celsius／3AC）', '26.9 倍', '跌勢較慢，最後 1 小時跌得不深'],
  ['2024-08-05', '12.2 倍', 'ETH 4.8 倍'],
  ['2025-10-10／11', '7.7 倍', '山寨幣只能 1.2–1.8 倍（SUI 5 分鐘 −75%）'],
];
function levCard(coin) {
  const L = DEC.coins[coin].liquidation;
  const sel = (k, arr, lab) => `<select data-k="${k}">${arr.map(([v, t]) => `<option value="${v}"${String(S[k]) === String(v) ? ' selected' : ''}>${t}</option>`).join('')}</select>`;
  return `<section class="card" id="lev"><h2>槓桿／強平檢查｜${coin}</h2>
    <div class="form three">
      <label>方向${sel('levSide', [['long', '做多'], ['short', '做空']])}</label>
      <label>槓桿${sel('lev', L.levs.map(x => [x, x + ' 倍']))}</label>
      <label>持有${sel('levDays', [[1, '1 天'], [7, '1 週'], [30, '30 天'], [90, '90 天']])}</label>
    </div>
    <div id="lev-out"></div>
    <details><summary>五次清算連鎖：最低點前 1 小時進場，BTC 最多撐得住幾倍</summary>
      <div class="scroll"><table class="bt"><thead><tr><th>事件</th><th>BTC 上限</th><th>備註</th></tr></thead><tbody>
      ${CASCADE.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td class="small">${r[2]}</td></tr>`).join('')}</tbody></table></div>
      <p class="small muted">逐倉多單、維持保證金 0.4%、以標記價最低點計算，Binance USDⓈ-M 1 分鐘資料（C#19）。進場時機稍早一點，上限就掉很多。</p>
    </details></section>`;
}
function levOut(coin) {
  const L = DEC.coins[coin].liquidation, ctx = CTX[coin];
  const lev = String(S.lev), H = String(S.levDays), side = S.levSide === 'short' ? 'short' : 'long';
  const d = DX.liqDistance(+lev, L.mmr, side), lp = DX.liqPrice(ctx.priceUsd, +lev, L.mmr, side);
  const p = L[side][lev]?.[H]; const wd = L.worst_drop[H];
  if (!p) return '';
  const lvl = p.full >= 0.2 ? ['warn', '⚠️ 歷史上很常被強平，這接近賭博。'] : p.full >= 0.05 ? ['warn', '⚠️ 風險很高：每 20 次就可能有 1 次以上被強平。'] : p.full > 0 ? ['warn', '發生過，只是不常見。被強平時虧掉的是整筆保證金。'] : ['ok', '這個組合在 BTC／ETH 歷史上沒被強平過，但 2025-10 山寨幣開 2 倍就會爆，未來也可能更糟。'];
  const hTxt = { 1: '1 天', 7: '1 週', 30: '30 天', 90: '90 天' }[H];
  return `<div class="kpis">
      <div><div class="label">價格${side === 'long' ? '跌' : '漲'}多少就強平</div><div class="num sm dn">${pctS(d)}</div><div class="muted small">強平價約 ${usd(lp)}</div></div>
      <div><div class="label">歷史上 ${hTxt}內被強平</div><div class="num sm ${p.full > 0.05 ? 'dn' : ''}">${pctS(p.full, p.full < 0.01 ? 1 : 0)}</div><div class="muted small">2023 起 ${pctS(p.oos, p.oos < 0.01 ? 1 : 0)}</div></div>
    </div>
    <p class="${lvl[0]}">${lvl[1]}</p>
    <p class="small">${coin} 從任一天收盤算起，${hTxt}內盤中最深跌幅：最差 1% 的情況 ${pctS(wd.p1, 0)}，史上最深 ${pctS(wd.min, 0)}（${fmtDay(wd.min_date)} 進場）。固定 2 倍每天再平衡、一直放著，BTC 2018–2026 被波動磨到只剩本金 0.27 倍；3 倍在 2020-03-12 一天歸零（C#9）。</p>
    <p class="small muted">算法：${sideTxt[side]}、逐倉、維持保證金 ${pctS(L.mmr, 1)}；${L.start.slice(0, 4)} 年起每天收盤進場，看之後 ${hTxt}的 Binance 現貨日 K 最高／最低價是否碰到強平價。成交價插針比標記價更深（偏保守）；沒算資金費和手續費（偏樂觀）。</p>`;
}

// ---------- 台幣買幣成本 ----------
function costCard(coin) {
  const f3 = x => (x * 100).toFixed(3).replace(/\.?0+$/, '');
  const vip = DEC.max.vip.map(v => [v.level, `VIP ${v.level}（${f3(v.taker)}%）`]);
  return `<section class="card" id="cost"><h2>台幣買 ${coin} 的真實成本（MAX）</h2>
    <div class="form">
      <label>金額（新台幣）<input type="text" inputmode="decimal" data-k="amt" value="${esc(S.amt)}"></label>
      <label>路徑（台幣→USDT→幣，或直接台幣市場）<select data-k="route"><option value="usdt"${S.route === 'usdt' ? ' selected' : ''}>經 USDT</option><option value="twd"${S.route === 'twd' ? ' selected' : ''}>直接台幣</option></select></label>
      <label>手續費等級（吃單費率）<select data-k="vip">${vip.map(([v, t]) => `<option value="${v}"${String(S.vip) === String(v) ? ' selected' : ''}>${t}</option>`).join('')}</select></label>
      <label>MAX 現在的 USDT 賣價（選填）<input type="text" inputmode="decimal" data-k="quote" value="${esc(S.quote)}" placeholder="例如 32.95"></label>
      <label class="check"><input type="checkbox" data-k="maker"${S.maker ? ' checked' : ''}> 用掛單（省價差，但不一定成交）</label>
    </div>
    <div id="cost-out"></div></section>`;
}
function costOut(coin) {
  const amt = num(S.amt);
  if (!amt || amt <= 0) return '<p class="small">請輸入金額。</p>';
  const v = DEC.max.vip.find(x => String(x.level) === String(S.vip)) ?? DEC.max.vip[0];
  const fee = S.maker ? v.maker : v.taker;
  const fx = usdTwd();
  const live = num(S.quote) ? DX.premiumFromQuote(num(S.quote), PRICES?.bitcoin?.twd && fx.src === 'CoinGecko' ? fx.v : null, PRICES?.tether?.usd) : null;
  const y26 = DEC.premium.by_year['2026'];
  const prem = live ?? y26.mean;
  const premSrc = live !== null ? `用你輸入的 ${S.quote} 和即時匯率 ${fx.v.toFixed(3)}、USDT ${PRICES.tether.usd} 美元算出` : `2026 年平均（${fmtDay(DEC.premium.last_date)} 是 ${pctS(DEC.premium.last, 2)}，近 30 天平均 ${pctS(DEC.premium.last30_mean, 2)}）`;
  const calc = route => DX.buyCost({ twd: amt, coin, route, fee, premium: prem, maker: !!S.maker }, DEC.max.books);
  const c = calc(S.route === 'twd' ? 'twd' : 'usdt'), alt = calc(S.route === 'twd' ? 'usdt' : 'twd');
  const fair = twdPrice(coin);
  const got = fair ? amt * (1 - c.total) / fair : null;
  const snap = fmtTime(Date.parse(DEC.max.fetched_at_utc));
  const lose = 2 * (c.fees + c.slip);
  return `<table class="bt cost"><tbody>
      <tr><th>USDT 溢價<div class="muted small">${premSrc}</div></th><td>${pctS(c.premium, 2)}</td><td>${ntd(amt * c.premium / (1 + c.premium))}</td></tr>
      <tr><th>價差＋滑價<div class="muted small">${S.maker ? '掛單不吃價差' : `MAX 掛單簿快照 ${snap}`}</div></th><td>${pctS(c.slip, 2)}</td><td>${ntd(amt * c.slip)}</td></tr>
      <tr><th>手續費<div class="muted small">${c.legs.length} 筆 × ${(fee * 100).toFixed(3).replace(/0+$/, '')}%</div></th><td>${pctS(c.fees, 2)}</td><td>${ntd(amt * c.fees)}</td></tr>
      <tr class="hl"><th>合計</th><td>${pctS(c.total, 2)}</td><td>${ntd(amt * c.total)}</td></tr>
    </tbody></table>
    ${got ? `<p>實拿約 <strong>${got.toFixed(coin === 'BTC' ? 6 : 4)} ${coin}</strong>（以國際均價 ${ntd(fair)} 計，等於 ${coin} 要先漲 ${pctS(c.total / (1 - c.total), 2)} 才打平，還沒算賣出）。</p>` : ''}
    ${c.filled ? '' : '<p class="warn">金額超過快照裡的掛單深度，實際滑價會更大，建議分批或改用掛單。</p>'}
    <p class="small">另一條路徑（${S.route === 'twd' ? '經 USDT' : '直接台幣'}）合計 ${pctS(alt.total, 2)}${alt.total < c.total ? '，<strong>比較便宜</strong>' : ''}。賣回台幣時，如果溢價還在，溢價那部分大致拿得回來；一定拿不回來的是手續費和價差，買進加賣出約 ${pctS(lose, 2)}。</p>
    <p class="small muted">溢價＝MAX 的 USDT/TWD 價比「央行匯率 × USDT 美元價」貴多少（C#23；2026 年 5%–95% 落在 ${pctS(y26.p5, 2)}～${pctS(y26.p95, 2)}）。直接用台幣買的市場，價格同樣含這個溢價。手續費來自 MAX 公開 API（${esc(DEC.max.vip_src === 'live' ? '與掛單簿同時抓取' : DEC.max.vip_src)}）。未含提領到自己錢包的手續費和銀行入金費用。MAX API 不允許手機直接讀取，所以價差用快照，不是即時。</p>`;
}

// ---------- 研究重點 ----------
function researchCard() {
  return `<section class="card" id="notes"><h2>24 篇研究的決策重點</h2><ul class="facts">
    ${DEC.research.map(x => `<li><strong>${esc(x.t)}</strong><br><span class="small">${esc(x.d)}</span> <span class="src">${esc(x.src)}</span></li>`).join('')}
  </ul></section>`;
}

function updateOuts() {
  const set = (id, f) => { const el = document.getElementById(id); if (el) { try { el.innerHTML = f(); } catch (e) { el.innerHTML = `<p class="warn">計算失敗：${esc(e.message || e)}</p>`; } } };
  set('dec-out', () => decOut(coin));
  set('risk-out', riskOut);
  set('plan-out', planOut);
  set('lev-out', () => levOut(coin));
  set('cost-out', () => costOut(coin));
  set('fc-money-BTC', () => moneyLine('BTC'));
  set('fc-spell', spellHome);
  set('fc-next', nmHome);
  set('nm-wrap', () => FR.withAsof(nextMoveHtml(), NMOVE?.as_of ?? null, Date.now()));
  set('fc-money-ETH', () => moneyLine('ETH'));
  set('fc-rel-BTC', () => relLine('BTC'));
  set('fc-rel-ETH', () => relLine('ETH'));
  set('rel-out', relOut);
  set('fc-live-BTC', () => liveLine('BTC'));
  set('fc-live-ETH', () => liveLine('ETH'));
  set('intra-out', intraOut);
}

function ctxFrom(live) {
  const rows = buildRows(completedOnly(live.candles), live.funding, live.fng);
  live.rows = rows;
  const last = live.candles[live.candles.length - 1];
  return { live, rows, r: rows[rows.length - 1], priceUsd: live.spot?.usd ?? last.c };
}

// ======================= v6: 資料可靠度＋接近翻轉價 =======================
let ADV = 'loading';
const usd0 = x => Number.isFinite(x) ? x.toLocaleString('en-US', { maximumFractionDigits: x > 1000 ? 0 : 2 }) : '—';
const ymd = t => new Date(t).toISOString().slice(0, 10);
const TL = t => t === null || t === undefined ? '—' : DX.TREND_LABEL[t]?.[0] ?? '—';
/** Everything shown about data quality for one coin, computed from the closed daily bars actually used. */
function relInfo(c) {
  const ctx = CTX[c]; if (!ctx) return null;
  const live = ctx.live, now = Date.now();
  const bars = RL.closedBars(live.candles, now), last = bars[bars.length - 1];
  const chk = live.check ? RL.closedBars(live.check.bars, now) : null;
  let cross = null, at = null, tA = null, tB = null, a = null, b = null;
  if (chk && chk.length) {
    const m = new Map(chk.map(k => [k.t, k]));
    for (let i = bars.length - 1; i >= Math.max(0, bars.length - 5); i--) if (m.has(bars[i].t)) { at = i; break; }
    if (at !== null) {
      a = bars[at]; b = m.get(a.t);
      const j = chk.indexOf(b);
      tA = RL.trend3(bars.slice(0, at + 1).map(k => k.c)); tB = RL.trend3(chk.slice(0, j + 1).map(k => k.c));
      cross = RL.crossCheck(a, b, tA, tB);
    }
  }
  const usdt = PRICES?.tether?.usd ?? null;
  const rel = RL.reliability({ lastOpen: last?.t ?? null, now, cross, usdt });
  const closes = bars.map(k => k.c);
  return { live, bars, last, chk, a, b, tA, tB, cross, usdt, rel, flips: RL.flipLevels(closes), near: RL.nearFlip(closes) };
}
function relLine(c) {
  const I = relInfo(c);
  if (!I) return `<p class="rel-line small muted">${ADV === 'error' ? '資料狀態：暫時無法檢查（行情連不上）' : '資料狀態：檢查中…'}</p>`;
  const { rel, near, last } = I;
  const why = rel.level === 'green' ? '' : ` <span class="small">${esc(rel.reasons.filter(r => !r.includes('更新中'))[0] || '')}</span>`;
  let flip = '';
  if (near) {
    const nextClose = closeMD(addDays(ymd(last.t), 1));
    flip = `<p class="flip">接近翻轉：${c} 若 ${nextClose} 早上 8 點收盤${near.above ? '低於' : '高於'} <strong>${usd0(near.price)} 美元</strong>，${XS.homeAddon(near.price, XS.maxRate(XSRC, PRICES))}，規則會轉為<strong>${RL.flipAction(near.trend, near.next)}</strong>（現在 ${usd0(near.close)}，差 ${pctS(Math.abs(near.dist), 2)}）。${near.tight ? '差距很小，各交易所可能給不同答案。' : ''}</p>`;
  }
  const f = LIVE?.coins?.[c];
  const edge = f && RL.nearActionEdge(f.exposure) ? `<p class="small">建議比例 ${Math.round(f.exposure * 100)}% 剛好在「持有／減碼」的分界附近，小小的波動就可能改變動作。</p>` : '';
  return `<p class="rel-line"><span class="rel-badge rel-${rel.level === 'pending' ? 'green' : rel.level}">● ${esc(rel.label)}</span>${why}</p>${flip}${edge}`;
}
// v24: 台幣翻轉價＋別家交易所比對
function xsrcHtml() {
  try {
    const F = {}; for (const c of ['BTC', 'ETH']) { const I = CTX[c] ? relInfo(c) : null; if (I?.flips) F[c] = I.flips; }
    return XS.xsrcCard(XSRC, F, XS.maxRate(XSRC, PRICES));
  } catch (e) { return `<section class="card" id="xsrc"><h2>台幣翻轉價＋別家交易所比對</h2><p class="warn">計算失敗：${esc(e.message || e)}</p></section>`; }
}
function relCard() {
  return `<section class="card" id="data"><h2>資料可靠度（各交易所比對）</h2><div id="rel-out">${relOut()}</div></section>`;
}
function relOut() {
  const coins = ['BTC', 'ETH'].filter(c => CTX[c]);
  if (!coins.length) return '<p class="small">行情還沒載入。</p>';
  const lv = { green: '綠（正常）', pending: '綠（今早收盤更新中）', yellow: '黃（注意）', red: '紅（先不要依此動作）' };
  const block = c => {
    const I = relInfo(c), L = I.live, F = I.flips;
    const src = n => `${esc(n)}（${PAIR[n] || ''}）`;
    const fl = F ? F.levels.map(l => `<tr><th>${l.ma} 日線翻轉價<div class="muted small">下次收盤${l.above ? '低於' : '高於'}此價，趨勢狀態${l.above ? '降' : '升'}一級</div></th><td>${usd(l.price)}（${pct(l.dist, 2)}）</td></tr>`).join('') : '';
    return `<h3 class="sub">${c}：${lv[I.rel.level]}</h3>
      <div class="scroll"><table class="bt"><tbody>
        <tr><th>判斷原因</th><td>${I.rel.reasons.length ? I.rel.reasons.map(esc).join('；') : '收盤時間正確、兩個來源一致'}</td></tr>
        <tr><th>採用來源</th><td>${src(L.candleSrc)}，抓取 ${fmtTime(L.candleAt || L.at)}</td></tr>
        <tr><th>最新已收完日K</th><td>${ymd(I.last.t)}（收盤 ${fmtTime(I.last.t + DAY)}）：${usd(I.last.c)}<div class="muted small">只用已收完的日K；正在進行中的當日K不列入判斷</div></td></tr>
        <tr><th>比對來源</th><td>${L.check ? `${src(L.check.source)}，抓取 ${fmtTime(L.check.at)}` : `抓不到${L.checkErrors?.length ? '（' + esc(L.checkErrors.join('；')) + '）' : ''}`}</td></tr>
        ${I.cross ? `<tr><th>同一根K收盤（${ymd(I.a.t)}）</th><td>${usd(I.a.c)} vs ${usd(I.b.c)}，差 <strong>${I.cross.bps.toFixed(1)} bps</strong>（${pctS(I.cross.diff, 3)}）</td></tr>
        <tr><th>趨勢狀態</th><td>${TL(I.tA)} vs ${TL(I.tB)}${I.cross.sameTrend === false ? ' ⚠️ 不一致' : '（一致）'}</td></tr>` : ''}
        ${fl}
        <tr><th>USDT</th><td>${I.usdt ?? '—'} 美元${I.usdt !== null && Math.abs(I.usdt - 1) > RL.USDT_DEPEG ? ' ⚠️ 偏離超過 0.5%' : ''}<div class="muted small">CoinGecko，只用於台幣換算</div></td></tr>
      </tbody></table></div>`;
  };
  return `${coins.map(block).join('')}
    <p class="small">門檻：台北 09:00 仍拿不到昨天的日K → 黃色「尚未更新」，12:00 → 紅色「過期」；兩個來源同一根K收盤差 ≤ 0.5% 綠色、0.5–2% 黃色、> 2% 或算出的趨勢狀態不同 → 紅色；離翻轉價 < 1% 顯示「接近翻轉」，< 0.25% 註明各交易所可能給不同答案；建議比例在 67% ± 2% 標示「持有／減碼分界」（不改預測規則）；USDT 偏離 1 美元超過 0.5% 黃色。</p>
    <p class="small muted">後備順序：${CANDLE_ORDER.map(n => `${esc(n)} ${PAIR[n]}`).join(' → ')}（與每日預測相同）。最近 200 根若有缺日、重複或不是 00:00 UTC 開盤，就改用下一個來源。翻轉價＝讓下次收盤剛好等於「含它自己的均線」的價格（50 日線＝最近 49 根收盤平均、200 日線＝最近 199 根平均）。依據：2023 年起換交易所只讓趨勢狀態不同 0–1 天／1,410 天，但把還沒收完的K當收盤、或晚一天沒更新，會讓 6–8% 的日子判斷錯（研究 CRYPTO-20261111-1403）。</p>`;
}

// ======================= v13: 盤中離翻轉價多遠 =======================
let TICK = {}, INTRA = null, TESTED = null, XSRC = null;
function liveInfo(c) {
  const ctx = CTX[c], t = TICK[c]; if (!ctx || !t || t.status !== 'ok') return null;
  const bars = RL.closedBars(ctx.live.candles, t.at), last = bars[bars.length - 1]; if (!last) return null;
  return ID.liveCheck({ closes: bars.map(k => k.c), lastOpen: last.t, price: t.price, now: t.at });
}
function liveLine(c) {
  const t = TICK[c];
  if (t?.status === 'ok' && !CTX[c]) return ID.homeLine(c, ADV === 'error' ? { status: 'ok', price: t.price, at: t.at } : { status: 'loading' }, null, INTRA);
  return ID.homeLine(c, t, liveInfo(c), INTRA);
}
async function loadTickers() {
  TICK = { BTC: { status: 'loading' }, ETH: { status: 'loading' } };
  await Promise.all(['BTC', 'ETH'].map(async c => { TICK[c] = await fetchTicker(c, CTX[c]?.live?.candleSrc).catch(e => ({ status: 'error', errors: [String(e.message || e)], at: Date.now() })); }));
  updateOuts();
}
function intraCard() {
  return `<section class="card" id="intraday"><h2>盤中離翻轉價多遠</h2><div id="intra-out">${intraOut()}</div></section>`;
}
function intraOut() {
  const rows = ['BTC', 'ETH'].map(c => {
    const t = TICK[c];
    const src = t?.status === 'ok' ? `${esc(t.source)}（${PAIR[t.source] || ''}）即時價 ${usd(t.price)}，抓取 ${fmtTime(t.at)}` : t?.status === 'loading' || !t ? '讀取中…' : `抓不到即時價${t.errors?.length ? '（' + esc(t.errors.join('；')) + '）' : ''}`;
    return `<tr><th>${c} 即時價</th><td>${src}</td></tr>${ID.advRows(c, t, liveInfo(c))}`;
  }).join('');
  const kNow = ['BTC', 'ETH'].map(liveInfo).find(L => L && !L.stale)?.k ?? null;
  const I = INTRA;
  const hist = I ? `<h3 class="sub">過去紀錄：盤中穿過，收盤還在那一邊嗎？</h3>${ID.histTable(I, kNow)}
    <p class="small">「已穿過→收盤仍穿過」：在那個整點，價格已經在翻轉價的另一邊（如果當下收盤，規則會變），當天早上 8 點收盤時仍在另一邊的比例。「差不到 ${Math.round(I.near * 100)}%→收盤穿過」：那個整點還沒穿過、但離翻轉價不到 ${Math.round(I.near * 100)}%，收盤時穿過的比例。越接近隔天早上 8 點越準；早上剛開盤時穿過，大約一半會在收盤前回來。</p>
    <p class="small muted">算法：<code>backtest/intraday_cross.py</code> → <code>data/intraday.json</code>（${esc(I.source)}，${esc(I.periods.full.start)}～${esc(I.periods.full.end)}，產生於 ${fmtTime(Date.parse(I.generated_at))}）。翻轉價只用前一天以前的收盤（和首頁同一算法），整點價格＝那一小時K的收盤價，不偷看之後的價格。次數是 BTC＋ETH、50 日線＋200 日線合計，每個（幣、均線、日）在每個整點算一次；同一段行情會連續好幾天出現，所以次數不是獨立樣本，比例只當參考。少於 ${ID.MIN_N} 次不顯示比例。這是過去紀錄，不是預測，也不改變規則。</p>` : '<p class="small">過去紀錄暫時讀不到。</p>';
  return `<div class="scroll"><table class="bt"><tbody>${rows}</tbody></table></div>
    <p class="small">規則每天只在早上 8 點收盤時判斷一次；盤中價格穿過翻轉價<strong>不是訊號</strong>，要等收盤才算。首頁那一行就是用這裡的即時價和前一天收盤算出的翻轉價比較。</p>
    ${GD.guardLine()}
    ${hist}`;
}

// ======================= v7: 建議變更提醒＋最近建議變化 =======================
let FLIPS = null, PENDING = {}, OUTC = null, WRISK = null, TBAND = null, SPELLS = null, NMOVE = null;
// v26: 現在空手要等多久 — current spell from the phone's closed daily bars (same rule as flips.js), else the weekly file
function spellCur() {
  const o = {};
  for (const c of ['BTC', 'ETH']) {
    let rows = null;
    try { if (CTX[c]?.live?.candles) rows = FL.recoRows(RL.closedBars(CTX[c].live.candles)); } catch { rows = null; }
    o[c] = SP.pickSpell(SPELLS, c, rows, LIVE?.coins?.[c]?.asof);
  }
  return o;
}
const spellHome = () => esc(SP.homeSentence(SPELLS, spellCur(), LIVE));
// v27: 這週可能要動手嗎 — distance to the nearest flip (phone's closed daily bars) → historical 1/7-day change rates + plan
function nmCur() {
  const o = {};
  for (const c of ['BTC', 'ETH']) {
    let closes = null, date = null;
    try { if (CTX[c]?.live?.candles) { const b = RL.closedBars(CTX[c].live.candles); closes = b.map(k => k.c); date = b.length ? ymd(b[b.length - 1].t) : null; } } catch { closes = null; }
    o[c] = NM.pickState(NMOVE, c, closes, date, LIVE?.coins?.[c]?.asof);
  }
  return o;
}
/** What to do if the nearest flip happens: TB.act on the new suggested share (+ MAX cost from the 買幣成本 model). */
function nmPlan(c, s) {
  if (!s || !holdingsSet()) return null;
  const px = twdPrice(c), B = coinBudget(c);
  if (!px || !(B > 0)) return null;
  const have = (num(S[c.toLowerCase()]) ?? 0) * px;
  const a = TB.act({ have, B, e: s.near.nextExpo, T: TBAND }); if (!a) return null;
  let cost = null;
  try {
    if (DEC && (a.kind === 'buy' || a.kind === 'sell' || a.kind === 'sellall')) {
      const cp = costParams();
      cost = a.kind === 'buy' ? DX.buyCost({ twd: a.amt, coin: c, route: cp.route, fee: cp.fee, premium: cp.premium, maker: cp.maker }, DEC.max.books)
        : DX.sellCost({ twd: a.amt, coin: c, route: cp.route, fee: cp.fee, maker: cp.maker }, DEC.max.books);
    }
  } catch { cost = null; }
  return { a, B, have, tgt: s.near.nextExpo * B, cost };
}
function nmPlanHtml(c, s) {
  const p = nmPlan(c, s); if (!p) return '';
  const ct = p.cost ? `，在 MAX 的成本約 ${ntd(p.a.amt * p.cost.total)}（${pctS(p.cost.total, 2)}，${p.a.kind === 'buy' ? '含 USDT 溢價、' : ''}價差與手續費，用「買幣成本」的設定）` : '';
  return `如果真的變了：你打算放在 ${c} 的錢 ${ntd(p.B)}，建議會變成放約 <strong>${ntd(p.tgt)}</strong>；你現在有 ${ntd(p.have)}，${TB.actHtml(p.a)}${ct}。`;
}
function nmHome() {
  const st = nmCur(), plan = {};
  for (const c of ['BTC', 'ETH']) { const p = nmPlan(c, st[c]); plan[c] = p ? NM.planShort(p.a) : ''; }
  return esc(NM.homeSentence(NMOVE, st, plan));
}
function nextMoveHtml() {
  try {
    const st = nmCur(), plans = {}, rate = XS.maxRate(XSRC, PRICES);
    for (const c of ['BTC', 'ETH']) plans[c] = nmPlanHtml(c, st[c]);
    return NM.nextMoveCard(NMOVE, st, plans, rate ? p => XS.twdOf(p, rate) : null);
  } catch (e) { return `<section class="card" id="nextmove"><h2>這週可能要動手嗎</h2><p class="warn">計算失敗：${esc(e.message || e)}</p></section>`; }
}
function spellsHtml() {
  try { return SP.spellsCard(SPELLS, spellCur(), LIVE); }
  catch (e) { return `<section class="card" id="spells"><h2>空手要等多久</h2><p class="warn">計算失敗：${esc(e.message || e)}</p></section>`; }
}
const ZH = FL.ACTION_ZH;
const p0 = e => `${Math.round((e ?? 0) * 100)}%`;
function changeBanner() {
  const cs = Object.entries(PENDING); if (!cs.length) return '';
  const lines = cs.map(([c, x]) => {
    const st = FL.revStat(FLIPS, c, x.kind);
    const hist = st ? `<span class="chg-sub">歷史上（${st.start.slice(0, 4)} 年起）${c} 這類變化有 ${pct0(st.full)} 在 14 天內又變回去${st.oos !== null ? `（2023 年起 ${pct0(st.oos)}）` : ''}。這是過去紀錄，不是預測。</span>` : '';
    return `<p class="chg-line" data-coin="${c}">${c} 建議從『${ZH[x.from]} ${p0(x.e0)}』改為『${ZH[x.to]} ${p0(x.e1)}』（依 ${closeMD(x.asof1)} 收盤）。上次看到是 ${closeMD(x.asof0)}。${hist}</p>`;
  }).join('');
  return `<div class="chg" role="status"><button type="button" class="chg-x" aria-label="知道了，關閉提醒">✕</button><div class="chg-head">建議變了</div>${lines}</div>`;
}
function dismissChange() {
  if (LIVE) FL.acknowledge(localStorage, Object.fromEntries(Object.keys(PENDING).map(c => [c, LIVE.coins[c]])));
  PENDING = {}; FL.setBadge(0);
  const el = document.getElementById('fc-change'); if (el) el.innerHTML = '';
}
function coinEvents(c) {
  const ctx = CTX[c];
  if (ctx) {
    const bars = RL.closedBars(ctx.live.candles);
    return { ev: FL.recoEvents(FL.recoRows(bars)), src: `手機抓到的已收完日K（${esc(ctx.live.candleSrc || '—')}，最新 ${ymd(bars[bars.length - 1].t)}）` };
  }
  const F = FLIPS?.coins?.[c]; if (!F) return { ev: [], src: '—' };
  const ev = F.events.map(e => ({ date: e[0], kind: e[1], from: e[2], to: e[3], e0: e[4], e1: e[5], close: e[8], rev: e[9], revDays: e[10] }));
  return { ev, src: `預先算好的歷史（最新 ${F.last_bar}）` };
}
function recentCard() {
  if (!FLIPS) return '';
  const block = c => {
    const { ev, src } = coinEvents(c);
    const last = ev.slice(-10).reverse();
    const rv = e => e.rev === true ? `是（${e.revDays} 天後）` : e.rev === false ? '否' : '還不到 14 天';
    const rows = last.map(e => `<tr><td class="nowrap">${closeMD(e.date)}<div class="muted small">${e.date.slice(0, 4)}</div></td><td>${ZH[e.from]} → <strong>${ZH[e.to]}</strong><div class="muted small">${p0(e.e0)} → ${p0(e.e1)}｜${e.kind === 'trend' ? '趨勢翻轉' : '波動變化'}</div></td><td>${usd(e.close)}</td><td>${rv(e)}</td></tr>`).join('');
    const S = FLIPS.coins[c].stats;
    const sr = (lab, k) => `<tr><th>${lab}</th>${['full', 'is', 'oos'].map(p => { const x = S[p][k]; return `<td>${x.rev14 === null ? '—' : pct0(x.rev14)}<div class="muted small">${x.n_rev}／${x.n_done} 次，每年 ${x.per_yr}</div></td>`; }).join('')}</tr>`;
    return `<h3 class="sub">${c}</h3>
      <div class="scroll"><table class="bt"><thead><tr><th>收盤日</th><th>變化</th><th>收盤價</th><th>14 天內翻回</th></tr></thead><tbody>${rows || '<tr><td colspan="4">沒有資料</td></tr>'}</tbody></table></div>
      <p class="small muted">來源：${src}。</p>
      <div class="scroll"><table class="bt"><thead><tr><th>14 天內翻回的比例</th><th>全期<div class="muted small">${S.full.start.slice(0, 7)}～</div></th><th>樣本內<div class="muted small">～2022</div></th><th>樣本外<div class="muted small">2023～</div></th></tr></thead>
      <tbody>${sr('趨勢翻轉', 'trend')}${sr('波動變化', 'vol')}${sr('合計', 'all')}</tbody></table></div>`;
  };
  return `<section class="card" id="recent"><h2>最近建議變化</h2>
    ${block('BTC')}${block('ETH')}
    <p class="small">「趨勢翻轉」＝收盤價穿過 50 日或 200 日均線，建議在空手／減碼／持有之間移動；「波動變化」＝趨勢沒變，但 30 日波動讓建議比例跨過 67%（持有／減碼分界）。「翻回」＝之後 14 根日K內又回到原來的狀態。只用已收完的日K，每天收盤（台北早上 8 點）判斷一次，不偷看之後的價格；還沒滿 14 天的變化標「還不到 14 天」，不列入比例。</p>
    <p class="small muted">算法：<code>backtest/flip_stats.py</code> → <code>data/flips.json</code>（${esc(FLIPS.source)}，產生於 ${fmtTime(Date.parse(FLIPS.generated_at))}），規則與首頁冠軍模型相同（trend_vt@1，${esc(FLIPS.model)}）。2023 年以前是樣本內、之後是樣本外。首頁的「加碼」只出現在變化當天，隔天會依比例顯示持有或減碼，所以這裡不把「加碼 → 持有／減碼」（比例沒變）算成新的變化；照每天顯示的字算，BTC 全期每年變 ${FLIPS.coins.BTC.stats.full.label_changes_per_yr} 次、ETH ${FLIPS.coins.ETH.stats.full.label_changes_per_yr} 次。這只是翻回頻率，不是報酬，所以不涉及成本。翻回很常見是趨勢規則降低大跌的代價：研究顯示加確認天數或緩衝帶雖然少響一半，樣本外跌幅反而更深，所以規則不改（研究 CRYPTO-20261111-1245）。</p>
  </section>`;
}

// ======================= v4: 未來一週預測建議（來自每日預測帳本 data/live.json） =======================
let LIVE = null, EV = null, TRUST = null, DEV;
const ACT_CLS = { add: 'st-hold', hold: 'st-hold', reduce: 'st-reduce', out: 'st-out' };
const ACT_HINT = { add: '比前一天建議多放一些', hold: '維持建議的比例', reduce: '比全部放進去少', out: '先不要放' };
const STATUS_ZH = { champion: '冠軍（目前採用）', challenger: '挑戰者', reference: '基準（一直抱著）', retired: '退休' };
// candle date D closes at D+1 08:00 Taipei
const closeMD = s => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + 1); return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`; };
const addDays = (s, n) => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
function coinBudget(c) {
  const total = num(S.total); if (!total) return null;
  const w = clamp((num(S.dcaW) ?? 5) / 100, 0, 1), sh = clamp((num(S.dcaBtc) ?? 100) / 100, 0, 1);
  return total * w * (c === 'BTC' ? sh : 1 - sh);
}
const holdingsSet = () => !!num(S.total) && (num(S.btc) !== null || num(S.eth) !== null);
function moneyLine(c) {
  const f = LIVE?.coins?.[c]; if (!f || !holdingsSet()) return '';
  const px = twdPrice(c) ?? (DEC ? f.price_usd * usdTwd().v : null), B = coinBudget(c);
  if (!px || B === null) return '';
  if (B <= 0) return `<p class="money small">你的計畫沒有配置 ${c}（到「進階 → 定期定額」可以調 BTC／ETH 比例）。</p>`;
  const have = (num(S[c.toLowerCase()]) ?? 0) * px, tgt = f.exposure * B;
  const act = TB.actHtml(TB.act({ have, B, e: f.exposure, T: TBAND }));   // v19: gap threshold from data/tradeband.json
  return `<p class="money">你打算放在 ${c} 的錢 ${ntd(B)}（總資產 × ${esc(S.dcaW)}%${c === 'BTC' ? ` × ${esc(S.dcaBtc)}%` : ` × ${100 - (num(S.dcaBtc) ?? 100)}%`}），建議放 <strong>${ntd(tgt)}</strong>。你現在有 ${ntd(have)}，${act}。</p>${WR.moneyText(f, B) ? `<p class="small badweek-ntd">${esc(WR.moneyText(f, B))}</p>` : ''}`;
}
function coinBlock(c) {
  const f = LIVE.coins[c]; if (!f) return '';
  const e = f.exposure, sharePct = Math.round(e * 100);
  const share = e < 0.005 ? '建議：<strong>先不要放</strong>（0%）' : `建議：放你打算投入 ${c} 的錢的 <strong>${sharePct}%</strong>${e >= 0.95 ? '（差不多全部）' : (e >= 0.4 && e <= 0.6) ? '（大約一半）' : ''}`;
  return `<div class="fc" data-coin="${c}">
      <div class="fc-head"><span class="coin">${c}</span><span class="state-big ${ACT_CLS[f.action]}">${esc(f.action_zh)}</span><span class="muted small">${ACT_HINT[f.action]}</span></div>
      <div id="fc-rel-${c}" class="rel">${relLine(c)}</div>
      <div id="fc-live-${c}" class="live">${liveLine(c)}</div>
      <p class="share">${share}</p>
      <p class="up">${esc(PU.DIR_TEXT)}</p>
      <p class="small">一週後價格大概在 ${usd(f.price_usd * (1 + f.q10))}～${usd(f.price_usd * (1 + f.q90))} 之間（10 次有 8 次落在這裡；現在 ${usd(f.price_usd)}）</p>
      <p class="badweek small">${esc(WR.homeLine(f, c, WRISK))}</p>
      <p class="why">原因：${esc(f.reason)}</p>
      ${OUTC ? `<p class="past small muted" data-coin="${c}">${esc(OC.homeLine(OUTC, c, f.action))}</p>` : ''}
      <div id="fc-money-${c}"></div>
    </div>`;
}
function forecastCard() {
  const any = LIVE.coins.BTC || LIVE.coins.ETH; if (!any) return '';
  return `<section class="card forecast" id="forecast">
    <div id="fc-change">${changeBanner()}</div>
    <h2>未來一週預測建議</h2>
    <p class="small muted">${closeMD(any.asof)} → ${closeMD(any.target_date)}（依每天早上 8 點的收盤價，每天更新一次）</p>
    <div id="fc-stale-wrap">${TR.topLine(LIVE, TRUST, Date.now(), DEV)}</div>
    ${coinBlock('BTC')}${coinBlock('ETH')}
    <p id="fc-spell" class="small spell-home">${spellHome()}</p>
    <p id="fc-next" class="small next-home">${nmHome()}</p>
    <div id="jr-hint-wrap">${JR.homeHint(JR.load(localStorage), LIVE)}</div>
    ${holdingsSet() ? '' : '<p class="small muted">想直接看要買賣多少錢：打開下面「進階 → 我的部位」填總資產和持有數量，這裡就會換算成金額。</p>'}
    ${TB.homeNote(TBAND) ? `<p class="small muted tb-note">${esc(TB.homeNote(TBAND))}</p>` : ''}
    <p class="small muted">「打算投入的錢」是你願意放在這個幣的上限。建議只看趨勢和波動，<strong>還沒有證明能贏過一直抱著</strong>；它的主要作用是大跌時少虧。</p>
  </section>`;
}
function trackCard() {
  const T = LIVE.track, ch = T.champion, b = T.baseline;
  const first = ch.first, ns = ch.scores?.n || 0;
  const nDays = Math.ceil((ch.n_forecasts || 0) / 2);
  const since = nDays < 14 ? `第 ${nDays} 天` : `${(nDays / 7).toFixed(0)} 週`;
  const hit = ns ? `已經有 ${ns} 次到期可以對答案，猜對漲跌 <strong>${pct0(ch.scores.hit)}</strong>（一直猜「會漲」是 ${pct0(b?.scores?.hit)}）。` : `第一批預測要到 ${first ? closeMD(addDays(first, 7)) : '—'} 才能對答案。`;
  const ret = x => x?.paper?.equity ? `${ntd(x.paper.equity)}<div class="muted small">${pct(x.paper.equity / T.paper_start_twd - 1, 2)}</div>` : '—';
  const W = LIVE.walkforward?.models, wc = W?.[LIVE.champion.key], wb = W?.[LIVE.baseline];
  const hist = wc && wb ? `<p class="small">回測（${wc.start.slice(0, 4)} 年起，每天只用當天以前的資料，BTC、ETH 各半）：照建議年化 ${pct(wc.cagr)}、最慘時虧 ${pctS(-wc.maxdd, 0)}；一直抱著年化 ${pct(wb.cagr)}、最慘時虧 ${pctS(-wb.maxdd, 0)}。猜漲跌的準確度 ${pct0(wc.hit)}，跟丟銅板差不多。</p>` : '';
  return `<section class="card track" id="track">
    <h2>預測成績單</h2>
    <p>從 ${first ? closeMD(first) : '—'} 開始，每天記錄一次預測（目前 ${ch.n_forecasts} 筆，兩個幣合計），記錄後不能修改。${hit}</p>
    <div class="kpis two">
      <div><div class="label">虛擬投資：照建議</div><div class="num sm">${ret(ch)}</div></div>
      <div><div class="label">虛擬投資：一直抱著</div><div class="num sm">${ret(b)}</div></div>
    </div>
    <p class="small muted">各用虛擬 NT$100 萬（BTC、ETH 各半）、每天照建議調整，已扣手續費和台幣買 USDT 的溢價。不是真的錢。</p>
    ${hist}
    <p class="warn">實際紀錄才剛開始（${since}）。至少要累積 8 週，系統才會開始比較不同的預測方法，表現更好的才會換上來；在那之前，請把建議當參考就好。</p>
  </section>`;
}
function modelsCard() {
  if (!LIVE) return '';
  const W = LIVE.walkforward?.models || {};
  const f = (x, d = 4) => x === null || x === undefined ? '—' : Number(x).toFixed(d);
  const rows = LIVE.models.map(m => { const w = W[m.key] || {};
    return `<tr${m.status === 'champion' ? ' class="hl"' : ''}><th>${esc(m.name)}<div class="muted small">${esc(m.key)}｜${STATUS_ZH[m.status] || m.status}</div></th><td>${m.n_forecasts}／${m.scores?.n || 0}</td><td>${f(m.scores?.brier)}</td><td>${m.paper?.equity ? ntd(m.paper.equity) : '—'}</td><td>${f(w.brier)}</td><td>${pct(w.cagr)}</td><td>${pct(w.maxdd, 0)}</td></tr>`; }).join('');
  return `<section class="card" id="models"><h2>預測模型與自我改善機制</h2>
    <p class="small">每天早上 8 點收盤後，所有登記的模型各自預測 BTC、ETH 未來 7 天（上漲機率、價格區間、建議部位），寫進只能新增、不能改的帳本（每筆都有雜湊鏈，並推到公開 GitHub）。7 天到期就自動評分，每個模型也各自跑一個虛擬 NT$100 萬的投資組合。每週檢討一次：挑戰者要實際累積 ≥ 8 週，而且「預測分數（Brier）」和「虛擬投資的風險調整報酬」都顯著比冠軍好、歷史回測不更差、最大跌幅不多跌 5 個百分點以上，才會取代冠軍。模型程式碼一登記就凍結；想改參數只能登記新版本、從零開始累積紀錄。</p>
    <div class="scroll"><table class="bt"><thead><tr><th>模型</th><th>實盤預測／已評分</th><th>實盤 Brier</th><th>虛擬投資</th><th>回測 Brier</th><th>回測年化</th><th>回測最大跌幅</th></tr></thead><tbody>${rows}</tbody></table></div>
    <p class="small muted" id="pup-note">${esc(PU.advNote(LIVE))}</p>
    ${RB.robustLine()}
    ${OF.overfitLine()}
    <p class="small muted">Brier：預測機率和實際結果的平方差，越低越好（永遠猜 50% = 0.25）。回測期間 ${esc(W[LIVE.champion.key]?.start || '—')}～${esc(W[LIVE.champion.key]?.end || '—')}，每天只用當天以前的資料。帳本：<a href="${esc(LIVE.ledger.repo)}" target="_blank" rel="noopener">GitHub coin-signal/ledger</a>（最後一筆雜湊 ${esc((LIVE.ledger.last_hash || '').slice(0, 12))}…）。預測產生於 ${fmtTime(Date.parse(LIVE.generated_at))}。</p>
  </section>`;
}
const advOpen = () => localStorage.getItem('adv-open') === '1';

// ======================= v12: 我的決策紀錄（只存在這支手機） =======================
function journalHtml() {
  const barsByCoin = {}, srcs = [];
  for (const c of ['BTC', 'ETH']) if (CTX[c]) { barsByCoin[c] = RL.closedBars(CTX[c].live.candles); srcs.push(`${c} ${CTX[c].live.candleSrc || '—'}，最新 ${ymd(barsByCoin[c][barsByCoin[c].length - 1].t)}`); }
  const budgets = {}, holdPct = {};
  for (const c of ['BTC', 'ETH']) {
    const B = coinBudget(c); budgets[c] = B && B > 0 ? B : null;
    const q = num(S[c.toLowerCase()]), px = twdPrice(c);
    if (budgets[c] && q !== null && px) holdPct[c] = String(Math.round(q * px / budgets[c] * 1000) / 10);
  }
  return JR.journalCard({ list: JR.load(localStorage), live: LIVE, barsByCoin, src: srcs.join('；'), budgets, holdPct, costs: OUTC?.costs || JR.DEFAULT_COSTS });
}
function refreshJournal() {
  const c = document.getElementById('journal'); if (c) c.outerHTML = journalHtml();
  const h = document.getElementById('jr-hint-wrap'); if (h && LIVE) h.innerHTML = JR.homeHint(JR.load(localStorage), LIVE);
}
function journalSave(c) {
  const box = document.querySelector(`.jr-form[data-coin="${c}"]`); if (!box) return;
  const choice = box.querySelector(`input[name="jr-choice-${c}"]:checked`)?.value;
  const B = coinBudget(c);
  const r = JR.makeEntry({ coin: c, f: LIVE?.coins?.[c], choice, pctText: box.querySelector('.jr-pct').value, amountText: box.querySelector('.jr-amt').value, budget: B && B > 0 ? B : null });
  if (r.error) { const m = box.querySelector('.jr-msg'); if (m) { m.textContent = r.error; m.className = 'jr-msg small warn-inline'; } return; }
  if (!JR.save(localStorage, JR.upsert(JR.load(localStorage), r.entry))) { const m = box.querySelector('.jr-msg'); if (m) m.textContent = '這支手機不能存資料（可能是私密瀏覽）。'; return; }
  refreshJournal();
  const m = document.querySelector(`.jr-msg[data-coin="${c}"]`); if (m) { m.textContent = '已記下。'; m.className = 'jr-msg small ok-inline'; }
}
async function goJournal() {
  const adv = $('#adv'); if (!adv) return;
  if (!adv.open) { adv.open = true; localStorage.setItem('adv-open', '1'); }
  for (let i = 0; i < 100 && !document.getElementById('journal'); i++) await new Promise(r => setTimeout(r, 100));
  document.getElementById('journal')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function render(force = false) {
  const el = $('#content');
  el.innerHTML = '<p class="loading">載入中…</p>';
  try {
    if (!BT || !DEC || !DCA) [BT, DEC, DCA] = await Promise.all(['backtest', 'decision', 'dca'].map(n => fetch(`data/${n}.json`).then(r => r.json())));
  } catch (e) {
    el.innerHTML = `<section class="card"><p class="warn">⚠️ ${esc(e.message || e)}</p><p class="small">請確認網路後按右上角 ↻ 重試。</p></section>`; return;
  }
  try { LIVE = await fetch('data/live.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : null); } catch { LIVE = LIVE || null; }
  try { EV = await fetch('data/events.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : null) || EV; } catch { EV = EV || null; }
  try { OUTC = await fetch('data/outcomes.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : null) || OUTC; } catch { OUTC = OUTC || null; }
  try { WRISK = await fetch('data/weekrisk.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : null) || WRISK; } catch { WRISK = WRISK || null; }
  try { SPELLS = await fetch('data/spells.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : null) || SPELLS; } catch { SPELLS = SPELLS || null; }
  try { NMOVE = await fetch('data/nextmove.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : null) || NMOVE; } catch { NMOVE = NMOVE || null; }
  try { TBAND = await fetch('data/tradeband.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : null) || TBAND; } catch { TBAND = TBAND || null; }
  try { TRUST = await fetch('data/trust.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : null) || TRUST; } catch { TRUST = TRUST || null; }
  try { FLIPS = await fetch('data/flips.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : null) || FLIPS; } catch { FLIPS = FLIPS || null; }
  try { TESTED = await fetch('data/tested_signals.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : null) || TESTED; } catch { TESTED = TESTED || null; }
  try { INTRA = await fetch('data/intraday.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : null) || INTRA; } catch { INTRA = INTRA || null; }
  try { XSRC = await fetch('data/xsrc.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : null) || XSRC; } catch { XSRC = XSRC || null; }
  TICK = { BTC: { status: 'loading' }, ETH: { status: 'loading' } };
  PENDING = LIVE ? FL.pendingChanges(localStorage, LIVE.coins) : {};
  FL.setBadge(Object.keys(PENDING).length);
  el.innerHTML = `
    ${LIVE ? forecastCard() + weekCard(EV) + trackCard() : '<section class="card"><p class="warn">⚠️ 預測資料暫時讀不到，請按右上角 ↻ 重試。</p></section>'}
    <details id="adv" class="card adv"${advOpen() ? ' open' : ''}><summary>進階（可不看）</summary>
      <p class="small muted">技術指標、回測和各種試算工具，給 cs 做決策時參考。</p>
      <nav class="tabs" role="tablist"><button role="tab" data-coin="BTC" aria-selected="${coin === 'BTC'}">BTC</button><button role="tab" data-coin="ETH" aria-selected="${coin === 'ETH'}">ETH</button></nav>
      <div id="adv-body"><p class="loading">載入行情中…</p></div>
    </details>`;
  $('#adv').addEventListener('toggle', e => localStorage.setItem('adv-open', e.target.open ? '1' : '0'));
  updateOuts();
  $('#meta').textContent = `版本 ${VERSION}${LIVE ? `｜預測 ${LIVE.coins.BTC?.asof || ''}｜冠軍模型 ${LIVE.champion.key}` : ''}`;
  devCheck();
  await renderAdv(force);
  await loadTickers();
}
// v9: re-verify the published ledger chain on this phone (once per render); refresh the top line and the 進階 card
async function devCheck() {
  DEV = undefined;
  const r = await TR.verifyOnDevice().catch(e => ({ ok: null, why: e.message || String(e) }));
  DEV = r;
  const w = $('#fc-stale-wrap'); if (w && LIVE) w.innerHTML = TR.topLine(LIVE, TRUST, Date.now(), DEV);
  const c = $('#trust'); if (c) c.outerHTML = TR.trustCard(TRUST, LIVE, Date.now(), DEV);
}

async function renderAdv(force = false) {
  const el = $('#adv-body'); if (!el) return;
  document.querySelectorAll('#adv .tabs button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.coin === coin)));
  try {
    const other = coin === 'BTC' ? 'ETH' : 'BTC';
    const [pr, cur, oth] = await Promise.allSettled([fetchPrices(force), loadLive(coin, force), loadLive(other, force)]);
    PRICES = pr.status === 'fulfilled' ? pr.value : PRICES;
    if (cur.status !== 'fulfilled') throw cur.reason;
    CTX[coin] = ctxFrom(cur.value);
    if (oth.status === 'fulfilled') CTX[other] = ctxFrom(oth.value);
    ADV = 'done';
    const c = BT.coins[coin], ctx = CTX[coin], live = ctx.live, r = ctx.r;
    const a = analog(c.analog.history, FEATURES.map(f => r[f]));
    const pos = rulePositions(ctx.rows);
    const ago = Math.round((Date.now() - live.at) / 60000);
    const NOW = Date.now();
    el.innerHTML = `
      <nav class="jump"><a href="#journal">我的決策紀錄</a><a href="#outcomes">建議之後一週</a><a href="#weekrisk">運氣差的一週</a><a href="#tradeband">差一點要不要動</a><a href="#nextmove">這週要動手嗎</a><a href="#spells">空手要等多久</a><a href="#recent">建議變化</a><a href="#intraday">盤中離翻轉價</a><a href="#xsrc">台幣翻轉價</a><a href="#data">資料可靠度</a><a href="#trust">紀錄可信度</a><a href="#today">今天</a><a href="#risk">我的部位</a><a href="#plan">定期定額</a><a href="#models">模型驗證</a><a href="#tested">沒通過的訊號</a><a href="#events">大漲跌原因</a><a href="#lev">槓桿</a><a href="#cost">買幣成本</a><a href="#notes">研究</a><a href="#signals">訊號細節</a></nav>
      ${LIVE ? journalHtml() : ''}
      ${FR.withAsof(OC.outcomesCard(OUTC), FR.asofOf('outcomes', OUTC), NOW)}
      ${FR.withAsof(WR.weekRiskCard(WRISK), FR.asofOf('weekrisk', WRISK), NOW)}
      ${FR.withAsof(TB.tradeBandCard(TBAND), FR.asofOf('tradeband', TBAND), NOW)}
      <div id="nm-wrap">${FR.withAsof(nextMoveHtml(), NMOVE?.as_of ?? null, NOW)}</div>
      ${FR.withAsof(spellsHtml(), SPELLS?.as_of ?? null, NOW)}
      ${FR.withAsof(recentCard(), FR.asofOf('flips', FLIPS), NOW)}
      ${FR.withAsof(intraCard(), FR.asofOf('intraday', INTRA), NOW)}
      ${relCard()}
      ${FR.withAsof(xsrcHtml(), XSRC?.as_of ?? null, NOW)}
      ${TR.trustCard(TRUST, LIVE, Date.now(), DEV)}
      ${FR.withAsof(decisionCard(coin), FR.asofOf('decision', DEC), NOW)}
      ${FR.withAsof(riskCard(), FR.asofOf('weekly', DEC), NOW)}
      ${FR.withAsof(planCard(), FR.asofOf('dca', DCA), NOW)}
      ${FR.withAsof(modelsCard(), FR.asofOf('walkforward', LIVE), NOW)}
      ${TS.testedCard(TESTED)}
      ${eventsCard(EV)}
      ${FR.withAsof(levCard(coin), FR.asofOf('decision', DEC), NOW)}
      ${costCard(coin)}
      ${researchCard()}
      <section class="card" id="signals"><details><summary>訊號細節：綜合預測與 7 個個別訊號</summary>
        ${FR.asofLine(FR.asofOf('backtest', BT), NOW)}
        <p class="small">這些是 v1 的預測指標。保留在這裡是為了透明：它們在樣本外大多沒有預測力，不建議拿來決定買賣。</p>
        ${outlookCard(c, r, a, live)}
        ${ORDER.map(k => signalCard(k, c.signals[k], r, pos[k])).join('')}
      </details></section>
      <section class="card small muted">
        <p>資料來源：日K ${esc(live.candleSrc || '—')}；資金費率 ${esc(live.fundingSrc || '抓不到')}；恐懼貪婪 ${esc(live.fngSrc || '抓不到')}；台幣價格與匯率 ${PRICES ? 'CoinGecko' : '抓不到（改用 MAX 快照估算）'}。抓取時間：${fmtTime(live.at)}${live.fromCache ? `（${ago < 1 ? '剛剛' : ago + ' 分鐘前'}的暫存${live.stale ? '，目前連不上網路' : ''}）` : ''}。</p>
        <p>決策數字：${esc(DEC.conventions.trend3)}。回測扣每次進出 0.15%，訊號在收盤後才用、隔天才持有。決策資料產生於 ${fmtTime(Date.parse(DEC.generated_at_utc.replace('Z', ':00Z')))}，訊號回測產生於 ${fmtTime(Date.parse(BT.generated_at_utc.replace('Z', ':00Z')))}。括號裡的 C#編號是對應的研究報告。</p>
        ${live.errors?.length ? `<p>連線備註：${esc(live.errors.join('；'))}</p>` : ''}
      </section>`;
  } catch (e) {
    ADV = 'error';
    el.innerHTML = `<section class="card"><p class="warn">⚠️ ${esc(e.message || e)}</p><p class="small">請確認網路後按右上角 ↻ 重試。</p>${LIVE ? journalHtml() : ''}${FR.withAsof(OC.outcomesCard(OUTC), FR.asofOf('outcomes', OUTC), Date.now())}${FR.withAsof(WR.weekRiskCard(WRISK), FR.asofOf('weekrisk', WRISK), Date.now())}${FR.withAsof(TB.tradeBandCard(TBAND), FR.asofOf('tradeband', TBAND), Date.now())}${FR.withAsof(nextMoveHtml(), NMOVE?.as_of ?? null, Date.now())}${FR.withAsof(spellsHtml(), SPELLS?.as_of ?? null, Date.now())}${FR.withAsof(recentCard(), FR.asofOf('flips', FLIPS), Date.now())}${TR.trustCard(TRUST, LIVE, Date.now(), DEV)}${FR.withAsof(modelsCard(), FR.asofOf('walkforward', LIVE), Date.now())}${eventsCard(EV)}</section>`;
  }
  updateOuts();
}

const onInput = e => {
  const k = e.target.dataset?.k; if (!k) return;
  S[k] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
  saveS(); updateOuts();
};
$('#content').addEventListener('input', onInput);
$('#content').addEventListener('change', onInput);
// v12: choosing 照建議 fills in the recommended %
$('#content').addEventListener('change', e => {
  const m = e.target.name?.match(/^jr-choice-(BTC|ETH)$/); if (!m || e.target.value !== 'follow') return;
  const f = LIVE?.coins?.[m[1]], box = e.target.closest('.jr-form');
  if (f && box) box.querySelector('.jr-pct').value = String(Math.round(f.exposure * 1000) / 10);
});
$('#content').addEventListener('click', e => {
  if (e.target.closest('.chg-x')) { dismissChange(); return; }
  if (e.target.closest('.jr-go')) { e.preventDefault(); goJournal(); return; }
  const js = e.target.closest('.jr-save'); if (js) { journalSave(js.dataset.coin); return; }
  const jd = e.target.closest('.jr-del'); if (jd) { JR.save(localStorage, JR.remove(JR.load(localStorage), jd.dataset.id)); refreshJournal(); return; }
  if (e.target.closest('.jr-clear')) { if (confirm('確定清除這支手機上的全部決策紀錄？')) { JR.save(localStorage, []); refreshJournal(); } return; }
  const b = e.target.closest('#adv .tabs button'); if (!b) return;
  coin = b.dataset.coin; localStorage.setItem('coin', coin); renderAdv();
});
$('#refresh').addEventListener('click', () => render(true));
if ('serviceWorker' in navigator) {
  const hadController = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController && !reloaded) { reloaded = true; location.reload(); } });
  navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {});
}
render();
