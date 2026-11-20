// v88: 買了之後，幣放哪裡？交易所倒了怎麼辦？ — pure functions (no DOM, no network).
// Numbers about "how long coins sit on the exchange" come only from data/trips.json (backtest/trips.py: the frozen
// champion trend_vt@1, closed Binance daily bars, paper_sim costs, every trip = recommendation 0 → >0 → back to 0;
// refreshed every Monday). The history / law lines are fixed facts from the research note
// CRYPTO-20261110-1346-exchange-failure-self-custody.md (sources [S1]–[S26] there; 全國法規資料庫 re-checked 2026-11-21).
// Not a signal, does not change the recommendation, no exchange is rated. Research only, not investment advice.
export const FROM = '2024-01-01';
const DAY = 86400000;
const d = s => Date.parse(s + 'T00:00:00Z') / DAY;
const pc0 = x => Number.isFinite(x) ? `${Math.round(x * 100)}%` : '—';
const med = xs => { if (!xs.length) return NaN; const a = [...xs].sort((p, q) => p - q), m = a.length >> 1; return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; };
export const LONG = 30;   // a trip of ≥ 30 days = "long"

/** Stats of one coin's trips from `from` (YYYY-MM-DD) to the coin's last bar. Trip columns: see trips.json trip_columns. */
export function stats(T, coin, from = FROM) {
  const C = T?.coins?.[coin], cols = T?.trip_columns;
  if (!C || !Array.isArray(C.trips) || !Array.isArray(cols) || !C.last_bar) return null;
  const ix = k => cols.indexOf(k), iS = ix('start'), iE = ix('end'), iD = ix('days'), iM = ix('e_max');
  if ([iS, iE, iD, iM].some(i => i < 0)) return null;
  const a = d(from), last = d(C.last_bar), span = last - a;
  if (!(span > 0)) return null;
  // days with coin inside the window: every trip (also one that began before `from`, and the open one) clipped to it
  const trips = C.trips.map(t => ({ s: d(t[iS]), e: d(t[iE]), days: t[iD], emax: t[iM] }));
  if (C.current?.start) trips.push({ s: d(C.current.start), e: last, days: last - d(C.current.start), emax: C.current.e_max ?? NaN, open: true });
  const held = trips.reduce((x, t) => x + Math.max(0, Math.min(t.e, last) - Math.max(t.s, a)), 0);
  const S = trips.filter(t => t.s >= a && !t.open);   // trips that started (and ended) in the window
  if (!S.length) return null;
  const long = S.filter(t => t.days >= LONG), sumDays = S.reduce((x, t) => x + t.days, 0);
  return {
    coin, from, to: C.last_bar, years: span / 365.25, n: S.length, perYear: S.length / (span / 365.25),
    daysMed: med(S.map(t => t.days)), short7: S.filter(t => t.days <= 7).length / S.length,
    nLong: long.length, longDaysShare: sumDays ? long.reduce((x, t) => x + t.days, 0) / sumDays : NaN, longest: Math.max(...S.map(t => t.days)),
    heldShare: held / span, emaxMed: med(S.map(t => t.emax).filter(Number.isFinite)), emaxMax: Math.max(...S.map(t => t.emax).filter(Number.isFinite)),
  };
}

const row = (lab, s) => !s ? '' : `<tr><th>${lab}</th><td>${s.perYear.toFixed(1)} 趟</td><td>${s.daysMed} 天</td><td>${pc0(s.short7)}</td><td>${s.nLong} 趟、${pc0(s.longDaysShare)}</td><td>${pc0(s.heldShare)}</td><td>${pc0(s.emaxMax)}</td></tr>`;
export function table(T) {
  const r = (c, f, lab) => row(`${c} ${lab}`, stats(T, c, f));
  return `<div class="scroll"><table class="bt"><thead><tr><th>照建議</th><th>每年進出</th><th>每趟中間值</th><th>7 天內就出場</th><th>放 ${LONG} 天以上的趟（占有幣天數）</th><th>有幣的日子</th><th>最多放到打算投入的錢</th></tr></thead><tbody>
    ${r('BTC', FROM, '2024 起')}${r('ETH', FROM, '2024 起')}${r('BTC', T.coins.BTC.first_bar, '2018 起')}${r('ETH', T.coins.ETH.first_bar, '2018 起')}</tbody></table></div>`;
}

/** Plain conclusion — only from the 2024+ stats. */
export function headLine(T) {
  const b = stats(T, 'BTC'), e = stats(T, 'ETH'); if (!b || !e) return '';
  const tr = Math.round(2 * (b.perYear + e.perYear));
  return `照這套建議，幣<strong>大多是短進短出、偶爾一抱好幾個月</strong>：2024 年起 BTC 每年進出約 ${b.perYear.toFixed(1)} 趟、ETH 約 ${e.perYear.toFixed(1)} 趟，每趟中間值 ${b.daysMed}／${e.daysMed} 天；而且有幣的期間<strong>每天都可能小幅加減</strong>。如果每趟都把幣轉到自己的錢包再轉回來，兩個幣每年要多做約 ${tr} 次鏈上轉帳，還沒算中間的加減。所以照這套做，<strong>幣實際上大多會放在交易所</strong>——比較實際的保護是「控制放在交易所的金額」，而不是每次都搬。`;
}

