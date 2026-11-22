// v93: 一個幣空手時，它那份錢要不要拿去買另一個幣？ — pure functions (no DOM, no network).
// backtest/idle_pool.py → data/idlepool.json: the frozen champion's walk-forward exposures with the money split in a BTC half
// and an ETH half (= virtual portfolio, "sep") vs "pool": when one coin is 0 and the other is on, the idle half also buys the
// coin that is on, at that coin's recommended %. Breakdown pool_btc (ETH half → BTC) / pool_eth (BTC half → ETH), never
// recommended on their own. Definitions committed before the first run (ce1bdfd), IS-only result (8cc1b11) before any 2024+
// number. Moskowitz, Ooi & Pedersen 2012 (JFE 104(2):228–250); DeMiguel, Garlappi & Uppal 2009 (RFS 22(5):1915–1953).
// Not a signal; the recommendation is unchanged. Research only, not investment advice.
import { asofInline, WEEKLY_NOTE } from './fresh.js';
const pc1 = x => !Number.isFinite(x) ? '—' : Math.abs(x) < 0.0005 ? '0.0%' : `${x < 0 ? '−' : ''}${Math.abs(x * 100).toFixed(1)}%`;
const pc0 = x => Number.isFinite(x) ? `${Math.round(x * 100)}%` : '—';
const f2 = x => Number.isFinite(x) ? (x < 0 ? '−' : '') + Math.abs(x).toFixed(2) : '—';
export const wan = x => Number.isFinite(x) ? `${(x / 10000).toFixed(1)} 萬` : '—';
export const RULES = ['sep', 'pool', 'pool_btc', 'pool_eth'];
const ANS = ['pool_better', 'keep_separate', 'more_risk_only', 'unclear'];
const VERD = ['better', 'worse', 'similar', 'mixed'];
const S = (D, r, k = 'oos') => D?.rules?.[r]?.[k];

export function valid(D) {
  const v = D?.verdict;
  if (!D || D.is_only || !v?.rules || !ANS.includes(v.answer) || !RULES.slice(1).every(r => VERD.includes(v.rules[r]) && Number.isFinite(v.oos_p_worse?.[r]))) return false;
  return RULES.every(r => ['is_', 'oos'].every(k => ['sharpe', 'cagr', 'maxdd', 'end_per_1m'].every(x => Number.isFinite(S(D, r, k)?.[x]))
      && ['avg_in_coins', 'max_in_coins', 'worst_7d'].every(x => Number.isFinite(D.rules[r].desc?.[k]?.[x]))))
    && ['is_', 'oos'].every(k => ['only_btc', 'only_eth', 'both_on', 'both_off'].every(x => Number.isFinite(D.states?.[k]?.[x])))
    && D.now && ['BTC', 'ETH'].every(c => Number.isFinite(D.now[c]));
}

const per = (D, k) => { const p = S(D, 'pool', k), s = S(D, 'sep', k); return { lowerSh: p.sharpe < s.sharpe, deeper: p.maxdd < s.maxdd }; };

