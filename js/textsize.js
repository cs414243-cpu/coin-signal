// v85: 字的大小（只存在這支手機）。主畫面 App 沒有 Safari 網址列的「大小」選單，App 內字級原本固定 15px（等於 iOS「小」）。
// 四級：標準 15px（原本）、大 17px（iOS 預設內文大小 Large body 17pt）、特大 19px（xLarge）、超大 21px（xxLarge）
// ——Apple HIG Typography「Specifications」iOS Dynamic Type 表。所有字級都是 rem，跟著 <html> 的 --fs 一起放大；
// 版面寬度不變（WCAG 2.2 SC 1.4.4 Resize Text：作者可直接提供放大字的功能；SC 1.4.10 Reflow：不能出現左右捲動）。
export const KEY = 'cs-text';
export const LEVELS = [
  { id: 's', zh: '標準', px: 15 },
  { id: 'l', zh: '大', px: 17 },
  { id: 'xl', zh: '特大', px: 19 },
  { id: 'xxl', zh: '超大', px: 21 },
];
export function load(storage) {
  let v = null; try { v = storage.getItem(KEY); } catch { /* storage blocked */ }
  return LEVELS.some(l => l.id === v) ? v : 's';
}
export function next(id) {
  const i = LEVELS.findIndex(l => l.id === id);
  return LEVELS[(i + 1) % LEVELS.length].id;
}
export function level(id) { return LEVELS.find(l => l.id === id) || LEVELS[0]; }
export function label(id) {
  const L = level(id), N = LEVELS[(LEVELS.indexOf(L) + 1) % LEVELS.length];
  return { text: `字 ${L.zh}`, aria: `字的大小：${L.zh}。點一下換成「${N.zh}」` };
}
// 套用到 <html data-text="..">；按鈕文字跟著改。回傳實際套用的級別。
export function apply(doc, id, btn) {
  const L = level(id);
  if (L.id === 's') delete doc.documentElement.dataset.text; else doc.documentElement.dataset.text = L.id;
  if (btn) { const t = label(L.id); btn.textContent = t.text; btn.setAttribute('aria-label', t.aria); }
  return L.id;
}
export function save(storage, id) {
  try { if (id === 's') storage.removeItem(KEY); else storage.setItem(KEY, id); return true; } catch { return false; }
}