/** Now: from the live recommendation (LIVE.coins[c].exposure, the public ledger's latest row). */
export function nowLine(LIVE) {
  const xs = ['BTC', 'ETH'].map(c => [c, LIVE?.coins?.[c]?.exposure]).filter(([, x]) => Number.isFinite(x));
  if (!xs.length) return '';
  const zero = xs.every(([, x]) => x <= 0.005);
  return zero
    ? '現在兩個幣的建議都是 0（空手）：照建議的話，交易所裡<strong>不需要放 BTC、ETH</strong>。但空手時如果把錢留成 USDT（「空手的錢」卡說只看成本通常比較省），<strong>那筆錢也還在交易所裡</strong>，一樣有這張卡說的風險。'
    : `現在建議：${xs.map(([c, x]) => `${c} 放約 ${pc0(x)}`).join('、')}（打算投入的錢的比例）。照做的話，這些幣和沒投入、留成 USDT 的錢都在交易所裡。`;
}

export function history() {
  return `<ul class="facts small">
    <li><strong>Mt.Gox</strong>（日本，2014-02 倒閉）：約 65 萬 BTC 不見；<strong>10 年後</strong>（2024-07）才開始還，還款期限又延到 2027-10-31。</li>
    <li><strong>FTX</strong>（2022-11 倒閉）：公司把客戶的錢挪去用。<strong>3 年多後</strong>（2026-03）一般客戶「法院認定的債權金額」累計才還到 96%。</li>
    <li><strong>QuadrigaCX</strong>（加拿大，2019）：76,000 多位客戶，至少損失 1.69 億加幣，只追回 4,600 萬加幣。原因不是駭客，是老闆挪用、做假帳。</li>
    <li><strong>Bybit</strong>（2025-02）：連「多人簽名的冷錢包」都被駭，約 15 億美元被偷（美國 FBI 說是北韓）。大交易所也會出事。</li>
    <li>交易所公布的<strong>「儲備證明」不是審計</strong>：只證明某一天某些幣在某些地址上，看不到它欠多少、錢是不是借來的（美國 PCAOB 2023 年提醒）。</li>
    <li><strong>台灣</strong>：《虛擬資產服務法》2026-07-22（民國 115 年）公布，規定客戶資產要和交易所自己的分開、交易所破產時不能拿去還債；但<strong>施行日期還沒定</strong>（全國法規資料庫，2026-11-21 查），現在還沒有這層保護。</li>
  </ul>`;
}

export function selfCustody() {
  return `<ul class="facts small">
    <li><strong>自己保管（硬體錢包）不是零風險，是換一組風險</strong>：12／24 個助記詞丟了或被看到＝錢沒了，<strong>沒有人能幫你找回</strong>；轉帳地址打錯或被假地址騙（研究發現 2022-07～2024-06 以太坊和 BSC 鏈上 2.7 億次假地址攻擊、至少 8,380 萬美元損失），也追不回來。</li>
    <li>照這套建議每天會加減，幣搬出去就不能照做；比較適合自己保管的是<strong>打算長期不動</strong>的幣，不是照建議進出的這一份。</li>
  </ul>`;
}

export function todo() {
  return `<ul class="facts small">
    <li>交易所裡<strong>只放「打算投入的錢」</strong>，其他的錢不要先放進去「等機會」。</li>
    <li><strong>不要用交易所的「賺幣、借貸、質押」</strong>：這些產品是把你的幣交給交易所或別人去用，出事時比放著更難拿回（借貸平台 Celsius 2022 年就是這樣倒的）。</li>
    <li>開<strong>兩步驟驗證</strong>（驗證器 App，不要只用簡訊）和<strong>提領地址白名單</strong>；不要點簡訊、私訊裡的「交易所」連結。</li>
    <li>交易所突然<strong>暫停提領、提領一直卡住、新聞說出事</strong>：先把能領的領出來，不要等。</li>
  </ul>`;
}

/** Advanced card. */
export function custodyCard(T, LIVE) {
  const id = 'custody', h2 = '買了之後，幣放哪裡？交易所倒了怎麼辦？';
  if (!stats(T, 'BTC') || !stats(T, 'ETH')) return `<section class="card" id="${id}"><h2>${h2}</h2><p class="muted small">資料讀不到，稍後再試。</p></section>`;
  const nl = nowLine(LIVE);
  return `<section class="card" id="${id}"><h2>${h2}</h2>
    <p class="small">App 的成績都假設交易所一直好好的。但放在交易所的幣和錢，交易所倒了或被駭，可能拿不回來或要等好幾年。這張卡說：照建議的話，幣會在交易所放多久、多少；歷史上交易所怎麼出事；可以怎麼降低風險。不評比任何一家交易所。</p>
    <p><strong>結論</strong>：${headLine(T)}</p>
    ${nl ? `<p class="small"><strong>現在</strong>：${nl}</p>` : ''}
    ${table(T)}
    <p class="small muted">「一趟」＝建議從 0 變成有投入，到回到 0。「有幣的日子」＝這段時間裡建議不是 0 的天數比例。「最多放到」＝某一天建議比例的最高值（例：100% 就是那天打算投入這個幣的錢全部買了幣）。</p>
    <h3 class="sub">歷史上交易所怎麼出事</h3>
    ${history()}
    <h3 class="sub">搬到自己的錢包呢？</h3>
    ${selfCustody()}
    <h3 class="sub">比較實際的做法（不是投資建議）</h3>
    ${todo()}
    <p class="small muted">算法：進出次數和天數直接來自 <code>data/trips.json</code>（<code>backtest/trips.py</code>：冠軍 trend_vt@1、凍結程式碼、每天只用當天以前的資料、Binance 已收完日K、含買賣 0.15% 和台幣溢價，每週一自動重算；這張卡只是換個角度數）。歷史和法規來自研究筆記 C#4（2026-11-10）原始資料：Mt.Gox 管財人公告、FTX 2026-03-18 第四次分配公告、加拿大 OSC 2020 QuadrigaCX 報告、FBI IC3 2025-02-26、PCAOB 2023-03-08 投資人提醒、全國法規資料庫《虛擬資產服務法》、Tsuchiya 等 USENIX Security 2025。</p>
  </section>`;
}