/** Plain conclusion (depends only on data + the pre-registered verdict). */
export function headLine(D) {
  const a = D.verdict.answer, s = S(D, 'sep'), p = S(D, 'pool'), si = S(D, 'sep', 'is_'), pi = S(D, 'pool', 'is_');
  const both = ['is_', 'oos'].every(k => per(D, k).lowerSh && per(D, k).deeper);
  const fl = D.verdict.flags?.pool || [];
  const std = fl.map((f, i) => `${i ? '2024 年起' : '2022–23 '}${f.harm ? '明顯變差' : f.better ? '明顯變好' : '差不多'}`).join('、');
  const head = a === 'pool_better' ? '<strong>過去挪過去比較好</strong>（兩段都明顯變好；仍只是回測，不保證以後）。'
    : a === 'keep_separate' ? '<strong>不要挪</strong>：2022–23 和 2024 年起兩段都明顯變差。'
    : a === 'more_risk_only' ? '<strong>差不多，只是放進去的錢變多</strong>：賺賠都跟著放大，換算成「每冒一分險賺多少」沒有比較好。'
    : both ? `<strong>沒有比較好，不建議挪</strong>：兩段的穩定度都比較低、最慘跌幅都比較深（照事先定的標準：${std}，所以正式判定是「說不準」）。`
    : `<strong>說不準</strong>：照事先定的標準，${std}；沒有證明挪過去比較好。`;
  return `${head}2024 年起每 NT$100 萬（兩幣各半、含手續費）：各自照建議 → ${wan(s.end_per_1m)}（最慘跌幅 ${pc1(s.maxdd)}）；`
    + `空手那半也拿去買另一個 → ${wan(p.end_per_1m)}（最慘跌幅 ${pc1(p.maxdd)}）。2022–23：${wan(si.end_per_1m)}（${pc1(si.maxdd)}）vs ${wan(pi.end_per_1m)}（${pc1(pi.maxdd)}）。`;
}

/** How often the situation happens, and what the extra money did. */
export function whyLine(D) {
  const o = D.states.oos, s = S(D, 'sep'), p = S(D, 'pool'), ds = D.rules.sep.desc.oos, dp = D.rules.pool.desc.oos;
  const extra = p.end_per_1m - s.end_per_1m;
  return `<strong>多常遇到</strong>：2024 年起，只有 BTC 有建議（ETH 空手）的日子占 ${pc0(o.only_btc)}、只有 ETH 有建議占 ${pc0(o.only_eth)}；兩個都有建議 ${pc0(o.both_on)}、兩個都空手 ${pc0(o.both_off)}。`
    + `<strong>挪過去等於把那個幣的錢加倍</strong>：平均放在幣裡的錢從 ${pc0(ds.avg_in_coins)} 變 ${pc0(dp.avg_in_coins)}（最多 ${pc0(dp.max_in_coins)}），`
    + (extra < 0 ? `但結束時反而少了 ${wan(-extra)}——多放的那些錢在這段期間整體是賠的。` : `結束時多了 ${wan(extra)}，但這是多放錢換來的，要看跌幅和穩定度有沒有一起變差。`)
    + `冠軍給每個幣的比例，本來就是照那個幣自己的起伏算好的；再把另一半也壓上去，放在那個幣的錢變兩倍，它跌的時候整筆錢跟著跌得更多。`;
}

function table(D) {
  const lab = { sep: '各自照建議（現在的做法）', pool: '空手那半也買另一個', pool_btc: '　只拆：ETH 空手時那半買 BTC', pool_eth: '　只拆：BTC 空手時那半買 ETH' };
  const row = r => { const o = S(D, r), i = S(D, r, 'is_'); return `<tr><th>${lab[r]}</th><td>${wan(o.end_per_1m)}</td><td>${pc1(o.cagr)}</td><td>${pc1(o.maxdd)}</td><td>${f2(o.sharpe)}</td><td>${f2(i.sharpe)}</td></tr>`; };
  return `<div class="scroll"><table class="bt"><thead><tr><th>怎麼做</th><th>2024 起每 100 萬變成</th><th>年化</th><th>最慘跌幅</th><th>穩定度（夏普）</th><th>2022–23 穩定度</th></tr></thead><tbody>
    ${RULES.map(row).join('')}</tbody></table></div>`;
}

export function splitNote(D) {
  const b = S(D, 'pool_btc'), e = S(D, 'pool_eth'), s = S(D, 'sep');
  const anyBetter = ['pool_btc', 'pool_eth'].filter(r => S(D, r).sharpe > s.sharpe || S(D, r, 'is_').sharpe > S(D, 'sep', 'is_').sharpe);
  return `拆開兩個方向：ETH 空手時把它那半拿去買 BTC → ${wan(b.end_per_1m)}；BTC 空手時把它那半拿去買 ETH → ${wan(e.end_per_1m)}（都是 2024 年起每 100 萬）。`
    + (anyBetter.length ? `其中有一段看起來比較好的，另一段就比較差——兩段不一致，沒有證明哪個方向可以挪。` : '兩個方向都沒有比較好。')
    + '這兩列只是拆開看，不是建議。';
}

