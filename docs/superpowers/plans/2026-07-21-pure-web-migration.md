# 純網頁化改版 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 Streamlit + SQLite + pandas 的交易績效追蹤系統改寫成不需要 Python、不需要伺服器的純靜態網頁，雙擊 `index.html` 即可完整使用。

**Architecture:** 單一 `window.TPT` 全域命名空間下的原生 JS 模組（`config`/`db`/`backup`/`timeSeries`/`metrics`/`charts`/`dashboard`/`forms`/`report`/`app`），以傳統（非 module）`<script>` 標籤依序載入，避免 `file://` 協定下 ES module 的 CORS 限制。資料存在 IndexedDB，圖表用 vendored 的 Plotly.js。

**Tech Stack:** 原生 HTML/CSS/JavaScript（ES2017+，瀏覽器原生 API：IndexedDB、File System Access API、FileReader、Blob）、Plotly.js 2.35.2（vendored）。無 npm、無建置工具、無執行期 Python 依賴。

**Reference spec:** `docs/superpowers/specs/2026-07-21-pure-web-migration-design.md`

## Global Constraints

- 不可引入任何 npm/build 工具或 ES module（`<script type="module">`）——必須能用瀏覽器直接雙擊 `index.html`（`file://` 協定）開啟並完整運作。
- 所有 UI 文案維持現有系統的繁體中文用語與圖示（📈📊📉📋🛠️➕📝❌等），不要英文化。
- 所有金額/百分比格式化規則須與現有 Python 版本逐一對應（見 Task 2 的精確參考數值）。
- Plotly.js 版本固定為 `2.35.2`（vendored 到 `lib/`），不使用 CDN。
- 每個任務完成後必須先手動驗證通過，才能進入下一個任務。
- 所有改動在 `feature/pure-web-migration` branch 上進行（已建立），不得直接在 `main` commit，不得 `git merge`/`git push`。

## File Structure

```
index.html                     主頁面（Task 1 建立骨架，Task 9 完成組裝）
css/style.css                  設計 tokens 與版面樣式（Task 1）
js/config.js                   INITIAL_CAPITAL / RISK_FREE_RATE（Task 2）
js/timeSeries.js               generateTradeEquityCurve（Task 2）
js/metrics.js                  calculateMetrics（Task 2）
js/db.js                       IndexedDB CRUD 封裝（Task 3）
js/backup.js                   自動備份（File System Access API）+ 手動匯出/匯入（Task 4）
js/charts.js                   Plotly.js 圖表建構（Task 5）
js/dashboard.js                指標卡 + 可排序搜尋的交易明細表格（Task 6）
js/forms.js                    新增/修改/刪除表單（Task 7）
js/report.js                   離線 HTML 報告匯出（Task 8）
js/app.js                      進入點，整合所有模組（Task 9）
lib/plotly.min.js              vendored Plotly.js 2.35.2（Task 1）
lib/plotly-source.js           同一份 Plotly.js 原始碼包成 JS 字串，供報告內嵌（Task 1）
tests/test_logic.html          timeSeries/metrics 公式測試（Task 2）
tests/test_db.html             IndexedDB CRUD 測試（Task 3）
tests/test_backup.html         備份功能手動測試（Task 4）
tests/test_charts.html         圖表建構測試（Task 5）
tests/test_dashboard.html      指標卡/表格元件測試（Task 6）
tests/test_forms.html          表單驗證邏輯測試（Task 7）
tests/test_report.html         報告產生測試（Task 8）
tools/migrate_db_to_json.py    一次性 SQLite→JSON 遷移工具（Task 10）
```

（已核准的 spec 中僅提到 `tests/test_logic.html` 一個測試頁；本計畫依 writing-plans 的「每個任務都要有可獨立驗證的產出」要求，為 db/backup/charts/dashboard/forms/report 各自新增了對應的測試頁，屬於實作細節上的合理延伸，不牴觸 spec 的整體設計。）

---

### Task 1: 專案骨架、Plotly.js 入庫、CSS 設計系統

**Files:**
- Create: `lib/plotly.min.js`
- Create: `lib/plotly-source.js`
- Create: `css/style.css`
- Create: `index.html`（骨架版本，Task 9 會整個換掉內容）

**Interfaces:**
- Produces: CSS 類別 `.app-layout`, `.sidebar`, `.main-content`, `.section-title`, `.metric-grid`, `.metric-card`, `.metric-label`, `.metric-value`, `.chart-block`, `.table-toolbar`, `.table-scroll`, `table.trade-table`, `.empty-note`, `.tabs`, `.tab-button`, `.tab-panel`, `.form-grid`, `.form-field`, `.btn`, `.btn-primary`, `.btn-danger`, `.btn-block`, `.alert`, `.alert-error`, `.alert-success`, `.alert-warning`（後續所有任務的 HTML 都會用到這些 class）
- Produces: 全域變數 `window.TPT_PLOTLY_SOURCE`（字串，Plotly.js 完整原始碼），由 `lib/plotly-source.js` 定義

- [ ] **Step 1: 建立目錄結構**

```bash
mkdir -p "C:/DiskD/Workspace/Project/Trading-Performance-Tracker/js"
mkdir -p "C:/DiskD/Workspace/Project/Trading-Performance-Tracker/css"
mkdir -p "C:/DiskD/Workspace/Project/Trading-Performance-Tracker/lib"
mkdir -p "C:/DiskD/Workspace/Project/Trading-Performance-Tracker/tests"
mkdir -p "C:/DiskD/Workspace/Project/Trading-Performance-Tracker/tools"
```

- [ ] **Step 2: 下載 Plotly.js 2.35.2 到 `lib/plotly.min.js`**

```bash
curl -L -o "C:/DiskD/Workspace/Project/Trading-Performance-Tracker/lib/plotly.min.js" "https://cdn.plot.ly/plotly-2.35.2.min.js"
```

若沒有網路連線或 `curl` 失敗，改用瀏覽器直接開啟 `https://cdn.plot.ly/plotly-2.35.2.min.js`、另存新檔到 `lib/plotly.min.js`。

驗證：檔案存在且大小 > 3MB。

```bash
ls -la "C:/DiskD/Workspace/Project/Trading-Performance-Tracker/lib/plotly.min.js"
```

Expected: 檔案大小約 3.5MB。

- [ ] **Step 3: 由 `lib/plotly.min.js` 產生 `lib/plotly-source.js`（開發期一次性工具，不影響網頁執行期免 Python 的目標）**

```bash
python -c "
import json
with open('lib/plotly.min.js', 'r', encoding='utf-8') as f:
    source = f.read()
with open('lib/plotly-source.js', 'w', encoding='utf-8') as f:
    f.write('window.TPT_PLOTLY_SOURCE = ' + json.dumps(source) + ';\n')
print('done, output size:', len(source))
"
```

Expected: 印出 `done, output size: <一個很大的數字>`。

驗證：

```bash
ls -la "C:/DiskD/Workspace/Project/Trading-Performance-Tracker/lib/plotly-source.js"
```

Expected: 檔案大小與 `plotly.min.js` 相近（略大，因為多了 JSON escape）。

- [ ] **Step 4: 建立 `css/style.css`**

```css
:root {
  --surface: #fcfcfb;
  --ink-primary: #0b0b0b;
  --ink-secondary: #52514e;
  --ink-muted: #898781;
  --grid: #e1e0d9;
  --baseline: #c3c2b7;
  --good: #0ca30c;
  --critical: #d03b3b;
  --good-fill: rgba(12, 163, 12, 0.10);
  --critical-fill: rgba(208, 59, 59, 0.10);
  --font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  background: var(--surface);
  color: var(--ink-secondary);
  font-family: var(--font-family);
}

.app-layout { display: flex; min-height: 100vh; }

.sidebar {
  width: 300px;
  flex-shrink: 0;
  padding: 20px;
  border-right: 1px solid var(--grid);
  background: #ffffff;
}
.sidebar h2 { font-size: 1rem; color: var(--ink-primary); margin: 0 0 16px 0; }
.sidebar label { display: block; font-size: 0.8rem; color: var(--ink-muted); margin-bottom: 6px; }
.sidebar select { width: 100%; padding: 8px; margin-bottom: 16px; border: 1px solid var(--grid); border-radius: 6px; font-family: var(--font-family); }
.sidebar-divider { border: none; border-top: 1px solid var(--grid); margin: 16px 0; }

.main-content { flex: 1; padding: 24px 32px; max-width: 100%; overflow-x: auto; }

h1.page-title { font-size: 1.6rem; color: var(--ink-primary); margin: 0 0 4px 0; }
.page-subtitle { font-size: 0.9rem; color: var(--ink-muted); margin-bottom: 24px; }

.section-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--ink-primary);
  margin: 28px 0 12px 0;
  border-left: 4px solid var(--good);
  padding-left: 8px;
}

.metric-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
@media (min-width: 900px) { .metric-grid { grid-template-columns: repeat(4, 1fr); } }
.metric-card { background: #ffffff; border: 1px solid var(--grid); border-radius: 10px; padding: 12px 14px; }
.metric-label { font-size: 0.72rem; color: var(--ink-muted); margin-bottom: 6px; }
.metric-value { font-size: 1.15rem; font-weight: 700; }

.chart-block { background: #ffffff; border: 1px solid var(--grid); border-radius: 10px; padding: 8px; margin-bottom: 16px; overflow-x: auto; }

.table-toolbar { display: flex; justify-content: flex-end; margin-bottom: 8px; }
.table-toolbar input[type="search"] { padding: 6px 10px; border: 1px solid var(--grid); border-radius: 6px; font-family: var(--font-family); width: 220px; }

.table-scroll { overflow-x: auto; border: 1px solid var(--grid); border-radius: 10px; max-height: 480px; overflow-y: auto; }
table.trade-table { width: 100%; border-collapse: collapse; font-size: 0.8rem; white-space: nowrap; }
table.trade-table thead th {
  position: sticky; top: 0; background: var(--surface); color: var(--ink-muted);
  text-align: left; padding: 8px 10px; border-bottom: 1px solid var(--grid);
  cursor: pointer; user-select: none;
}
table.trade-table thead th:hover { color: var(--ink-primary); }
table.trade-table tbody td { padding: 7px 10px; border-bottom: 1px solid var(--grid); color: var(--ink-secondary); }
.empty-note { color: var(--ink-muted); font-size: 0.9rem; }

.tabs { display: flex; gap: 4px; margin-bottom: 16px; border-bottom: 1px solid var(--grid); }
.tab-button {
  padding: 8px 16px; border: none; background: none; font-family: var(--font-family);
  font-size: 0.9rem; color: var(--ink-muted); cursor: pointer; border-bottom: 2px solid transparent;
}
.tab-button.active { color: var(--ink-primary); border-bottom-color: var(--good); font-weight: 600; }
.tab-panel { display: none; }
.tab-panel.active { display: block; }

.form-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 12px; }
@media (max-width: 720px) { .form-grid { grid-template-columns: 1fr; } }
.form-field label { display: block; font-size: 0.78rem; color: var(--ink-muted); margin-bottom: 4px; }
.form-field input, .form-field select { width: 100%; padding: 8px; border: 1px solid var(--grid); border-radius: 6px; font-family: var(--font-family); }

.btn { padding: 9px 18px; border-radius: 6px; border: 1px solid var(--grid); background: #ffffff; font-family: var(--font-family); font-size: 0.85rem; cursor: pointer; }
.btn-primary { background: var(--good); color: #ffffff; border-color: var(--good); }
.btn-danger { background: var(--critical); color: #ffffff; border-color: var(--critical); }
.btn-block { width: 100%; }
.btn + .btn { margin-left: 8px; }

.alert { padding: 10px 14px; border-radius: 6px; font-size: 0.85rem; margin: 10px 0; }
.alert-error { background: var(--critical-fill); color: var(--critical); border: 1px solid var(--critical); }
.alert-success { background: var(--good-fill); color: var(--good); border: 1px solid var(--good); }
.alert-warning { background: #fdf3e0; color: #9a6b00; border: 1px solid #e8c27a; }
```

- [ ] **Step 5: 建立骨架版 `index.html`**

```html
<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>交易績效追蹤與多策略分析系統</title>
<link rel="stylesheet" href="css/style.css">
</head>
<body>
<div id="app-root">
  <p style="padding:24px;">頁面建置中...（將於 Task 9 完成組裝）</p>
</div>
</body>
</html>
```

- [ ] **Step 6: 手動驗證**

雙擊 `index.html`（或用瀏覽器開啟該檔案路徑），確認：
1. 頁面背景是淺米白色（`#fcfcfb`），代表 CSS 有正確載入。
2. 瀏覽器開發者工具 Console 沒有任何 404 或錯誤。
3. 頁面顯示「頁面建置中...」文字。

- [ ] **Step 7: Commit**

