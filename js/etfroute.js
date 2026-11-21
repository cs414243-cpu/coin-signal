// v89: 可以改用美股比特幣 ETF（券商複委託）照建議做嗎？ — pure functions (no DOM, no network).
// Numbers only from data/etfroute.json (backtest/etf_route.py: the frozen champion trend_vt@1's own walk-forward
// recommendations; the ETF route trades only on US trading days ~30 min after the 09:30 New York open, to the latest
// recommendation published before that moment (no lookahead), at the Binance hourly price; costs per side broker 0.25%
// (or 0.10%) + FX 0.05% + spread 0.02% and a 0.25%/yr sponsor fee, vs the MAX route = paper_sim. Definitions committed
// before the first run (9e92c17), IS-only result (742f487) before any 2024+ number; refreshed every Monday by weekly.sh).
// Legal / tax lines are fixed facts with sources in the research note CRYPTO-20261121-0834-etf-route.md:
// 金管會 2024-09-30 新聞稿（複委託外國虛擬資產 ETF 限專業投資人）、中央社 2026-04-23（仍在評估）、財政部稅務入口網
// 「最低稅負制」(海外所得 100 萬、750 萬)、南區國稅局（海外財產交易損失只扣當年度）、IRS Form 706-NA ($60,000).
// Not a signal, not tax advice, no broker is rated; the recommendation is unchanged. Research only, not investment advice.
const pc1 = x => !Number.isFinite(x) ? '—' : `${x < 0 ? '−' : ''}${Math.abs(x * 100).toFixed(1)}%`;
const ntd = x => Number.isFinite(x) ? `NT$${Math.round(x).toLocaleString('en-US')}` : '—';
export const ROUTES = ['max', 'etf_mid', 'etf_low', 'timing_only', 'cost_only'];
export const LABEL = {
  max: '在 MAX 照做（＝虛擬投資）', etf_mid: '用美股 ETF（券商手續費 0.25%）', etf_low: '用美股 ETF（券商手續費 0.10%）',
  timing_only: '只是「晚一點才買賣」（成本和 MAX 一樣）', cost_only: '只是「換成 ETF 的成本」（時間和 MAX 一樣）',
};
export const P = (D, r, per = 'oos') => D?.results?.[r]?.pooled?.[per];
export const money = s => Number.isFinite(s?.ret) ? 1_000_000 * (1 + s.ret) : NaN;

export function valid(D) {
  if (!D || D.is_only || !D.results || !D.verdict) return false;
  return ROUTES.every(r => ['is_', 'oos'].every(p => ['sharpe', 'cagr', 'maxdd', 'ret'].every(k => Number.isFinite(P(D, r, p)?.[k]))))
    && ROUTES.slice(1).every(r => ['worse', 'better', 'similar', 'mixed'].includes(D.verdict[r]))
    && Number.isFinite(D.delays?.oos?.median_h) && Number.isFinite(D.delays?.oos?.share_over_48h);
}

/** Plain conclusion — depends only on the data and the pre-registered verdict of etf_mid. */
export function headLine(D) {
  const v = D.verdict.etf_mid, m = P(D, 'max'), e = P(D, 'etf_mid');
  const word = { worse: '<strong>就算可以買，照這套建議用 ETF 做明顯比較差</strong>', better: '<strong>照這套建議用 ETF 做，過去反而比較好</strong>',
    similar: '<strong>照這套建議用 ETF 做，過去和在交易所做差不多</strong>', mixed: '<strong>用 ETF 做是好是壞，兩段時間不一致</strong>' }[v];
  return `${word}：2024 年起每 NT$100 萬，在 MAX 照做會變成約 ${ntd(money(m))}（每年 ${pc1(m.cagr)}、最慘跌 ${pc1(m.maxdd)}），用美股 ETF 照做約 ${ntd(money(e))}（每年 ${pc1(e.cagr)}、最慘跌 ${pc1(e.maxdd)}）。`;
}