export function nowLine(D) {
  const on = ['BTC', 'ETH'].filter(c => D.now[c] >= 0.005);
  return on.length === 0 ? '現在：BTC、ETH 建議都是 0（空手），兩半的錢都在等，這張暫時用不到；下次如果只有一個幣先轉成買進，就照那個幣自己的比例、只用它那一半的錢。'
    : on.length === 2 ? `現在：${on.map(c => `${c} 建議 ${pc0(D.now[c])}`).join('、')}——兩個都有建議，各自照做就好。`
    : `現在：${on[0]} 建議 ${pc0(D.now[on[0]])}、${on[0] === 'BTC' ? 'ETH' : 'BTC'} 空手——正是這張卡說的情況：${on[0]} 只用它那一半的錢。`;
}

export function you(D) {
  return '<strong>對你來說</strong>：① 照建議時，每個幣只用它自己那一半的錢，另一個幣空手時那半就先放著（放哪裡見「空手的錢放哪」「錢放銀行來得及嗎」）；'
    + '② 如果你本來就想多放一點在加密幣，應該事先決定總共要投入多少、BTC／ETH 怎麼分（見上一張「BTC／ETH 怎麼分」），而不是看到哪個在漲才臨時把另一半挪過去；'
    + '③ 過去的結果不保證未來。';
}

/** Advanced card. */
export function idlePoolCard(D) {
  const id = 'idlepool', h2 = '一個幣空手時，它那份錢要不要拿去買另一個幣？';
  if (!valid(D)) return `<section class="card" id="${id}"><h2>${h2}</h2><p class="muted small">資料讀不到，稍後再試。</p></section>`;
  return `<section class="card" id="${id}"><h2>${h2}</h2>
    <p class="small">App 和虛擬投資都把錢分成 BTC 一半、ETH 一半，各自照建議。像「BTC 加碼、ETH 空手」的時候，ETH 那一半的錢閒著，很容易想「乾脆也拿去買正在漲的 BTC」。這張用同一份過去的建議算：只有一個幣有建議時，把空手那一半也照另一個幣的比例去買那個幣，和現在的做法比。</p>
    <p><strong>結論</strong>：${headLine(D)}</p>
    <p class="small">${whyLine(D)}</p>
    ${table(D)}
    <p class="small">${splitNote(D)}</p>
    <p class="small">${nowLine(D)}</p>
    <p class="small">${you(D)}</p>
    <p class="small muted">算法：<code>backtest/idle_pool.py</code> → <code>data/idlepool.json</code>（冠軍 trend_vt@1 逐日重做的建議比例、凍結程式碼、每天只用當天以前的資料；Binance 已收完日K；${asofInline(D.as_of)}，${WEEKLY_NOTE}）。買賣 0.15%、買進加台幣溢價 0.27%，沒投入的錢不計利息；兩邊都每天照比例調整。「明顯變好／變差」事先固定（commit ce1bdfd）：穩定度（夏普）少 ${D.sharpe_tol} 以上或最慘跌幅多 ${Math.round(D.dd_tol * 100)} 個百分點以上算明顯變差；夏普多 ${D.sharpe_tol} 以上且跌幅沒有多 ${Math.round(D.dd_tol * 100)} 個百分點以上算明顯變好；2022–23 和 2024 起兩段都一樣才下結論。2024 年起「挪過去」比現在差的把握 ${pc0(D.verdict.oos_p_worse.pool)}（每日報酬 28 天區塊重抽 ${D.boot.n} 次）。研究：Moskowitz、Ooi、Pedersen 2012 每個資產各自依波動定部位；DeMiguel 等人 2009 固定平分很難被打敗。</p>
  </section>`;
}
