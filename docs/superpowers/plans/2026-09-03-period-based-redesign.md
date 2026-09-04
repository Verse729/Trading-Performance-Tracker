# 以「期」為單位的績效重新設計 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把計算與呈現層改為以「期」（月）為單位：每筆交易新增投入資金，「全部」視圖做資金加權合併，版面分四層，三張以月份為橫軸的圖表。

**Architecture:** 資料層（`db.js`、`backup.js`）不動。`timeSeries.js` 依 `buy_date` 的年月分組產出期序列，`metrics.js` 只吃期序列，`charts.js` 與 `dashboard.js` 只吃期序列與指標物件並回傳純資料／純字串，`app.js` 與 `report.js` 共用它們。所有建構函式都是純函式，測試可在瀏覽器開 HTML 頁面，也可用 `node tests/<name>.test.js` 跑。

**Tech Stack:** 純瀏覽器 JS（classic script、`window.TPT` namespace）、Plotly.js（已 vendored）、IndexedDB。無 build step。

**Spec:** `docs/superpowers/specs/2026-09-03-period-based-redesign-design.md`

## Global Constraints

- 所有改動在 branch `feature/period-based-redesign` 上進行；禁止 `git merge`、`git push`。
- 不能用 ES module、`fetch()` 本地檔案或任何 build 工具；每個 JS 檔開頭維持 `window.TPT = window.TPT || {};`。
- 期鍵：`period = buy_date.slice(0, 7)`（YYYY-MM）。
- 配色沿用台股慣例：正值用 `T.GOOD`（紅），負值用 `T.CRITICAL`（綠）。
- 顯示規則：無法計算的指標顯示「—」（annual_return 與 sharpe 在 `n < 2` 時、sharpe 在 std = 0 時、profit_factor 無虧損期時）。
- 資金推算：`capital` 未填或 ≤ 0 時，`net_return_pct !== 0` 則 `|net_profit_loss / (net_return_pct / 100)|`，否則 `null`（資金未填）。
- `RISK_FREE_RATE` 保留為 0.02；`INITIAL_CAPITAL` 移除。
- Commit 訊息用中文，格式 `<Type>: <說明>`（既有慣例：Feat / Fix / Style / Chore / Docs / Test），結尾附
  `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` 與
  `Claude-Session: https://claude.ai/code/session_01LtnewNVuDACu6eCV6bcE5y`。

## File Structure

| 檔案 | 責任 | 動作 |
|---|---|---|
| `tests/harness.js` | 共用的 assert 與結果輸出（瀏覽器印 DOM，node 印 console） | 新增 |
| `tests/logic.test.js` | `timeSeries` + `metrics` 測試本體（HTML 與 node 共用） | 新增 |
| `tests/test_logic.html` | 載入 harness 與 logic.test.js | 重寫 |
| `js/config.js` | 只剩 `RISK_FREE_RATE` | 修改 |
| `js/timeSeries.js` | `periodOf`、`capitalOf`、`buildPeriodSeries` | 重寫 |
| `js/metrics.js` | `calculateMetrics(series)` | 重寫 |
| `js/charts.js` | `buildCumReturnChart`、`buildPeriodReturnsChart`、`buildDrawdownChart` | 重寫（保留 `chartTokens`） |
| `tests/charts.test.js`、`tests/test_charts.html` | 圖表結構測試 | 新增／重寫 |
| `js/dashboard.js` | 卡片、策略比較表、交易明細表 | 重寫 |
| `css/style.css` | 新增小卡列、卡片副標、資金未填樣式 | 修改 |
| `tests/dashboard.test.js`、`tests/test_dashboard.html` | 卡片與表格測試 | 新增／重寫 |
| `js/forms.js` | 投入資金欄位、同策略同期重複檢查 | 修改 |
| `tests/forms.test.js`、`tests/test_forms.html` | 驗證邏輯測試 | 新增／重寫 |
| `js/report.js` | 新的報告組裝 | 修改 |
| `js/app.js`、`index.html` | 串接四層版面 | 修改 |
| `tests/report.test.js`、`tests/test_report.html` | 報告產生測試 | 新增／重寫 |
| `CLAUDE.md` | Key Design Decisions 更新 | 修改 |

---

### Task 1: 測試 harness 與期序列（timeSeries）

**Files:**
- Create: `tests/harness.js`
- Create: `tests/logic.test.js`
- Modify: `tests/test_logic.html`（整檔重寫）
- Modify: `js/config.js`
- Modify: `js/timeSeries.js`（整檔重寫）

**Interfaces:**
- Produces: `TPT.timeSeries.periodOf(buyDate: string) -> string`
- Produces: `TPT.timeSeries.capitalOf(trade) -> number | null`
- Produces: `TPT.timeSeries.buildPeriodSeries(trades) -> { points: Point[], unfilledCount: number }`，
  `Point = { period, r, pnl, capital, cumReturn, cumPnl, drawdown }`，依 `period` 升冪。
  同一期只有一筆交易時 `r = net_return_pct / 100`；多筆時 `r = Σ pnl(有資金者) / Σ capital(有資金者)`，
  若該期沒有任何有資金者則 `r = mean(net_return_pct / 100)`。`pnl` 為該期全部損益加總。
  `drawdown` 以峰值起始 1.0 計算：`(1+cumReturn) / max(1, 歷史最高 1+cumReturn) − 1`。
- Produces: harness 全域函式 `assertClose(name, actual, expected, tol=1e-6)`、`assertEqual(name, actual, expected)`、`reportResults()`、`loadSources(files)`。每個 `*.test.js` 第一行固定是 `if (typeof require !== 'undefined') require('./harness.js');`，瀏覽器由 `<script src="harness.js">` 載入。

- [ ] **Step 1: 寫 harness**

`tests/harness.js`：

```js
// 瀏覽器與 node 共用。瀏覽器：把結果印在 #results。node：印到 console 並設定 exit code。
(function (root) {
  const results = [];
  root.assertClose = function (name, actual, expected, tolerance) {
    tolerance = tolerance === undefined ? 1e-6 : tolerance;
    const pass = typeof actual === 'number' && Math.abs(actual - expected) < tolerance;
    results.push({ name, pass, actual, expected });
  };
  root.assertEqual = function (name, actual, expected) {
    results.push({ name, pass: actual === expected, actual, expected });
  };
  root.reportResults = function () {
    const allPass = results.every(r => r.pass);
    if (typeof document !== 'undefined') {
      const el = document.getElementById('results');
      results.forEach(r => {
        const line = document.createElement('div');
        line.style.color = r.pass ? 'green' : 'red';
        line.textContent = `[${r.pass ? 'PASS' : 'FAIL'}] ${r.name} (actual=${r.actual}, expected=${r.expected})`;
        el.appendChild(line);
      });
      const summary = document.createElement('h2');
      summary.textContent = allPass ? '全部通過 ✅' : '有測試失敗 ❌';
      summary.style.color = allPass ? 'green' : 'red';
      el.prepend(summary);
    } else {
      results.forEach(r => console.log(`[${r.pass ? 'PASS' : 'FAIL'}] ${r.name} (actual=${r.actual}, expected=${r.expected})`));
      console.log(allPass ? '全部通過' : '有測試失敗');
      process.exitCode = allPass ? 0 : 1;
    }
  };
  // node 專用：把 js/ 下的檔案掛到 globalThis.window
  root.loadSources = function (files) {
    if (typeof require === 'undefined') return;
    globalThis.window = globalThis;
    const path = require('path');
    files.forEach(f => require(path.join(__dirname, '..', 'js', f)));
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
```

- [ ] **Step 2: 寫失敗測試**

`tests/logic.test.js`：

