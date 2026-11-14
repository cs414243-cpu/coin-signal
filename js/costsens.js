// v38: 手續費高一點，照建議還划算嗎 — pure functions (no DOM, no network).
// History: backtest/cost_sens.py → data/costsens.json (champion trend_vt@1 on closed Binance daily bars, the same rule
// re-run with every per-side cost from 0% to 2%; NT$ premium 0.27% on buys fixed; hold = buy once, pays the cost once).
// Descriptive past record only (not a signal, not a forecast).
const pc = (x, d = 1) => x === null || x === undefined || !Number.isFinite(x) ? '—' : `${x < 0 ? '−' : ''}${Math.abs(x * 100).toFixed(d)}%`;
const fc = f => `${+(f * 100).toFixed(2)}%`;   // 0.0015 → "0.15%", 0.005 → "0.5%", 0.01 → "1%"
const pp = x => x === null || !Number.isFinite(x) ? '—' : `${(x * 100).toFixed(1)} 個百分點`;
const ASSUMED = 0.0015;

/** Linear interpolation of a table column at per-side cost f (table rows sorted by f). Outside the table → null. */
export function at(table, f, key) {
  if (!Array.isArray(table) || !table.length || !Number.isFinite(f)) return null;
  if (f < table[0].f - 1e-12 || f > table.at(-1).f + 1e-12) return null;
  for (let i = 0; i < table.length; i++) {
    const a = table[i]; if (Math.abs(a.f - f) < 1e-12) return a[key];
    const b = table[i + 1]; if (b && f > a.f && f < b.f) return a[key] + (b[key] - a[key]) * (f - a.f) / (b.f - a.f);
  }
  return null;
}
/** Per-side cost a person actually pays (fee + spread/slippage, premium excluded) from the 買幣成本 buy/sell results. */
export function perSide(buy, sell) {
  if (!buy || !sell) return null;
  const v = ((buy.fees + buy.slip) + (sell.fees + sell.slip)) / 2;
  return Number.isFinite(v) && v >= 0 ? v : null;
}
const W = (CS, way, who) => { const P = CS?.periods?.oos?.ways?.[way]; return who === 'mix' ? P?.mix : P?.coins?.[who]; };
const loseFor = T => { const a = at(T, ASSUMED, 'cagr'), b = at(T, ASSUMED + 0.001, 'cagr'); return a === null || b === null ? null : a - b; };

/** One line under the 買幣成本 calculator: what the rule did in 2024→ at THIS person's cost (coin alone, 「差一點不用動」). */
export function userLine(coin, f, CS) {
  const T = W(CS, 'gap20', coin)?.table; if (!T || f === null || !Number.isFinite(f)) return '';
  const cmp = Math.abs(f - ASSUMED) < 0.0003 ? '和回測假設的 0.15% 差不多' : f > ASSUMED ? `比回測假設的 0.15% 高` : `比回測假設的 0.15% 低`;
  const head = `照上面的條件，一次買或賣（手續費＋價差，不含溢價）約 ${pc(f, 2)}，${cmp}。`;
  if (f > T.at(-1).f) return head + `這比回測表上最高的 ${fc(T.at(-1).f)} 還高，照建議常常買賣，這種成本下多半不划算；請先找成本低一點的買法。這是過去紀錄，不是保證。`;
  const r = at(T, f, 'cagr'), h = at(T, f, 'hold_cagr'), dd = at(T, f, 'maxdd'), hd = at(T, f, 'hold_maxdd');
  const verdict = r > h + 0.005 ? '照建議賺得比較多，也跌得比較少' : r < h - 0.005 ? '一直抱著賺得比較多，照建議的好處只剩跌得比較少' : '兩者賺得差不多，照建議的好處主要是跌得比較少';
  return head + `2024 年起的回測，每次成本 ${pc(f, 2)} 時，只放 ${coin}、照「差一點不用動」一年平均約 ${pc(r)}（一直抱著 ${pc(h)}），最多跌 ${pc(dd, 0)}（一直抱著 ${pc(hd, 0)}）：${verdict}。這是過去紀錄，不是保證。`;
}