```bash
git add lib/plotly.min.js lib/plotly-source.js css/style.css index.html
git commit -m "$(cat <<'EOF'
Scaffold: 建立純網頁版專案骨架與 Plotly.js 入庫

新增目錄結構、vendored Plotly.js 2.35.2（含供報告內嵌用的 JS 字串版本）、
共用設計系統 CSS，以及骨架版 index.html，作為後續模組開發的基礎。

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: 核心計算邏輯 — `timeSeries.js` / `metrics.js`

**Files:**
- Create: `js/config.js`
- Create: `js/timeSeries.js`
- Create: `js/metrics.js`
- Create: `tests/test_logic.html`

**Interfaces:**
- Consumes: 無（本任務是最底層的純邏輯模組）
- Produces:
  - `TPT.config.INITIAL_CAPITAL`（number）, `TPT.config.RISK_FREE_RATE`（number）
  - `TPT.timeSeries.generateTradeEquityCurve(trades: Array<{trade_id, buy_date, sell_date, net_return_pct, net_profit_loss}>) => Array<{trade_id, buy_date, sell_date, return_pct, nav, cum_return}>`
  - `TPT.metrics.calculateMetrics(trades: Array<Trade>, equityCurve: Array<EquityPoint>) => {total_trades, total_pnl, avg_monthly_return, avg_trade_return, max_drawdown, worst_single_trade_return, sharpe_ratio, calmar_ratio}`

- [ ] **Step 1: 建立 `js/config.js`**

```js
window.TPT = window.TPT || {};

TPT.config = {
  INITIAL_CAPITAL: 1000000.0,
  RISK_FREE_RATE: 0.02
};
```

- [ ] **Step 2: 建立 `js/timeSeries.js`**

```js
window.TPT = window.TPT || {};

TPT.timeSeries = (function () {
  function generateTradeEquityCurve(trades) {
    if (!trades || trades.length === 0) return [];

    const sorted = [...trades].sort((a, b) => new Date(a.buy_date) - new Date(b.buy_date));

    let nav = TPT.config.INITIAL_CAPITAL;
    return sorted.map(t => {
      const returnPct = t.net_return_pct / 100.0;
      nav = nav * (1.0 + returnPct);
      const cumReturn = nav / TPT.config.INITIAL_CAPITAL - 1.0;
      return {
        trade_id: t.trade_id,
        buy_date: t.buy_date,
        sell_date: t.sell_date,
        return_pct: returnPct,
        nav: nav,
        cum_return: cumReturn
      };
    });
  }

  return { generateTradeEquityCurve };
})();
```

- [ ] **Step 3: 建立 `js/metrics.js`**

```js
window.TPT = window.TPT || {};

TPT.metrics = (function () {
  function calculateMetrics(trades, equityCurve) {
    const result = {
      total_trades: 0,
      total_pnl: 0.0,
      avg_monthly_return: 0.0,
      avg_trade_return: 0.0,
      max_drawdown: 0.0,
      worst_single_trade_return: 0.0,
      sharpe_ratio: 0.0,
      calmar_ratio: 0.0
    };

    if (!trades || trades.length === 0 || !equityCurve || equityCurve.length === 0) {
      return result;
    }

    result.total_trades = trades.length;
    result.total_pnl = trades.reduce((sum, t) => sum + t.net_profit_loss, 0);

    const returns = equityCurve.map(e => e.return_pct);
    result.avg_trade_return = returns.reduce((a, b) => a + b, 0) / returns.length;

    const minTradeReturn = Math.min(...trades.map(t => t.net_return_pct));
    result.worst_single_trade_return = minTradeReturn < 0 ? minTradeReturn / 100.0 : 0.0;

    const buyTimes = trades.map(t => new Date(t.buy_date).getTime());
    const sellTimes = trades.map(t => new Date(t.sell_date).getTime());
    const totalDays = Math.max(Math.round((Math.max(...sellTimes) - Math.min(...buyTimes)) / 86400000), 1);

    const finalNav = equityCurve[equityCurve.length - 1].nav;
    const totalReturn = finalNav / TPT.config.INITIAL_CAPITAL - 1.0;
    const annualReturn = Math.pow(1.0 + totalReturn, 365.25 / totalDays) - 1.0;

    result.avg_monthly_return = Math.pow(1.0 + annualReturn, 1.0 / 12.0) - 1.0;

    let runningMax = -Infinity;
    let maxDrawdown = 0.0;
    for (const point of equityCurve) {
      runningMax = Math.max(runningMax, point.nav);
      const drawdown = (point.nav - runningMax) / runningMax;
      if (drawdown < maxDrawdown) maxDrawdown = drawdown;
    }
    result.max_drawdown = maxDrawdown;

    if (returns.length > 1) {
      const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
      const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (returns.length - 1);
      const stdDev = Math.sqrt(variance);
      const periodsPerYear = returns.length / (totalDays / 365.25);
      const annualVol = stdDev * Math.sqrt(periodsPerYear);
      if (annualVol > 0.0001) {
        result.sharpe_ratio = (annualReturn - TPT.config.RISK_FREE_RATE) / annualVol;
      }
    }

    if (Math.abs(result.max_drawdown) > 0) {
      result.calmar_ratio = annualReturn / Math.abs(result.max_drawdown);
    }

    return result;
  }

  return { calculateMetrics };
})();
```

- [ ] **Step 4: 建立 `tests/test_logic.html`**

參考數值來自實際執行現有 Python 版 `test_analyzer.py` 的精確輸出（已於規劃階段用相同 mock 資料驗證過）。

```html
<!doctype html>
<html lang="zh-Hant">
<head><meta charset="utf-8"><title>核心邏輯測試</title></head>
<body>
<h1>核心計算邏輯測試</h1>
<div id="results"></div>
<script src="../js/config.js"></script>
<script src="../js/timeSeries.js"></script>
<script src="../js/metrics.js"></script>
<script>
const results = [];
function assertClose(name, actual, expected, tolerance) {
  tolerance = tolerance === undefined ? 1e-6 : tolerance;
  const pass = Math.abs(actual - expected) < tolerance;
  results.push({ name, pass, actual, expected });
}
function assertEqual(name, actual, expected) {
  results.push({ name, pass: actual === expected, actual, expected });
}

const mockTrades = [
  { trade_id: 'T001', strategy_name: 'StratA', version: 'v1.0', buy_date: '2026-01-12', sell_date: '2026-01-20', net_return_pct: 6.0, net_profit_loss: 60000.0 },
  { trade_id: 'T002', strategy_name: 'StratA', version: 'v1.0', buy_date: '2026-02-11', sell_date: '2026-03-10', net_return_pct: -2.0, net_profit_loss: -20000.0 },
  { trade_id: 'T003', strategy_name: 'StratA', version: 'v1.0', buy_date: '2026-03-11', sell_date: '2026-03-25', net_return_pct: 3.0, net_profit_loss: 30000.0 }
];

const equity = TPT.timeSeries.generateTradeEquityCurve(mockTrades);
assertEqual('equity curve length', equity.length, 3);
assertClose('T001 nav', equity[0].nav, 1060000.0, 0.01);
assertClose('T002 nav', equity[1].nav, 1038800.0, 0.01);
assertClose('T003 nav', equity[2].nav, 1069964.0, 0.01);
assertClose('T003 cum_return', equity[2].cum_return, 0.06996399999999992, 1e-6);

const metrics = TPT.metrics.calculateMetrics(mockTrades, equity);
assertEqual('total_trades', metrics.total_trades, 3);
assertClose('total_pnl', metrics.total_pnl, 70000.0, 0.01);
assertClose('avg_trade_return', metrics.avg_trade_return, 0.02333333333333333, 1e-9);
assertClose('worst_single_trade_return', metrics.worst_single_trade_return, -0.02, 1e-9);
assertClose('max_drawdown', metrics.max_drawdown, -0.02, 1e-9);
assertClose('avg_monthly_return', metrics.avg_monthly_return, 0.029000559332193143, 1e-9);
assertClose('sharpe_ratio', metrics.sharpe_ratio, 2.4688751812902856, 1e-6);
assertClose('calmar_ratio', metrics.calmar_ratio, 20.4623842348609, 1e-4);

const emptyEquity = TPT.timeSeries.generateTradeEquityCurve([]);
assertEqual('empty equity curve length', emptyEquity.length, 0);
const emptyMetrics = TPT.metrics.calculateMetrics([], []);
assertEqual('empty metrics total_trades', emptyMetrics.total_trades, 0);

const resultsEl = document.getElementById('results');
let allPass = true;
results.forEach(r => {
  if (!r.pass) allPass = false;
  const line = document.createElement('div');
  line.style.color = r.pass ? 'green' : 'red';
  line.textContent = `[${r.pass ? 'PASS' : 'FAIL'}] ${r.name} (actual=${r.actual}, expected=${r.expected})`;
  resultsEl.appendChild(line);
});
const summary = document.createElement('h2');
summary.textContent = allPass ? '全部通過 ✅' : '有測試失敗 ❌';
summary.style.color = allPass ? 'green' : 'red';
resultsEl.prepend(summary);
</script>
</body>
</html>
```

- [ ] **Step 5: 執行測試**

雙擊開啟 `tests/test_logic.html`。

Expected: 頁面標題顯示「全部通過 ✅」，所有行都是綠色 `[PASS]`。

- [ ] **Step 6: Commit**

```bash
git add js/config.js js/timeSeries.js js/metrics.js tests/test_logic.html
git commit -m "$(cat <<'EOF'
Feat: 移植權益曲線與績效指標核心計算邏輯到 JS

將 analyzer/time_series.py、analyzer/metrics.py 逐公式移植為
js/timeSeries.js、js/metrics.js，並以現有 test_analyzer.py 的
Python 輸出數值作為精確參考值撰寫瀏覽器測試頁驗證一致性。

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: IndexedDB CRUD 封裝 — `db.js`

**Files:**
- Create: `js/db.js`
- Create: `tests/test_db.html`

**Interfaces:**
- Consumes: 無
- Produces:
  - `TPT.db.openDatabase() => Promise<IDBDatabase>`
  - `TPT.db.getAllTrades() => Promise<Array<Trade>>`
  - `TPT.db.addTrade(trade) => Promise<void>`（`trade_id` 已存在時 reject）
  - `TPT.db.updateTrade(trade) => Promise<void>`
  - `TPT.db.deleteTrade(tradeId) => Promise<void>`
  - `TPT.db.getSetting(key) => Promise<any>`
  - `TPT.db.setSetting(key, value) => Promise<void>`

- [ ] **Step 1: 建立 `js/db.js`**

```js
window.TPT = window.TPT || {};

TPT.db = (function () {
  const DB_NAME = 'trading_tracker';
  const DB_VERSION = 1;
  let dbPromise = null;

  function openDatabase() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('trades')) {
          db.createObjectStore('trades', { keyPath: 'trade_id' });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };
      request.onsuccess = (event) => resolve(event.target.result);
      request.onerror = (event) => reject(event.target.error);
    });
    return dbPromise;
  }

  async function getAllTrades() {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('trades', 'readonly');
      const request = tx.objectStore('trades').getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function addTrade(trade) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('trades', 'readwrite');
      const request = tx.objectStore('trades').add(trade);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async function updateTrade(trade) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('trades', 'readwrite');
      const request = tx.objectStore('trades').put(trade);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async function deleteTrade(tradeId) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('trades', 'readwrite');
      const request = tx.objectStore('trades').delete(tradeId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async function getSetting(key) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('settings', 'readonly');
      const request = tx.objectStore('settings').get(key);
      request.onsuccess = () => resolve(request.result ? request.result.value : undefined);
      request.onerror = () => reject(request.error);
    });
  }

  async function setSetting(key, value) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('settings', 'readwrite');
      const request = tx.objectStore('settings').put({ key, value });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  return { openDatabase, getAllTrades, addTrade, updateTrade, deleteTrade, getSetting, setSetting };
})();
```

- [ ] **Step 2: 建立 `tests/test_db.html`**

測試會在真實 IndexedDB 中寫入一筆帶有明顯測試標記的資料（`__TEST_TRADE_001__`），並在 `finally` 區塊中無論成敗都清除，避免污染之後 Task 9 會用到的真實資料。

