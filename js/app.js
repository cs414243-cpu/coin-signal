import { buildRows, completedOnly, rulePositions, analog, STATE, FEATURES, DAY } from './signals.js';
import { fetchCandles, fetchFunding, fetchFng, fetchSpot } from './data.js';

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

async function render(force = false) {
  const el = $('#content');
  document.querySelectorAll('.tabs button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.coin === coin)));
  el.innerHTML = '<p class="loading">載入行情中…</p>';
  try {
    if (!BT) BT = await (await fetch('data/backtest.json')).json();
    const c = BT.coins[coin];
    const live = await loadLive(coin, force);
    const done = completedOnly(live.candles);
    const last = live.candles[live.candles.length - 1];
    const rows = buildRows(done, live.funding, live.fng);
    live.rows = rows;
    const r = rows[rows.length - 1];
    const a = analog(c.analog.history, FEATURES.map(f => r[f]));
    const pos = rulePositions(rows);
    const price = live.spot?.usd ?? last.c;
    const ago = Math.round((Date.now() - live.at) / 60000);
    el.innerHTML = `
      <section class="card price">
        <div class="row"><div><div class="label">${coin} 現價</div><div class="num">${usd(price)}</div>${live.spot?.twd ? `<div class="muted small">約 NT$${Math.round(live.spot.twd).toLocaleString('en-US')}</div>` : ''}</div>
        <div class="right small muted">訊號依據：${fmtTime(r.t + DAY)} 收盤的日K<br>抓取時間：${fmtTime(live.at)}${live.fromCache ? `（${ago < 1 ? '剛剛' : ago + ' 分鐘前'}的暫存${live.stale ? '，目前連不上網路' : ''}）` : ''}</div></div>
        ${chart(rows)}
      </section>
      ${outlookCard(c, r, a, live)}
      <h2 class="section">個別訊號</h2>
      ${ORDER.map(k => signalCard(k, c.signals[k], r, pos[k])).join('')}
      <section class="card small muted">
        <p>資料來源：日K ${esc(live.candleSrc || '—')}；資金費率 ${esc(live.fundingSrc || '抓不到')}；恐懼貪婪 ${esc(live.fngSrc || '抓不到')}；台幣價格 CoinGecko。回測資料：${esc(BT.conventions.data)}，產生於 ${fmtTime(Date.parse(BT.generated_at_utc.replace('Z', ':00Z')))}。</p>
        <p>方法：訊號在每天收盤（00:00 UTC，台北早上 8 點）計算，隔天才持有，沒有偷看未來資料。樣本內到 2022 年底，樣本外從 ${BT.conventions.oos_start} 起。規則都是事先固定的常見用法，沒有拿資料調參數。</p>
        ${live.errors?.length ? `<p>連線備註：${esc(live.errors.join('；'))}</p>` : ''}
      </section>`;
    $('#meta').textContent = `回測快照 ${BT.coins[coin].last_date}｜版本 v1`;
  } catch (e) {
    el.innerHTML = `<section class="card"><p class="warn">⚠️ ${esc(e.message || e)}</p><p class="small">請確認網路後按右上角 ↻ 重試。</p></section>`;
  }
}

document.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => { coin = b.dataset.coin; localStorage.setItem('coin', coin); render(); }));
$('#refresh').addEventListener('click', () => render(true));
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {});
render();
