import { buildRows, completedOnly, rulePositions, analog, STATE, FEATURES, DAY } from './signals.js';
import { fetchCandles, fetchFunding, fetchFng, fetchSpot, fetchPrices } from './data.js';
import * as DX from './decision.js';

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
  if (!force && cached && Date.now() - cached.at < 10 * 60 * 1000) return { ...cached, fromCache: true };
  const [cd, fd, gd, spot] = await Promise.all([fetchCandles(sym), fetchFunding(sym), fetchFng(), fetchSpot(sym)]);
  if (!cd.data) {
    if (cached) return { ...cached, fromCache: true, stale: true, errors: cd.errors };
    throw new Error('所有行情來源都連不上：' + cd.errors.join('；'));
  }
  const live = { at: Date.now(), candles: cd.data, candleSrc: cd.source, funding: fd.data, fundingSrc: fd.source, fng: gd.data, fngSrc: gd.source, spot,
    errors: [...cd.errors, ...fd.errors, ...gd.errors] };
  try { localStorage.setItem(key, JSON.stringify(live)); } catch {}
  return live;
}

// ======================= v2: decision layer =======================
const VERSION = 'v2';
const ntd = x => x === null || x === undefined || !Number.isFinite(x) ? '—' : `${x < 0 ? '−' : ''}NT$${Math.abs(Math.round(x)).toLocaleString('en-US')}`;
const pctS = (x, d = 1) => x === null || x === undefined || !Number.isFinite(x) ? '—' : `${x < 0 ? '−' : ''}${Math.abs(x * 100).toFixed(d)}%`;
const SKEY = 'cs-v2-settings';
const DEFAULTS = { budget: 2, total: '', btc: '', eth: '', rest: '6040', lev: 3, levDays: 7, levSide: 'long', amt: 100000, route: 'usdt', vip: 0, maker: false, quote: '' };
let S = { ...DEFAULTS, ...(() => { try { return JSON.parse(localStorage.getItem(SKEY) || '{}'); } catch { return {}; } })() };
const saveS = () => { try { localStorage.setItem(SKEY, JSON.stringify(S)); } catch {} };
const num = v => { const x = parseFloat(String(v).replace(/,/g, '')); return Number.isFinite(x) ? x : null; };
let DEC = null, PRICES = null;
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
  set('lev-out', () => levOut(coin));
  set('cost-out', () => costOut(coin));
}

function ctxFrom(live) {
  const rows = buildRows(completedOnly(live.candles), live.funding, live.fng);
  live.rows = rows;
  const last = live.candles[live.candles.length - 1];
  return { live, rows, r: rows[rows.length - 1], priceUsd: live.spot?.usd ?? last.c };
}

async function render(force = false) {
  const el = $('#content');
  document.querySelectorAll('.tabs button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.coin === coin)));
  el.innerHTML = '<p class="loading">載入行情中…</p>';
  try {
    if (!BT || !DEC) [BT, DEC] = await Promise.all([fetch('data/backtest.json').then(r => r.json()), fetch('data/decision.json').then(r => r.json())]);
    const other = coin === 'BTC' ? 'ETH' : 'BTC';
    const [pr, cur, oth] = await Promise.allSettled([fetchPrices(force), loadLive(coin, force), loadLive(other, force)]);
    PRICES = pr.status === 'fulfilled' ? pr.value : null;
    if (cur.status !== 'fulfilled') throw cur.reason;
    CTX[coin] = ctxFrom(cur.value);
    if (oth.status === 'fulfilled') CTX[other] = ctxFrom(oth.value);
    const c = BT.coins[coin], ctx = CTX[coin], live = ctx.live, r = ctx.r;
    const a = analog(c.analog.history, FEATURES.map(f => r[f]));
    const pos = rulePositions(ctx.rows);
    const ago = Math.round((Date.now() - live.at) / 60000);
    el.innerHTML = `
      <nav class="jump"><a href="#today">今天</a><a href="#risk">我的部位</a><a href="#lev">槓桿</a><a href="#cost">買幣成本</a><a href="#notes">研究</a><a href="#signals">訊號細節</a></nav>
      ${decisionCard(coin)}
      ${riskCard()}
      ${levCard(coin)}
      ${costCard(coin)}
      ${researchCard()}
      <section class="card" id="signals"><details><summary>訊號細節：綜合預測與 7 個個別訊號</summary>
        <p class="small">這些是 v1 的預測指標。保留在這裡是為了透明：它們在樣本外大多沒有預測力，不建議拿來決定買賣。</p>
        ${outlookCard(c, r, a, live)}
        ${ORDER.map(k => signalCard(k, c.signals[k], r, pos[k])).join('')}
      </details></section>
      <section class="card small muted">
        <p>資料來源：日K ${esc(live.candleSrc || '—')}；資金費率 ${esc(live.fundingSrc || '抓不到')}；恐懼貪婪 ${esc(live.fngSrc || '抓不到')}；台幣價格與匯率 ${PRICES ? 'CoinGecko' : '抓不到（改用 MAX 快照估算）'}。抓取時間：${fmtTime(live.at)}${live.fromCache ? `（${ago < 1 ? '剛剛' : ago + ' 分鐘前'}的暫存${live.stale ? '，目前連不上網路' : ''}）` : ''}。</p>
        <p>決策數字：${esc(DEC.conventions.trend3)}。回測扣每次進出 0.15%，訊號在收盤後才用、隔天才持有。決策資料產生於 ${fmtTime(Date.parse(DEC.generated_at_utc.replace('Z', ':00Z')))}，訊號回測產生於 ${fmtTime(Date.parse(BT.generated_at_utc.replace('Z', ':00Z')))}。括號裡的 C#編號是對應的研究報告。</p>
        ${live.errors?.length ? `<p>連線備註：${esc(live.errors.join('；'))}</p>` : ''}
      </section>`;
    updateOuts();
    $('#meta').textContent = `回測快照 ${DEC.coins[coin].last_date}｜版本 ${VERSION}`;
  } catch (e) {
    el.innerHTML = `<section class="card"><p class="warn">⚠️ ${esc(e.message || e)}</p><p class="small">請確認網路後按右上角 ↻ 重試。</p></section>`;
  }
}

const onInput = e => {
  const k = e.target.dataset?.k; if (!k) return;
  S[k] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
  saveS(); updateOuts();
};
$('#content').addEventListener('input', onInput);
$('#content').addEventListener('change', onInput);
document.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => { coin = b.dataset.coin; localStorage.setItem('coin', coin); render(); }));
$('#refresh').addEventListener('click', () => render(true));
if ('serviceWorker' in navigator) {
  const hadController = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController && !reloaded) { reloaded = true; location.reload(); } });
  navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {});
}
render();
