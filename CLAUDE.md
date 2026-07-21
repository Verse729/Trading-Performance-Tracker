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