```js
if (typeof require !== 'undefined') require('./harness.js');
loadSources(['config.js', 'timeSeries.js', 'metrics.js']);

// ---- 案例 A：單一策略，3 期 ----
const tradesA = [
  { trade_id: 'T001', strategy_name: 'StratA', version: 'v1.0', buy_date: '2026-01-12', sell_date: '2026-01-20', net_return_pct: 6.0, net_profit_loss: 60000, capital: 1000000 },
  { trade_id: 'T003', strategy_name: 'StratA', version: 'v1.0', buy_date: '2026-03-11', sell_date: '2026-03-25', net_return_pct: 3.0, net_profit_loss: 30000, capital: 1000000 },
  { trade_id: 'T002', strategy_name: 'StratA', version: 'v1.0', buy_date: '2026-02-11', sell_date: '2026-03-10', net_return_pct: -2.0, net_profit_loss: -20000 }
];

assertEqual('periodOf', TPT.timeSeries.periodOf('2026-02-11'), '2026-02');
assertClose('capitalOf explicit', TPT.timeSeries.capitalOf(tradesA[0]), 1000000);
assertClose('capitalOf derived', TPT.timeSeries.capitalOf(tradesA[2]), 1000000);
assertEqual('capitalOf null when pct is 0', TPT.timeSeries.capitalOf({ net_return_pct: 0, net_profit_loss: 0 }), null);

const sA = TPT.timeSeries.buildPeriodSeries(tradesA);
assertEqual('A points length', sA.points.length, 3);
assertEqual('A unfilledCount', sA.unfilledCount, 0);
assertEqual('A sorted by period', sA.points.map(p => p.period).join(','), '2026-01,2026-02,2026-03');
assertClose('A r[1]', sA.points[1].r, -0.02);
assertClose('A cumReturn[1]', sA.points[1].cumReturn, 0.0388);
assertClose('A cumReturn[2]', sA.points[2].cumReturn, 0.069964);
assertClose('A cumPnl[2]', sA.points[2].cumPnl, 70000);
assertClose('A drawdown[1]', sA.points[1].drawdown, -0.02);
assertClose('A drawdown[2]', sA.points[2].drawdown, 0);

// ---- 案例 B：兩策略同期合併，含一筆資金未填 ----
const tradesB = [
  { trade_id: 'A1', strategy_name: 'StratA', version: 'v1', buy_date: '2026-01-05', sell_date: '2026-01-20', net_return_pct: 6.0, net_profit_loss: 60000, capital: 1000000 },
  { trade_id: 'B1', strategy_name: 'StratB', version: 'v1', buy_date: '2026-01-05', sell_date: '2026-01-25', net_return_pct: -1.0, net_profit_loss: -5000, capital: 500000 },
  { trade_id: 'A2', strategy_name: 'StratA', version: 'v1', buy_date: '2026-02-03', sell_date: '2026-02-20', net_return_pct: -2.0, net_profit_loss: -20000, capital: 1000000 },
  { trade_id: 'B2', strategy_name: 'StratB', version: 'v1', buy_date: '2026-02-03', sell_date: '2026-02-20', net_return_pct: 0, net_profit_loss: 0 }
];
const sB = TPT.timeSeries.buildPeriodSeries(tradesB);
assertEqual('B points length', sB.points.length, 2);
assertEqual('B unfilledCount', sB.unfilledCount, 1);
assertClose('B r[0] capital-weighted', sB.points[0].r, 55000 / 1500000);
assertClose('B pnl[0]', sB.points[0].pnl, 55000);
assertClose('B capital[0]', sB.points[0].capital, 1500000);
assertClose('B r[1] excludes unfilled', sB.points[1].r, -0.02);
assertClose('B cumReturn[1]', sB.points[1].cumReturn, 0.015933333333, 1e-9);

// ---- 案例 D：第一期就虧損，回撤要從 1.0 起算 ----
const tradesD = [
  { trade_id: 'D1', strategy_name: 'S', version: 'v1', buy_date: '2026-01-01', sell_date: '2026-01-20', net_return_pct: -10, net_profit_loss: -10000, capital: 100000 },
  { trade_id: 'D2', strategy_name: 'S', version: 'v1', buy_date: '2026-02-01', sell_date: '2026-02-20', net_return_pct: 5, net_profit_loss: 4500, capital: 90000 }
];
const sD = TPT.timeSeries.buildPeriodSeries(tradesD);
assertClose('D drawdown[0]', sD.points[0].drawdown, -0.10);
assertClose('D drawdown[1]', sD.points[1].drawdown, -0.055);

// ---- 空資料 ----
const sEmpty = TPT.timeSeries.buildPeriodSeries([]);
assertEqual('empty points length', sEmpty.points.length, 0);

reportResults();
```

`tests/test_logic.html`：

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
<script src="harness.js"></script>
<script src="logic.test.js"></script>
</body>
</html>
```

- [ ] **Step 3: 跑測試確認失敗**

Run: `node tests/logic.test.js`
Expected: 多筆 FAIL（`TPT.timeSeries.periodOf is not a function` 或 actual=undefined），exit code 1。

- [ ] **Step 4: 實作**

`js/config.js`：

```js
window.TPT = window.TPT || {};

TPT.config = {
  RISK_FREE_RATE: 0.02
};
```

`js/timeSeries.js`：

```js
window.TPT = window.TPT || {};

TPT.timeSeries = (function () {
  function periodOf(buyDate) {
    return String(buyDate).slice(0, 7);
  }

  function capitalOf(trade) {
    if (typeof trade.capital === 'number' && trade.capital > 0) return trade.capital;
    if (trade.net_return_pct) return Math.abs(trade.net_profit_loss / (trade.net_return_pct / 100));
    return null;
  }

  function periodReturn(group) {
    if (group.length === 1) return group[0].net_return_pct / 100;
    let pnl = 0, capital = 0;
    group.forEach(t => {
      const c = capitalOf(t);
      if (c !== null) { pnl += t.net_profit_loss; capital += c; }
    });
    if (capital > 0) return pnl / capital;
    return group.reduce((s, t) => s + t.net_return_pct / 100, 0) / group.length;
  }

  function buildPeriodSeries(trades) {
    const groups = new Map();
    let unfilledCount = 0;
    (trades || []).forEach(t => {
      if (capitalOf(t) === null) unfilledCount++;
      const key = periodOf(t.buy_date);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(t);
    });

    let growth = 1, peak = 1, cumPnl = 0;
    const points = [...groups.keys()].sort().map(period => {
      const group = groups.get(period);
      const r = periodReturn(group);
      const pnl = group.reduce((s, t) => s + t.net_profit_loss, 0);
      const capital = group.reduce((s, t) => s + (capitalOf(t) || 0), 0);
      growth *= 1 + r;
      peak = Math.max(peak, growth);
      cumPnl += pnl;
      return { period, r, pnl, capital, cumReturn: growth - 1, cumPnl, drawdown: growth / peak - 1 };
    });
    return { points, unfilledCount };
  }

  return { periodOf, capitalOf, buildPeriodSeries };
})();
```

- [ ] **Step 5: 跑測試確認通過**

Run: `node tests/logic.test.js`
Expected: 所有 timeSeries 相關斷言 PASS，exit code 0。也可在瀏覽器開 `tests/test_logic.html` 看到「全部通過 ✅」。

- [ ] **Step 6: Commit**

```bash
git add tests/harness.js tests/logic.test.js tests/test_logic.html js/config.js js/timeSeries.js
git commit -m "Feat: 以期為單位的序列計算與可在 node 執行的測試 harness"
```

---

### Task 2: 指標計算（metrics）

**Files:**
- Modify: `js/metrics.js`（整檔重寫）
- Modify: `tests/logic.test.js`（在 `reportResults();` 之前追加）

**Interfaces:**
- Consumes: `TPT.timeSeries.buildPeriodSeries(trades)` 的回傳值。
- Produces: `TPT.metrics.calculateMetrics(series) -> Metrics`，欄位如下（無法計算者為 `null`）：

```
n, first_period, last_period, unfilled_count,
total_pnl, cum_return, annual_return, max_drawdown,
win_rate, profit_factor, avg_return, expectancy,
sharpe, max_consecutive_losses, max_drawdown_amount, best_return, worst_return
```

- [ ] **Step 1: 追加失敗測試**

在 `tests/logic.test.js` 的 `reportResults();` 之前加入：

```js
// ---- metrics：案例 A ----
const mA = TPT.metrics.calculateMetrics(sA);
assertEqual('mA n', mA.n, 3);
assertEqual('mA first_period', mA.first_period, '2026-01');
assertEqual('mA last_period', mA.last_period, '2026-03');
assertClose('mA total_pnl', mA.total_pnl, 70000);
assertClose('mA cum_return', mA.cum_return, 0.069964);
assertClose('mA annual_return', mA.annual_return, 0.310619613, 1e-9);
assertClose('mA max_drawdown', mA.max_drawdown, -0.02);
assertClose('mA win_rate', mA.win_rate, 2 / 3);
assertClose('mA profit_factor', mA.profit_factor, 2.25);
assertClose('mA avg_return', mA.avg_return, 0.023333333333, 1e-9);
assertClose('mA expectancy', mA.expectancy, 0.023333333333, 1e-9);
assertClose('mA sharpe', mA.sharpe, 1.857142857, 1e-9);
assertEqual('mA max_consecutive_losses', mA.max_consecutive_losses, 1);
assertClose('mA max_drawdown_amount', mA.max_drawdown_amount, 20000);
assertClose('mA best_return', mA.best_return, 0.06);
assertClose('mA worst_return', mA.worst_return, -0.02);

// ---- metrics：案例 B（合併） ----
const mB = TPT.metrics.calculateMetrics(sB);
assertEqual('mB unfilled_count', mB.unfilled_count, 1);
assertClose('mB annual_return', mB.annual_return, 0.09948994, 1e-8);
assertClose('mB profit_factor', mB.profit_factor, 1.833333333, 1e-9);
assertClose('mB sharpe', mB.sharpe, 0.576350528, 1e-9);

// ---- metrics：只有 1 期 ----
const sC = TPT.timeSeries.buildPeriodSeries([
  { trade_id: 'C1', strategy_name: 'S', version: 'v1', buy_date: '2026-05-01', sell_date: '2026-05-20', net_return_pct: 5, net_profit_loss: 5000, capital: 100000 }
]);
const mC = TPT.metrics.calculateMetrics(sC);
assertEqual('mC annual_return null', mC.annual_return, null);
assertEqual('mC sharpe null', mC.sharpe, null);
assertEqual('mC profit_factor null (no losses)', mC.profit_factor, null);
assertClose('mC win_rate', mC.win_rate, 1);
assertEqual('mC max_consecutive_losses', mC.max_consecutive_losses, 0);

// ---- metrics：案例 D 連續與回撤 ----
const mD = TPT.metrics.calculateMetrics(sD);
assertClose('mD max_drawdown', mD.max_drawdown, -0.10);
assertClose('mD max_drawdown_amount', mD.max_drawdown_amount, 10000);
assertClose('mD sharpe', mD.sharpe, -0.870929686, 1e-9);

// ---- metrics：空 ----
const mE = TPT.metrics.calculateMetrics(sEmpty);
assertEqual('mE n', mE.n, 0);
assertEqual('mE total_pnl', mE.total_pnl, 0);
assertEqual('mE cum_return null', mE.cum_return, null);
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `node tests/logic.test.js`
Expected: `mA` 起的斷言 FAIL（`calculateMetrics` 回傳舊欄位或拋錯）。

- [ ] **Step 3: 實作**

`js/metrics.js`：

