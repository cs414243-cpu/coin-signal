// v14: 「試過但沒通過的訊號」 — every candidate signal tested against the champion and why it was rejected.
// Pure functions (no DOM, no fetch). Data: data/tested_signals.json (backtest/tested_signals.py, read-only copy of
// forecast/proposals/proto_*_results.json). Lives only in 進階; the homepage is not touched.
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const md = s => { const m = /^(\d{4})-(\d\d)-(\d\d)/.exec(s || ''); return m ? `${+m[2]}/${+m[3]}` : '—'; };
export const GROUPS = [['news', '新聞和研究常提到的指標'], ['tweak', '調整目前規則的細節']];

export function itemHtml(s) {
  return `<li class="ts-item" data-id="${esc(s.id)}"><p class="ts-head"><strong>${esc(s.name)}</strong> <span class="badge v-none">${esc(s.verdict)}</span></p>
    <p class="small">${esc(s.what)}</p>
    <p class="small">${esc(s.result_text)}<strong>${esc(s.judge_text)}</strong></p>
    <p class="small muted">為什麼沒通過：${esc(s.why)}（${md(s.tested_on)} 測試）</p></li>`;
}

export function holdHtml(T) {
  const H = T?.hold_less || [];
  if (!H.length && !T?.prob50) return '';
  const hold = H.length ? `<h3 class="sub">一再出現的發現：少放一點，結果差不多（未證實，不是建議）</h3>
    <ul class="facts small">${H.map(h => `<li>${esc(h.text)}</li>`).join('')}</ul>
    <p class="small">好幾個「更聰明的風控」最後打不過「同樣的規則、只是少放一點」。少放一點就是跌得少、也賺得少，夏普幾乎一樣，差距可能只是運氣。這不是新的訊號，也沒有經過 8 週實測，<strong>不是叫你改比例</strong>；要不要少放，看你自己能承受多大的跌幅。</p>` : '';
  const p = T?.prob50;
  const p50 = p ? `<p class="small">另一個一再出現的發現：沒有任何版本的一週上漲機率勝過「一律猜 50%」（冠軍的誤差 ${p.champ_brier.toFixed(5)}，一律猜 50% 是 ${p.const50_brier.toFixed(5)}）。所以首頁寫「約一半一半，無法預測」。</p>` : '';
  return `<div class="ts-note">${hold}${p50}</div>`;
}

export function testedCard(T) {
  if (!T || !Array.isArray(T.signals) || !T.signals.length) return '<section class="card" id="tested"><h2>試過但沒通過的訊號</h2><p class="small">資料暫時讀不到。</p></section>';
  const n = T.signals.length, rej = T.signals.filter(s => s.verdict === '沒通過').length;
  const groups = GROUPS.map(([g, title]) => {
    const xs = T.signals.filter(s => s.group === g);
    return xs.length ? `<h3 class="sub">${title}</h3><ul class="ts-list">${xs.map(itemHtml).join('')}</ul>` : '';
  }).join('');
  const early = T.earlier_ideas?.length ? `<h3 class="sub">更早用大漲跌資料檢查過的說法（也沒有用）</h3>
    <ul class="facts small">${T.earlier_ideas.map(e => `<li>${esc(e.idea)}：${esc(e.why)}</li>`).join('')}</ul>` : '';
  return `<section class="card" id="tested"><h2>試過但沒通過的訊號</h2>
    <p class="small">這些都是新聞或研究常提到、聽起來有道理的訊號。每一個都和目前的預測規則（冠軍）比過：先只用 2022–23 年的資料事先選好版本，再看 <strong>2024 年起</strong>（選的時候沒看過的期間，BTC＋ETH 合計）的結果。</p>
    <p class="ts-sum"><strong>共 ${n} 個，${rej} 個沒通過，0 個採用。</strong>看到這些標題時，不用為了它們調整買賣。</p>
    ${groups}
    ${holdHtml(T)}
    ${early}
    <p class="small muted">怎麼看：夏普＝每承擔一份波動換到多少報酬，越高越好；最大跌幅＝從高點最多跌掉多少；上漲機率誤差（Brier）越小越好；「比冠軍好的把握」是把過去的週重新抽樣估出來的。括號裡是冠軍同期的數字。一個新版本要取代冠軍，必須事先登記、在選模期間過關，再通過 8 週實測；這裡沒有任何一個被註冊成模型。</p>
    <p class="small muted">數字全部直接讀自 <code>${esc(T.source)}</code>，由 <code>backtest/tested_signals.py</code> 產生 <code>data/tested_signals.json</code>（最新一次測試 ${md(T.as_of)}）。只是研究紀錄，不是投資建議。</p></section>`;
}
