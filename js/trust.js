// v9: 預測新鮮度與紀錄可信度 — pure functions + one on-device chain check (no DOM writes, same-origin fetch only).
// Build-time facts come from forecast/trust_export.py → data/trust.json (verified with forecast/common.py).
export const RUN_GRACE_MS = 3600000;   // daily.sh runs 08:20 Taipei (00:20 UTC); count a day as missed only after 09:00 Taipei
export const LEDGER_FILES = ['forecasts.jsonl', 'scores.jsonl', 'paper.jsonl', 'events.jsonl'];
const DAY = 86400000;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const dnum = s => Date.parse(s + 'T00:00:00Z') / DAY;
const ymd = n => new Date(n * DAY).toISOString().slice(0, 10);
/** candle date D closes at D+1 08:00 Taipei → "M/D" of that morning */
export const closeMD = s => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + 1); return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`; };
const ntd = x => 'NT$' + Math.round(x).toLocaleString('en-US');
const spct = (x, d = 2) => `${x > 0 ? '+' : x < 0 ? '−' : ''}${Math.abs(x * 100).toFixed(d)}%`;
const tpe = t => new Intl.DateTimeFormat('zh-TW', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(t)) + '（台北）';

/** Latest candle date the daily run should have forecast by `now` (ms). After 09:00 Taipei on day X it is X−1 (UTC). */
export function expectedAsof(now) { return ymd(Math.floor((now - RUN_GRACE_MS) / DAY) - 1); }

/** Freshness of the forecast the top card shows. level: null (fresh) | 'yellow' (1 day missed) | 'red' (≥ 2). */
export function staleness(asof, now) {
  if (!asof) return { level: 'red', missed: null, expected: expectedAsof(now) };
  const exp = expectedAsof(now), missed = Math.max(0, Math.round(dnum(exp) - dnum(asof)));
  return { level: missed >= 2 ? 'red' : missed === 1 ? 'yellow' : null, missed, expected: exp };
}

/** One plain line for the top card, or '' when everything is fine. */
export function topLine(live, trust, now, dev) {
  const asof = live?.coins?.BTC?.asof || live?.coins?.ETH?.asof;
  if ((trust && trust.chain_ok === false) || dev?.ok === false) return `<p class="stale stale-red" id="fc-stale">⛔ 預測紀錄檢查沒通過，先別照做。</p>`;
  const s = staleness(asof, now);
  if (!s.level) return '';
  const n = s.missed === null ? '多' : s.missed;
  return `<p class="stale stale-${s.level}" id="fc-stale" data-level="${s.level}" data-missed="${s.missed ?? ''}">${s.level === 'red' ? '⛔' : '⚠️'} 預測資料已 ${n} 天沒更新，先別照做${asof ? `（下面還是 ${closeMD(asof)} 早上的建議）` : ''}。</p>`;
}

async function sha256hex(str) {
  const b = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
}
/** Re-check a hash-chained JSONL file exactly like forecast/common.py verify_chain: hash = sha256(prev_hash + canon(row without hash)).
 *  Rows are canonical JSON with sorted keys, so canon(row without hash) is the raw line with the "hash" member cut out
 *  (no float re-serialisation needed). */
export async function verifyChainText(text) {
  let prev = '0'.repeat(64), n = 0;
  const lines = text.split('\n').filter(l => l.trim());
  for (const line of lines) {
    n++;
    let r; try { r = JSON.parse(line); } catch { return { ok: false, rows: n, bad_line: n, why: 'JSON' }; }
    const h = r.hash, cut = `"hash":"${h}"`;
    let body = line.includes(cut + ',') ? line.replace(cut + ',', '') : line.replace(',' + cut, '');
    if (typeof h !== 'string' || body === line || r.prev_hash !== prev || await sha256hex(prev + body) !== h) return { ok: false, rows: n, bad_line: n, why: 'hash' };
    prev = h;
  }
  return { ok: true, rows: lines.length, last_hash: lines.length ? prev : null };
}
/** Fetch the published ledger (same origin, ./ledger/*.jsonl) and verify every chain on this phone. */
export async function verifyOnDevice(fetchFn = fetch, base = 'ledger/') {
  const out = {};
  for (const f of LEDGER_FILES) {
    try {
      const r = await fetchFn(base + f, { cache: 'no-cache' });
      if (!r.ok) return { ok: null, why: `${f} HTTP ${r.status}` };
      out[f] = await verifyChainText(await r.text());
    } catch (e) { return { ok: null, why: `${f} ${e.message || e}` }; }
  }
  return { ok: Object.values(out).every(x => x.ok), files: out };
}

const ROLE_ZH = { champion: '照建議（冠軍）', reference: '一直抱著（基準）', challenger: '挑戰者', retired: '已退休' };
/** 進階 card. T = trust.json, live = live.json, dev = verifyOnDevice() result (or undefined while running). */
export function trustCard(T, live, now, dev) {
  if (!T) return `<section class="card" id="trust"><h2>預測新鮮度與紀錄可信度</h2><p class="small muted">紀錄檢查資料（data/trust.json）暫時讀不到。</p></section>`;
  const F = T.forecasts, V = T.verification, files = T.files;
  const asof = live?.coins?.BTC?.asof || live?.coins?.ETH?.asof, s = staleness(asof, now);
  const fresh = !asof ? '讀不到預測資料' : s.level ? `<span class="warn-inline">晚了 ${s.missed} 天</span>（最新是 ${esc(asof)} 收盤＝台北 ${closeMD(asof)} 08:00；現在應該要有 ${esc(s.expected)} 的預測）` : `正常（最新是 ${esc(asof)} 收盤＝台北 ${closeMD(asof)} 08:00 的預測；下一次約在 ${closeMD(ymd(dnum(s.expected) + 1))} 08:20 產生）`;
  const ok = b => b ? '✅ 通過' : '❌ 沒通過';
  const fileRows = Object.entries(files).map(([n, x]) => `<tr><th>${esc(n)}</th><td>${x.rows}</td><td>${ok(x.ok)}${x.error ? `<div class="muted small">${esc(x.error)}</div>` : ''}</td><td>${dev?.files?.[n] ? `${ok(dev.files[n].ok)}${dev.files[n].ok && dev.files[n].last_hash !== x.last_hash ? '<div class="muted small">最後雜湊和建置時不同（帳本已更新）</div>' : ''}` : '—'}</td><td><code>${x.last_hash ? esc(x.last_hash.slice(0, 12)) + '…' : '—'}</code></td></tr>`).join('');
  const devLine = dev === undefined ? '這支手機正在自己重算一次雜湊鏈…' : dev.ok === true ? '✅ 這支手機剛剛自己重算了公開帳本的雜湊鏈，全部相符。' : dev.ok === false ? '❌ 這支手機重算公開帳本時發現不相符，先別照做。' : `這支手機這次沒辦法自己重算（${esc(dev.why || '讀不到帳本檔')}），只能看建置時的結果。`;
  const dayN = F.first_asof ? Math.max(0, Math.round(dnum(s.expected) - dnum(F.first_asof)) + 1) : 0;
  const need = V.min_live_days;
  const verif = F.first_asof
    ? `從 ${esc(F.first_asof)} 收盤開始記錄，今天是第 <strong>${Math.min(dayN, 9999)}</strong> 天／需要 ${need} 天（${V.min_weeks} 週）。帳本實際有 ${F.n_days} 天的預測${F.missing_days.length ? `，中間缺 ${F.missing_days.length} 天（${F.missing_days.map(esc).join('、')}）` : '，中間沒有缺日'}。每個預測 7 天後才能對答案：第一批 ${esc(V.first_score_due)} 收盤到期，目前已評分 ${T.scores.n} 筆。換冠軍的規則要每個幣都有 ≥ ${need} 天「已評分」的預測，照每天記錄、不缺日，最早要等第 ${need} 天（${esc(V.last_needed_asof)}）的預測在 ${esc(V.scored_by)} 收盤（台北 ${closeMD(V.scored_by)} 08:00）到期之後的週檢討。`
    : '尚無實盤紀錄。';
  const P = T.paper, role = Object.fromEntries((T.models_frozen?.models || []).map(m => [m.key, ROLE_ZH[m.status] || m.status]));
  const paper = P && Object.keys(P.models).length ? `<div class="scroll"><table class="bt"><thead><tr><th>虛擬投資（NT$${(P.start_twd / 1e4).toFixed(0)} 萬起）</th><th>目前</th><th>報酬</th><th>累計成本</th><th>期間</th></tr></thead><tbody>${Object.entries(P.models).map(([k, x]) => `<tr${k === T.champion ? ' class="hl"' : ''}><th>${esc(role[k] || '模型')}<div class="muted small">${esc(k)}</div></th><td>${ntd(x.equity)}</td><td>${spct(x.ret)}</td><td>${ntd(x.cum_cost)}</td><td>${esc(x.start)}～${esc(x.end)}（${x.rows} 天）</td></tr>`).join('')}</tbody></table></div>
    <p class="small muted">第一天的虧損就是買進的手續費和台幣溢價（還沒有價格變動）。</p>` : '<p>虛擬投資：尚無實盤紀錄。</p>';
  return `<section class="card" id="trust"><h2>預測新鮮度與紀錄可信度</h2>
    <p><strong>新鮮度：</strong>${fresh}。晚 1 天首頁會出現黃色提醒、晚 2 天以上變紅色，都寫「先別照做」。</p>
    <p><strong>雜湊鏈：</strong>${T.chain_ok ? '✅ 建置時驗證通過' : '❌ 建置時驗證沒通過'}（用每日預測同一套檢查 <code>forecast/common.py</code> 的 <code>verify_chain</code>＋<code>verify_forecast_frames</code>）；${T.frames.ok ? '每筆預測的計算框架雜湊都符合' : `框架雜湊不符：${esc(T.frames.error || '')}`}；${T.models_frozen.ok ? `${T.models_frozen.n} 個模型的程式碼都和登記時的 sha256 相同（凍結，沒被改過）` : '❌ 有模型程式碼和登記時不同'}。</p>
    <p id="trust-dev">${devLine}</p>
    <div class="scroll"><table class="bt"><thead><tr><th>帳本檔</th><th>筆數</th><th>建置時</th><th>這支手機</th><th>最後雜湊</th></tr></thead><tbody>${fileRows}</tbody></table></div>
    <p><strong>已記錄的實盤預測：</strong>${F.n} 筆（${Object.keys(F.by_model).length} 個模型 × ${F.coins.length} 個幣 × ${F.n_days} 天），其中冠軍 ${esc(T.champion)} ${F.n_champion} 筆。第一筆寫入於 ${F.first_created_at ? tpe(Date.parse(F.first_created_at)) : '—'}，最新一筆 ${F.last_created_at ? tpe(Date.parse(F.last_created_at)) : '—'}。</p>
    <p><strong>8 週驗證：</strong>${verif}</p>
    ${paper}
    <p class="small muted">資料：<code>forecast/trust_export.py</code> → <code>data/trust.json</code>，產生於 ${tpe(Date.parse(T.generated_at))}；每天 <code>daily.sh</code>、每週 <code>weekly.sh</code> 會重產並一起發布。手機上的重算只讀公開的 <code>ledger/*.jsonl</code>，用的是同一個公式（sha256(上一筆雜湊＋這一筆內容)）；它只能證明「發布後沒被改」，不能證明寫入當時的數字正確。</p>
  </section>`;
}