/** Where the difference comes from: later execution vs costs (the two decomposition routes). */
export function whyLine(D) {
  const m = P(D, 'max'), t = P(D, 'timing_only'), c = P(D, 'cost_only'), dl = D.delays.oos;
  const tBig = Math.abs(m.cagr - t.cagr) > Math.abs(m.cagr - c.cagr);
  const main = tBig ? '<strong>主要差在「時間」，不是手續費</strong>' : '<strong>主要差在「成本」，不是時間</strong>';
  return `${main}：ETF 只能在美股開盤時買賣（台北晚上），建議早上 8 點出來，2024 年起每次建議改變，通常（中間值）要等約 ${Math.round(dl.median_h)} 小時才買得到；週末和美股休市日改變的，要等到下一個開盤日（${pc1(dl.share_over_48h).replace('.0', '')} 的改變等超過 2 天）。只看「晚一點」：每年 ${pc1(m.cagr)} → ${pc1(t.cagr)}、最慘跌 ${pc1(m.maxdd)} → ${pc1(t.maxdd)}；只看「成本」：每年 ${pc1(m.cagr)} → ${pc1(c.cagr)}。這套方法靠「價格開始跌就快點減碼」賺錢，晚十幾個小時就少掉一部分保護（和「晚幾天才照做」卡同一個道理）。`;
}

export function table(D) {
  const row = r => {
    const o = P(D, r), i = P(D, r, 'is_');
    return `<tr${r === 'etf_mid' ? ' class="hl"' : ''}><th>${LABEL[r]}</th><td>${pc1(o.cagr)}</td><td>${pc1(o.maxdd)}</td><td>${ntd(money(o))}</td><td>${o.sharpe.toFixed(2)}</td><td>${pc1(i.cagr)}／${pc1(i.maxdd)}</td></tr>`;
  };
  return `<div class="scroll"><table class="bt"><thead><tr><th>做法（BTC、ETH 各半）</th><th>2024 起每年</th><th>最慘跌幅</th><th>NT$100 萬變成</th><th>穩定度（夏普）</th><th>2022–23 每年／最慘跌幅</th></tr></thead><tbody>
    ${ROUTES.map(row).join('')}</tbody></table></div>`;
}

/** Is the coin price a fair stand-in for the ETF price? (reported data check, not used in the numbers above) */
export function checkLine(D) {
  const b = D.data_check?.BTC, e = D.data_check?.ETH;
  if (!b?.ok || !e?.ok) return '';
  const one = (x, c) => `${x.sym}（${x.first} 起 ${x.n} 天）每天漲跌和 ${c} 的相關 ${x.corr.toFixed(4)}、每天差距中間值 ${pc1(x.med_abs_diff).replace(/^0\.0%$/, '<0.1%')}，一年下來比 ${c} ${x.gap_per_year < 0 ? '少' : '多'}約 ${pc1(Math.abs(x.gap_per_year))}`;
  return `ETF 的價格可以用幣價代替嗎？可以：${one(b, 'BTC')}；${one(e, 'ETH')}（大約是管理費加上計價時間差）。2024 年以前還沒有這些 ETF，那段是「假設當時已經有 ETF」的推算。`;
}

export function nowLine(LIVE) {
  const xs = ['BTC', 'ETH'].map(c => LIVE?.coins?.[c]?.exposure).filter(Number.isFinite);
  if (!xs.length) return '';
  return xs.every(x => x <= 0.005) ? '現在兩個幣的建議都是 0（空手），不管用哪一種方式，現在都不用買。' : '';
}