```js
window.TPT = window.TPT || {};

TPT.metrics = (function () {
  function mean(xs) { return xs.reduce((a, b) => a + b, 0) / xs.length; }

  function sampleStd(xs) {
    const m = mean(xs);
    return Math.sqrt(xs.reduce((s, x) => s + (x - m) * (x - m), 0) / (xs.length - 1));
  }

  function calculateMetrics(series) {
    const points = (series && series.points) || [];
    const n = points.length;
    const result = {
      n, first_period: null, last_period: null, unfilled_count: (series && series.unfilledCount) || 0,
      total_pnl: 0, cum_return: null, annual_return: null, max_drawdown: null,
      win_rate: null, profit_factor: null, avg_return: null, expectancy: null,
      sharpe: null, max_consecutive_losses: 0, max_drawdown_amount: null, best_return: null, worst_return: null
    };
    if (n === 0) return result;

    const rs = points.map(p => p.r);
    const last = points[n - 1];
    result.first_period = points[0].period;
    result.last_period = last.period;
    result.total_pnl = last.cumPnl;
    result.cum_return = last.cumReturn;
    if (n >= 2) result.annual_return = Math.pow(1 + last.cumReturn, 12 / n) - 1;
    result.max_drawdown = Math.min(...points.map(p => p.drawdown));

    const wins = rs.filter(r => r > 0), losses = rs.filter(r => r < 0);
    const avgWin = wins.length ? mean(wins) : 0;
    const avgLoss = losses.length ? mean(losses) : 0;
    result.win_rate = wins.length / n;
    result.profit_factor = losses.length ? avgWin / Math.abs(avgLoss) : null;
    result.avg_return = mean(rs);
    result.expectancy = result.win_rate * avgWin + (1 - result.win_rate) * avgLoss;

    if (n >= 2) {
      const std = sampleStd(rs);
      if (std > 0) {
        const rfPeriod = TPT.config.RISK_FREE_RATE / 12;
        result.sharpe = mean(rs.map(r => r - rfPeriod)) / std * Math.sqrt(12);
      }
    }

    let streak = 0;
    rs.forEach(r => {
      streak = r < 0 ? streak + 1 : 0;
      if (streak > result.max_consecutive_losses) result.max_consecutive_losses = streak;
    });

    let peakPnl = 0, mddAmount = 0;
    points.forEach(p => {
      peakPnl = Math.max(peakPnl, p.cumPnl);
      mddAmount = Math.max(mddAmount, peakPnl - p.cumPnl);
    });
    result.max_drawdown_amount = mddAmount;
    result.best_return = Math.max(...rs);
    result.worst_return = Math.min(...rs);
    return result;
  }

  return { calculateMetrics };
})();
```

- [ ] **Step 4: 跑測試確認通過**

Run: `node tests/logic.test.js`
Expected: 全部 PASS，exit code 0。

- [ ] **Step 5: Commit**

```bash
git add js/metrics.js tests/logic.test.js
git commit -m "Feat: 以期報酬序列計算全部指標"
```

---

### Task 3: 圖表建構函式（charts）

**Files:**
- Modify: `js/charts.js`（整檔重寫，保留 `TPT.chartTokens` 並新增 `SERIES` 調色盤）
- Create: `tests/charts.test.js`
- Modify: `tests/test_charts.html`（整檔重寫）

**Interfaces:**
- Consumes: `Point[]`（Task 1）。
- Produces（都回傳 `{ data, layout }`，橫軸為 `period` 類別軸）：
  - `TPT.charts.buildCumReturnChart(seriesList)`：`seriesList = [{ name, points, emphasis }]`。
    每個 series 產兩條 trace：累積報酬率（可見）與累積損益金額（隱藏），`layout.updatemenus` 一組兩個按鈕切換。
    `emphasis: true` 的線用 `T.INK_PRIMARY`、寬 3；其餘依序取 `T.SERIES[i]`。單一 series 時用 `T.GOOD`。
  - `TPT.charts.buildPeriodReturnsChart(seriesList)`：每個 series 一組 bar，`barmode: 'group'`。
    單一 series 時柱色依正負 `T.GOOD`／`T.CRITICAL`；多 series 時一 series 一色（同上調色規則）。
  - `TPT.charts.buildDrawdownChart(points)`：一條 `fill: 'tozeroy'` 的線，顏色 `T.CRITICAL`。
  - 空資料時三者都回傳 `{ data: [], layout: { title: '暫無數據' } }`。

- [ ] **Step 1: 寫失敗測試**

`tests/charts.test.js`：

```js
if (typeof require !== 'undefined') require('./harness.js');
loadSources(['config.js', 'timeSeries.js', 'charts.js']);

const mk = (id, s, buy, pct, pnl, cap) => ({ trade_id: id, strategy_name: s, version: 'v1', buy_date: buy, sell_date: buy, net_return_pct: pct, net_profit_loss: pnl, capital: cap });
const tradesA = [mk('A1', 'A', '2026-01-05', 6, 60000, 1e6), mk('A2', 'A', '2026-02-03', -2, -20000, 1e6)];
const tradesB = [mk('B1', 'B', '2026-01-05', -1, -5000, 5e5), mk('B2', 'B', '2026-02-03', 4, 20000, 5e5)];
const pA = TPT.timeSeries.buildPeriodSeries(tradesA).points;
const pB = TPT.timeSeries.buildPeriodSeries(tradesB).points;
const pAll = TPT.timeSeries.buildPeriodSeries(tradesA.concat(tradesB)).points;

// 累積報酬曲線：單一策略
const c1 = TPT.charts.buildCumReturnChart([{ name: 'A', points: pA }]);
assertEqual('cum single trace count', c1.data.length, 2);
assertEqual('cum return trace visible', c1.data[0].visible, true);
assertEqual('cum pnl trace hidden', c1.data[1].visible, false);
assertEqual('cum x is period', c1.data[0].x.join(','), '2026-01,2026-02');
assertClose('cum y[1] is pct', c1.data[0].y[1], 3.88);
assertClose('cum pnl y[1]', c1.data[1].y[1], 40000);
assertEqual('cum xaxis category', c1.layout.xaxis.type, 'category');
assertEqual('cum has toggle', c1.layout.updatemenus[0].buttons.length, 2);
assertEqual('cum single color', c1.data[0].line.color, TPT.chartTokens.GOOD);

// 累積報酬曲線：全部（兩策略 + 合併）
const c2 = TPT.charts.buildCumReturnChart([{ name: 'A', points: pA }, { name: 'B', points: pB }, { name: '全部', points: pAll, emphasis: true }]);
assertEqual('cum multi trace count', c2.data.length, 6);
assertEqual('cum emphasis width', c2.data[4].line.width, 3);
assertEqual('cum emphasis color', c2.data[4].line.color, TPT.chartTokens.INK_PRIMARY);
assertEqual('cum series color', c2.data[0].line.color, TPT.chartTokens.SERIES[0]);

// 每期報酬柱狀
const b1 = TPT.charts.buildPeriodReturnsChart([{ name: 'A', points: pA }]);
assertEqual('bar single trace count', b1.data.length, 1);
assertEqual('bar type', b1.data[0].type, 'bar');
assertEqual('bar single colors by sign', b1.data[0].marker.color.join(','), [TPT.chartTokens.GOOD, TPT.chartTokens.CRITICAL].join(','));
assertClose('bar y[0] pct', b1.data[0].y[0], 6);
const b2 = TPT.charts.buildPeriodReturnsChart([{ name: 'A', points: pA }, { name: 'B', points: pB }]);
assertEqual('bar multi trace count', b2.data.length, 2);
assertEqual('bar grouped', b2.layout.barmode, 'group');
assertEqual('bar multi color', b2.data[1].marker.color, TPT.chartTokens.SERIES[1]);

// 回撤曲線
const d1 = TPT.charts.buildDrawdownChart(pA);
assertEqual('dd trace count', d1.data.length, 1);
assertEqual('dd fill', d1.data[0].fill, 'tozeroy');
assertClose('dd y[1] pct', d1.data[0].y[1], -2);
assertEqual('dd color', d1.data[0].line.color, TPT.chartTokens.CRITICAL);

// 空資料
assertEqual('cum empty', TPT.charts.buildCumReturnChart([]).data.length, 0);
assertEqual('bar empty', TPT.charts.buildPeriodReturnsChart([{ name: 'A', points: [] }]).data.length, 0);
assertEqual('dd empty', TPT.charts.buildDrawdownChart([]).data.length, 0);

reportResults();
```

`tests/test_charts.html`：

```html
<!doctype html>
<html lang="zh-Hant">
<head><meta charset="utf-8"><title>圖表測試</title></head>
<body>
<h1>圖表建構測試</h1>
<div id="results"></div>
<h2>視覺檢查</h2>
<div id="chart-cum" style="width:100%;max-width:900px;"></div>
<div id="chart-bar" style="width:100%;max-width:900px;"></div>
<div id="chart-dd" style="width:100%;max-width:900px;"></div>
<script src="../lib/plotly.min.js"></script>
<script src="../js/config.js"></script>
<script src="../js/timeSeries.js"></script>
<script src="../js/charts.js"></script>
<script src="harness.js"></script>
<script src="charts.test.js"></script>
<script>
  Plotly.newPlot('chart-cum', c2.data, c2.layout, { responsive: true, displaylogo: false });
  Plotly.newPlot('chart-bar', b2.data, b2.layout, { responsive: true, displaylogo: false });
  Plotly.newPlot('chart-dd', d1.data, d1.layout, { responsive: true, displaylogo: false });
</script>
</body>
</html>
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `node tests/charts.test.js`
Expected: FAIL（`buildCumReturnChart is not a function`）。

- [ ] **Step 3: 實作**

`js/charts.js`：

```js
window.TPT = window.TPT || {};

