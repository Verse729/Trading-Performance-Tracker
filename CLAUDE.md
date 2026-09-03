# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Workflow Rules

1. **所有改動必須在新建的 branch 上進行**，禁止直接在 `main` 上 commit。
2. **絕對禁止執行 `git merge` 與 `git push`**，包含任何形式的 force push。

## Project Overview

A pure client-side (no server, no Python) trading performance tracker. Double-click `index.html` to open it in a browser and it produces time-weighted equity curves and risk metrics from trade records you enter, with multi-strategy filtering and interactive CRUD backed by the browser's IndexedDB.

## Running Tests

There is no formal test framework — tests are standalone HTML pages you open directly in a browser and read PASS/FAIL from the page (see `tests/`).

## Architecture

### Key Design Decisions

**Equity curve model** (`js/timeSeries.js`): Each period only has one non-overlapping trade (entries follow a monthly cycle rule), so trades are simply sorted by `buy_date` and chained compounding is applied directly: `nav[i] = INITIAL_CAPITAL * Π(1 + return_pct[j])` for all trades up to and including `i`.

**Max Drawdown** (`js/metrics.js`): True peak-to-trough drawdown of the equity curve (`nav` running-max based), not a single-trade return. `worst_single_trade_return` is kept as a separate auxiliary metric equal to the worst single `net_return_pct`.

**Monthly return estimation**: CAGR (based on actual elapsed calendar days between the earliest `buy_date` and latest `sell_date`) compounded back down to a monthly figure — not a naive daily-average × 30 approximation.

**Strategy isolation**: Filtering happens in `js/app.js` before both `timeSeries`/`metrics` calls, so metrics and charts always reflect only the selected strategy's trades.

**No build step**: All JS files are loaded as classic (non-module) `<script>` tags attaching to a single `window.TPT` namespace, specifically so the app works when opened directly via `file://` (ES modules and `fetch()` of local files are blocked under `file://` in Chromium).

**Offline-capable HTML report**: `lib/plotly-source.js` holds the full Plotly.js source as a JS string (`window.TPT_PLOTLY_SOURCE`), used only to inline the library into exported reports. `lib/plotly.min.js` is the normal vendored copy used by the app itself via a `<script src>` tag.

### Backup & Persistence

Trade data lives in the browser's IndexedDB and does **not** sync across browsers/devices. `js/backup.js` provides two mechanisms:
- **Automatic**: once a backup file is chosen via the File System Access API (Chrome/Edge only), every add/update/delete overwrites that same file with the full dataset.
- **Manual**: "匯出 JSON" always works in any browser and downloads a timestamped snapshot; "匯入 JSON" upserts a JSON file's trades back into IndexedDB.

`tools/migrate_db_to_json.py` is a one-time Python script for migrating data out of the legacy `trading_tracker.db` SQLite file into a JSON file importable by the web app. It is not part of the running application.
