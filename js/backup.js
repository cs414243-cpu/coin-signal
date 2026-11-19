// v84: 我的資料備份與還原 — everything 宗 types into the app (部位／總資產、定期定額與成本設定、決策紀錄) lives ONLY in this
// phone's localStorage. On iOS a Home Screen web app keeps its own storage, separate from Safari (WebKit blog 2020-03-24
// "Full Third-Party Cookie Blocking and More": home-screen web apps "are not part of Safari"), and WebKit may evict an
// origin's data under storage pressure unless the origin is in persistent mode (WebKit blog 2023-08-10 "Updates to
// Storage Policy": navigator.storage.persist()/persisted(), granted by heuristics such as running as a Home Screen app).
// So: (1) ask once for persistent storage, (2) show plainly what is saved and whether it is protected, (3) a backup code
// (plain JSON text, copy or save as a file) that can be pasted back on a new phone / the other app. Nothing leaves the
// phone unless 宗 copies it himself. Pure functions (storage passed in), no DOM. Research only, not investment advice.
export const FORMAT = 'coin-signal-backup';
export const V = 1;
/** Keys that hold 宗's own data / preferences (all other keys are caches the app rebuilds). */
export const KEYS = ['cs-v2-settings', 'cs-v12-journal', 'cs-v7-seen', 'coin', 'adv-open', 'adv-grp', 'cs-text'];   // v85: + 字的大小
const JSON_KEYS = { 'cs-v2-settings': 'object', 'cs-v12-journal': 'array', 'cs-v7-seen': 'object', 'adv-grp': 'array' };
const MAX_LEN = 500000;

const parseJ = s => { try { return JSON.parse(s); } catch { return undefined; } };
const kindOf = x => Array.isArray(x) ? 'array' : (x && typeof x === 'object' ? 'object' : typeof x);
const pad = n => String(n).padStart(2, '0');
/** Taipei-time stamp "YYYY-MM-DD HH:MM" for a ms timestamp (fixed UTC+8, no DST). */
export function taipei(ms) { const d = new Date(ms + 8 * 3600000); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`; }

/** What is saved on this phone right now (counts only; used for the card and for the backup summary). */
export function summary(data) {
  const s = parseJ(data['cs-v2-settings'] ?? 'null'), j = parseJ(data['cs-v12-journal'] ?? 'null');
  const has = v => v !== undefined && v !== null && String(v).trim() !== '';
  return {
    journal: Array.isArray(j) ? j.length : 0,
    position: !!(s && (has(s.total) || has(s.btc) || has(s.eth))),
    settings: !!(s && typeof s === 'object' && Object.keys(s).length),
    keys: KEYS.filter(k => typeof data[k] === 'string').length,
  };
}
export function read(storage) {
  const out = {};
  for (const k of KEYS) { try { const v = storage.getItem(k); if (typeof v === 'string') out[k] = v; } catch { /* storage blocked */ } }
  return out;
}
/** Backup text = one JSON object (copyable; also saved as a .json file). */
export function makeBackup(storage, now = Date.now()) {
  const data = read(storage);
  return JSON.stringify({ format: FORMAT, v: V, made: taipei(now) + ' 台北', summary: summary(data), data });
}

/** Parse pasted text → {data, summary, made} or {error} (plain zh-TW). Only known keys; JSON keys must parse to the right shape. */
export function parseBackup(text) {
  const t = String(text ?? '').trim();
  if (!t) return { error: '請先貼上備份碼。' };
  if (t.length > MAX_LEN) return { error: '備份碼太長，不像是幣訊號的備份。' };
  const o = parseJ(t);
  if (!o || typeof o !== 'object' || o.format !== FORMAT) return { error: '這不是幣訊號的備份碼（請整段複製，開頭是 {"format":"coin-signal-backup"）。' };
  if (o.v !== V) return { error: `備份格式版本 ${o.v} 不認得，請用新版 App 產生。` };
  if (!o.data || typeof o.data !== 'object') return { error: '備份碼裡沒有資料。' };
  const data = {};
  for (const [k, v] of Object.entries(o.data)) {
    if (!KEYS.includes(k)) continue;                     // ignore unknown keys (never write anything else)
    if (typeof v !== 'string') return { error: `備份碼的「${k}」格式不對。` };
    if (JSON_KEYS[k] && kindOf(parseJ(v)) !== JSON_KEYS[k]) return { error: `備份碼的「${k}」格式不對。` };
    data[k] = v;
  }
  if (!Object.keys(data).length) return { error: '備份碼裡沒有可以還原的資料。' };
  return { data, summary: summary(data), made: typeof o.made === 'string' ? o.made : null };
}

/** Journal merge: union by id; for the same id (same 建議日＋幣) the backup's record wins. Sorted like journal.js (asof, coin). */
export function mergeJournal(curText, bakText) {
  const cur = parseJ(curText ?? '[]'), bak = parseJ(bakText ?? '[]');
  const m = new Map();
  for (const e of Array.isArray(cur) ? cur : []) if (e && e.id) m.set(e.id, e);
  for (const e of Array.isArray(bak) ? bak : []) if (e && e.id) m.set(e.id, e);
  return JSON.stringify([...m.values()].sort((a, b) => (a.asof + a.coin).localeCompare(b.asof + b.coin)));
}

/** Write a parsed backup: settings/preferences replaced, decision records merged (nothing on the phone is lost). */
export function restore(storage, parsed) {
  try {
    for (const [k, v] of Object.entries(parsed.data)) {
      storage.setItem(k, k === 'cs-v12-journal' ? mergeJournal(storage.getItem(k), v) : v);
    }
    return { ok: true, summary: summary(read(storage)) };
  } catch { return { ok: false, error: '這支手機不能存資料（可能是私密瀏覽或空間不足）。' }; }
}

/** Plain status lines. env = {standalone, persisted (true/false/null = unknown)}. */
export function statusLines(sum, env) {
  const what = sum.journal || sum.position || sum.settings
    ? `這裡存了：決策紀錄 ${sum.journal} 筆、部位${sum.position ? '有填' : '沒填'}、試算設定${sum.settings ? '有改過' : '用預設'}。`
    : '這裡還沒有你自己填的資料（沒填部位、沒有決策紀錄），目前不需要備份。';
  const where = env.standalone
    ? '你現在用的是主畫面上的 App。它的資料跟 Safari 網頁版分開存，兩邊不相通。'
    : '你現在用的是瀏覽器網頁版。加到主畫面的 App 會另外存一份，兩邊不相通；而且網頁版太久沒開，Safari 可能自動清掉資料。';
  const keep = env.persisted === true ? '這支手機已同意「不要自動清掉」這個 App 的資料（換手機、刪 App 或清除網站資料還是會不見）。'
    : env.persisted === false ? '這支手機沒有保證保留：空間不夠時系統可能清掉。'
    : '這支手機沒辦法查詢會不會被自動清掉。';
  return [what, where, keep];
}