```html
<!doctype html>
<html lang="zh-Hant">
<head><meta charset="utf-8"><title>DB 測試</title></head>
<body>
<h1>IndexedDB CRUD 測試</h1>
<div id="results"></div>
<script src="../js/config.js"></script>
<script src="../js/db.js"></script>
<script>
const TEST_ID = '__TEST_TRADE_001__';
const results = [];
function record(name, pass) { results.push({ name, pass }); }

async function runTests() {
  try {
    await TPT.db.deleteTrade(TEST_ID).catch(() => {});

    await TPT.db.addTrade({
      trade_id: TEST_ID, strategy_name: 'TestStrat', version: 'v1.0',
      buy_date: '2026-01-01', sell_date: '2026-01-05',
      net_return_pct: 1.5, net_profit_loss: 15000
    });
    let all = await TPT.db.getAllTrades();
    let found = all.find(t => t.trade_id === TEST_ID);
    record('新增後可讀取', !!found && found.net_return_pct === 1.5);

    let addAgainFailed = false;
    try {
      await TPT.db.addTrade({
        trade_id: TEST_ID, strategy_name: 'Dup', version: 'v1.0',
        buy_date: '2026-01-01', sell_date: '2026-01-05',
        net_return_pct: 0, net_profit_loss: 0
      });
    } catch (e) {
      addAgainFailed = true;
    }
    record('重複編號新增應失敗', addAgainFailed);

    await TPT.db.updateTrade({
      trade_id: TEST_ID, strategy_name: 'TestStrat', version: 'v1.1',
      buy_date: '2026-01-01', sell_date: '2026-01-05',
      net_return_pct: 3.0, net_profit_loss: 30000
    });
    all = await TPT.db.getAllTrades();
    found = all.find(t => t.trade_id === TEST_ID);
    record('修改後資料更新', found && found.version === 'v1.1' && found.net_return_pct === 3.0);

    await TPT.db.deleteTrade(TEST_ID);
    all = await TPT.db.getAllTrades();
    found = all.find(t => t.trade_id === TEST_ID);
    record('刪除後資料消失', !found);

    await TPT.db.setSetting('test_key', { foo: 'bar' });
    const settingValue = await TPT.db.getSetting('test_key');
    record('settings 讀寫正常', settingValue && settingValue.foo === 'bar');
  } catch (err) {
    record('測試流程未預期中斷: ' + err.message, false);
  } finally {
    await TPT.db.deleteTrade(TEST_ID).catch(() => {});
  }

  const resultsEl = document.getElementById('results');
  let allPass = true;
  results.forEach(r => {
    if (!r.pass) allPass = false;
    const line = document.createElement('div');
    line.style.color = r.pass ? 'green' : 'red';
    line.textContent = `[${r.pass ? 'PASS' : 'FAIL'}] ${r.name}`;
    resultsEl.appendChild(line);
  });
  const summary = document.createElement('h2');
  summary.textContent = allPass ? '全部通過 ✅' : '有測試失敗 ❌';
  summary.style.color = allPass ? 'green' : 'red';
  resultsEl.prepend(summary);
}

runTests();
</script>
</body>
</html>
```

- [ ] **Step 3: 執行測試**

雙擊開啟 `tests/test_db.html`。

Expected: 顯示「全部通過 ✅」，5 個項目都是綠色 PASS。

- [ ] **Step 4: Commit**

```bash
git add js/db.js tests/test_db.html
git commit -m "$(cat <<'EOF'
Feat: 新增 IndexedDB CRUD 封裝取代 SQLite DBManager

js/db.js 提供 Promise 化的 trades 物件存放區 CRUD，以及供備份功能
使用的 settings 存放區，取代 database/db_manager.py 的角色。

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: 自動備份（File System Access API）與手動匯出/匯入 — `backup.js`

**Files:**
- Create: `js/backup.js`
- Create: `tests/test_backup.html`

**Interfaces:**
- Consumes: `TPT.db.getSetting`, `TPT.db.setSetting`（Task 3）
- Produces:
  - `TPT.backup.isFileSystemAccessSupported() => boolean`
  - `TPT.backup.chooseBackupFile() => Promise<FileSystemFileHandle>`
  - `TPT.backup.getConfiguredHandle() => Promise<FileSystemFileHandle|null>`
  - `TPT.backup.writeIfConfigured(trades) => Promise<{written: boolean, reason?: string}>`
  - `TPT.backup.exportJson(trades) => void`（觸發瀏覽器下載）
  - `TPT.backup.importJsonFile(file) => Promise<Array<Trade>>`

- [ ] **Step 1: 建立 `js/backup.js`**

```js
window.TPT = window.TPT || {};

