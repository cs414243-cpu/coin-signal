// v5: 本週要注意 (top, one small card) + 最近大漲大跌的原因 / 指標關聯 (inside 進階). Pure functions of data/events.json.
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pct = (x, d = 1) => x === null || x === undefined || Number.isNaN(x) ? '—' : `${x > 0 ? '+' : ''}${(x * 100).toFixed(d)}%`;
const pct0 = x => x === null || x === undefined ? '—' : `${Math.round(x * 100)}%`;
export const TIMING_ZH = { before: '事前', during: '當天', 'during (date only)': '當天', after: '事後', unknown: '時間不明' };
const SHORT = { CPI: '美國 CPI（通膨）公布', FOMC: '聯準會利率決議', NFP: '美國非農就業公布', FOMC_MINUTES: '聯準會會議紀錄公布' };
const hourZh = hm => { const [h, m] = hm.split(':').map(Number); const ap = h < 6 ? '凌晨' : h < 12 ? '早上' : h < 18 ? '下午' : '晚上'; const hh = h % 12 === 0 ? 12 : h % 12; return `${ap} ${hh}:${String(m).padStart(2, '0')}`; };

export function weekLine(e) {
  const vol = e.vol_claim_supported ? '，歷史上這類日子波動較大' : '';
  return `${e.md} ${hourZh(e.hm)} ${SHORT[e.kind] || e.title_zh}${vol}`;
}

export function weekCard(EV) {
  if (!EV) return '';
  const up = EV.upcoming || [];
  const body = up.length
    ? `<ul class="week-list">${up.map(e => `<li>${esc(weekLine(e))}</li>`).join('')}</ul>`
    : `<p>未來 7 天沒有排定的美國 CPI、聯準會利率決議或非農就業公布。${EV.next_after ? `下一個是 ${esc(weekLine(EV.next_after))}。` : ''}</p>`;
  return `<section class="card week" id="week"><h2>本週要注意</h2>${body}<p class="small muted">時間為台北時間；來源是美國聯準會和勞工統計局的官方日程。</p></section>`;
}

function srcLinks(ev) {
  if (!ev.sources?.length) return '<span class="muted">原因整理中</span>';
  return ev.sources.map(s => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc((s.title || s.url).slice(0, 48))}</a><span class="src">${TIMING_ZH[s.timing] || esc(s.timing)}</span>`).join('<br>');
}

function evItem(ev) {
  const up = ev.direction === 'up';
  return `<li class="ev"><div class="ev-head"><strong>${esc(ev.date)} ${esc(ev.coin)}</strong> <span class="${up ? 'upc' : 'dn'}">${ev.trigger === 'weekly' ? `7 天${up ? '大漲' : '大跌'} ${pct(ev.ret_7d)}` : `${up ? '大漲' : '大跌'} ${pct(ev.ret_1d)}`}</span>${ev.category_zh?.length ? ` <span class="muted small">${esc(ev.category_zh.join('、'))}</span>` : ''}</div>
    <div class="ev-why">${ev.summary_zh ? esc(ev.summary_zh) : '<span class="muted">這次的原因還在整理，下次更新會補上。</span>'}</div>
    <div class="small ev-src">${srcLinks(ev)}</div></li>`;
}

export function eventsCard(EV) {
  if (!EV) return '';
  const vol = EV.event_day_vol || {};
  const row = k => { const b = vol[k]?.BTC, e = vol[k]?.ETH; if (!b) return '';
    return `<tr><th>${esc(SHORT[k] || k)}</th><td>${b.ratio.toFixed(2)} 倍<div class="muted">q=${b.q_bh.toFixed(2)}</div></td><td>${e ? e.ratio.toFixed(2) + ' 倍' : '—'}<div class="muted">${e ? 'q=' + e.q_bh.toFixed(2) : ''}</div></td><td>${b.n_event_days}</td></tr>`; };
  const st = EV.stats || {};
  const cat = st.categories ? Object.entries(st.categories).sort((a, b) => b[1].primary - a[1].primary).map(([k, v]) => `${CAT_ZH[k] || k} ${v.primary}`).join('、') : '';
  const tm = st.cause_timing || {};
  return `<section class="card" id="events"><h2>最近大漲大跌的原因</h2>
    <p class="small">只要 BTC 或 ETH 單日漲跌超過最近 30 天日波動的 2.5 倍，或 7 天漲跌超過 10%，就記成一次「大漲跌」，再去找當時的新聞和官方公告。每個來源都標了是在大漲跌<strong>事前、當天還是事後</strong>發布的。</p>
    <p class="warn">${esc(EV.warning)}</p>
    <ul class="evs">${(EV.recent || []).map(evItem).join('')}</ul>
    <details><summary>2020 年以來最大的 ${EV.largest_explained?.length || 0} 次漲跌與原因</summary><ul class="evs">${(EV.largest_explained || []).map(evItem).join('')}</ul></details>
    <h3 class="sub">哪些指標跟大漲跌有關</h3>
    <ul class="facts">${(EV.findings || []).map(f => `<li>${esc(f.text)} <span class="src">${f.artifact ? '假象，不採用' : f.robust ? '校正後仍成立' : '不顯著'}｜q=${f.q.toFixed(2)}</span></li>`).join('')}</ul>
    <h4>總經數據公布日的平均漲跌幅（跟其他日子相比）</h4>
    <div class="scroll"><table><thead><tr><th>公布日</th><th>BTC</th><th>ETH</th><th>次數</th></tr></thead><tbody>${['CPI', 'FOMC', 'NFP'].map(row).join('')}</tbody></table></div>
    <p class="small muted">「1.26 倍」表示那天平均漲跌幅是其他日子的 1.26 倍。q 是經過多重檢定校正的顯著性，小於 0.05 才算可信；目前都沒有達到，所以「本週要注意」只列日期，不說「波動會比較大」。</p>
    <p class="small muted">共記錄 ${st.episodes ?? '—'} 次大漲跌（BTC 從 2020 年、ETH 從 2021 年起），其中 ${st.filled ?? '—'} 次已查好原因。主要原因分類：${esc(cat)}。來源發布時間：事前 ${tm.before || 0}、當天 ${(tm.during || 0) + (tm['during (date only)'] || 0)}、事後 ${tm.after || 0}，大部分解釋都是當天或事後才出現。共做了 ${st.n_tests ?? '—'} 項檢定，p 值用循環位移重抽樣計算，再用 Benjamini-Hochberg 校正。</p>
  </section>`;
}
export const CAT_ZH = { macro_fed: '總經／聯準會', etf_flows: 'ETF 資金流', leverage: '槓桿／強平', exchange_hack: '交易所出事／駭客', regulation_policy: '監管／政策', token_specific: '幣種本身', equities_risk_off: '股市避險', unknown: '不明' };
