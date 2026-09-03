# 以「期」為單位的績效重新設計

日期：2026-09-03

## 目標

交易週期固定為每月一筆（每個策略），現有系統以持股天數推算日報酬再估月報酬，
與實際操作方式不符，且指標卡平鋪缺乏層次。本設計保留資料層，重寫計算與呈現層：
所有指標以「期」為單位，版面分四層，「全部」視圖支援多策略資金加權合併與並排比較。

## 範圍

- 重寫：`js/metrics.js`、`js/timeSeries.js`、`js/charts.js`、`js/dashboard.js`、`js/app.js`、`index.html`
- 小改：`js/forms.js`（新增欄位）、`js/report.js`（沿用新建構函式）、`js/config.js`
- 不動：`js/db.js`、`js/backup.js`
- 對應更新 `tests/` 下的測試頁
- 更新 `CLAUDE.md` 的 Key Design Decisions（權益曲線模型、最大回撤、月報酬估算三段改為本設計）

## 資料模型

`trades` store 新增一個欄位，其餘不變：

| 欄位 | 型別 | 說明 |
|---|---|---|
| `capital` | number | 投入資金（元）。舊資料可缺 |

缺 `capital` 時的推算規則：`capital = net_profit_loss / (net_return_pct / 100)`；
`net_return_pct` 為 0 時無法推算，該筆標記為「資金未填」，明細表以醒目色提示補填，
並在合併報酬計算中排除（單一策略視圖不受影響，因為單策略直接用 `net_return_pct`）。

期鍵 `period = buy_date.slice(0, 7)`（YYYY-MM）。同一策略同一期只允許一筆；
表單新增時若已存在同策略同期交易，顯示錯誤並拒絕。

`INITIAL_CAPITAL` 從 config 移除（不再需要基準 NAV）；`RISK_FREE_RATE` 保留。

## 計算模型（`timeSeries.js`）

輸入：已依策略篩選過的交易陣列。輸出：依期排序的序列。

**單一策略**：每期 `r = net_return_pct / 100`，`pnl = net_profit_loss`。

**全部策略**：依 `period` 分組，
`r = Σ pnl / Σ capital`（排除資金未填者），`pnl = Σ pnl`（含所有筆）。

每期輸出 `{ period, r, pnl, cumReturn, cumPnl, drawdown }`：

- `cumReturn[i] = Π(1 + r[0..i]) − 1`
- `cumPnl[i] = Σ pnl[0..i]`
- `drawdown[i] = (1 + cumReturn[i]) / max(1 + cumReturn[0..i]) − 1`，恆 ≤ 0

## 指標（`metrics.js`）

輸入：上述序列。`n` 為期數。

| 層 | 指標 | 算法 |
|---|---|---|
| 總結 | 總損益 | `cumPnl[n−1]` |
| 總結 | 累積報酬率 | `cumReturn[n−1]` |
| 總結 | 年化報酬率 | `(1 + 累積報酬率)^(12/n) − 1` |
| 總結 | 最大回撤 | `min(drawdown)` |
| 品質 | 勝率 | `count(r > 0) / n` |
| 品質 | 盈虧比 | `mean(r | r>0) / |mean(r | r<0)|`；無虧損期顯示「—」 |
| 品質 | 平均期報酬 | `mean(r)` |
| 品質 | 期望值 | `勝率 × mean(r|r>0) + (1−勝率) × mean(r|r<0)` |
| 風險 | Sharpe | `mean(r − RISK_FREE_RATE/12) / std(r) × √12`；`n<2` 或 std=0 顯示「—」 |
| 風險 | 最大連續虧損期數 | 最長的連續 `r<0` 段長度 |
| 風險 | 最大回撤金額 | `cumPnl` 曲線的最大峰谷差（元） |
| 風險 | 最佳／最差單期 | `max(r)` / `min(r)` |

移除：平均日報酬、持股天數、天數推算的 CAGR、Calmar、`worst_single_trade_return`（併入最差單期）。

## 版面（`index.html` + `dashboard.js`）

由上而下：

0. **策略選擇器**：「全部」與各策略名稱，固定在頂部。
1. **總結列**：4 張大卡（總損益、累積報酬率、年化報酬率、最大回撤），
   卡片下方小字「n 期，YYYY-MM 至 YYYY-MM」。
2. **品質與風險列**：8 張小卡（勝率、盈虧比、平均期報酬、期望值、Sharpe、
   最大連續虧損期數、最大回撤金額、最佳／最差單期）。正值紅、負值綠（台股慣例）。
3. **圖表**（見下節）。
4. **表格**：「全部」時先顯示策略比較表，再顯示交易明細表。

策略比較表欄位：策略、期數、總損益、累積報酬率、年化報酬率、最大回撤、勝率。

交易明細表欄位：交易編號、策略名稱、版本、期（YYYY-MM）、買進日期、賣出日期、
投入資金、結算報酬率、絕對損益金額。移除持股天數與平均日報酬。

## 圖表（`charts.js`）

橫軸一律為 `period`（類別軸，YYYY-MM）。紅漲綠跌沿用現有配色。

| 圖 | 單一策略 | 全部 |
|---|---|---|
| 累積報酬率曲線 | 一條線；切換鈕改顯示累積損益金額 | 每策略一條細線 + 一條粗合併線；切換鈕同左 |
| 每期報酬柱狀 | 每期一根 | 同期多根並排，一策略一色 |
| 回撤曲線 | 填色面積，≤ 0 | 只畫合併線 |

三個建構函式各回傳 `{ data, layout }`，供 `app.js` 與 `report.js` 共用。

## 表單與報告

- `forms.js`：新增「投入資金」欄位（必填，正數）；同策略同期重複時拒絕。
- `report.js`：改呼叫新的卡片與圖表建構函式，結構不變。
- 匯入 JSON 時 `capital` 可缺，依推算規則處理。

## 錯誤處理

- 沒有交易：卡片顯示「—」，圖表顯示「暫無數據」。
- 只有 1 期：年化與 Sharpe 顯示「—」，其餘正常。
- 資金未填且報酬率為 0：明細表標示，合併報酬排除該筆並在總結列下方提示「有 k 筆資金未填」。

## 測試

- `tests/test_logic.html`：以手算的 3 期範例驗證序列與每個指標；含全部策略的資金加權案例、
  資金缺漏推算案例、1 期邊界案例。
- `tests/test_charts.html`、`tests/test_dashboard.html`、`tests/test_forms.html`、
  `tests/test_report.html`：對應新結構更新。
- `tests/test_db.html`、`tests/test_backup.html`：不變。