function rowHtml(T1, T2, f) {
  const g = k => at(T1, f, k), q = k => at(T2, f, k);
  const mark = Math.abs(f - ASSUMED) < 1e-9 ? '<div class="muted small">回測假設</div>' : '';
  return `<tr${mark ? ' class="hl"' : ''}><th>${fc(f)}${mark}</th><td>${pc(g('cagr'))}</td><td>${pc(q('cagr'))}<div class="muted small">最多跌 ${pc(q('maxdd'), 0)}</div></td><td>${pc(g('hold_cagr'))}<div class="muted small">最多跌 ${pc(g('hold_maxdd'), 0)}</div></td></tr>`;
}
/** Advanced card 「手續費高一點還划算嗎」. vip0 = DEC.max.vip[0] (optional, for the MAX example). */
export function costSensCard(CS, vip0) {
  const D = W(CS, 'daily', 'mix'), G = W(CS, 'gap20', 'mix');
  if (!D?.table || !G?.table) return `<section class="card" id="costsens"><h2>手續費高一點還划算嗎</h2><p class="muted small">資料讀不到，稍後再試。</p></section>`;
  const tD = at(D.table, ASSUMED, 'turn_yr'), tG = at(G.table, ASSUMED, 'turn_yr');
  const lD = loseFor(D.table), lG = loseFor(G.table);
  const BG = W(CS, 'gap20', 'BTC'), EG = W(CS, 'gap20', 'ETH'), BD = W(CS, 'daily', 'BTC');
  const be = x => x === null || x === undefined ? '超過 2%' : x === 0 ? '0%' : `約 ${fc(x)}`;
  const full = CS.periods?.full?.ways;
  const tbl = `<div class="scroll"><table class="bt"><thead><tr><th>每次成本</th><th>每天調</th><th>差一點<br>不用動</th><th>一直<br>抱著</th></tr></thead><tbody>
      ${CS.show.map(f => rowHtml(D.table, G.table, f)).join('')}</tbody></table></div>`;
  const bt = x => at(BG.table, ASSUMED, x), et = x => at(EG.table, ASSUMED, x);
  const taker = vip0?.taker, maker = vip0?.maker;
  return `<section class="card" id="costsens"><h2>手續費高一點還划算嗎</h2>
    <p class="small">回測和首頁的虛擬投資都假設：每次買或賣付 0.15%（手續費＋價差），買進再多付台幣買 USDT 的溢價 0.27%。照建議一年大約要把這筆錢買賣 ${tD === null ? '—' : tD.toFixed(0)} 倍（照首頁「差一點不用動」少調幾次：約 ${tG === null ? '—' : tG.toFixed(0)} 倍），所以<strong>每次成本多 0.1%，一年平均大約少 ${pp(lD)}（差一點不用動：${pp(lG)}）</strong>。下表是 2024 年起、BTC 和 ETH 各放一半的回測，數字是一年平均（「每次成本」＝一次買或賣的手續費＋價差）：</p>
    ${tbl}
    <p class="small">兩個幣各一半：每次成本到${be(D.be_cagr)}（差一點不用動：${be(G.be_cagr)}）以上，照建議一年平均就不再比一直抱著多；但最多跌還是淺很多。<strong>只放 BTC 不一樣</strong>：2024 年起一直抱著 BTC 一年平均 ${pc(bt('hold_cagr'))}，照建議（差一點不用動、成本 0.15%）${pc(bt('cagr'))}，本來就差不多（每天照建議調更低：${pc(at(BD.table, ASSUMED, 'cagr'))}）——照建議的好處只剩跌得少（最多 ${pc(bt('maxdd'), 0)} vs ${pc(bt('hold_maxdd'), 0)}），成本越高這個代價越大。ETH 同期一直抱著 ${pc(et('hold_cagr'))}，照建議 ${pc(et('cagr'))}，成本到 1% 也還是照建議比較好。</p>
    <p class="small">怎麼用：① 在下面「台幣買幣成本」填你的金額、手續費等級，算出來的成本下面會直接寫「你的成本在回測裡是什麼結果」。② ${taker ? `MAX 最低等級吃單每筆 ${pc(taker, 2)}；` : ''}從台幣經 USDT 再買幣是兩筆，光手續費就${taker ? ` ${pc(2 * taker, 2)}` : '是兩倍'}，比回測假設高${maker ? `；直接台幣市場只有一筆、或用掛單（${pc(maker, 2)}）會便宜，但台幣市場價差可能比較大，兩條路都算一下再選` : ''}。③ 照首頁「差一點不用動」，差不到 20 個百分點就不調，可以少買賣、省成本；建議變成「先不要放」時還是要當天賣。</p>
    <p class="small muted">算法：<code>backtest/cost_sens.py</code> → <code>data/costsens.json</code>（Binance 已收完日K，${CS.first_bar}～${CS.as_of}；定義事先固定在程式說明）。同一套冠軍規則，每次買賣成本從 0% 到 2% 每 0.01% 重算一次，買進溢價固定 0.27%；一直抱著＝第一天買進付一次成本、之後不動；沒投入的錢不算利息；沒算稅、提領費、交易所倒閉風險。2024 年起是規則定好之後才有的資料；2018 年起（設定規則時看過的期間）兩幣各半的打平成本是${be(full?.daily?.mix?.be_cagr)}（差一點不用動：${be(full?.gap20?.mix?.be_cagr)}）。「一年平均」是複利年化。這是過去紀錄，不是保證。</p>
  </section>`;
}