TPT.backup = (function () {
  const HANDLE_KEY = 'backupFileHandle';

  function isFileSystemAccessSupported() {
    return typeof window.showSaveFilePicker === 'function';
  }

  async function chooseBackupFile() {
    if (!isFileSystemAccessSupported()) {
      throw new Error('此瀏覽器不支援自動備份功能，請改用手動匯出。');
    }
    const handle = await window.showSaveFilePicker({
      suggestedName: 'trades_backup.json',
      types: [{ description: 'JSON 檔案', accept: { 'application/json': ['.json'] } }]
    });
    await TPT.db.setSetting(HANDLE_KEY, handle);
    return handle;
  }

  async function getConfiguredHandle() {
    if (!isFileSystemAccessSupported()) return null;
    const handle = await TPT.db.getSetting(HANDLE_KEY);
    return handle || null;
  }

  async function ensurePermission(handle) {
    const opts = { mode: 'readwrite' };
    if ((await handle.queryPermission(opts)) === 'granted') return true;
    if ((await handle.requestPermission(opts)) === 'granted') return true;
    return false;
  }

  async function writeIfConfigured(trades) {
    const handle = await getConfiguredHandle();
    if (!handle) return { written: false, reason: 'not_configured' };
    let granted;
    try {
      granted = await ensurePermission(handle);
    } catch (err) {
      return { written: false, reason: 'permission_error' };
    }
    if (!granted) return { written: false, reason: 'permission_denied' };
    const writable = await handle.createWritable();
    await writable.write(JSON.stringify(trades, null, 2));
    await writable.close();
    return { written: true };
  }

  function exportJson(trades) {
    const blob = new Blob([JSON.stringify(trades, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const timestamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
    a.href = url;
    a.download = `trades_export_${timestamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function importJsonFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          if (!Array.isArray(data)) throw new Error('檔案格式錯誤：預期為交易陣列');
          resolve(data);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }

  return { isFileSystemAccessSupported, chooseBackupFile, getConfiguredHandle, writeIfConfigured, exportJson, importJsonFile };
})();
```

- [ ] **Step 2: 建立 `tests/test_backup.html`（手動測試頁）**

File System Access API 需要真實使用者手勢與檔案總管互動，無法寫成全自動斷言測試，因此本頁是操作型測試工具。

```html
<!doctype html>
<html lang="zh-Hant">
<head><meta charset="utf-8"><title>備份功能手動測試</title></head>
<body>
<h1>備份功能手動測試（需要手動點擊操作）</h1>
<p>File System Access API 需要真實使用者手勢與檔案總管互動，無法自動化，請依序點擊下方按鈕並觀察結果。</p>
<button id="btn-support">1. 檢查瀏覽器支援度</button>
<pre id="out-support"></pre>
<button id="btn-choose">2. 選擇備份檔案</button>
<pre id="out-choose"></pre>
<button id="btn-write">3. 寫入測試資料到備份檔</button>
<pre id="out-write"></pre>
<button id="btn-export">4. 手動匯出 JSON（應觸發下載）</button>
<hr>
<p>5. 手動匯入測試：</p>
<input type="file" id="file-import" accept=".json">
<pre id="out-import"></pre>

<script src="../js/config.js"></script>
<script src="../js/db.js"></script>
<script src="../js/backup.js"></script>
<script>
const fixture = [
  { trade_id: 'BKTEST01', strategy_name: 'Backup Test', version: 'v1.0', buy_date: '2026-01-01', sell_date: '2026-01-05', net_return_pct: 1.0, net_profit_loss: 1000 }
];

document.getElementById('btn-support').onclick = () => {
  document.getElementById('out-support').textContent = 'supported: ' + TPT.backup.isFileSystemAccessSupported();
};

document.getElementById('btn-choose').onclick = async () => {
  try {
    await TPT.backup.chooseBackupFile();
    document.getElementById('out-choose').textContent = '已選定備份檔案。';
  } catch (e) {
    document.getElementById('out-choose').textContent = '錯誤: ' + e.message;
  }
};

document.getElementById('btn-write').onclick = async () => {
  const result = await TPT.backup.writeIfConfigured(fixture);
  document.getElementById('out-write').textContent = JSON.stringify(result) + ' — 請打開你選的檔案確認內容為 fixture JSON';
};

document.getElementById('btn-export').onclick = () => {
  TPT.backup.exportJson(fixture);
};

document.getElementById('file-import').onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const data = await TPT.backup.importJsonFile(file);
    document.getElementById('out-import').textContent = JSON.stringify(data, null, 2);
  } catch (err) {
    document.getElementById('out-import').textContent = '錯誤: ' + err.message;
  }
};
</script>
</body>
</html>
```

- [ ] **Step 3: 手動執行測試**

雙擊開啟 `tests/test_backup.html`，依序：
1. 點「1. 檢查瀏覽器支援度」→ Chrome/Edge 應顯示 `supported: true`。
2. 點「2. 選擇備份檔案」→ 應跳出系統檔案儲存對話框，選一個路徑存成 `test_backup.json`。
3. 點「3. 寫入測試資料到備份檔」→ 顯示 `{"written":true}`；打開 `test_backup.json` 確認內容是 fixture 陣列。
4. 點「4. 手動匯出 JSON」→ 瀏覽器應觸發下載一個 `trades_export_*.json` 檔案。
5. 選取剛下載的檔案 → 下方應顯示解析出的 fixture JSON 內容。

若瀏覽器不支援（如 Firefox），步驟 2、3 應該顯示清楚的錯誤訊息而不是白畫面例外，步驟 4、5（手動匯出/匯入）仍須正常運作。

- [ ] **Step 4: Commit**

```bash
git add js/backup.js tests/test_backup.html
git commit -m "$(cat <<'EOF'
Feat: 新增自動備份（File System Access API）與手動匯出/匯入 JSON

js/backup.js 提供三層備份機制：選定本機檔案後每次異動自動覆寫、
手動匯出時間戳記快照、以及匯入 JSON 還原資料，取代原本鎖在
SQLite 檔案裡、無備份機制的資料儲存方式。

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: 圖表建構 — `charts.js`

**Files:**
- Create: `js/charts.js`
- Create: `tests/test_charts.html`

**Interfaces:**
- Consumes: 無（純函式，輸入交易陣列）
- Produces:
  - `TPT.chartTokens`（顏色/字型常數物件，Task 6/8 會重用）
  - `TPT.charts.buildReturnsChart(trades) => {data: Array, layout: Object}`
  - `TPT.charts.buildCumPnlChart(trades) => {data: Array, layout: Object}`

- [ ] **Step 1: 建立 `js/charts.js`**

```js
window.TPT = window.TPT || {};

TPT.chartTokens = {
  SURFACE: '#fcfcfb',
  INK_PRIMARY: '#0b0b0b',
  INK_SECONDARY: '#52514e',
  INK_MUTED: '#898781',
  GRID: '#e1e0d9',
  BASELINE: '#c3c2b7',
  GOOD: '#0ca30c',
  CRITICAL: '#d03b3b',
  GOOD_FILL: 'rgba(12, 163, 12, 0.10)',
  CRITICAL_FILL: 'rgba(208, 59, 59, 0.10)',
  FONT_FAMILY: "system-ui, -apple-system, 'Segoe UI', sans-serif"
};

TPT.charts = (function () {
  const T = TPT.chartTokens;
  const LEGEND_STYLE = { orientation: 'h', yanchor: 'bottom', y: 1.02, xanchor: 'right', x: 1, bgcolor: 'rgba(0,0,0,0)', bordercolor: 'rgba(0,0,0,0)' };
  const HOVERLABEL_STYLE = { bgcolor: T.SURFACE, bordercolor: T.GRID, font: { family: T.FONT_FAMILY, size: 12, color: T.INK_PRIMARY } };

  function buildStemSegments(xVals, yVals, mask) {
    const xs = [], ys = [];
    for (let i = 0; i < xVals.length; i++) {
      if (mask[i]) {
        xs.push(xVals[i], xVals[i], null);
        ys.push(0, yVals[i], null);
      }
    }
    return { xs, ys };
  }

  function splitAtZero(xVals, yVals) {
    const segments = [];
    let curX = [xVals[0]], curY = [yVals[0]];
    let curSign = yVals[0] >= 0;
    for (let i = 1; i < xVals.length; i++) {
      const x0 = xVals[i - 1], y0 = yVals[i - 1];
      const x1 = xVals[i], y1 = yVals[i];
      const sign1 = y1 >= 0;
      if (sign1 !== curSign && y1 !== y0) {
        const frac = (0 - y0) / (y1 - y0);
        const crossX = new Date(x0.getTime() + frac * (x1.getTime() - x0.getTime()));
        curX.push(crossX); curY.push(0.0);
        segments.push({ x: curX, y: curY, sign: curSign });
        curX = [crossX]; curY = [0.0];
        curSign = sign1;
      }
      curX.push(x1); curY.push(y1);
    }
    segments.push({ x: curX, y: curY, sign: curSign });
    return segments;
  }

  function buildReturnsChart(trades) {
    if (!trades || trades.length === 0) {
      return { data: [], layout: { title: '暫無交易數據可繪製圖表' } };
    }
    const xVals = trades.map(t => new Date(t.sell_date));
    const yData = trades.map(t => t.net_return_pct);
    const gainMask = yData.map(v => v >= 0);
    const lossMask = gainMask.map(v => !v);

    const gainSeg = buildStemSegments(xVals, yData, gainMask);
    const lossSeg = buildStemSegments(xVals, yData, lossMask);
    const markerColors = yData.map(v => v >= 0 ? T.GOOD : T.CRITICAL);

    let maxIdx = 0, minIdx = 0;
    yData.forEach((v, i) => {
      if (v > yData[maxIdx]) maxIdx = i;
      if (v < yData[minIdx]) minIdx = i;
    });

    const fmtPct = v => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;
    const annotations = [{
      x: xVals[maxIdx], y: yData[maxIdx], text: `<b>${fmtPct(yData[maxIdx])}</b>`,
      showarrow: false, yshift: 16, font: { color: T.INK_PRIMARY, size: 12, family: T.FONT_FAMILY }
    }];
    if (minIdx !== maxIdx) {
      annotations.push({
        x: xVals[minIdx], y: yData[minIdx], text: `<b>${fmtPct(yData[minIdx])}</b>`,
        showarrow: false, yshift: -16, font: { color: T.INK_PRIMARY, size: 12, family: T.FONT_FAMILY }
      });
    }

    const xTimes = xVals.map(d => d.getTime());
    const xMin = new Date(Math.min(...xTimes));
    const xMax = new Date(Math.max(...xTimes));
    const padMs = Math.max((xMax - xMin) * 0.03, 2 * 86400000);
    const xRangeMin = new Date(xMin.getTime() - padMs);
    const xRangeMax = new Date(xMax.getTime() + padMs);

    const data = [
      { x: gainSeg.xs, y: gainSeg.ys, mode: 'lines', name: '獲利交易', line: { color: T.GOOD, width: 2 }, hoverinfo: 'skip' },
      { x: lossSeg.xs, y: lossSeg.ys, mode: 'lines', name: '虧損交易', line: { color: T.CRITICAL, width: 2 }, hoverinfo: 'skip' },
      {
        x: xVals, y: yData, mode: 'markers',
        customdata: trades.map(t => [t.trade_id, t.strategy_name]),
        marker: { size: 10, color: markerColors, line: { width: 2, color: T.SURFACE } },
        hovertemplate: '<b>交易編號:</b> %{customdata[0]}<br><b>策略:</b> %{customdata[1]}<br><b>平倉日期:</b> %{x|%Y-%m-%d}<br><b>結算損益:</b> %{y:+.2f}%<extra></extra>',
        showlegend: false
      }
    ];

    const layout = {
      height: 400,
      margin: { l: 60, r: 30, t: 40, b: 40 },
      hovermode: 'closest',
      plot_bgcolor: T.SURFACE,
      paper_bgcolor: 'rgba(0,0,0,0)',
      font: { family: T.FONT_FAMILY, color: T.INK_SECONDARY },
      legend: LEGEND_STYLE,
      hoverlabel: HOVERLABEL_STYLE,
      annotations,
      shapes: [{ type: 'line', x0: xRangeMin, x1: xRangeMax, y0: 0, y1: 0, line: { color: T.BASELINE, width: 1 } }],
      xaxis: { range: [xRangeMin, xRangeMax], showgrid: true, gridcolor: T.GRID, linecolor: T.BASELINE, mirror: true, zeroline: false },
      yaxis: { title: '單次結算報酬率 (%)', showgrid: true, gridcolor: T.GRID, linecolor: T.BASELINE, mirror: true, zeroline: false }
    };

    return { data, layout };
  }

  function buildCumPnlChart(trades) {
    if (!trades || trades.length === 0) {
      return { data: [], layout: { title: '暫無數據可繪製累積損益曲線' } };
    }
    const sorted = [...trades].sort((a, b) => new Date(a.sell_date) - new Date(b.sell_date));
    let cum = 0;
    const xVals = [], yVals = [];
    sorted.forEach(t => {
      cum += t.net_profit_loss;
      xVals.push(new Date(t.sell_date));
      yVals.push(cum);
    });

    const segments = splitAtZero(xVals, yVals);
    const data = [];
    segments.forEach(seg => {
      const color = seg.sign ? T.GOOD : T.CRITICAL;
      const fillColor = seg.sign ? T.GOOD_FILL : T.CRITICAL_FILL;
      data.push({ x: seg.x, y: seg.y, mode: 'lines', line: { color, width: 2 }, fill: 'tozeroy', fillcolor: fillColor, hoverinfo: 'skip', showlegend: false });
    });

    data.push({ x: [null], y: [null], mode: 'lines', name: '獲利區間', line: { color: T.GOOD, width: 2 } });
    data.push({ x: [null], y: [null], mode: 'lines', name: '虧損區間', line: { color: T.CRITICAL, width: 2 } });

    const markerColors = yVals.map(v => v >= 0 ? T.GOOD : T.CRITICAL);
    data.push({
      x: xVals, y: yVals, mode: 'markers',
      marker: { size: 9, color: markerColors, line: { width: 2, color: T.SURFACE } },
      customdata: sorted.map(t => [t.trade_id, t.net_profit_loss]),
      hovertemplate: '<b>平倉日期:</b> %{x|%Y-%m-%d}<br><b>累積損益:</b> $%{y:+,.0f} 元<br><b>交易編號:</b> %{customdata[0]}<br><b>本筆損益:</b> $%{customdata[1]:+,.0f} 元<extra></extra>',
      showlegend: false
    });

    const xTimes = xVals.map(d => d.getTime());
    const xMin = new Date(Math.min(...xTimes));
    const xMax = new Date(Math.max(...xTimes));
    const padMs = Math.max((xMax - xMin) * 0.05, 2 * 86400000);
    const xRangeMin = new Date(xMin.getTime() - padMs);
    const xRangeMax = new Date(xMax.getTime() + padMs);

    const lastX = xVals[xVals.length - 1];
    const lastY = yVals[yVals.length - 1];
    const sign = lastY >= 0 ? '+' : '-';
    const lastLabel = `<b>$${sign}${Math.round(Math.abs(lastY)).toLocaleString('en-US')}</b>`;

    const layout = {
      height: 350,
      margin: { l: 60, r: 30, t: 40, b: 40 },
      hovermode: 'closest',
      plot_bgcolor: T.SURFACE,
      paper_bgcolor: 'rgba(0,0,0,0)',
      font: { family: T.FONT_FAMILY, color: T.INK_SECONDARY },
      legend: LEGEND_STYLE,
      hoverlabel: HOVERLABEL_STYLE,
      shapes: [{ type: 'line', x0: xRangeMin, x1: xRangeMax, y0: 0, y1: 0, line: { color: T.BASELINE, width: 1 } }],
      annotations: [{ x: lastX, y: lastY, text: lastLabel, showarrow: false, xanchor: 'left', xshift: 14, font: { color: T.INK_PRIMARY, size: 13, family: T.FONT_FAMILY } }],
      xaxis: { range: [xRangeMin, xRangeMax], showgrid: true, gridcolor: T.GRID, linecolor: T.BASELINE, mirror: true, zeroline: false },
      yaxis: { title: '累積損益金額 (元)', showgrid: true, gridcolor: T.GRID, linecolor: T.BASELINE, mirror: true, zeroline: false }
    };

    return { data, layout };
  }

  return { buildReturnsChart, buildCumPnlChart };
})();
```

- [ ] **Step 2: 建立 `tests/test_charts.html`**

```html
<!doctype html>
<html lang="zh-Hant">
<head><meta charset="utf-8"><title>圖表測試</title></head>
<body>
<h1>圖表建構測試</h1>
<div id="assert-results"></div>
<h2>單筆結算報酬率</h2>
<div id="chart1" style="width:800px;"></div>
<h2>累積損益曲線</h2>
<div id="chart2" style="width:800px;"></div>

<script src="../lib/plotly.min.js"></script>
<script src="../js/charts.js"></script>
<script>
const fixture = [
  { trade_id: 'T001', strategy_name: 'StratA', buy_date: '2026-01-12', sell_date: '2026-01-20', net_return_pct: 6.0, net_profit_loss: 60000.0 },
  { trade_id: 'T002', strategy_name: 'StratA', buy_date: '2026-02-11', sell_date: '2026-03-10', net_return_pct: -2.0, net_profit_loss: -20000.0 },
  { trade_id: 'T003', strategy_name: 'StratA', buy_date: '2026-03-11', sell_date: '2026-03-25', net_return_pct: 3.0, net_profit_loss: 30000.0 }
];

const results = [];
function record(name, pass) { results.push({ name, pass }); }

const returnsFig = TPT.charts.buildReturnsChart(fixture);
record('returns chart 有 3 條 trace（gain/loss/markers）', returnsFig.data.length === 3);
record('returns chart 的 markers trace 有 3 個點', returnsFig.data[2].x.length === 3);

const cumFig = TPT.charts.buildCumPnlChart(fixture);
record('cum pnl chart 的最後一條 trace（markers）有 3 個點', cumFig.data[cumFig.data.length - 1].x.length === 3);

Plotly.newPlot('chart1', returnsFig.data, returnsFig.layout, { responsive: true, displaylogo: false });
Plotly.newPlot('chart2', cumFig.data, cumFig.layout, { responsive: true, displaylogo: false });

const emptyFig = TPT.charts.buildReturnsChart([]);
record('空交易陣列 returns chart 無資料 trace', emptyFig.data.length === 0);

const resultsEl = document.getElementById('assert-results');
let allPass = true;
results.forEach(r => {
  if (!r.pass) allPass = false;
  const line = document.createElement('div');
  line.style.color = r.pass ? 'green' : 'red';
  line.textContent = `[${r.pass ? 'PASS' : 'FAIL'}] ${r.name}`;
  resultsEl.appendChild(line);
});
const summary = document.createElement('h3');
summary.textContent = allPass
  ? '結構性測試全部通過 ✅（請再肉眼確認下方兩張圖表顯示正常、顏色與 hover 正確）'
  : '有測試失敗 ❌';
summary.style.color = allPass ? 'green' : 'red';
resultsEl.prepend(summary);
</script>
</body>
</html>
```

- [ ] **Step 3: 執行測試**

雙擊開啟 `tests/test_charts.html`。

Expected: 「結構性測試全部通過 ✅」，且下方兩張圖表正常顯示（第一張是綠/紅針狀圖含最高最低點標籤，第二張是綠/紅填色的累積損益曲線含期末金額標籤），滑鼠移到點上有正確的 hover 內容。

- [ ] **Step 4: Commit**

```bash
git add js/charts.js tests/test_charts.html
git commit -m "$(cat <<'EOF'
Feat: 移植 Plotly 圖表建構邏輯到 charts.js

逐一對照 views/charts.py 的 lollipop 針狀報酬圖與零軸自動切色的
累積損益曲線，改寫成回傳 Plotly.js data/layout 物件的純函式。

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: 儀表板 — `dashboard.js`（指標卡 + 可排序搜尋表格）

**Files:**
- Create: `js/dashboard.js`
- Create: `tests/test_dashboard.html`

**Interfaces:**
- Consumes: `TPT.chartTokens`（Task 5）
- Produces:
  - `TPT.dashboard.buildMetricCardsHtml(metrics) => string`
  - `TPT.dashboard.buildStaticTableHtml(trades) => string`（用於 Task 8 報告匯出，靜態、依 sell_date 排序）
  - `TPT.dashboard.computeDisplayRows(trades) => Array<DisplayRow>`
  - `TPT.dashboard.renderMetricCards(metrics, containerEl) => void`
  - `TPT.dashboard.renderTradeTable(trades, containerEl) => void`（互動式，可點欄排序、可搜尋）
  - `TPT.dashboard.formatSignedInt(value) => string`

- [ ] **Step 1: 建立 `js/dashboard.js`**

```js
window.TPT = window.TPT || {};

TPT.dashboard = (function () {
  const T = TPT.chartTokens;

  function formatSignedInt(value) {
    const sign = value >= 0 ? '+' : '-';
    return sign + Math.round(Math.abs(value)).toLocaleString('en-US');
  }

  const METRIC_CARD_DEFS = [
    ['交易總次數', m => `${m.total_trades} 次`, () => null],
    ['累積損益金額', m => `${formatSignedInt(m.total_pnl)} 元`, m => m.total_pnl],
    ['平均月報酬 (複利年化換算)', m => `${(m.avg_monthly_return * 100).toFixed(2)}%`, m => m.avg_monthly_return],
    ['單次週期平均報酬', m => `${(m.avg_trade_return * 100).toFixed(2)}%`, m => m.avg_trade_return],
    ['Max Drawdown (權益曲線峰谷回撤)', m => `${(m.max_drawdown * 100).toFixed(2)}%`, m => m.max_drawdown < 0 ? -1 : 0],
    ['單筆最大虧損', m => `${(m.worst_single_trade_return * 100).toFixed(2)}%`, m => m.worst_single_trade_return < 0 ? -1 : 0],
    ['Sharpe Ratio (夏普值)', m => m.sharpe_ratio.toFixed(2), m => m.sharpe_ratio],
    ['Calmar Ratio (卡瑪比率)', m => m.calmar_ratio.toFixed(2), m => m.calmar_ratio]
  ];

  function statusColor(value) {
    if (value === null || value === undefined || value === 0) return T.INK_PRIMARY;
    return value > 0 ? T.GOOD : T.CRITICAL;
  }

  function buildMetricCardsHtml(metrics) {
    return METRIC_CARD_DEFS.map(([label, fmt, tone]) => {
      const color = statusColor(tone(metrics));
      return `<div class="metric-card"><div class="metric-label">${label}</div><div class="metric-value" style="color:${color};">${fmt(metrics)}</div></div>`;
    }).join('');
  }

  function computeDisplayRows(trades) {
    return trades.map(t => {
      const holdingDays = Math.round((new Date(t.sell_date) - new Date(t.buy_date)) / 86400000) + 1;
      const dailyRetPct = t.net_return_pct / holdingDays;
      return {
        trade_id: t.trade_id,
        strategy_name: t.strategy_name,
        version: t.version,
        buy_date: t.buy_date,
        sell_date: t.sell_date,
        holding_days: holdingDays,
        daily_ret_pct: dailyRetPct,
        net_return_pct: t.net_return_pct,
        net_profit_loss: t.net_profit_loss
      };
    });
  }

  const TABLE_COLUMNS = [
    { key: 'trade_id', label: '交易編號' },
    { key: 'strategy_name', label: '策略名稱' },
    { key: 'version', label: '版本' },
    { key: 'buy_date', label: '買進日期' },
    { key: 'sell_date', label: '賣出日期' },
    { key: 'holding_days', label: '持股天數' },
    { key: 'daily_ret_pct', label: '平均日報酬 (%)' },
    { key: 'net_return_pct', label: '結算報酬率 (%)' },
    { key: 'net_profit_loss', label: '絕對損益金額 (元)' }
  ];

  function formatCell(key, value) {
    if (key === 'daily_ret_pct') return `${value.toFixed(2)}%`;
    if (key === 'net_return_pct') {
      const color = value >= 0 ? T.GOOD : T.CRITICAL;
      return `<span style="color:${color};">${value >= 0 ? '+' : ''}${value.toFixed(2)}%</span>`;
    }
    if (key === 'net_profit_loss') {
      const color = value >= 0 ? T.GOOD : T.CRITICAL;
      return `<span style="color:${color};">${formatSignedInt(value)}</span>`;
    }
    return value;
  }

  function buildStaticTableHtml(trades) {
    if (!trades || trades.length === 0) {
      return '<p class="empty-note">目前無交易明細數據。</p>';
    }
    const rows = computeDisplayRows([...trades].sort((a, b) => new Date(a.sell_date) - new Date(b.sell_date)));
    const header = TABLE_COLUMNS.map(c => `<th>${c.label}</th>`).join('');
    const body = rows.map(row => {
      const cells = TABLE_COLUMNS.map(c => `<td>${formatCell(c.key, row[c.key])}</td>`).join('');
      return `<tr>${cells}</tr>`;
    }).join('');
    return `<div class="table-scroll"><table class="trade-table"><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table></div>`;
  }

  function renderMetricCards(metrics, container) {
    container.innerHTML = buildMetricCardsHtml(metrics);
  }

  function renderTradeTable(trades, container) {
    if (!trades || trades.length === 0) {
      container.innerHTML = '<p class="empty-note">目前無交易明細數據。請使用下方維護表單新增交易。</p>';
      return;
    }
    const state = { rows: computeDisplayRows(trades), sortKey: null, sortDir: 1, search: '' };

    container.innerHTML = `
      <div class="table-toolbar"><input type="search" placeholder="搜尋交易編號、策略..." id="table-search"></div>
      <div class="table-scroll">
        <table class="trade-table">
          <thead><tr>${TABLE_COLUMNS.map(c => `<th data-key="${c.key}">${c.label}</th>`).join('')}</tr></thead>
          <tbody></tbody>
        </table>
      </div>`;

    const tbody = container.querySelector('tbody');
    const searchInput = container.querySelector('#table-search');

    function getFilteredSortedRows() {
      let rows = state.rows;
      if (state.search) {
        const term = state.search.toLowerCase();
        rows = rows.filter(r => TABLE_COLUMNS.some(c => String(r[c.key]).toLowerCase().includes(term)));
      }
      if (state.sortKey) {
        rows = [...rows].sort((a, b) => {
          const av = a[state.sortKey], bv = b[state.sortKey];
          if (av < bv) return -1 * state.sortDir;
          if (av > bv) return 1 * state.sortDir;
          return 0;
        });
      }
      return rows;
    }

    function renderRows() {
      const rows = getFilteredSortedRows();
      tbody.innerHTML = rows.map(row => {
        const cells = TABLE_COLUMNS.map(c => `<td>${formatCell(c.key, row[c.key])}</td>`).join('');
        return `<tr>${cells}</tr>`;
      }).join('');
    }

    container.querySelectorAll('thead th').forEach(th => {
      th.addEventListener('click', () => {
        const key = th.dataset.key;
        if (state.sortKey === key) {
          state.sortDir *= -1;
        } else {
          state.sortKey = key;
          state.sortDir = 1;
        }
        renderRows();
      });
    });

    searchInput.addEventListener('input', (e) => {
      state.search = e.target.value;
      renderRows();
    });

    renderRows();
  }

  return { buildMetricCardsHtml, buildStaticTableHtml, computeDisplayRows, renderMetricCards, renderTradeTable, formatSignedInt };
})();
```

- [ ] **Step 2: 建立 `tests/test_dashboard.html`**

```html
<!doctype html>
<html lang="zh-Hant">
<head><meta charset="utf-8"><title>儀表板測試</title>
<link rel="stylesheet" href="../css/style.css"></head>
<body>
<h1>儀表板元件測試</h1>
<div id="assert-results"></div>
<h2>指標卡</h2>
<div id="cards" class="metric-grid"></div>
<h2>交易明細表格</h2>
<div id="table"></div>

<script src="../js/config.js"></script>
<script src="../js/timeSeries.js"></script>
<script src="../js/metrics.js"></script>
<script src="../lib/plotly.min.js"></script>
<script src="../js/charts.js"></script>
<script src="../js/dashboard.js"></script>
<script>
const fixtureTrades = [
  { trade_id: 'T001', strategy_name: 'StratA', version: 'v1.0', buy_date: '2026-01-12', sell_date: '2026-01-20', net_return_pct: 6.0, net_profit_loss: 60000.0 },
  { trade_id: 'T002', strategy_name: 'StratA', version: 'v1.0', buy_date: '2026-02-11', sell_date: '2026-03-10', net_return_pct: -2.0, net_profit_loss: -20000.0 },
  { trade_id: 'T003', strategy_name: 'StratA', version: 'v1.0', buy_date: '2026-03-11', sell_date: '2026-03-25', net_return_pct: 3.0, net_profit_loss: 30000.0 }
];
const equity = TPT.timeSeries.generateTradeEquityCurve(fixtureTrades);
const metrics = TPT.metrics.calculateMetrics(fixtureTrades, equity);

const results = [];
function record(name, pass) { results.push({ name, pass }); }

const cardsEl = document.getElementById('cards');
TPT.dashboard.renderMetricCards(metrics, cardsEl);
record('渲染出 8 張指標卡', cardsEl.querySelectorAll('.metric-card').length === 8);

const tableEl = document.getElementById('table');
TPT.dashboard.renderTradeTable(fixtureTrades, tableEl);
record('表格初始渲染 3 列', tableEl.querySelectorAll('tbody tr').length === 3);

const searchInput = tableEl.querySelector('#table-search');
searchInput.value = 'T002';
searchInput.dispatchEvent(new Event('input'));
record('搜尋 T002 後只剩 1 列', tableEl.querySelectorAll('tbody tr').length === 1);

searchInput.value = '';
searchInput.dispatchEvent(new Event('input'));
const sortHeader = tableEl.querySelector('thead th[data-key="net_return_pct"]');
sortHeader.click();
record('點擊結算報酬率欄位排序後仍是 3 列', tableEl.querySelectorAll('tbody tr').length === 3);

const resultsEl = document.getElementById('assert-results');
let allPass = true;
results.forEach(r => {
  if (!r.pass) allPass = false;
  const line = document.createElement('div');
  line.style.color = r.pass ? 'green' : 'red';
  line.textContent = `[${r.pass ? 'PASS' : 'FAIL'}] ${r.name}`;
  resultsEl.appendChild(line);
});
const summary = document.createElement('h3');
summary.textContent = allPass
  ? '全部通過 ✅（請再肉眼確認上方卡片與表格樣式、排序、搜尋皆正常）'
  : '有測試失敗 ❌';
summary.style.color = allPass ? 'green' : 'red';
resultsEl.prepend(summary);
</script>
</body>
</html>
```

- [ ] **Step 3: 執行測試**

雙擊開啟 `tests/test_dashboard.html`。

Expected: 「全部通過 ✅」；肉眼確認 8 張指標卡有正確配色（虧損相關指標為紅色、獲利相關為綠色）、表格可點欄名排序、搜尋框可即時過濾。

- [ ] **Step 4: Commit**

```bash
git add js/dashboard.js tests/test_dashboard.html
git commit -m "$(cat <<'EOF'
Feat: 新增儀表板元件（指標卡 + 可排序搜尋交易明細表）

js/dashboard.js 統一了指標卡與交易明細表格的 HTML 產生邏輯，
同時提供互動版（首頁用）與靜態版（供 Task 8 報告匯出重用），
取代 views/dashboard.py。

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: 資料維護表單 — `forms.js`

**Files:**
- Create: `js/forms.js`
- Create: `tests/test_forms.html`

**Interfaces:**
- Consumes: 無直接依賴（透過 callbacks 注入 db 操作，維持模組邊界乾淨）
- Produces:
  - `TPT.forms.validateNewTrade(input) => {valid: boolean, error?: string}`
  - `TPT.forms.validateDatesOnly(buyDate, sellDate) => {valid: boolean, error?: string}`
  - `TPT.forms.render(containerEl, callbacks: {getAllTrades, addTrade, updateTrade, deleteTrade, onChange}) => void`

- [ ] **Step 1: 建立 `js/forms.js`**

```js
window.TPT = window.TPT || {};

TPT.forms = (function () {
  function validateNewTrade(input) {
    if (!input.trade_id.trim() || !input.strategy_name.trim()) {
      return { valid: false, error: '交易編號與策略名稱不能為空！' };
    }
    if (new Date(input.buy_date) > new Date(input.sell_date)) {
      return { valid: false, error: '賣出日期不能早於買進日期！' };
    }
    return { valid: true };
  }

  function validateDatesOnly(buyDate, sellDate) {
    if (new Date(buyDate) > new Date(sellDate)) {
      return { valid: false, error: '賣出日期不能早於買進日期！' };
    }
    return { valid: true };
  }

  function showAlert(container, type, message) {
    container.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
    setTimeout(() => { container.innerHTML = ''; }, 4000);
  }

  function render(container, callbacks) {
    container.innerHTML = `
      <div class="tabs">
        <button class="tab-button active" data-tab="add">➕ 新增交易</button>
        <button class="tab-button" data-tab="update">📝 修改紀錄</button>
        <button class="tab-button" data-tab="delete">❌ 刪除紀錄</button>
      </div>
      <div class="tab-panel active" data-panel="add">
        <div id="add-alert"></div>
        <form id="add-form">
          <div class="form-grid">
            <div class="form-field"><label>交易編號 (不重複)</label><input type="text" name="trade_id" placeholder="例如: T001"></div>
            <div class="form-field"><label>策略名稱</label><input type="text" name="strategy_name" placeholder="例如: 均線交叉"></div>
            <div class="form-field"><label>版本編號</label><input type="text" name="version" placeholder="例如: v1.0"></div>
            <div class="form-field"><label>買進日期</label><input type="date" name="buy_date"></div>
            <div class="form-field"><label>賣出日期</label><input type="date" name="sell_date"></div>
            <div class="form-field"><label>結算報酬率 (%)</label><input type="number" step="0.01" name="net_return_pct" value="0"></div>
            <div class="form-field"><label>絕對損益金額 (元)</label><input type="number" step="100" name="net_profit_loss" value="0"></div>
          </div>
          <button type="submit" class="btn btn-primary">確認新增</button>
        </form>
      </div>
      <div class="tab-panel" data-panel="update">
        <div id="update-alert"></div>
        <div id="update-body"></div>
      </div>
      <div class="tab-panel" data-panel="delete">
        <div id="delete-alert"></div>
        <div id="delete-body"></div>
      </div>
    `;

    container.querySelectorAll('.tab-button').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
        container.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        container.querySelector(`.tab-panel[data-panel="${btn.dataset.tab}"]`).classList.add('active');
      });
    });

    const addForm = container.querySelector('#add-form');
    const addAlert = container.querySelector('#add-alert');
    addForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(addForm);
      const input = {
        trade_id: fd.get('trade_id'), strategy_name: fd.get('strategy_name'),
        version: fd.get('version').trim() || 'v1.0',
        buy_date: fd.get('buy_date'), sell_date: fd.get('sell_date'),
        net_return_pct: parseFloat(fd.get('net_return_pct')) || 0,
        net_profit_loss: parseFloat(fd.get('net_profit_loss')) || 0
      };
      const validation = validateNewTrade(input);
      if (!validation.valid) {
        showAlert(addAlert, 'error', `❌ ${validation.error}`);
        return;
      }
      try {
        await callbacks.addTrade({ ...input, trade_id: input.trade_id.trim(), strategy_name: input.strategy_name.trim() });
        showAlert(addAlert, 'success', `🎉 交易 ${input.trade_id} 新增成功！`);
        addForm.reset();
        await callbacks.onChange();
      } catch (err) {
        showAlert(addAlert, 'error', `❌ 新增失敗，可能交易編號 ${input.trade_id} 已存在。`);
      }
    });

    renderUpdatePanel(container, callbacks);
    renderDeletePanel(container, callbacks);
  }

  async function renderUpdatePanel(container, callbacks) {
    const body = container.querySelector('#update-body');
    const alertEl = container.querySelector('#update-alert');
    const trades = await callbacks.getAllTrades();
    if (trades.length === 0) {
      body.innerHTML = '<p class="empty-note">目前資料庫沒有任何交易數據可供修改。</p>';
      return;
    }
    body.innerHTML = `
      <div class="form-field" style="max-width:300px;"><label>選擇要修改的交易編號</label>
        <select id="update-select">${trades.map(t => `<option value="${t.trade_id}">${t.trade_id}</option>`).join('')}</select>
      </div>
      <form id="update-form">
        <div class="form-grid">
          <div class="form-field"><label>策略名稱</label><input type="text" name="strategy_name"></div>
          <div class="form-field"><label>版本編號</label><input type="text" name="version"></div>
          <div class="form-field"><label>買進日期</label><input type="date" name="buy_date"></div>
          <div class="form-field"><label>賣出日期</label><input type="date" name="sell_date"></div>
          <div class="form-field"><label>結算報酬率 (%)</label><input type="number" step="0.01" name="net_return_pct"></div>
          <div class="form-field"><label>絕對損益金額 (元)</label><input type="number" step="100" name="net_profit_loss"></div>
        </div>
        <button type="submit" class="btn btn-primary">確認修改</button>
      </form>`;

    const select = body.querySelector('#update-select');
    const form = body.querySelector('#update-form');

    function fillForm(tradeId) {
      const t = trades.find(x => x.trade_id === tradeId);
      form.strategy_name.value = t.strategy_name;
      form.version.value = t.version;
      form.buy_date.value = t.buy_date;
      form.sell_date.value = t.sell_date;
      form.net_return_pct.value = t.net_return_pct;
      form.net_profit_loss.value = t.net_profit_loss;
    }
    fillForm(select.value);
    select.addEventListener('change', () => fillForm(select.value));

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const buyDate = fd.get('buy_date'), sellDate = fd.get('sell_date');
      const validation = validateDatesOnly(buyDate, sellDate);
      if (!validation.valid) {
        showAlert(alertEl, 'error', `❌ ${validation.error}`);
        return;
      }
      const tradeId = select.value;
      try {
        await callbacks.updateTrade({
          trade_id: tradeId,
          strategy_name: fd.get('strategy_name').trim(),
          version: fd.get('version').trim(),
          buy_date: buyDate, sell_date: sellDate,
          net_return_pct: parseFloat(fd.get('net_return_pct')) || 0,
          net_profit_loss: parseFloat(fd.get('net_profit_loss')) || 0
        });
        showAlert(alertEl, 'success', `📝 交易 ${tradeId} 修改成功！`);
        await callbacks.onChange();
      } catch (err) {
        showAlert(alertEl, 'error', '❌ 修改失敗。');
      }
    });
  }

  async function renderDeletePanel(container, callbacks) {
    const body = container.querySelector('#delete-body');
    const alertEl = container.querySelector('#delete-alert');
    const trades = await callbacks.getAllTrades();
    if (trades.length === 0) {
      body.innerHTML = '<p class="empty-note">目前資料庫沒有任何交易數據可供刪除。</p>';
      return;
    }
    body.innerHTML = `
      <div class="form-field" style="max-width:300px;"><label>選擇要刪除的交易編號</label>
        <select id="delete-select">${trades.map(t => `<option value="${t.trade_id}">${t.trade_id}</option>`).join('')}</select>
      </div>
      <div class="alert alert-warning" id="delete-warning"></div>
      <button class="btn btn-danger btn-block" id="delete-confirm">🔴 確認永久刪除</button>`;

    const select = body.querySelector('#delete-select');
    const warning = body.querySelector('#delete-warning');
    function updateWarning() {
      warning.textContent = `⚠️ 警告：確定要永久刪除交易紀錄 ${select.value} 嗎？刪除後將無法還原。`;
    }
    updateWarning();
    select.addEventListener('change', updateWarning);

    body.querySelector('#delete-confirm').addEventListener('click', async () => {
      const tradeId = select.value;
      try {
        await callbacks.deleteTrade(tradeId);
        showAlert(alertEl, 'success', `🗑️ 交易 ${tradeId} 已成功移除！`);
        await callbacks.onChange();
      } catch (err) {
        showAlert(alertEl, 'error', '❌ 刪除失敗。');
      }
    });
  }

  return { render, validateNewTrade, validateDatesOnly };
})();
```

- [ ] **Step 2: 建立 `tests/test_forms.html`**

互動式 UI（分頁切換、送出表單、下拉選單連動）會在 Task 9 的完整端對端手動測試中驗證；本頁只測試純驗證函式。

```html
<!doctype html>
<html lang="zh-Hant">
<head><meta charset="utf-8"><title>表單驗證測試</title></head>
<body>
<h1>表單驗證邏輯測試</h1>
<p>互動式 UI（分頁切換、送出表單、下拉選單連動）將於 Task 9 的完整端對端手動測試中驗證。此頁僅測試純驗證函式。</p>
<div id="results"></div>
<script src="../js/forms.js"></script>
<script>
const results = [];
function record(name, pass) { results.push({ name, pass }); }

