# 純網頁化改版設計文件

日期：2026-07-21
狀態：已核准，待進入實作規劃 (writing-plans)

## 背景與目標

目前系統是 Streamlit + SQLite + pandas 的 Python 應用，需要 Conda 環境與 `streamlit run` 才能啟動。目標是改為**不需要 Python、不需要任何 server** 的純靜態網頁：雙擊 `index.html` 即可在瀏覽器中完整使用（策略績效儀表板、圖表、交易資料 CRUD、HTML 報告匯出）。

改版後 Streamlit 版本（`app.py`、`views/`、`analyzer/`、`database/`、`config.py`、`run.bat`、`setup_env.bat`、`test_db.py`、`test_analyzer.py`）將完全移除，不保留備用版本。

## 使用情境限制

- 僅在單一本機上使用，直接雙擊 `index.html` 開啟（`file://` 協定），不部署到任何靜態網頁託管服務。
- 不需要考慮多裝置/多瀏覽器間的即時同步；跨裝置搬資料一律透過手動匯出/匯入 JSON。

## A. 架構與檔案配置

```
index.html              主頁面（儀表板 + 圖表 + 維護表單）
css/style.css           沿用現有淺色質感風格 tokens (SURFACE / INK_* / GOOD / CRITICAL / GRID / BASELINE)
js/
  config.js             INITIAL_CAPITAL = 1000000, RISK_FREE_RATE = 0.02
  db.js                 IndexedDB 封裝（Promise 化 CRUD + 自動備份寫檔）
  timeSeries.js         generate_trade_equity_curve 的 JS 版
  metrics.js            calculate_metrics 的 JS 版
  charts.js             Plotly.js 版：單筆報酬 lollipop 圖、累積損益曲線圖
  dashboard.js           績效卡片 + 可排序/搜尋的交易明細表格
  forms.js               新增/修改/刪除表單邏輯與驗證
  report.js               匯出單一 HTML 離線報告
  app.js                   進入點：初始化 DB → 讀取交易 → 依策略篩選 → 渲染各區塊
lib/plotly.min.js       內建 Plotly.js（vendored，離線可用，不走 CDN）
tools/migrate_db_to_json.py  一次性遷移腳本（僅執行一次，不影響網頁本身免 Python 的目標）
tests/test_logic.html    瀏覽器端邏輯測試頁（雙擊執行，比對 PASS/FAIL）
```

原本的 `app.py`、`views/`、`analyzer/`、`database/`（含誤入版控的 `database/.claude/`）、`config.py`、`run.bat`、`setup_env.bat`、`test_db.py`、`test_analyzer.py`、`__pycache__/` 全部刪除。

`trading_tracker.db` 保留在專案根目錄（已被 `.gitignore` 排除，且是遷移來源），是否於遷移完成後手動刪除由使用者自行決定，不在本次自動化範圍內。

## B. 資料模型與持久化（IndexedDB）

### Schema

單一 object store `trades`，`keyPath: 'trade_id'`，欄位與現有 SQLite 表完全對應：

| 欄位 | 型別 | 備註 |
|---|---|---|
| `trade_id` | string | 主鍵，使用者輸入，須唯一 |
| `strategy_name` | string | 側邊欄篩選依據 |
| `version` | string | 策略版本標籤 |
| `buy_date` / `sell_date` | string (`YYYY-MM-DD`) | |
| `net_return_pct` | number | 百分比，如 `5.5` 代表 5.5% |
| `net_profit_loss` | number | 新台幣絕對金額 |

### CRUD

`db.js` 用原生 `indexedDB` API 包一層 Promise 介面：
- `getAllTrades()`
- `addTrade(trade)` — 用 `add()`，`trade_id` 已存在時 reject，對應原本「編號重複」錯誤
- `updateTrade(trade)` — 用 `put()`
- `deleteTrade(id)`

### 自動備份（File System Access API，主要機制）

- 首次使用時，畫面提供「設定自動備份檔案」按鈕，呼叫 `showSaveFilePicker()` 讓使用者選定本機路徑存成 `trades_backup.json`；取得的檔案控制代碼（`FileSystemFileHandle`）序列化保存於 IndexedDB 的獨立 object store（如 `settings`），下次開啟頁面時嘗試重用。
- 之後每次新增/修改/刪除交易成功後，`db.js` 自動呼叫寫入，把當下完整交易清單覆寫回 `trades_backup.json`（`createWritable()` → `write()` → `close()`），不累積多個檔案。
- 每次重新開啟頁面時，因瀏覽器安全機制，可能需要重新確認一次「允許存取此檔案」的授權提示；若使用者拒絕或該次無法取得權限，畫面提示改用手動匯出。

### 手動備份（後備機制，任何瀏覽器皆可用）

- 「匯出 JSON」：把 `getAllTrades()` 結果 `JSON.stringify` 包成 Blob，用 `<a download>` 觸發下載。
- 「匯入 JSON」：`<input type="file" accept=".json">` 讀取後逐筆 **upsert**（`put()`）寫回 IndexedDB，可用於還原備份或套用遷移結果。

風險提醒：IndexedDB 資料掛在瀏覽器 profile 上，清瀏覽器資料或換瀏覽器會遺失；自動備份與手動匯出按鈕皆常駐於主畫面，不藏在次選單中。

## C. 核心計算邏輯移植

逐公式對照現有 Python 實作，確保數值結果一致：

