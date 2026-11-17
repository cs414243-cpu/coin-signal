// v67: 不用開 App 也知道建議有沒有變 — iPhone calendar subscription to data/signal.ics (forecast/calendar_export.py, written by
// daily.sh at 08:20 from the public ledger). One all-day event per 08:00 close; ⚠️ + 09:00 alert when the recommendation
// changed. iOS fetches subscribed calendars by itself (Settings → Calendar → Fetch; RFC 7986 REFRESH-INTERVAL PT1H hint);
// alerts only fire if 「移除提示 / Remove Alerts」 is switched off when subscribing. No push, no account, nothing sent anywhere.
/** webcal:// URL of the feed next to this page (works for the live site and for local test servers). */
export function feedUrl(loc) {
  const path = String(loc?.pathname || '/').replace(/[^/]*$/, '');
  return { webcal: `webcal://${loc?.host || ''}${path}data/signal.ics`, https: `https://${loc?.host || ''}${path}data/signal.ics` };
}
/** One line for 「更多說明」 (plain words; the how-to is small print). */
export function homeLine(loc) {
  const u = feedUrl(loc);
  return `<p class="small cal-home" id="cal-home">📅 不用開 App 也知道建議有沒有變：<a href="${u.webcal}" id="cal-link">加到 iPhone 行事曆</a>。每天早上 8:20 以後行事曆會多一則「幣訊號」（例如「BTC 空手・ETH 空手（沒變）」），建議變了標題會有 ⚠️，內容寫變成多少和下次什麼價格會變。</p>
    <p class="small muted cal-how">想讓它在建議變了的那天早上 9 點跳通知：按連結後先別按「加入」，點最下面的「訂閱詳細資訊」，把「移除提示」（英文 Remove Alerts）關掉再加入；已經訂閱的要刪掉重訂。行事曆多久更新一次由 iPhone 決定（通常 15 分鐘到 1 小時），要馬上看還是以 App 為準。連結打不開時：設定 → 行事曆 → 帳號 → 加入帳號 → 其他 → 加入訂閱的行事曆，貼上 <code>${u.https}</code>。</p>`;
}