let r = TPT.forms.validateNewTrade({ trade_id: '', strategy_name: 'A', buy_date: '2026-01-01', sell_date: '2026-01-02' });
record('空交易編號應驗證失敗', r.valid === false && r.error.includes('不能為空'));

r = TPT.forms.validateNewTrade({ trade_id: 'T001', strategy_name: 'A', buy_date: '2026-01-05', sell_date: '2026-01-01' });
record('賣出日期早於買進日期應驗證失敗', r.valid === false && r.error.includes('賣出日期'));

r = TPT.forms.validateNewTrade({ trade_id: 'T001', strategy_name: 'A', buy_date: '2026-01-01', sell_date: '2026-01-05' });
record('正常輸入應驗證通過', r.valid === true);

r = TPT.forms.validateDatesOnly('2026-01-05', '2026-01-01');
record('validateDatesOnly 偵測日期顛倒', r.valid === false);

const resultsEl = document.getElementById('results');
let allPass = true;
results.forEach(row => {
  if (!row.pass) allPass = false;
  const line = document.createElement('div');
  line.style.color = row.pass ? 'green' : 'red';
  line.textContent = `[${row.pass ? 'PASS' : 'FAIL'}] ${row.name}`;
  resultsEl.appendChild(line);
});
const summary = document.createElement('h2');
summary.textContent = allPass ? '全部通過 ✅' : '有測試失敗 ❌';
summary.style.color = allPass ? 'green' : 'red';
resultsEl.prepend(summary);
</script>
</body>
</html>
```

- [ ] **Step 3: 執行測試**

雙擊開啟 `tests/test_forms.html`。

Expected: 「全部通過 ✅」。

- [ ] **Step 4: Commit**

```bash
git add js/forms.js tests/test_forms.html
git commit -m "$(cat <<'EOF'
Feat: 新增交易資料維護表單（新增/修改/刪除）

