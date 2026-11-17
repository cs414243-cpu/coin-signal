// v50: 進階（可不看）分成 5 個「問題」群組（預設收起），上方問題索引點哪張卡就打開那一組並捲過去。
// Only organisation: every card keeps its own id, content and numbers (nothing here computes or shows a number except the
// card count of each group). Group open/closed state is remembered on this phone only (localStorage 'adv-grp').
// Why (research note CRYPTO-20261115-1839-adv-groups.md): Nielsen 2006 「Progressive Disclosure」 (NN/g) — chunk advanced
// features into groups that make sense so users check one place and ignore the rest, with labels that set clear
// expectations; Miller 1956 Psychol. Rev. 63(2):81–97 (doi 10.1037/h0043158) — few chunks at a time.
// Research only, not investment advice.
export const KEY = 'adv-grp';

/** Fixed groups, in display order. `cards` = the ids of the 進階 cards (must match app.js renderAdv and the index). */
export const GROUPS = [
  { id: 'act', q: '這週要不要動手？價格到哪會變？', cards: ['today', 'nextmove', 'fullpath', 'intraday', 'xsrc', 'recent', 'splitexit', 'dipstop', 'takeprofit', 'quickexit'] },
  { id: 'flat', q: '現在空手：要等多久、錢放哪、大跌要不要買？', cards: ['spells', 'lateentry', 'cashyield', 'usdtpark', 'startany', 'moveweeks', 'dipbuy', 'events'] },
  { id: 'record', q: '照建議做，過去賺多少、虧多少？', cards: ['outcomes', 'weekrisk', 'tradeband', 'trips', 'underwater', 'years', 'blend', 'sameavg', 'quitcost'] },
  { id: 'money', q: '我的錢：紀錄、部位、定期定額、買幣成本', cards: ['journal', 'risk', 'execlag', 'coinsplit', 'plan', 'cost', 'costsens', 'lev', 'twdview'] },
  { id: 'trust', q: '這些數字可信嗎？資料、紀錄、模型、研究', cards: ['data', 'trust', 'pupcal', 'review', 'models', 'tested', 'bigclues', 'notes', 'signals'] },
];

export const groupOf = cardId => GROUPS.find(g => g.cards.includes(cardId))?.id ?? null;

/** Set of open group ids remembered on this phone (bad / missing value → all closed). */
export function loadOpen(storage) {
  try { const v = JSON.parse(storage?.getItem(KEY) || '[]'); return new Set(Array.isArray(v) ? v.filter(x => GROUPS.some(g => g.id === x)) : []); }
  catch { return new Set(); }
}
export function saveOpen(storage, set) { try { storage?.setItem(KEY, JSON.stringify(GROUPS.map(g => g.id).filter(id => set.has(id)))); } catch {} }

/** Wrap the cards' HTML of one group. `open` = remembered state. */
export function wrap(id, inner, open = false) {
  const g = GROUPS.find(x => x.id === id); if (!g) throw new Error('unknown group ' + id);
  return `<details class="adv-grp" id="grp-${g.id}" data-grp="${g.id}"${open ? ' open' : ''}><summary><span class="grp-q">${g.q}</span><span class="grp-n">${g.cards.length} 張</span></summary>${inner}</details>`;
}

/** Open every closed <details> around `el` (群組 and 進階 itself); returns the ids of the groups that were opened. */
export function openAround(el) {
  const opened = [];
  for (let d = el?.parentElement?.closest('details'); d; d = d.parentElement?.closest('details')) {
    if (!d.open) { d.open = true; if (d.dataset?.grp) opened.push(d.dataset.grp); }
  }
  return opened;
}