TPT.chartTokens = {
  SURFACE: '#fcfcfb',
  INK_PRIMARY: '#0b0b0b',
  INK_SECONDARY: '#52514e',
  INK_MUTED: '#898781',
  GRID: '#e1e0d9',
  BASELINE: '#c3c2b7',
  GOOD: '#d03b3b',
  CRITICAL: '#0ca30c',
  GOOD_FILL: 'rgba(208, 59, 59, 0.10)',
  CRITICAL_FILL: 'rgba(12, 163, 12, 0.10)',
  SERIES: ['#2f6fdd', '#e08a1e', '#7b4fc2', '#1a9e8f', '#c2437b', '#6b7280'],
  FONT_FAMILY: "system-ui, -apple-system, 'Segoe UI', sans-serif"
};

TPT.charts = (function () {
  const T = TPT.chartTokens;
  const EMPTY = { data: [], layout: { title: '暫無數據' } };
  const LEGEND_STYLE = { orientation: 'h', yanchor: 'bottom', y: 1.02, xanchor: 'right', x: 1, bgcolor: 'rgba(0,0,0,0)', bordercolor: 'rgba(0,0,0,0)' };
  const HOVERLABEL_STYLE = { bgcolor: T.SURFACE, bordercolor: T.GRID, font: { family: T.FONT_FAMILY, size: 12, color: T.INK_PRIMARY } };
  const AXIS = { showgrid: true, gridcolor: T.GRID, linecolor: T.BASELINE, mirror: true, zeroline: false };

  function baseLayout(height, yTitle) {
    return {
      height,
      margin: { l: 60, r: 30, t: 40, b: 40 },
      hovermode: 'x unified',
      plot_bgcolor: T.SURFACE,
      paper_bgcolor: 'rgba(0,0,0,0)',
      font: { family: T.FONT_FAMILY, color: T.INK_SECONDARY },
      legend: LEGEND_STYLE,
      hoverlabel: HOVERLABEL_STYLE,
      xaxis: { ...AXIS, type: 'category' },
      yaxis: { ...AXIS, title: yTitle }
    };
  }

  function seriesColor(s, i, count) {
    if (s.emphasis) return T.INK_PRIMARY;
    if (count === 1) return T.GOOD;
    return T.SERIES[i % T.SERIES.length];
  }

  function hasData(seriesList) {
    return Array.isArray(seriesList) && seriesList.some(s => s.points && s.points.length > 0);
  }

  function buildCumReturnChart(seriesList) {
    if (!hasData(seriesList)) return EMPTY;
    const data = [];
    seriesList.forEach((s, i) => {
      const x = s.points.map(p => p.period);
      const line = { color: seriesColor(s, i, seriesList.length), width: s.emphasis ? 3 : 2 };
      data.push({ x, y: s.points.map(p => p.cumReturn * 100), mode: 'lines+markers', name: s.name, line, visible: true, hovertemplate: '%{y:+.2f}%<extra>' + s.name + '</extra>' });
      data.push({ x, y: s.points.map(p => p.cumPnl), mode: 'lines+markers', name: s.name, line, visible: false, hovertemplate: '%{y:+,.0f} 元<extra>' + s.name + '</extra>' });
    });
    const n = seriesList.length;
    const retVisible = data.map((_, i) => i % 2 === 0);
    const pnlVisible = retVisible.map(v => !v);
    const layout = baseLayout(400, '累積報酬率 (%)');
    layout.updatemenus = [{
      type: 'buttons', direction: 'right', x: 0, xanchor: 'left', y: 1.15, yanchor: 'top', showactive: true,
      buttons: [
        { label: '累積報酬率', method: 'update', args: [{ visible: retVisible }, { 'yaxis.title': '累積報酬率 (%)' }] },
        { label: '累積損益金額', method: 'update', args: [{ visible: pnlVisible }, { 'yaxis.title': '累積損益金額 (元)' }] }
      ]
    }];
    layout.shapes = [{ type: 'line', xref: 'paper', x0: 0, x1: 1, y0: 0, y1: 0, line: { color: T.BASELINE, width: 1 } }];
    return { data, layout };
  }

  function buildPeriodReturnsChart(seriesList) {
    if (!hasData(seriesList)) return EMPTY;
    const data = seriesList.map((s, i) => {
      const y = s.points.map(p => p.r * 100);
      const color = seriesList.length === 1 ? y.map(v => v >= 0 ? T.GOOD : T.CRITICAL) : seriesColor(s, i, seriesList.length);
      return { type: 'bar', x: s.points.map(p => p.period), y, name: s.name, marker: { color }, hovertemplate: '%{y:+.2f}%<extra>' + s.name + '</extra>' };
    });
    const layout = baseLayout(350, '每期報酬率 (%)');
    layout.barmode = 'group';
    layout.showlegend = seriesList.length > 1;
    return { data, layout };
  }

  function buildDrawdownChart(points) {
    if (!points || points.length === 0) return EMPTY;
    const data = [{
      x: points.map(p => p.period), y: points.map(p => p.drawdown * 100), mode: 'lines',
      name: '回撤', line: { color: T.CRITICAL, width: 2 }, fill: 'tozeroy', fillcolor: T.CRITICAL_FILL,
      hovertemplate: '%{y:.2f}%<extra>回撤</extra>'
    }];
    const layout = baseLayout(260, '回撤 (%)');
    layout.showlegend = false;
    return { data, layout };
  }

  return { buildCumReturnChart, buildPeriodReturnsChart, buildDrawdownChart };
})();
```

- [ ] **Step 4: 跑測試確認通過**

Run: `node tests/charts.test.js`
Expected: 全部 PASS。瀏覽器開 `tests/test_charts.html`：三張圖有畫出來，第一張上方有「累積報酬率／累積損益金額」兩個按鈕可切換。

- [ ] **Step 5: Commit**

```bash
git add js/charts.js tests/charts.test.js tests/test_charts.html
git commit -m "Feat: 以月份為橫軸的累積報酬、每期報酬與回撤圖表"
```

---

### Task 4: 儀表板卡片與表格（dashboard + css）

**Files:**
- Modify: `js/dashboard.js`（整檔重寫）
- Modify: `css/style.css`（追加）
- Create: `tests/dashboard.test.js`
- Modify: `tests/test_dashboard.html`（整檔重寫）

**Interfaces:**
- Consumes: `Metrics`（Task 2）、`TPT.timeSeries.periodOf`／`capitalOf`（Task 1）、`TPT.chartTokens`。
- Produces:
  - `TPT.dashboard.buildSummaryCardsHtml(metrics) -> string`：4 張 `.metric-card`，每張含 `.metric-sub`（「n 期，YYYY-MM 至 YYYY-MM」）。
  - `TPT.dashboard.buildDetailCardsHtml(metrics) -> string`：8 張 `.metric-card.metric-card-small`。
  - `TPT.dashboard.buildStrategyTableHtml(rows) -> string`：`rows = [{ name, metrics }]`，欄位：策略、期數、總損益、累積報酬率、年化報酬率、最大回撤、勝率。
  - `TPT.dashboard.buildStaticTableHtml(trades) -> string`、`renderTradeTable(trades, container)`、`renderSummaryCards(metrics, container)`、`renderDetailCards(metrics, container)`、`renderStrategyTable(rows, container)`。
  - `TPT.dashboard.fmtPct(v)`、`fmtRatio(v)`、`formatSignedInt(v)`：`null` 一律回 `'—'`。
  - 交易明細欄位順序：`trade_id, strategy_name, version, period, buy_date, sell_date, capital, net_return_pct, net_profit_loss`；`capital` 為 `null` 時顯示 `<span class="capital-missing">未填</span>`。

- [ ] **Step 1: 寫失敗測試**

`tests/dashboard.test.js`：

```js
if (typeof require !== 'undefined') require('./harness.js');
loadSources(['config.js', 'utils.js', 'timeSeries.js', 'metrics.js', 'charts.js', 'dashboard.js']);

const trades = [
  { trade_id: 'T001', strategy_name: 'StratA', version: 'v1.0', buy_date: '2026-01-12', sell_date: '2026-01-20', net_return_pct: 6.0, net_profit_loss: 60000, capital: 1000000 },
  { trade_id: 'T002', strategy_name: 'StratA', version: 'v1.0', buy_date: '2026-02-11', sell_date: '2026-03-10', net_return_pct: -2.0, net_profit_loss: -20000, capital: 1000000 },
  { trade_id: 'T003', strategy_name: 'StratA', version: 'v1.0', buy_date: '2026-03-11', sell_date: '2026-03-25', net_return_pct: 0, net_profit_loss: 0 }
];
const metrics = TPT.metrics.calculateMetrics(TPT.timeSeries.buildPeriodSeries(trades));
const D = TPT.dashboard;

assertEqual('fmtPct positive', D.fmtPct(0.069964), '+7.00%');
assertEqual('fmtPct negative', D.fmtPct(-0.02), '-2.00%');
assertEqual('fmtPct null', D.fmtPct(null), '—');
assertEqual('fmtRatio', D.fmtRatio(2.25), '2.25');
assertEqual('fmtRatio null', D.fmtRatio(null), '—');
assertEqual('formatSignedInt', D.formatSignedInt(-20000), '-20,000');

const summary = D.buildSummaryCardsHtml(metrics);
assertEqual('summary card count', (summary.match(/class="metric-card"/g) || []).length, 4);
assertEqual('summary has sub line', summary.includes('3 期，2026-01 至 2026-03'), true);
assertEqual('summary shows total pnl', summary.includes('+40,000'), true);

