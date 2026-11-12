// v23: 回測是不是運氣（過度擬合檢查） — numbers copied from forecast/proposals/proto_overfit_audit_report.json (tests check they match).
// Deflated Sharpe (N trials), PBO/CSCV on the 300-config grid, Hansen SPA over the rejected alternatives; 2024→ backtest, costs as paper_sim.
export const OVERFIT = {"as_of": "2026-11-10", "oos_start": "2024-01-01", "n_trials": 440, "dsr_oos": 0.7852, "dsr_wf": 0.8261, "psr_hold_oos": 0.7349, "mintrl_days": 1325.0, "grid_n": 300, "pbo": 0.2849, "n_alts": 100, "n_above": 16, "spa_c": 0.921, "rc_p": 0.9965};
const pc0 = x => `${Math.round(x * 100)}%`;
/** One plain line for the advanced 「預測模型與自我改善機制」 card. */
export function overfitLine(X = OVERFIT) {
  if (!X?.n_trials || !X?.n_alts) return '';
  const y = X.oos_start.slice(0, 4), yrs = (X.mintrl_days / 365).toFixed(1);
  const proven = X.dsr_oos >= 0.95;
  const edge = proven ? `冠軍 ${y} 年起的回測成績不是「試很多次、挑到運氣最好那個」的把握有 ${pc0(X.dsr_oos)}（已過 95%，算證實）` : `冠軍 ${y} 年起的回測成績不是「試很多次、挑到運氣最好那個」的把握約 ${pc0(X.dsr_oos)}（要 95% 才算證實，<strong>還沒證實</strong>）`;
  const hidden = X.spa_c < 0.10 ? `被否決的 ${X.n_alts} 種做法裡很可能有真的比冠軍好的，要重新檢查` : `被否決的 ${X.n_alts} 種做法裡有 ${X.n_above} 種回測數字比冠軍好，但一起檢查後差距都在運氣範圍內，沒有證據顯示錯殺了好方法（只小一點點的改善本來就驗不出來）`;
  return `<p id="overfit"><strong>回測是不是運氣</strong>：把到目前試過的約 ${X.n_trials} 種做法都算進去，${edge}；賺得比一直抱著穩的把握約 ${pc0(X.psr_hold_oos)}。把 ${X.grid_n} 組設定的歷史切兩半輪流「挑最好、再看另一半」，約 ${pc0(X.pbo)} 的機會挑到的那組在另一半反而落到一半以下。${hidden}。<strong>結論：冠軍可以繼續當參考，但優勢還不能當成保證；就算它真有回測這麼好，光靠實際紀錄要證明也大約要 ${yrs} 年。</strong></p>`;
}