js/forms.js 以分頁 UI 重現 views/forms.py 的三個維護區塊與其
驗證規則（編號/策略名不可空白、賣出日期不可早於買進日期、
編號重複時報錯），CRUD 動作透過 callbacks 注入，不直接依賴 db.js。

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: 離線 HTML 報告匯出 — `report.js`

**Files:**
- Create: `js/report.js`
- Create: `tests/test_report.html`

**Interfaces:**
- Consumes: `TPT.chartTokens`（Task 5）, `TPT.dashboard.buildMetricCardsHtml` / `buildStaticTableHtml`（Task 6）, `window.TPT_PLOTLY_SOURCE`（Task 1）
- Produces: `TPT.report.buildReportHtml(strategyName, metrics, trades, returnsFig, cumPnlFig) => string`（完整、可離線開啟的單一 HTML 字串）

- [ ] **Step 1: 建立 `js/report.js`**

```js
window.TPT = window.TPT || {};

TPT.report = (function () {
  const T = TPT.chartTokens;

  function buildReportStyles() {
    return `
    * { box-sizing: border-box; }
    body { margin:0; padding:16px; background:${T.SURFACE}; color:${T.INK_SECONDARY}; font-family:${T.FONT_FAMILY}; }
    .report-header { margin-bottom:20px; }
    .report-header h1 { margin:0 0 4px 0; font-size:1.4rem; color:${T.INK_PRIMARY}; }
    .report-header .subtitle { font-size:0.85rem; color:${T.INK_MUTED}; }
    .section-title { font-size:1.05rem; font-weight:600; color:${T.INK_PRIMARY}; margin:28px 0 12px 0; border-left:4px solid ${T.GOOD}; padding-left:8px; }
    .metric-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:10px; }
    @media (min-width:640px) { .metric-grid { grid-template-columns:repeat(4,1fr); } }
    .metric-card { background:#ffffff; border:1px solid ${T.GRID}; border-radius:10px; padding:12px 14px; }
    .metric-label { font-size:0.72rem; color:${T.INK_MUTED}; margin-bottom:6px; }
    .metric-value { font-size:1.15rem; font-weight:700; }
    .chart-block { background:#ffffff; border:1px solid ${T.GRID}; border-radius:10px; padding:8px; margin-bottom:16px; overflow-x:auto; }
    .table-scroll { overflow-x:auto; border:1px solid ${T.GRID}; border-radius:10px; max-height:480px; overflow-y:auto; }
    table.trade-table { width:100%; border-collapse:collapse; font-size:0.8rem; white-space:nowrap; }
    table.trade-table thead th { position:sticky; top:0; background:${T.SURFACE}; color:${T.INK_MUTED}; text-align:left; padding:8px 10px; border-bottom:1px solid ${T.GRID}; }
    table.trade-table tbody td { padding:7px 10px; border-bottom:1px solid ${T.GRID}; color:${T.INK_SECONDARY}; }
    .empty-note { color:${T.INK_MUTED}; font-size:0.9rem; }
    .report-footer { margin-top:28px; font-size:0.75rem; color:${T.INK_MUTED}; text-align:center; }
    `;
  }

  function buildReportHtml(strategyName, metrics, trades, returnsFig, cumPnlFig) {
    const generatedAt = new Date().toLocaleString('zh-TW', { hour12: false });
    const metricCardsHtml = TPT.dashboard.buildMetricCardsHtml(metrics);
    const tableHtml = TPT.dashboard.buildStaticTableHtml(trades);
    const plotlySource = window.TPT_PLOTLY_SOURCE || '';

    return `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<title>策略績效報告 - ${strategyName}</title>
<style>${buildReportStyles()}</style>
</head>
<body>
  <div class="report-header">
    <h1>📈 ${strategyName} · 策略績效報告</h1>
    <div class="subtitle">產生時間：${generatedAt}</div>
  </div>
  <div class="section-title">績效儀表板</div>
  <div class="metric-grid">${metricCardsHtml}</div>
  <div class="section-title">單筆結算報酬率</div>
  <div class="chart-block"><div id="report-chart-1" style="width:100%;"></div></div>
  <div class="section-title">累積絕對損益金額</div>
  <div class="chart-block"><div id="report-chart-2" style="width:100%;"></div></div>
  <div class="section-title">交易明細紀錄</div>
  ${tableHtml}
  <div class="report-footer">交易績效追蹤與多策略分析系統 · 本報告可離線開啟</div>
  <script>${plotlySource}</script>
  <script>
    Plotly.newPlot('report-chart-1', ${JSON.stringify(returnsFig.data)}, ${JSON.stringify(returnsFig.layout)}, {responsive: true, displaylogo: false});
    Plotly.newPlot('report-chart-2', ${JSON.stringify(cumPnlFig.data)}, ${JSON.stringify(cumPnlFig.layout)}, {responsive: true, displaylogo: false});
  </script>
</body>
</html>`;
  }

  return { buildReportHtml };
})();
```

- [ ] **Step 2: 建立 `tests/test_report.html`**

```html
<!doctype html>
<html lang="zh-Hant">
<head><meta charset="utf-8"><title>報告匯出測試</title></head>
<body>
<h1>HTML 報告產生測試</h1>
<div id="results"></div>
<button id="btn-download">下載測試報告（請下載後雙擊確認離線也能顯示圖表與表格）</button>

<script src="../js/config.js"></script>
<script src="../js/timeSeries.js"></script>
<script src="../js/metrics.js"></script>
<script src="../lib/plotly.min.js"></script>
<script src="../js/charts.js"></script>
<script src="../js/dashboard.js"></script>
<script src="../lib/plotly-source.js"></script>
<script src="../js/report.js"></script>
<script>
const fixtureTrades = [
  { trade_id: 'T001', strategy_name: 'StratA', version: 'v1.0', buy_date: '2026-01-12', sell_date: '2026-01-20', net_return_pct: 6.0, net_profit_loss: 60000.0 },
  { trade_id: 'T002', strategy_name: 'StratA', version: 'v1.0', buy_date: '2026-02-11', sell_date: '2026-03-10', net_return_pct: -2.0, net_profit_loss: -20000.0 },
  { trade_id: 'T003', strategy_name: 'StratA', version: 'v1.0', buy_date: '2026-03-11', sell_date: '2026-03-25', net_return_pct: 3.0, net_profit_loss: 30000.0 }
];
const equity = TPT.timeSeries.generateTradeEquityCurve(fixtureTrades);
const metrics = TPT.metrics.calculateMetrics(fixtureTrades, equity);
const returnsFig = TPT.charts.buildReturnsChart(fixtureTrades);
const cumFig = TPT.charts.buildCumPnlChart(fixtureTrades);

const html = TPT.report.buildReportHtml('StratA', metrics, fixtureTrades, returnsFig, cumFig);

const results = [];
function record(name, pass) { results.push({ name, pass }); }
record('報告含標題', html.includes('StratA · 策略績效報告'));
record('報告含 8 張指標卡', (html.match(/metric-card/g) || []).length >= 8);
record('報告含 3 列交易明細', (html.match(/<tr>/g) || []).length >= 3);
record('報告內嵌 Plotly 圖表初始化呼叫', html.includes("Plotly.newPlot('report-chart-1'") && html.includes("Plotly.newPlot('report-chart-2'"));
record('報告內嵌 Plotly.js 原始碼（離線可用，檔案應該很大）', html.length > 500000);

const resultsEl = document.getElementById('results');
let allPass = true;
results.forEach(r => {
  if (!r.pass) allPass = false;
  const line = document.createElement('div');
  line.style.color = r.pass ? 'green' : 'red';
  line.textContent = `[${r.pass ? 'PASS' : 'FAIL'}] ${r.name}`;
  resultsEl.appendChild(line);
});
const summary = document.createElement('h2');
summary.textContent = allPass ? '全部通過 ✅' : '有測試失敗 ❌';
summary.style.color = allPass ? 'green' : 'red';
resultsEl.prepend(summary);

document.getElementById('btn-download').addEventListener('click', () => {
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'test_report.html';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
});
</script>
</body>
</html>
```

- [ ] **Step 3: 執行測試**

雙擊開啟 `tests/test_report.html`，確認「全部通過 ✅」。接著點擊「下載測試報告」按鈕，把下載到的 `test_report.html` **拔掉網路連線後**雙擊開啟，確認：
1. 指標卡、圖表、表格都正常顯示。
2. 圖表可以互動（hover 顯示提示、可縮放）。
3. 完全不需要網路連線。

- [ ] **Step 4: Commit**

```bash
git add js/report.js tests/test_report.html
git commit -m "$(cat <<'EOF'
Feat: 新增離線 HTML 績效報告匯出功能

js/report.js 重用 dashboard.js 的指標卡/表格產生器，並內嵌
lib/plotly-source.js 提供的 Plotly.js 原始碼，產出單一、
可離線開啟、適合手機瀏覽的報告 HTML，取代 views/report.py。

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: 整合入口 — `app.js` + 完整 `index.html`

**Files:**
- Create: `js/app.js`
- Modify: `index.html`（用完整版本整個取代 Task 1 的骨架內容）

**Interfaces:**
- Consumes: 所有前面任務產出的模組（`TPT.db`, `TPT.backup`, `TPT.timeSeries`, `TPT.metrics`, `TPT.charts`, `TPT.dashboard`, `TPT.forms`, `TPT.report`）
- Produces: `TPT.app.init() => Promise<void>`（頁面載入時自動呼叫一次）

- [ ] **Step 1: 建立 `js/app.js`**

```js
window.TPT = window.TPT || {};

TPT.app = (function () {
  const ALL_STRATEGIES = '全部策略';
  let currentStrategy = ALL_STRATEGIES;

  async function init() {
    document.getElementById('btn-choose-backup').addEventListener('click', onChooseBackup);
    document.getElementById('btn-export-json').addEventListener('click', onExportJson);
    document.getElementById('file-import-json').addEventListener('change', onImportJson);
    document.getElementById('btn-export-report').addEventListener('click', onExportReport);
    document.getElementById('strategy-select').addEventListener('change', onStrategyChange);
    await refresh();
  }

  async function onStrategyChange(e) {
    currentStrategy = e.target.value;
    await refresh();
  }

  async function onChooseBackup() {
    try {
      await TPT.backup.chooseBackupFile();
      const trades = await TPT.db.getAllTrades();
      await TPT.backup.writeIfConfigured(trades);
      alert('已設定自動備份檔案，並完成第一次寫入。');
    } catch (err) {
      alert('設定失敗：' + err.message);
    }
  }

  async function onExportJson() {
    const trades = await TPT.db.getAllTrades();
    TPT.backup.exportJson(trades);
  }

  async function onImportJson(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const data = await TPT.backup.importJsonFile(file);
      for (const trade of data) {
        await TPT.db.updateTrade(trade);
      }
      alert(`已匯入 ${data.length} 筆交易資料。`);
      await refresh();
    } catch (err) {
      alert('匯入失敗：' + err.message);
    } finally {
      e.target.value = '';
    }
  }

  async function onExportReport() {
    const allTrades = await TPT.db.getAllTrades();
    const filtered = filterByStrategy(allTrades, currentStrategy);
    const equity = TPT.timeSeries.generateTradeEquityCurve(filtered);
    const metrics = TPT.metrics.calculateMetrics(filtered, equity);
    const returnsFig = TPT.charts.buildReturnsChart(filtered);
    const cumFig = TPT.charts.buildCumPnlChart(filtered);
    const html = TPT.report.buildReportHtml(currentStrategy, metrics, filtered, returnsFig, cumFig);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const timestamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '_');
    a.href = url;
    a.download = `report_${currentStrategy}_${timestamp}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function filterByStrategy(trades, strategy) {
    if (strategy === ALL_STRATEGIES) return trades;
    return trades.filter(t => t.strategy_name === strategy);
  }

  function populateStrategySelect(trades) {
    const select = document.getElementById('strategy-select');
    const uniqueStrategies = [...new Set(trades.map(t => t.strategy_name))].sort();
    const strategies = [ALL_STRATEGIES, ...uniqueStrategies];
    const previous = currentStrategy;
    select.innerHTML = strategies.map(s => `<option value="${s}">${s}</option>`).join('');
    if (strategies.includes(previous)) {
      select.value = previous;
      currentStrategy = previous;
    } else {
      select.value = ALL_STRATEGIES;
      currentStrategy = ALL_STRATEGIES;
    }
  }

  async function refresh() {
    const allTrades = await TPT.db.getAllTrades();
    populateStrategySelect(allTrades);
    const filtered = filterByStrategy(allTrades, currentStrategy);

    const equity = TPT.timeSeries.generateTradeEquityCurve(filtered);
    const metrics = TPT.metrics.calculateMetrics(filtered, equity);

    TPT.dashboard.renderMetricCards(metrics, document.getElementById('metric-cards'));
    TPT.dashboard.renderTradeTable(filtered, document.getElementById('trade-table'));

    const returnsFig = TPT.charts.buildReturnsChart(filtered);
    Plotly.newPlot('returns-chart', returnsFig.data, returnsFig.layout, { responsive: true, displaylogo: false });

    const cumFig = TPT.charts.buildCumPnlChart(filtered);
    Plotly.newPlot('cum-pnl-chart', cumFig.data, cumFig.layout, { responsive: true, displaylogo: false });

    TPT.forms.render(document.getElementById('forms-container'), {
      getAllTrades: TPT.db.getAllTrades,
      addTrade: wrapWithBackup(TPT.db.addTrade),
      updateTrade: wrapWithBackup(TPT.db.updateTrade),
      deleteTrade: wrapWithBackup(TPT.db.deleteTrade),
      onChange: refresh
    });
  }

  function wrapWithBackup(dbFn) {
    return async (...args) => {
      await dbFn(...args);
      const trades = await TPT.db.getAllTrades();
      await TPT.backup.writeIfConfigured(trades);
    };
  }

  return { init };
})();

window.addEventListener('DOMContentLoaded', () => {
  TPT.app.init();
});
```

- [ ] **Step 2: 用完整版本取代 `index.html`**

```html
<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>交易績效追蹤與多策略分析系統</title>
<link rel="stylesheet" href="css/style.css">
</head>
<body>
<div class="app-layout">
  <aside class="sidebar">
    <h2>⚙️ 控制面板與篩選</h2>
    <label for="strategy-select">選擇分析策略</label>
    <select id="strategy-select"></select>

    <hr class="sidebar-divider">
    <button id="btn-choose-backup" class="btn btn-block">🔒 設定自動備份檔案</button>
    <div style="height:8px;"></div>
    <button id="btn-export-json" class="btn btn-block">💾 手動匯出 JSON</button>
    <div style="height:8px;"></div>
    <label for="file-import-json">📂 匯入 JSON 備份</label>
    <input type="file" id="file-import-json" accept=".json">

    <hr class="sidebar-divider">
    <button id="btn-export-report" class="btn btn-block">📄 匯出策略績效報告 (HTML)</button>
  </aside>

  <main class="main-content">
    <h1 class="page-title">📈 交易績效追蹤與多策略分析系統</h1>
    <p class="page-subtitle">輸入你的歷史交易明細，自動產出精準時間加權的累計權益曲線與核心風險指標。</p>

    <div class="section-title">📊 策略績效儀表板</div>
    <div id="metric-cards" class="metric-grid"></div>

    <div class="section-title">📉 單筆結算報酬率</div>
    <div class="chart-block"><div id="returns-chart" style="width:100%;"></div></div>

    <div class="section-title">📈 累積絕對損益金額</div>
    <div class="chart-block"><div id="cum-pnl-chart" style="width:100%;"></div></div>

    <div class="section-title">📋 交易明細紀錄</div>
    <div id="trade-table"></div>

    <div class="section-title">🛠️ 資料庫數據維護</div>
    <div id="forms-container"></div>
  </main>
</div>

<script src="lib/plotly.min.js"></script>
<script src="lib/plotly-source.js"></script>
<script src="js/config.js"></script>
<script src="js/db.js"></script>
<script src="js/backup.js"></script>
<script src="js/timeSeries.js"></script>
<script src="js/metrics.js"></script>
<script src="js/charts.js"></script>
<script src="js/dashboard.js"></script>
<script src="js/forms.js"></script>
<script src="js/report.js"></script>
<script src="js/app.js"></script>
</body>
</html>
```

- [ ] **Step 3: 完整端對端手動測試**

雙擊開啟 `index.html`（正式版，非 tests/ 底下的測試頁），依序操作並確認：

1. **初始狀態**：策略下拉選單只有「全部策略」，儀表板顯示「交易總次數：0 次」，圖表顯示「暫無交易數據」，表格顯示「目前無交易明細數據」。
2. **新增 3 筆交易**（用 Task 2 的 mock 資料）：
   - T001 / StratA / v1.0 / 2026-01-12 / 2026-01-20 / 6.0 / 60000
   - T002 / StratA / v1.0 / 2026-02-11 / 2026-03-10 / -2.0 / -20000
   - T003 / StratA / v1.0 / 2026-03-11 / 2026-03-25 / 3.0 / 30000
   每次新增後應立即看到成功訊息、表單清空、下方儀表板/圖表/表格即時更新。
3. **驗證數字**：新增完 3 筆後，指標卡應顯示：交易總次數 3 次、累積損益 +70,000 元、平均月報酬約 2.90%、單次週期平均報酬約 2.33%、Max Drawdown 約 -2.00%、單筆最大虧損約 -2.00%、Sharpe 約 2.47、Calmar 約 20.46（與 Task 2 測試頁的參考值一致）。
4. **策略篩選**：新增一筆 strategy_name 為 `StratB` 的交易，切換下拉選單應該只顯示對應策略的資料與指標。
5. **修改**：切到「📝 修改紀錄」分頁，選 T002，把結算報酬率改成 -1.0，送出後確認表格與圖表都更新。
6. **刪除**：切到「❌ 刪除紀錄」分頁，刪除 T003，確認表格與指標卡都更新（交易總次數變少）。
7. **持久化**：關閉分頁重新雙擊 `index.html` 開啟，確認資料還在（IndexedDB 有正確持久化）。
8. **主要頁面圖表與報告匯出**：點擊「📄 匯出策略績效報告 (HTML)」，確認下載的檔案內容與畫面一致，且拔網路也能開啟。

- [ ] **Step 4: Commit**

```bash
git add js/app.js index.html
git commit -m "$(cat <<'EOF'
Feat: 完成純網頁版整合入口，全功能可用

js/app.js 串接 db/backup/timeSeries/metrics/charts/dashboard/forms/report
所有模組：初始化 IndexedDB、依策略篩選、渲染儀表板與圖表、
CRUD 後自動觸發備份與重新整理畫面。index.html 從骨架擴充為完整版面，
純網頁版本至此功能對等於原本的 Streamlit 版本。

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: 資料遷移工具

**Files:**
- Create: `tools/migrate_db_to_json.py`

**Interfaces:**
- Consumes: 現有 `trading_tracker.db`（SQLite，直接用 `sqlite3` 標準函式庫讀取，不依賴專案內任何即將刪除的 Python 模組）
- Produces: `trades_export.json`（陣列格式，欄位對應 Task 3 的 `trades` object store schema）

- [ ] **Step 1: 建立 `tools/migrate_db_to_json.py`**

```python
"""一次性資料遷移工具：將 trading_tracker.db 匯出成純網頁版可匯入的 JSON。

執行方式：python tools/migrate_db_to_json.py
只需要執行一次；完成匯入後可刪除本腳本與 trading_tracker.db。
"""
import sqlite3
import json
import os

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(PROJECT_ROOT, 'trading_tracker.db')
OUTPUT_PATH = os.path.join(PROJECT_ROOT, 'trades_export.json')


def main():
    if not os.path.exists(DB_PATH):
        print(f'找不到資料庫檔案: {DB_PATH}')
        return

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute(
        'SELECT trade_id, strategy_name, version, buy_date, sell_date, '
        'net_return_pct, net_profit_loss FROM trades'
    )
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()

    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(rows, f, ensure_ascii=False, indent=2)

    print(f'已匯出 {len(rows)} 筆交易紀錄到 {OUTPUT_PATH}')
    print('請到網頁版點擊「匯入 JSON 備份」，選擇這個檔案即可完成資料搬遷。')


if __name__ == '__main__':
    main()
```

- [ ] **Step 2: 執行遷移並驗證**

```bash
python tools/migrate_db_to_json.py
```

Expected: 印出 `已匯出 N 筆交易紀錄到 .../trades_export.json`（N 應與資料庫實際筆數相符，可用下方指令交叉驗證）。

```bash
python -c "
import sqlite3
conn = sqlite3.connect('trading_tracker.db')
print(conn.execute('SELECT COUNT(*) FROM trades').fetchone()[0])
"
```

Expected: 數字與遷移腳本印出的 N 一致。

- [ ] **Step 3: 在網頁版驗證匯入結果**

雙擊 `index.html`，點「📂 匯入 JSON 備份」選擇 `trades_export.json`，確認：
1. 彈出「已匯入 N 筆交易資料」，N 與 Step 2 的數字一致。
2. 儀表板「交易總次數」與匯入筆數相符。
3. 隨機抽一筆交易編號，用「📝 修改紀錄」分頁選取它，確認欄位內容與原本 SQLite 資料庫裡的值一致（可用 `python -c "import sqlite3; ..."` 查詢比對）。

- [ ] **Step 4: Commit**

```bash
git add tools/migrate_db_to_json.py
git commit -m "$(cat <<'EOF'
Feat: 新增一次性 SQLite→JSON 資料遷移工具

tools/migrate_db_to_json.py 讀取現有 trading_tracker.db 並輸出
trades_export.json，供純網頁版的「匯入 JSON」功能匯入，完成
既有交易資料搬遷。此腳本僅為開發期一次性工具，不是網頁版執行期的一部分。

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

（`trades_export.json` 本身因含真實交易資料不進版控，已於 Task 11 加進 `.gitignore`；此處不 commit 該檔案。）

---

### Task 11: 清理舊 Streamlit 專案、更新文件

**Files:**
- Delete: `app.py`, `views/`, `analyzer/`, `database/`, `config.py`, `run.bat`, `setup_env.bat`, `test_db.py`, `test_analyzer.py`, `__pycache__/`
- Modify: `.gitignore`
- Modify: `CLAUDE.md`

**Interfaces:** 無（純清理與文件任務，不產生新的程式介面）

- [ ] **Step 1: 刪除 Streamlit 相關檔案與目錄**

```bash
git rm -r app.py views analyzer config.py run.bat setup_env.bat test_db.py test_analyzer.py
rm -rf database __pycache__
```

（`database/` 底下含一個非預期版控進來的 `database/.claude/settings.local.json`，一併用檔案系統刪除再交給下一步的 `git add -A` 處理刪除追蹤。）

- [ ] **Step 2: 更新 `.gitignore`**

用以下內容整個取代 `.gitignore`：

```
# 瀏覽器/系統產生的暫存檔案
.DS_Store

# 本機交易資料庫（僅作為一次性遷移來源，已被純網頁版 IndexedDB 取代）
*.db
*.sqlite3

# 編輯器與 IDE 設定檔 (VS Code)
.vscode/

# 一次性資料遷移輸出（含真實交易資料，不進版控）
trades_export.json
```

- [ ] **Step 3: 更新 `CLAUDE.md`**

用以下內容整個取代 `CLAUDE.md`：

```markdown
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Workflow Rules

1. **所有改動必須在新建的 branch 上進行**，禁止直接在 `main` 上 commit。
2. **絕對禁止執行 `git merge` 與 `git push`**，包含任何形式的 force push。

## Project Overview

A pure client-side (no server, no Python) trading performance tracker. Double-click `index.html` to open it in a browser and it produces time-weighted equity curves and risk metrics from trade records you enter, with multi-strategy filtering and interactive CRUD backed by the browser's IndexedDB.

## Running the App

Double-click `index.html`, or open it directly in a browser (`file://` path). No build step, no server, no Python/Node required.

## Running Tests

There is no formal test framework — tests are standalone HTML pages you open directly in a browser and read PASS/FAIL from the page:

```
tests/test_logic.html      # timeSeries.js / metrics.js formula correctness
tests/test_db.html         # IndexedDB CRUD (writes a throwaway trade, cleans up after itself)
tests/test_charts.html     # Plotly.js chart builders (structural checks + visual)
tests/test_dashboard.html  # metric cards + sortable/searchable trade table
tests/test_forms.html      # form validation logic
tests/test_report.html     # HTML report generation
tests/test_backup.html     # File System Access API auto-backup (manual, needs real file dialogs)
```

## Architecture

Data flows in one direction through the browser:

```
IndexedDB ('trades' store)
    ↓  js/db.js            (CRUD, Promise-wrapped)
    ↓  js/timeSeries.js    (generateTradeEquityCurve)
    ↓  js/metrics.js       (calculateMetrics)
    ↓  js/dashboard.js     (renderMetricCards, renderTradeTable)
    ↓  js/charts.js        (buildReturnsChart, buildCumPnlChart via Plotly.js)
    ↓  js/forms.js         (CRUD forms)
    ↑  onChange callback → js/app.js re-fetches and re-renders everything
```

`js/app.js` is the orchestrator: it initialises the IndexedDB connection, filters trades by the selected strategy, runs both `timeSeries`/`metrics` functions, then renders all sections top-to-bottom. `js/report.js` reuses the same metric-card and table builders from `js/dashboard.js` to produce a single self-contained offline HTML report (Plotly.js source is inlined via `lib/plotly-source.js` so the exported report works with no network connection).

### Key Design Decisions

**Equity curve model** (`js/timeSeries.js`): Each period only has one non-overlapping trade (entries follow a monthly cycle rule), so trades are simply sorted by `buy_date` and chained compounding is applied directly: `nav[i] = INITIAL_CAPITAL * Π(1 + return_pct[j])` for all trades up to and including `i`.

**Max Drawdown** (`js/metrics.js`): True peak-to-trough drawdown of the equity curve (`nav` running-max based), not a single-trade return. `worst_single_trade_return` is kept as a separate auxiliary metric equal to the worst single `net_return_pct`.

**Monthly return estimation**: CAGR (based on actual elapsed calendar days between the earliest `buy_date` and latest `sell_date`) compounded back down to a monthly figure — not a naive daily-average × 30 approximation.

**Strategy isolation**: Filtering happens in `js/app.js` before both `timeSeries`/`metrics` calls, so metrics and charts always reflect only the selected strategy's trades.

**No build step**: All JS files are loaded as classic (non-module) `<script>` tags attaching to a single `window.TPT` namespace, specifically so the app works when opened directly via `file://` (ES modules and `fetch()` of local files are blocked under `file://` in Chromium).

**Offline-capable HTML report**: `lib/plotly-source.js` holds the full Plotly.js source as a JS string (`window.TPT_PLOTLY_SOURCE`), used only to inline the library into exported reports. `lib/plotly.min.js` is the normal vendored copy used by the app itself via a `<script src>` tag.

### Configuration (`js/config.js`)

| Constant | Default | Purpose |
|---|---|---|
| `INITIAL_CAPITAL` | 1,000,000 | Base NAV for equity curve and drawdown % |
| `RISK_FREE_RATE` | 0.02 | Annual rate used in Sharpe calculation |

### Data Model (IndexedDB `trades` object store, keyPath `trade_id`)

| Field | Type | Notes |
|---|---|---|
| `trade_id` | string | User-defined, must be unique |
| `strategy_name` | string | Used for sidebar filter grouping |
| `version` | string | Strategy version tag |
| `buy_date` / `sell_date` | string | Stored as `YYYY-MM-DD` |
| `net_return_pct` | number | Percentage, e.g. `5.5` means 5.5% |
| `net_profit_loss` | number | Absolute amount in NTD |

A second `settings` object store (keyPath `key`) holds app-level settings, currently just the saved `FileSystemFileHandle` used for automatic backups.

### Backup & Persistence

Trade data lives in the browser's IndexedDB and does **not** sync across browsers/devices. `js/backup.js` provides two mechanisms:
- **Automatic**: once a backup file is chosen via the File System Access API (Chrome/Edge only), every add/update/delete overwrites that same file with the full dataset.
- **Manual**: "匯出 JSON" always works in any browser and downloads a timestamped snapshot; "匯入 JSON" upserts a JSON file's trades back into IndexedDB.

`tools/migrate_db_to_json.py` is a one-time Python script for migrating data out of the legacy `trading_tracker.db` SQLite file into a JSON file importable by the web app. It is not part of the running application.
```

- [ ] **Step 4: 檢查與 commit**

```bash
git add -A
git status
```

檢查輸出，確認只包含預期的刪除（`app.py`, `views/*`, `analyzer/*`, `database/*`, `config.py`, `run.bat`, `setup_env.bat`, `test_db.py`, `test_analyzer.py`）與修改（`.gitignore`, `CLAUDE.md`），沒有其他非預期的變動。

```bash
git commit -m "$(cat <<'EOF'
Chore: 移除 Streamlit/Python 版本，更新專案文件

純網頁版本已達功能對等，刪除 app.py、views/、analyzer/、database/、
config.py、run.bat、setup_env.bat 與相關測試腳本；更新 .gitignore
移除 Python 特定規則；改寫 CLAUDE.md 反映新的純網頁架構、
執行方式（雙擊 index.html）與測試方式（瀏覽器測試頁）。

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review Notes

- **Spec coverage**：spec 的 A（架構）→ Task 1/9；B（IndexedDB + 自動備份/手動匯出匯入）→ Task 3/4；C（核心計算移植 + 精確參考值）→ Task 2；D（UI/圖表/報告匯出）→ Task 5/6/7/8；E（遷移工具/測試/清理）→ Task 10/11。全部涵蓋。
- **Placeholder scan**：所有步驟皆含完整可執行程式碼與明確驗證期望值，未使用「TBD」「待補」等字樣。
- **Type consistency**：`Trade` 物件欄位（`trade_id`, `strategy_name`, `version`, `buy_date`, `sell_date`, `net_return_pct`, `net_profit_loss`）在 Task 2/3/4/5/6/7/8/9/10 中保持一致；`generateTradeEquityCurve` 回傳的 `EquityPoint`（`trade_id`, `buy_date`, `sell_date`, `return_pct`, `nav`, `cum_return`）欄位名稱在 `metrics.js`（Task 2）與 `app.js`（Task 9）的用法一致；`TPT.chartTokens` 在 Task 5 定義、Task 6/8 重用時欄位名稱（`SURFACE`/`INK_PRIMARY`/...）一致。