const detail = D.buildDetailCardsHtml(metrics);
assertEqual('detail card count', (detail.match(/metric-card-small/g) || []).length, 8);
assertEqual('detail shows win rate', detail.includes('33.33%'), true);
assertEqual('detail shows streak', detail.includes('1 期'), true);

const empty = D.buildSummaryCardsHtml(TPT.metrics.calculateMetrics({ points: [], unfilledCount: 0 }));
assertEqual('empty summary shows dash', (empty.match(/—/g) || []).length >= 3, true);

const stratRows = [{ name: 'StratA', metrics }, { name: 'StratB', metrics: TPT.metrics.calculateMetrics({ points: [], unfilledCount: 0 }) }];
const stratTable = D.buildStrategyTableHtml(stratRows);
assertEqual('strategy table rows', (stratTable.match(/<tr>/g) || []).length, 3);
assertEqual('strategy table has name', stratTable.includes('StratA'), true);

const staticTable = D.buildStaticTableHtml(trades);
assertEqual('static table has period column', staticTable.includes('<th>期</th>'), true);
assertEqual('static table no holding days', staticTable.includes('持股天數'), false);
assertEqual('static table has capital', staticTable.includes('1,000,000'), true);
assertEqual('static table marks missing capital', staticTable.includes('capital-missing'), true);
assertEqual('static table escapes', D.buildStaticTableHtml([{ ...trades[0], strategy_name: '<b>x' }]).includes('&lt;b&gt;x'), true);

reportResults();
```

`tests/test_dashboard.html`：

```html
<!doctype html>
<html lang="zh-Hant">
<head><meta charset="utf-8"><title>儀表板測試</title><link rel="stylesheet" href="../css/style.css"></head>
<body style="padding:20px;">
<h1>儀表板測試</h1>
<div id="results"></div>
<h2>視覺檢查</h2>
<div id="summary" class="metric-grid"></div>
<div id="detail" class="metric-grid metric-grid-detail"></div>
<div id="strategy-table"></div>
<div id="trade-table"></div>
<script src="../js/config.js"></script>
<script src="../js/utils.js"></script>
<script src="../js/timeSeries.js"></script>
<script src="../js/metrics.js"></script>
<script src="../js/charts.js"></script>
<script src="../js/dashboard.js"></script>
<script src="harness.js"></script>
<script src="dashboard.test.js"></script>
<script>
  TPT.dashboard.renderSummaryCards(metrics, document.getElementById('summary'));
  TPT.dashboard.renderDetailCards(metrics, document.getElementById('detail'));
  TPT.dashboard.renderStrategyTable(stratRows, document.getElementById('strategy-table'));
  TPT.dashboard.renderTradeTable(trades, document.getElementById('trade-table'));
</script>
</body>
</html>
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `node tests/dashboard.test.js`
Expected: FAIL（`fmtPct is not a function`）。

- [ ] **Step 3: 實作**

`js/dashboard.js`：

```js
window.TPT = window.TPT || {};

TPT.dashboard = (function () {
  const T = TPT.chartTokens;
  const esc = TPT.utils.escapeHtml;

  function formatSignedInt(value) {
    if (value === null || value === undefined) return '—';
    const sign = value >= 0 ? '+' : '-';
    return sign + Math.round(Math.abs(value)).toLocaleString('en-US');
  }
  function fmtPct(v) { return v === null || v === undefined ? '—' : `${v >= 0 ? '+' : ''}${(v * 100).toFixed(2)}%`; }
  function fmtRatio(v) { return v === null || v === undefined ? '—' : v.toFixed(2); }
  function fmtInt(v) { return v === null || v === undefined ? '—' : Math.round(v).toLocaleString('en-US'); }

  function toneColor(v) {
    if (v === null || v === undefined || v === 0) return T.INK_PRIMARY;
    return v > 0 ? T.GOOD : T.CRITICAL;
  }

  // [label, 顯示值, 決定顏色的數值]
  const SUMMARY_DEFS = [
    ['總損益', m => `${formatSignedInt(m.total_pnl)} 元`, m => m.total_pnl],
    ['累積報酬率', m => fmtPct(m.cum_return), m => m.cum_return],
    ['年化報酬率', m => fmtPct(m.annual_return), m => m.annual_return],
    ['最大回撤', m => fmtPct(m.max_drawdown), m => m.max_drawdown]
  ];
  const DETAIL_DEFS = [
    ['勝率', m => m.win_rate === null ? '—' : `${(m.win_rate * 100).toFixed(2)}%`, () => null],
    ['盈虧比', m => fmtRatio(m.profit_factor), () => null],
    ['平均期報酬', m => fmtPct(m.avg_return), m => m.avg_return],
    ['期望值', m => fmtPct(m.expectancy), m => m.expectancy],
    ['Sharpe', m => fmtRatio(m.sharpe), m => m.sharpe],
    ['最大連續虧損', m => `${m.max_consecutive_losses} 期`, m => m.max_consecutive_losses > 0 ? -1 : 0],
    ['最大回撤金額', m => m.max_drawdown_amount === null ? '—' : `${fmtInt(m.max_drawdown_amount)} 元`, m => m.max_drawdown_amount > 0 ? -1 : 0],
    ['最佳 / 最差單期', m => `${fmtPct(m.best_return)} / ${fmtPct(m.worst_return)}`, () => null]
  ];

  function card(label, value, color, extraClass, sub) {
    const cls = extraClass ? `metric-card ${extraClass}` : 'metric-card';
    const subHtml = sub ? `<div class="metric-sub">${sub}</div>` : '';
    return `<div class="${cls}"><div class="metric-label">${label}</div><div class="metric-value" style="color:${color};">${value}</div>${subHtml}</div>`;
  }

  function buildSummaryCardsHtml(m) {
    const sub = m.n > 0 ? `${m.n} 期，${m.first_period} 至 ${m.last_period}` : '尚無交易';
    return SUMMARY_DEFS.map(([label, fmt, tone]) => card(label, fmt(m), toneColor(tone(m)), '', sub)).join('');
  }

  function buildDetailCardsHtml(m) {
    return DETAIL_DEFS.map(([label, fmt, tone]) => card(label, fmt(m), toneColor(tone(m)), 'metric-card-small')).join('');
  }

  function buildStrategyTableHtml(rows) {
    if (!rows || rows.length === 0) return '';
    const header = ['策略', '期數', '總損益', '累積報酬率', '年化報酬率', '最大回撤', '勝率'].map(h => `<th>${h}</th>`).join('');
    const body = rows.map(({ name, metrics: m }) => `<tr><td>${esc(name)}</td><td>${m.n}</td>` +
      `<td><span style="color:${toneColor(m.total_pnl)};">${formatSignedInt(m.total_pnl)}</span></td>` +
      `<td><span style="color:${toneColor(m.cum_return)};">${fmtPct(m.cum_return)}</span></td>` +
      `<td><span style="color:${toneColor(m.annual_return)};">${fmtPct(m.annual_return)}</span></td>` +
      `<td><span style="color:${toneColor(m.max_drawdown)};">${fmtPct(m.max_drawdown)}</span></td>` +
      `<td>${m.win_rate === null ? '—' : (m.win_rate * 100).toFixed(2) + '%'}</td></tr>`).join('');
    return `<div class="table-scroll"><table class="trade-table"><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table></div>`;
  }

  function computeDisplayRows(trades) {
    return trades.map(t => ({
      trade_id: t.trade_id, strategy_name: t.strategy_name, version: t.version,
      period: TPT.timeSeries.periodOf(t.buy_date), buy_date: t.buy_date, sell_date: t.sell_date,
      capital: TPT.timeSeries.capitalOf(t), net_return_pct: t.net_return_pct, net_profit_loss: t.net_profit_loss
    }));
  }

  const TABLE_COLUMNS = [
    { key: 'trade_id', label: '交易編號' },
    { key: 'strategy_name', label: '策略名稱' },
    { key: 'version', label: '版本' },
    { key: 'period', label: '期' },
    { key: 'buy_date', label: '買進日期' },
    { key: 'sell_date', label: '賣出日期' },
    { key: 'capital', label: '投入資金 (元)' },
    { key: 'net_return_pct', label: '結算報酬率 (%)' },
    { key: 'net_profit_loss', label: '絕對損益金額 (元)' }
  ];

  function formatCell(key, value) {
    if (key === 'capital') return value === null ? '<span class="capital-missing">未填</span>' : fmtInt(value);
    if (key === 'net_return_pct') return `<span style="color:${toneColor(value)};">${value >= 0 ? '+' : ''}${value.toFixed(2)}%</span>`;
    if (key === 'net_profit_loss') return `<span style="color:${toneColor(value)};">${formatSignedInt(value)}</span>`;
    return esc(value);
  }

  function rowsHtml(rows) {
    return rows.map(row => `<tr>${TABLE_COLUMNS.map(c => `<td>${formatCell(c.key, row[c.key])}</td>`).join('')}</tr>`).join('');
  }

  function buildStaticTableHtml(trades) {
    if (!trades || trades.length === 0) return '<p class="empty-note">目前無交易明細數據。</p>';
    const rows = computeDisplayRows([...trades].sort((a, b) => a.buy_date < b.buy_date ? -1 : 1));
    const header = TABLE_COLUMNS.map(c => `<th>${c.label}</th>`).join('');
    return `<div class="table-scroll"><table class="trade-table"><thead><tr>${header}</tr></thead><tbody>${rowsHtml(rows)}</tbody></table></div>`;
  }

  function renderSummaryCards(metrics, container) { container.innerHTML = buildSummaryCardsHtml(metrics); }
  function renderDetailCards(metrics, container) { container.innerHTML = buildDetailCardsHtml(metrics); }
  function renderStrategyTable(rows, container) { container.innerHTML = buildStrategyTableHtml(rows); }

  function renderTradeTable(trades, container) {
    if (!trades || trades.length === 0) {
      container.innerHTML = '<p class="empty-note">目前無交易明細數據。請使用下方維護表單新增交易。</p>';
      return;
    }
    const state = { rows: computeDisplayRows(trades), sortKey: 'period', sortDir: 1, search: '' };
    container.innerHTML = `
      <div class="table-toolbar"><input type="search" placeholder="搜尋交易編號、策略..." id="table-search"></div>
      <div class="table-scroll">
        <table class="trade-table">
          <thead><tr>${TABLE_COLUMNS.map(c => `<th data-key="${c.key}">${c.label}</th>`).join('')}</tr></thead>
          <tbody></tbody>
        </table>
      </div>`;
    const tbody = container.querySelector('tbody');

    function visibleRows() {
      let rows = state.rows;
      if (state.search) {
        const term = state.search.toLowerCase();
        rows = rows.filter(r => TABLE_COLUMNS.some(c => String(r[c.key]).toLowerCase().includes(term)));
      }
      return [...rows].sort((a, b) => {
        const av = a[state.sortKey], bv = b[state.sortKey];
        if (av === null) return 1;
        if (bv === null) return -1;
        return (av < bv ? -1 : av > bv ? 1 : 0) * state.sortDir;
      });
    }
    function renderRows() { tbody.innerHTML = rowsHtml(visibleRows()); }

    container.querySelectorAll('thead th').forEach(th => th.addEventListener('click', () => {
      const key = th.dataset.key;
      if (state.sortKey === key) state.sortDir *= -1; else { state.sortKey = key; state.sortDir = 1; }
      renderRows();
    }));
    container.querySelector('#table-search').addEventListener('input', e => { state.search = e.target.value; renderRows(); });
    renderRows();
  }

  return {
    fmtPct, fmtRatio, formatSignedInt,
    buildSummaryCardsHtml, buildDetailCardsHtml, buildStrategyTableHtml, buildStaticTableHtml, computeDisplayRows,
    renderSummaryCards, renderDetailCards, renderStrategyTable, renderTradeTable
  };
})();
```

