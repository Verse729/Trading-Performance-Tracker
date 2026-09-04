# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Workflow Rules

1. **所有改動必須在新建的 branch 上進行**，禁止直接在 `main` 上 commit。
2. **允許執行 `git merge`**（例如將功能分支合併回 `main`），但**絕對禁止執行 `git push`**，包含任何形式的 force push。

## Project Overview

A pure client-side (no server, no Python) trading performance tracker. Double-click `index.html` to open it in a browser and it produces time-weighted equity curves and risk metrics from trade records you enter, with multi-strategy filtering and interactive CRUD backed by the browser's IndexedDB.

## Running Tests

There is no formal test framework — tests are standalone HTML pages you open directly in a browser and read PASS/FAIL from the page (see `tests/`); the same `tests/*.test.js` files also run headless with `node tests/<name>.test.js`.

## Architecture

### Key Design Decisions

**Period model** (`js/timeSeries.js`): The unit of analysis is a period = calendar month of `buy_date` (`YYYY-MM`), one trade per strategy per period; no day counts anywhere. A period's return is `net_return_pct` when it has one trade, otherwise capital-weighted `Σ pnl / Σ capital` across the strategies trading that month. `capital` may be missing on legacy rows and is then derived as `|pnl / return|`; rows with 0% return and no capital are flagged and excluded from the weighting.

**Two cumulative curves**: cumulative P&L (plain sum, "how much did I make") and cumulative return (chain-linked `Π(1+r) − 1`, time-weighted, "how good is the strategy regardless of capital"). Annualisation assumes 12 periods per year: `(1+cum)^(12/n) − 1`.

**Drawdown** (`js/metrics.js`): peak-to-trough on the chain-linked growth curve with the peak seeded at 1.0, so a first-period loss registers. `max_drawdown_amount` is the same idea on the cumulative P&L curve.

**Strategy isolation**: `app.js` builds one period series for the selected strategy (or the capital-weighted combined series for 全部), and in the 全部 view also one per strategy so charts can overlay them and the comparison table can rank them.

**No build step**: All JS files are loaded as classic (non-module) `<script>` tags attaching to a single `window.TPT` namespace, specifically so the app works when opened directly via `file://` (ES modules and `fetch()` of local files are blocked under `file://` in Chromium).

**Offline-capable HTML report**: `lib/plotly-source.js` holds the full Plotly.js source as a JS string (`window.TPT_PLOTLY_SOURCE`), used only to inline the library into exported reports. `lib/plotly.min.js` is the normal vendored copy used by the app itself via a `<script src>` tag.

### Backup & Persistence

Trade data lives in the browser's IndexedDB and does **not** sync across browsers/devices. `js/backup.js` provides two mechanisms:
- **Automatic**: once a backup file is chosen via the File System Access API (Chrome/Edge only), every add/update/delete overwrites that same file with the full dataset.
- **Manual**: "匯出 JSON" always works in any browser and downloads a timestamped snapshot; "匯入 JSON" upserts a JSON file's trades back into IndexedDB.

`tools/migrate_db_to_json.py` is a one-time Python script for migrating data out of the legacy `trading_tracker.db` SQLite file into a JSON file importable by the web app. It is not part of the running application.
