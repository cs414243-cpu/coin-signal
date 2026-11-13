// v24: 翻轉價換成 MAX 台幣價＋別家交易所價格交叉核對.
// Numbers come from app/data/xsrc.json (backtest/fetch_xsrc.py → backtest/xsrc.py, public keyless data, cached with fetch_log).
// The flip prices themselves are computed in the app from the same closed Binance daily bars as everything else (reliability.flipLevels).
const pc1 = x => `${(x * 100).toFixed(1)}%`;
const pc2 = x => `${(x * 100).toFixed(2)}%`;
const bpsPct = b => `${(b / 100).toFixed(2)}%`;
export const ntd = x => Number.isFinite(x) ? 'NT$' + Math.round(x).toLocaleString('en-US') : '—';
const usd = x => Number.isFinite(x) ? x.toLocaleString('en-US', { maximumFractionDigits: x > 1000 ? 0 : 2 }) + ' 美元' : '—';
const md = s => { const [, m, d] = s.split('-'); return `${+m}/${+d}`; };

/** Approximate MAX USDT/TWD now. Live: CoinGecko tether→TWD × (1 + median MAX premium of the last 30 days, from xsrc.json).
 *  Fallback: last MAX USDT/TWD daily close in xsrc.json (dated). null if neither. */
export function maxRate(X, prices) {
  const cg = prices?.tether?.twd, prem = X?.max?.coingecko?.premium_median_30d;
  if (Number.isFinite(cg) && cg > 20 && cg < 50 && Number.isFinite(prem)) return { v: cg * (1 + prem), src: 'live', cg, prem };
  const L = X?.max?.usdttwd_last;
  if (L && Number.isFinite(L.close)) return { v: L.close, src: 'file', date: L.date };
  return null;
}
/** USD(T) price → approximate NT$ on MAX. */
export function twdOf(price, rate) { return rate && Number.isFinite(price) ? price * rate.v : null; }
export function rateText(rate, X) {
  if (!rate) return '台幣換算：抓不到匯率';
  if (rate.src === 'live') return `換算匯率 1 USDT ≈ NT$${rate.v.toFixed(2)}（CoinGecko 即時 ${rate.cg.toFixed(2)}，加上最近 30 天 MAX 平均多出的 ${pc2(rate.prem)}）`;
  return `換算匯率 1 USDT ≈ NT$${rate.v.toFixed(2)}（MAX ${md(rate.date)} 收盤；即時匯率抓不到，可能和現在差一點）`;
}
/** Short NT$ add-on for the homepage 「接近翻轉」 line, e.g. 「（在 MAX 約 NT$2,413,546）」. */
export function homeAddon(price, rate) {
  const t = twdOf(price, rate); return t ? `（在 MAX 約 ${ntd(t)}）` : '';
}
/** The single plain line: 「換成別家交易所的價格，建議有 X% 的日子不同」. */
export function xsrcLine(X) {
  const h = X?.headline; if (!h?.all?.action?.days) return '';
  const a = h.all.action, o = h.oos.action;
  return `<p id="xsrc-line"><strong>換成別家交易所的價格，建議有 ${pc1(a.pct)} 的日子不同</strong>（2018 年起 BTC、ETH，拿 Coinbase、Bitstamp 的價格照同一條規則重算，${a.days.toLocaleString('en-US')} 次比較裡 ${a.diff} 次不同；2024 年起 ${pc1(o.pct)}）。不同的時候，${Math.round(a.same_state / a.diff * 100)}%（2024 年起 ${Math.round(o.same_state / o.diff * 100)}%）趨勢狀態其實一樣，只是加碼／減碼的幅度剛好跨過門檻；趨勢狀態本身不同只有 ${pc2(h.all.state.pct)} 的日子。用哪一家回測成績都差不多，所以照 Binance 的規則就好。</p>`;
}
const pick = (o, k) => o?.[k];
/** Plain summary of the Sharpe differences vs Binance (signal-only versions), computed from the file. */
export function diffText(bt) {
  const d = per => ['coinbase_signal', 'bitstamp_signal'].map(k => bt[per][k].sharpe_diff);
  const say = (per, nm) => { const x = d(per), lo = Math.min(...x), hi = Math.max(...x);
    return hi < 0 ? `${nm}別家訊號都略差（夏普 ${lo.toFixed(3)}～${hi.toFixed(3)}）` : lo > 0 ? `${nm}別家訊號都略好（夏普 +${lo.toFixed(3)}～+${hi.toFixed(3)}）` : `${nm}互有高低（夏普 ${lo.toFixed(3)}～+${hi.toFixed(3)}）`; };
  const big = ['is', 'oos'].some(p => d(p).some(v => Math.abs(v) >= 0.1));
  return `${say('oos', '2024 年起')}，${say('is', '2018–2023 ')}。${big ? '差距不小，要再檢查。' : '差距都很小，不改規則。'}`;
}
/** Advanced card. F = { BTC: flipLevels(closes), ETH: ... } computed in the app; rate = maxRate(). */
export function xsrcCard(X, F, rate) {
  if (!X?.headline) return `<section class="card" id="xsrc"><h2>台幣翻轉價＋別家交易所比對</h2><p class="small">資料檔讀不到。</p></section>`;
  const coins = ['BTC', 'ETH'];
  const blk = c => {
    const f = F?.[c], m = X.max?.coins?.[c]; if (!f || !m) return '';
    const rows = f.levels.map(l => `<tr><th>${l.ma} 日線翻轉價<div class="muted small">下次收盤${l.above ? '低於' : '高於'}此價，趨勢狀態${l.above ? '降' : '升'}一級</div></th><td>${usd(l.price)}<div><strong>約 ${ntd(twdOf(l.price, rate))}</strong></div></td></tr>`).join('');
    return `<h3 class="sub">${c}</h3><div class="scroll"><table class="bt"><tbody>${rows}
      <tr><th>最新收盤</th><td>${usd(f.close)}<div>約 ${ntd(twdOf(f.close, rate))}</div></td></tr></tbody></table></div>
      <p class="small">不要用 MAX 台幣K線自己畫的 200 日線：它把匯率和 USDT 溢價的變化也算進去，${X.max.coins[c].basis_first.slice(0, 4)} 年起有 ${pc1(m.own_chart_state_diff_pct)} 的日子和規則給不同的趨勢狀態（2024 年起 ${pc1(m.own_chart_state_diff_oos_pct)}）。${md(m.max_close.date)} 收盤時，MAX 台幣K線的 200 日翻轉價是 ${ntd(m.flip_on_max_chart.f200)}，規則換算的是 ${ntd(m.flip_twd_approx.f200)}。</p>`;
  };
  const bt = X.backtest, row = (k, nm) => `<tr><th>${nm}</th><td>${pick(bt.is[k], 'sharpe')?.toFixed(2)}／${pc1(bt.is[k].cagr)}／${pc1(bt.is[k].maxdd)}</td><td>${bt.oos[k].sharpe.toFixed(2)}／${pc1(bt.oos[k].cagr)}／${pc1(bt.oos[k].maxdd)}</td></tr>`;
  const mc = X.max.coins, ev = X.max.coingecko?.eval;
  return `<section class="card" id="xsrc"><h2>台幣翻轉價＋別家交易所比對</h2>
    ${xsrcLine(X)}
    <p class="small">翻轉價是規則用的 Binance USDT 價格，換成 MAX 台幣是<strong>大約</strong>：USDT 價 × MAX 的 USDT/TWD。${rateText(rate, X)}。</p>
    ${coins.map(blk).join('')}
    <p class="small muted">準不準：${mc.BTC.basis_first} 起每天比「Binance 收盤 × MAX USDT/TWD 收盤」和 MAX 自己的台幣收盤，BTC 差中位 ${bpsPct(mc.BTC.basis_absbps_median)}、95% 在 ${bpsPct(mc.BTC.basis_absbps_p95)} 內（最近一年 ${bpsPct(mc.BTC.basis_365_absbps_p95)}），ETH ${bpsPct(mc.ETH.basis_absbps_median)}／${bpsPct(mc.ETH.basis_absbps_p95)}（最近一年 ${bpsPct(mc.ETH.basis_365_absbps_p95)}）。匯率用「CoinGecko 即時 × 最近 30 天溢價」估 MAX 的 USDT/TWD，最近一年誤差中位 ${ev ? bpsPct(ev.cg_premium_1d.median_bps) : '—'}、95% 在 ${ev ? bpsPct(ev.cg_premium_1d.p95_bps) : '—'} 內；溢價一週沒更新時中位 ${ev ? bpsPct(ev.cg_premium_7d.median_bps) : '—'}（直接用一週前的匯率是 ${ev ? bpsPct(ev.stale_rate_7d_same_days.median_bps) : '—'}）。規則只看早上 8 點的收盤，不是盤中碰到。</p>
    <h3 class="sub">用別家價格回測（扣成本，夏普／年化／最慘跌幅）</h3>
    <div class="scroll"><table class="bt"><thead><tr><th></th><th>2018-03～2023</th><th>2024 起（樣本外）</th></tr></thead><tbody>
      ${row('binance', 'Binance（現在用的）')}${row('coinbase_signal', 'Coinbase 的訊號')}${row('bitstamp_signal', 'Bitstamp 的訊號')}${row('coinbase_both', 'Coinbase 價格＋訊號')}${row('bitstamp_both', 'Bitstamp 價格＋訊號')}
    </tbody></table></div>
    <p class="small muted">「的訊號」＝用那家的收盤算規則、在 Binance 價格成交，只看訊號差異。成本同虛擬投資（每次進出 0.15%＋買進 0.27% 台幣溢價，NT$100 萬 BTC/ETH 各半），收盤後才決定、隔天才持有。${diffText(bt)}這裡的 2024 年起是 1/1 從空倉重新開始算，所以和別張卡的冠軍數字略不同。資料：Binance、Coinbase Exchange、Bitstamp、MAX 公開日K，CoinGecko，不用金鑰；抓取 ${X.fetched_at_utc?.coinbase?.slice(0, 10) ?? '—'}（UTC），每週一自動更新（新資料檢查不過就保留上一版），程式 backtest/fetch_xsrc.py → backtest/xsrc.py。</p>
  </section>`;
}