在 `css/style.css` 檔案最後追加（必須放在既有 `.metric-grid` 的 media query 之後，否則欄數會被蓋掉）：

```css
.metric-sub { font-size: 0.7rem; color: var(--ink-muted); margin-top: 4px; }
.metric-grid-detail { grid-template-columns: repeat(2, 1fr); margin-top: 10px; }
@media (min-width: 900px) { .metric-grid-detail { grid-template-columns: repeat(4, 1fr); } }
@media (min-width: 1300px) { .metric-grid-detail { grid-template-columns: repeat(8, 1fr); } }
.metric-card-small .metric-value { font-size: 0.95rem; }
.capital-missing { color: #9a6b00; background: #fdf3e0; padding: 1px 6px; border-radius: 4px; font-size: 0.75rem; }
```

- [ ] **Step 4: 跑測試確認通過**

Run: `node tests/dashboard.test.js`
Expected: 全部 PASS。瀏覽器開 `tests/test_dashboard.html`：4 張大卡有副標、8 張小卡一列、比較表 2 列、明細表 T003 的投入資金顯示「未填」，點表頭可排序。

- [ ] **Step 5: Commit**

```bash
git add js/dashboard.js css/style.css tests/dashboard.test.js tests/test_dashboard.html
git commit -m "Feat: 分層指標卡、策略比較表與含投入資金的交易明細表"
```

---

### Task 5: 表單新增投入資金與同期重複檢查（forms）

**Files:**
- Modify: `js/forms.js`
- Create: `tests/forms.test.js`
- Modify: `tests/test_forms.html`（整檔重寫）

**Interfaces:**
- Consumes: `TPT.timeSeries.periodOf`。
- Produces: `TPT.forms.validateTrade(input, existingTrades, editingTradeId) -> { valid, error? }`：
  檢查 `trade_id`／`strategy_name` 非空、日期順序、`capital > 0`、同 `strategy_name` 同期且 `trade_id !== editingTradeId` 的重複。
  取代原本的 `validateNewTrade` 與 `validateDatesOnly`。

- [ ] **Step 1: 寫失敗測試**

`tests/forms.test.js`：

```js
if (typeof require !== 'undefined') require('./harness.js');
loadSources(['config.js', 'utils.js', 'timeSeries.js', 'forms.js']);

const existing = [
  { trade_id: 'T001', strategy_name: 'StratA', version: 'v1', buy_date: '2026-01-12', sell_date: '2026-01-20', net_return_pct: 6, net_profit_loss: 60000, capital: 1000000 }
];
const base = { trade_id: 'T009', strategy_name: 'StratA', version: 'v1', buy_date: '2026-02-01', sell_date: '2026-02-20', net_return_pct: 1, net_profit_loss: 1000, capital: 100000 };
const V = TPT.forms.validateTrade;

assertEqual('valid trade', V(base, existing).valid, true);
assertEqual('empty id rejected', V({ ...base, trade_id: ' ' }, existing).valid, false);
assertEqual('empty strategy rejected', V({ ...base, strategy_name: '' }, existing).valid, false);
assertEqual('date order rejected', V({ ...base, buy_date: '2026-02-21' }, existing).valid, false);
assertEqual('capital zero rejected', V({ ...base, capital: 0 }, existing).valid, false);
assertEqual('capital NaN rejected', V({ ...base, capital: NaN }, existing).valid, false);
const dup = V({ ...base, buy_date: '2026-01-03', sell_date: '2026-01-30' }, existing);
assertEqual('same strategy same period rejected', dup.valid, false);
assertEqual('dup error mentions period', dup.error.includes('2026-01'), true);
assertEqual('other strategy same period ok', V({ ...base, strategy_name: 'StratB', buy_date: '2026-01-03', sell_date: '2026-01-30' }, existing).valid, true);
assertEqual('editing itself not a dup', V({ ...existing[0] }, existing, 'T001').valid, true);

reportResults();
```

`tests/test_forms.html`：

```html
<!doctype html>
<html lang="zh-Hant">
<head><meta charset="utf-8"><title>表單驗證測試</title><link rel="stylesheet" href="../css/style.css"></head>
<body style="padding:20px;">
<h1>表單驗證測試</h1>
<div id="results"></div>
<h2>視覺檢查（不會寫入資料庫）</h2>
<div id="forms"></div>
<script src="../js/config.js"></script>
<script src="../js/utils.js"></script>
<script src="../js/timeSeries.js"></script>
<script src="../js/forms.js"></script>
<script src="harness.js"></script>
<script src="forms.test.js"></script>
<script>
  TPT.forms.render(document.getElementById('forms'), {
    getAllTrades: async () => existing,
    addTrade: async t => console.log('addTrade', t),
    updateTrade: async t => console.log('updateTrade', t),
    deleteTrade: async id => console.log('deleteTrade', id),
    onChange: async () => {}
  });
</script>
</body>
</html>
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `node tests/forms.test.js`
Expected: FAIL（`validateTrade is not a function`）。

- [ ] **Step 3: 實作**

在 `js/forms.js` 中：

(a) 把開頭的 `validateNewTrade` 與 `validateDatesOnly` 兩個函式整段換成：

```js
  function validateTrade(input, existingTrades, editingTradeId) {
    if (!String(input.trade_id || '').trim() || !String(input.strategy_name || '').trim()) {
      return { valid: false, error: '交易編號與策略名稱不能為空！' };
    }
    if (new Date(input.buy_date) > new Date(input.sell_date)) {
      return { valid: false, error: '賣出日期不能早於買進日期！' };
    }
    if (!(input.capital > 0)) {
      return { valid: false, error: '投入資金必須大於 0！' };
    }
    const period = TPT.timeSeries.periodOf(input.buy_date);
    const name = String(input.strategy_name).trim();
    const dup = (existingTrades || []).find(t => t.trade_id !== editingTradeId && t.strategy_name === name && TPT.timeSeries.periodOf(t.buy_date) === period);
    if (dup) {
      return { valid: false, error: `策略「${TPT.utils.escapeHtml(name)}」在 ${period} 已有交易 ${TPT.utils.escapeHtml(dup.trade_id)}，每期只能一筆！` };
    }
    return { valid: true };
  }
```

(b) 新增表單：在 `<div class="form-field"><label>結算報酬率 (%)</label>...` 那一行之前插入：

```html
            <div class="form-field"><label>投入資金 (元)</label><input type="number" step="1000" min="1" name="capital" placeholder="例如: 1000000"></div>
```

(c) 新增表單的 submit handler 整段換成：

```js
    addForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(addForm);
      const input = {
        trade_id: fd.get('trade_id').trim(), strategy_name: fd.get('strategy_name').trim(),
        version: fd.get('version').trim() || 'v1.0',
        buy_date: fd.get('buy_date'), sell_date: fd.get('sell_date'),
        capital: parseFloat(fd.get('capital')),
        net_return_pct: parseFloat(fd.get('net_return_pct')) || 0,
        net_profit_loss: parseFloat(fd.get('net_profit_loss')) || 0
      };
      const validation = validateTrade(input, await callbacks.getAllTrades());
      if (!validation.valid) {
        showAlert(addAlert, 'error', `❌ ${validation.error}`);
        return;
      }
      try {
        await callbacks.addTrade(input);
        showAlert(addAlert, 'success', `🎉 交易 ${TPT.utils.escapeHtml(input.trade_id)} 新增成功！`);
        addForm.reset();
        await callbacks.onChange();
      } catch (err) {
        showAlert(addAlert, 'error', `❌ 新增失敗，可能交易編號 ${TPT.utils.escapeHtml(input.trade_id)} 已存在。`);
      }
    });