export function rules() {
  return `<ul class="facts small">
    <li><strong>一般投資人現在不能用複委託買</strong>：金管會 2024-09-30 只開放「專業投資人」透過複委託買外國虛擬資產 ETF（第一次買前要做適合度評估、簽風險預告書）。2026-04-23 金管會說還在評估要不要開放一般投資人；到 2026-11-21 查詢時沒有查到開放的公告。</li>
    <li><strong>稅的算法不一樣（不是稅務建議）</strong>：在台灣交易所買賣 BTC、ETH 的獲利，「稅後還划算嗎」卡是當成財產交易所得、併入綜合所得算。複委託買美國 ETF 的獲利是<strong>海外所得</strong>：全戶一年海外所得未滿 100 萬元不用計入；計入後基本所得額 750 萬元以下也不用繳（財政部最低稅負制）。但海外的賠錢只能扣<strong>同一年</strong>海外的賺錢，不能留到之後幾年用（南區國稅局）。</li>
    <li><strong>美國遺產稅</strong>：不是美國人、也不住美國的人，過世時持有的美國資產（包括美國 ETF）超過 6 萬美元，要向美國報遺產稅（IRS Form 706-NA）。在交易所放幣沒有這個問題，但有上一張卡說的交易所風險。</li>
    <li>ETF 買的是基金份額，幣由發行商找的保管機構保管，<strong>不能轉到自己的錢包</strong>；週末幣價大跌時 ETF 沒有開盤，<strong>賣不掉</strong>。每天小幅加減如果碰到券商「最低手續費」，小金額會更吃虧（上面沒算）。</li>
  </ul>`;
}

/** Advanced card. */
export function etfRouteCard(D, LIVE) {
  const id = 'etfroute', h2 = '可以改用美股比特幣 ETF（券商複委託）照建議做嗎？';
  if (!valid(D)) return `<section class="card" id="${id}"><h2>${h2}</h2><p class="muted small">資料讀不到，稍後再試。</p></section>`;
  const nl = nowLine(LIVE), ck = checkLine(D);
  return `<section class="card" id="${id}"><h2>${h2}</h2>
    <p class="small">有人會說：不想把錢放在交易所（上一張卡），改用券商複委託買美國的比特幣、以太幣 ETF（例如 IBIT、ETHA）照建議做。這張卡回答兩件事：<strong>能不能買</strong>，和<strong>照建議用 ETF 做會差多少</strong>。不評比任何券商或 ETF。</p>
    <p><strong>結論</strong>：${headLine(D)}</p>
    <p class="small">${whyLine(D)}</p>
    ${nl ? `<p class="small"><strong>現在</strong>：${nl}</p>` : ''}
    ${table(D)}
    ${ck ? `<p class="small muted">${ck}</p>` : ''}
    <h3 class="sub">能不能買、稅和其他不一樣的地方</h3>
    ${rules()}
    <p class="small muted">算法：<code>backtest/etf_route.py</code>，冠軍 trend_vt@1 自己每天的建議（凍結程式碼、每天只用當天以前的資料）。ETF 做法只在美股交易日、紐約 9:30 開盤後約 30 分鐘買賣，用那時已經公布的最新建議（不偷看），價格用 Binance 每小時幣價代替 ETF 價格；成本每次：券商 0.25%（或 0.10%）＋換匯 0.05%＋價差 0.02%，另扣 ETF 管理費每年 0.25%。MAX 做法＝虛擬投資（每次 0.15%，買進另加台幣溢價 0.27%）。判定規則事先固定：兩段時間（2022–23、2024 起）都比 MAX 的穩定度低 0.05 以上或最慘跌幅多 2 個百分點以上，才算「明顯比較差」。2024 起重抽 2000 次，用 ETF（0.25%）比較差的比例 ${pc1(D.results.etf_mid.oos_p_worse).replace('.0', '')}。${D.as_of ? `資料到 ${D.as_of.replace(/-/g, '/')}，每週一自動重算。` : ''}法規和稅：金管會 2024-09-30 新聞稿、中央社 2026-04-23、財政部稅務入口網「最低稅負制」、南區國稅局、美國 IRS Form 706-NA 說明。</p>
  </section>`;
}