**`timeSeries.js`**（對應 `analyzer/time_series.py`）
- 依 `buy_date` 排序後逐筆連鎖複利：`nav[i] = INITIAL_CAPITAL * Π(1 + return_pct[j])`（`j` 從最早到第 i 筆）
- `cum_return = nav / INITIAL_CAPITAL - 1`
- 空陣列輸入回傳空結果

**`metrics.js`**（對應 `analyzer/metrics.py`）
- `total_trades` / `total_pnl`：直接加總
- `avg_trade_return`：各筆 `return_pct` 算術平均
- `worst_single_trade_return`：`net_return_pct` 最小值，僅為負時記錄，否則 0
- CAGR：`total_days = max(sell_date_max - buy_date_min 天數, 1)` → `annual_return = (1+total_return)^(365.25/total_days) - 1`
- `avg_monthly_return`：`(1+annual_return)^(1/12) - 1`
- Max Drawdown：`nav` 的 running max → `(nav - running_max) / running_max` 取最小值（峰谷回撤）
- Sharpe：交易報酬序列的樣本標準差（`ddof=1`）依實際交易頻率年化後計算
- Calmar：`annual_return / abs(max_drawdown)`

JS 不使用任何統計函式庫，手刻 cumprod / cummax / 樣本標準差等，維持零依賴。

**驗證基準**：沿用 `test_analyzer.py` 中的三筆模擬交易（T001/T002/T003），JS 版輸出須與 Python 版逐一比對一致。

## D. UI / UX、圖表、報告匯出

**主頁面版面**（延續現有 Streamlit 版資訊順序）：
1. 標題列
2. 側邊控制面板：策略篩選下拉選單（動態自 IndexedDB 的 `strategy_name` 去重產生，含「全部策略」）、自動備份設定/手動匯出/匯入按鈕、匯出 HTML 報告按鈕
3. 績效儀表板：8 張指標卡（交易總次數、累積損益、平均月報酬、單次週期平均報酬、Max Drawdown、單筆最大虧損、Sharpe、Calmar），配色沿用現有 `GOOD`/`CRITICAL` 狀態色邏輯
4. 兩張 Plotly 圖表：單筆結算報酬率（lollipop 針狀圖）、累積損益曲線 —— 逐一對照現有 Python 版的 trace/shape/annotation 邏輯改寫成 Plotly.js 呼叫
5. 交易明細表格：可點欄名排序、右上角關鍵字搜尋（原生 JS 實作，不引入額外表格套件）
6. 資料維護表單：新增／修改／刪除三個分頁，驗證規則沿用（編號/策略名不可空白、賣出日期不可早於買進日期、編號重複時報錯）

**HTML 報告匯出**（`report.js`）：邏輯對應現有 `views/report.py`——沿用同一份指標卡 HTML 產生器與表格產生器，圖表序列化後內嵌 vendored 的 `plotly.min.js`（第二張圖不重複內嵌 JS 以縮小檔案），輸出成單一離線可開啟的 HTML 字串並觸發下載，視覺樣式（卡片、表格、配色 token）原封不動搬遷。

## E. 遷移工具、測試方式、專案清理

### 一次性遷移腳本 `tools/migrate_db_to_json.py`

- 讀取現有 `trading_tracker.db`（直接用 `sqlite3` 查詢，不依賴專案內即將刪除的其他模組）
- 輸出 `trades_export.json`（陣列格式，欄位與 IndexedDB schema 完全對應）
- 執行方式寫在腳本檔頭註解：`python tools/migrate_db_to_json.py`，僅需執行一次
- 產生的 `trades_export.json` 透過網頁上的「匯入 JSON」功能匯入 IndexedDB

### 測試方式

延續現有「無正式框架、可直接執行的腳本驗證」風格，改為瀏覽器版：
- `tests/test_logic.html`：獨立頁面，內嵌 `timeSeries.js` / `metrics.js`，用與 `test_analyzer.py` 相同的模擬交易資料跑一次，結果印在頁面上並標示 PASS/FAIL，雙擊即可執行，不需 Node/npm
- IndexedDB CRUD 因需要瀏覽器環境，改為在 `index.html` 上手動操作驗證（新增/修改/刪除各跑一次，確認畫面即時更新），不另外寫自動化腳本

### 專案清理

- 刪除：`app.py`、`views/`（`report.py`/`charts.py`/`dashboard.py`/`forms.py`）、`analyzer/`、`database/`（含 `database/.claude/`）、`config.py`、`run.bat`、`setup_env.bat`、`test_db.py`、`test_analyzer.py`、`__pycache__/`
- `trading_tracker.db` 保留，不自動刪除
- 更新 `.gitignore`：移除 Python 相關規則，改為視需要忽略瀏覽器產生的暫存/備份檔案
- 更新 `CLAUDE.md`：移除 Conda/Streamlit 環境設定與執行說明，改為「直接雙擊 `index.html` 開啟」；更新架構圖為 `IndexedDB → JS 邏輯 → DOM 渲染`；Workflow Rules（禁止在 main 上直接 commit、禁止 merge/push）維持不變

## 未決風險（實作時需留意，非阻塞項）

- File System Access API 在 `file://` 協定下的相容性需在實作初期以 Chrome/Edge 實測確認；若行為與預期不同，退回「僅手動匯出」並在文件中註明。
- Plotly.js 3~4MB 檔案會被提交進版控，屬預期內的一次性倉庫體積增加。