```

(d) 修改表單：在 update-form 的 `<div class="form-field"><label>結算報酬率 (%)</label>...` 之前插入：

```html
          <div class="form-field"><label>投入資金 (元)</label><input type="number" step="1000" min="1" name="capital"></div>
```

`fillForm` 內加一行 `form.capital.value = t.capital || '';`。

(e) 修改表單的 submit handler 整段換成：

```js
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const tradeId = select.value;
      const input = {
        trade_id: tradeId,
        strategy_name: fd.get('strategy_name').trim(),
        version: fd.get('version').trim(),
        buy_date: fd.get('buy_date'), sell_date: fd.get('sell_date'),
        capital: parseFloat(fd.get('capital')),
        net_return_pct: parseFloat(fd.get('net_return_pct')) || 0,
        net_profit_loss: parseFloat(fd.get('net_profit_loss')) || 0
      };
      const validation = validateTrade(input, trades, tradeId);
      if (!validation.valid) {
        showAlert(alertEl, 'error', `❌ ${validation.error}`);
        return;
      }
      try {
        await callbacks.updateTrade(input);
        showAlert(alertEl, 'success', `📝 交易 ${TPT.utils.escapeHtml(tradeId)} 修改成功！`);
        await callbacks.onChange();
      } catch (err) {
        showAlert(alertEl, 'error', '❌ 修改失敗。');
      }
    });
```

(f) 檔尾 `return { render, validateNewTrade, validateDatesOnly };` 改為 `return { render, validateTrade };`。

- [ ] **Step 4: 跑測試確認通過**

Run: `node tests/forms.test.js`
Expected: 全部 PASS。瀏覽器開 `tests/test_forms.html`：新增與修改表單都有「投入資金」欄位；新增策略 StratA、買進日 2026-01-xx 會跳出「每期只能一筆」錯誤。

- [ ] **Step 5: Commit**

```bash
git add js/forms.js tests/forms.test.js tests/test_forms.html
git commit -m "Feat: 表單新增投入資金欄位並拒絕同策略同期重複"
```

---

### Task 6: 報告、主程式與頁面串接（report + app + index.html + CLAUDE.md）

**Files:**
- Modify: `js/report.js`（`buildReportHtml` 改簽名與內容）
- Modify: `js/app.js`（`refresh` 與 `onExportReport` 改寫）
- Modify: `index.html`（main 區塊改寫）
- Modify: `css/style.css`（追加 `.notice`）
- Create: `tests/report.test.js`
- Modify: `tests/test_report.html`（整檔重寫）
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: Task 1–5 全部。
- Produces: `TPT.report.buildReportHtml({ strategyName, metrics, trades, strategyRows, figs })`，
  `figs = { cumReturn, periodReturns, drawdown }`（各為 `{ data, layout }`），`strategyRows` 在單一策略時傳 `[]`。
- Produces: `TPT.app.buildView(allTrades, strategy) -> { filtered, metrics, strategyRows, figs }`（純函式，供 `refresh` 與 `onExportReport` 共用，也讓測試不需 DOM）。

- [ ] **Step 1: 寫失敗測試**

`tests/report.test.js`：

```js
if (typeof require !== 'undefined') require('./harness.js');
loadSources(['config.js', 'utils.js', 'timeSeries.js', 'metrics.js', 'charts.js', 'dashboard.js', 'report.js', 'app.js']);

const trades = [
  { trade_id: 'A1', strategy_name: 'StratA', version: 'v1', buy_date: '2026-01-05', sell_date: '2026-01-20', net_return_pct: 6, net_profit_loss: 60000, capital: 1000000 },
  { trade_id: 'B1', strategy_name: 'StratB', version: 'v1', buy_date: '2026-01-05', sell_date: '2026-01-25', net_return_pct: -1, net_profit_loss: -5000, capital: 500000 },
  { trade_id: 'A2', strategy_name: 'StratA', version: 'v1', buy_date: '2026-02-03', sell_date: '2026-02-20', net_return_pct: -2, net_profit_loss: -20000, capital: 1000000 }
];

const all = TPT.app.buildView(trades, '全部策略');
assertEqual('view all filtered count', all.filtered.length, 3);
assertEqual('view all strategyRows', all.strategyRows.length, 2);
assertEqual('view all metrics n', all.metrics.n, 2);
assertEqual('view all cum chart traces (2 strategies + combined) x2', all.figs.cumReturn.data.length, 6);
assertEqual('view all bar traces', all.figs.periodReturns.data.length, 2);

const one = TPT.app.buildView(trades, 'StratB');
assertEqual('view one filtered count', one.filtered.length, 1);
assertEqual('view one strategyRows empty', one.strategyRows.length, 0);
assertEqual('view one cum chart traces', one.figs.cumReturn.data.length, 2);

const html = TPT.report.buildReportHtml({ strategyName: '全部策略', metrics: all.metrics, trades: all.filtered, strategyRows: all.strategyRows, figs: all.figs });
assertEqual('report is html', html.startsWith('<!doctype html>'), true);
assertEqual('report has title', html.includes('<title>策略績效報告 - 全部策略</title>'), true);
assertEqual('report has summary cards', (html.match(/class="metric-card"/g) || []).length, 4);
assertEqual('report has detail cards', (html.match(/metric-card-small/g) || []).length >= 8, true);
assertEqual('report has strategy table', html.includes('策略比較'), true);
assertEqual('report has three plots', (html.match(/Plotly\.newPlot\('report-chart-/g) || []).length, 3);
assertEqual('report escapes strategy name', TPT.report.buildReportHtml({ strategyName: '<s>', metrics: one.metrics, trades: one.filtered, strategyRows: [], figs: one.figs }).includes('&lt;s&gt;'), true);
const oneHtml = TPT.report.buildReportHtml({ strategyName: 'StratB', metrics: one.metrics, trades: one.filtered, strategyRows: [], figs: one.figs });
assertEqual('single report has no strategy table', oneHtml.includes('策略比較'), false);

reportResults();
```

`tests/test_report.html`：

```html
<!doctype html>
<html lang="zh-Hant">
<head><meta charset="utf-8"><title>報告產生測試</title></head>
<body style="padding:20px;">
<h1>報告產生測試</h1>
<div id="results"></div>
<button id="open">在新分頁開啟報告</button>
<script src="../lib/plotly-source.js"></script>
<script src="../js/config.js"></script>
<script src="../js/utils.js"></script>
<script src="../js/timeSeries.js"></script>
<script src="../js/metrics.js"></script>
<script src="../js/charts.js"></script>
<script src="../js/dashboard.js"></script>
<script src="../js/report.js"></script>
<script src="../js/app.js"></script>
<script src="harness.js"></script>
<script src="report.test.js"></script>
<script>
  document.getElementById('open').addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    window.open(url, '_blank');
  });
</script>
</body>
</html>
```

注意：`app.js` 檔尾的 `DOMContentLoaded` 監聽在 node 沒有 `window.addEventListener`，Step 3 會把它包在 `if (typeof document !== 'undefined')` 內。

- [ ] **Step 2: 跑測試確認失敗**

Run: `node tests/report.test.js`
Expected: FAIL（`buildView is not a function` 或 `window.addEventListener is not a function`）。

- [ ] **Step 3: 實作**

`js/report.js` 的 `buildReportHtml` 整個函式換成：

```js
  function buildReportHtml({ strategyName, metrics, trades, strategyRows, figs }) {
    const generatedAt = new Date().toLocaleString('zh-TW', { hour12: false });
    const D = TPT.dashboard;
    const plotlySource = window.TPT_PLOTLY_SOURCE || '';
    const strategySection = strategyRows && strategyRows.length
      ? `<div class="section-title">策略比較</div>${D.buildStrategyTableHtml(strategyRows)}`
      : '';
    const plot = (id, fig) => `Plotly.newPlot('${id}', ${JSON.stringify(fig.data)}, ${JSON.stringify(fig.layout)}, {responsive: true, displaylogo: false});`;

    return `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<title>策略績效報告 - ${TPT.utils.escapeHtml(strategyName)}</title>
<style>${buildReportStyles()}</style>
</head>
<body>
  <div class="report-header">
    <h1>📈 ${TPT.utils.escapeHtml(strategyName)} · 策略績效報告</h1>
    <div class="subtitle">產生時間：${generatedAt}</div>
  </div>
  <div class="section-title">總結</div>
  <div class="metric-grid">${D.buildSummaryCardsHtml(metrics)}</div>
  <div class="metric-grid metric-grid-detail">${D.buildDetailCardsHtml(metrics)}</div>
  <div class="section-title">累積報酬率</div>
  <div class="chart-block"><div id="report-chart-1" style="width:100%;"></div></div>
  <div class="section-title">每期報酬率</div>
  <div class="chart-block"><div id="report-chart-2" style="width:100%;"></div></div>
  <div class="section-title">回撤</div>
  <div class="chart-block"><div id="report-chart-3" style="width:100%;"></div></div>
  ${strategySection}
  <div class="section-title">交易明細紀錄</div>
  ${D.buildStaticTableHtml(trades)}
  <div class="report-footer">交易績效追蹤與多策略分析系統 · 本報告可離線開啟</div>
  <script>${plotlySource}</script>
  <script>
    ${plot('report-chart-1', figs.cumReturn)}
    ${plot('report-chart-2', figs.periodReturns)}
    ${plot('report-chart-3', figs.drawdown)}
  </script>
</body>
</html>`;
  }
```

並在 `buildReportStyles()` 的 `.metric-value {...}` 之後加入：

```js
    .metric-sub { font-size:0.7rem; color:${T.INK_MUTED}; margin-top:4px; }
    .metric-grid-detail { grid-template-columns:repeat(2,1fr); margin-top:10px; }
    @media (min-width:900px) { .metric-grid-detail { grid-template-columns:repeat(4,1fr); } }
    .metric-card-small .metric-value { font-size:0.95rem; }
    .capital-missing { color:#9a6b00; background:#fdf3e0; padding:1px 6px; border-radius:4px; font-size:0.75rem; }
```

`js/app.js`：把 `onExportReport`、`filterByStrategy`、`refresh` 換成下面內容（`init`、`onStrategyChange`、`onChooseBackup`、`onExportJson`、`onImportJson`、`populateStrategySelect`、`wrapWithBackup` 不動）：

```js
  function filterByStrategy(trades, strategy) {
    if (strategy === ALL_STRATEGIES) return trades;
    return trades.filter(t => t.strategy_name === strategy);
  }

  // 純函式：由全部交易與選定策略算出這一頁需要的所有東西
  function buildView(allTrades, strategy) {
    const filtered = filterByStrategy(allTrades, strategy);
    const series = TPT.timeSeries.buildPeriodSeries(filtered);
    const metrics = TPT.metrics.calculateMetrics(series);

    let seriesList, strategyRows;
    if (strategy === ALL_STRATEGIES) {
      const names = [...new Set(filtered.map(t => t.strategy_name))].sort();
      const perStrategy = names.map(name => ({ name, series: TPT.timeSeries.buildPeriodSeries(filterByStrategy(filtered, name)) }));
      seriesList = perStrategy.map(s => ({ name: s.name, points: s.series.points })).concat([{ name: ALL_STRATEGIES, points: series.points, emphasis: true }]);
      strategyRows = perStrategy.map(s => ({ name: s.name, metrics: TPT.metrics.calculateMetrics(s.series) }));
    } else {
      seriesList = [{ name: strategy, points: series.points }];
      strategyRows = [];
    }

    const figs = {
      cumReturn: TPT.charts.buildCumReturnChart(seriesList),
      periodReturns: TPT.charts.buildPeriodReturnsChart(seriesList.filter(s => !s.emphasis)),
      drawdown: TPT.charts.buildDrawdownChart(series.points)
    };
    return { filtered, metrics, strategyRows, figs };
  }

  async function onExportReport() {
    const allTrades = await TPT.db.getAllTrades();
    const view = buildView(allTrades, currentStrategy);
    const html = TPT.report.buildReportHtml({ strategyName: currentStrategy, ...view, trades: view.filtered });
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

  async function refresh() {
    const allTrades = await TPT.db.getAllTrades();
    populateStrategySelect(allTrades);
    const view = buildView(allTrades, currentStrategy);
    const plotOpts = { responsive: true, displaylogo: false };

    TPT.dashboard.renderSummaryCards(view.metrics, document.getElementById('summary-cards'));
    TPT.dashboard.renderDetailCards(view.metrics, document.getElementById('detail-cards'));
    const notice = document.getElementById('capital-notice');
    notice.textContent = view.metrics.unfilled_count > 0 ? `⚠️ 有 ${view.metrics.unfilled_count} 筆交易資金未填且報酬率為 0，已從合併報酬中排除。` : '';
    notice.hidden = view.metrics.unfilled_count === 0;

    Plotly.newPlot('cum-return-chart', view.figs.cumReturn.data, view.figs.cumReturn.layout, plotOpts);
    Plotly.newPlot('period-returns-chart', view.figs.periodReturns.data, view.figs.periodReturns.layout, plotOpts);
    Plotly.newPlot('drawdown-chart', view.figs.drawdown.data, view.figs.drawdown.layout, plotOpts);

    const strategySection = document.getElementById('strategy-section');
    strategySection.hidden = view.strategyRows.length === 0;
    TPT.dashboard.renderStrategyTable(view.strategyRows, document.getElementById('strategy-table'));
    TPT.dashboard.renderTradeTable(view.filtered, document.getElementById('trade-table'));

    TPT.forms.render(document.getElementById('forms-container'), {
      getAllTrades: TPT.db.getAllTrades,
      addTrade: wrapWithBackup(TPT.db.addTrade),
      updateTrade: wrapWithBackup(TPT.db.updateTrade),
      deleteTrade: wrapWithBackup(TPT.db.deleteTrade),
      onChange: refresh
    });
  }
```

`return { init };` 改為 `return { init, buildView };`，檔尾改為：

```js
if (typeof document !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => { TPT.app.init(); });
}
```

`index.html` 的 `<main class="main-content">` 內容換成：

```html
    <h1 class="page-title">📈 交易績效追蹤與多策略分析系統</h1>
    <p class="page-subtitle">以「期」（每月一筆）為單位計算報酬與風險，多策略資金加權合併。</p>

    <div class="section-title">📊 總結</div>
    <div id="summary-cards" class="metric-grid"></div>
    <div id="detail-cards" class="metric-grid metric-grid-detail"></div>
    <p id="capital-notice" class="notice" hidden></p>

    <div class="section-title">📈 累積報酬率</div>
    <div class="chart-block"><div id="cum-return-chart" style="width:100%;"></div></div>

    <div class="section-title">📉 每期報酬率</div>
    <div class="chart-block"><div id="period-returns-chart" style="width:100%;"></div></div>

    <div class="section-title">🌊 回撤</div>
    <div class="chart-block"><div id="drawdown-chart" style="width:100%;"></div></div>

    <div id="strategy-section" hidden>
      <div class="section-title">🏁 策略比較</div>
      <div id="strategy-table"></div>
    </div>

    <div class="section-title">📋 交易明細紀錄</div>
    <div id="trade-table"></div>

    <div class="section-title">🛠️ 資料庫數據維護</div>
    <div id="forms-container"></div>
```

`css/style.css` 檔案最後追加：

```css
.notice { font-size: 0.85rem; color: #9a6b00; background: #fdf3e0; border: 1px solid #e8c27a; border-radius: 6px; padding: 8px 12px; margin: 10px 0 0 0; }
```

`CLAUDE.md` 的 `### Key Design Decisions` 中，把 **Equity curve model**、**Max Drawdown**、**Monthly return estimation**、**Strategy isolation** 四段換成：

```markdown
**Period model** (`js/timeSeries.js`): The unit of analysis is a period = calendar month of `buy_date` (`YYYY-MM`), one trade per strategy per period; no day counts anywhere. A period's return is `net_return_pct` when it has one trade, otherwise capital-weighted `Σ pnl / Σ capital` across the strategies trading that month. `capital` may be missing on legacy rows and is then derived as `|pnl / return|`; rows with 0% return and no capital are flagged and excluded from the weighting.

**Two cumulative curves**: cumulative P&L (plain sum, "how much did I make") and cumulative return (chain-linked `Π(1+r) − 1`, time-weighted, "how good is the strategy regardless of capital"). Annualisation assumes 12 periods per year: `(1+cum)^(12/n) − 1`.

**Drawdown** (`js/metrics.js`): peak-to-trough on the chain-linked growth curve with the peak seeded at 1.0, so a first-period loss registers. `max_drawdown_amount` is the same idea on the cumulative P&L curve.

**Strategy isolation**: `app.js` builds one period series for the selected strategy (or the capital-weighted combined series for 全部), and in the 全部 view also one per strategy so charts can overlay them and the comparison table can rank them.
```

- [ ] **Step 4: 跑測試確認通過**

Run: `node tests/report.test.js && node tests/logic.test.js && node tests/charts.test.js && node tests/dashboard.test.js && node tests/forms.test.js`
Expected: 五個都「全部通過」。

瀏覽器手動檢查：開 `index.html`，新增兩個策略、同月各一筆，確認：
1. 總結列 4 張大卡有「n 期，… 至 …」副標，8 張小卡一列。
2. 三張圖橫軸是 YYYY-MM，第一張可切換報酬率／金額，「全部」時有多條線與粗合併線。
3. 「全部」時出現策略比較表，切到單一策略時消失。
4. 明細表有「期」與「投入資金」欄，沒有持股天數。
5. 匯出 HTML 報告後離線開啟，內容與頁面一致。

- [ ] **Step 5: Commit**

```bash
git add js/report.js js/app.js index.html css/style.css tests/report.test.js tests/test_report.html CLAUDE.md
git commit -m "Feat: 四層版面串接、報告改用新圖表與比較表，更新設計說明"
```

---

## Self-Review

- **規格覆蓋**：資料模型與推算規則（Task 1）、期序列與兩條曲線（Task 1）、全部指標與「—」規則（Task 2）、三張圖與切換鈕（Task 3）、四層版面與兩張表（Task 4、6）、表單欄位與同期重複（Task 5）、報告（Task 6）、資金未填提示（Task 6）、`INITIAL_CAPITAL` 移除（Task 1）、`CLAUDE.md`（Task 6）。匯入 JSON 時 `capital` 可缺：`capitalOf` 自動推算，不需額外程式。
- **型別一致**：`buildPeriodSeries` 回 `{ points, unfilledCount }`，`calculateMetrics` 讀 `series.points`／`series.unfilledCount`；圖表吃 `{ name, points, emphasis }`；`buildView` 回 `{ filtered, metrics, strategyRows, figs }`，`buildReportHtml` 以同名欄位解構。
- **與規格的小差異**：回撤峰值從 1.0 起算（規格寫的是從第 0 期起算），讓第一期虧損也算回撤，已寫進 Task 1 介面與 `CLAUDE.md`。
