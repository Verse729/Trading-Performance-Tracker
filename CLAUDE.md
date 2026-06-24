# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Streamlit-based trading performance tracker that accepts historical trade records and produces time-weighted equity curves and risk metrics. Supports multi-strategy filtering and interactive CRUD via a SQLite backend.

## Environment Setup

Requires Conda environment `trading_tracker` with Python 3.11.

```bat
# First-time setup (creates and installs dependencies)
setup_env.bat

# Activate environment manually
conda activate trading_tracker
pip install pandas numpy plotly streamlit
```

## Running the App

```bat
# Windows one-liner (activates env + starts Streamlit)
run.bat

# Or manually
conda activate trading_tracker
python -m streamlit run app.py
```

## Running Tests

There is no formal test framework — tests are standalone scripts run directly:

```bash
python test_db.py       # Tests DBManager CRUD against the live SQLite file
python test_analyzer.py # Tests equity curve generation and metrics calculation
```

`test_db.py` writes to the actual `trading_tracker.db` file (creates it if absent). Run it in a clean state or clean up manually if needed.

## Architecture

Data flows in one direction through three layers:

```
SQLite (trading_tracker.db)
    ↓  database/db_manager.py  (DBManager)
    ↓  analyzer/time_series.py (generate_daily_equity_curve)
    ↓  analyzer/metrics.py     (calculate_metrics)
    ↓  views/dashboard.py      (render_dashboard)
    ↓  views/charts.py         (plot_performance_charts)
    ↓  views/forms.py          (render_trade_forms)
    ↑  on_data_changed_callback → st.rerun()
```

`app.py` is the orchestrator: it initialises `DBManager`, filters trades by selected strategy, runs both analyzer functions, then renders all views top-to-bottom.

### Key Design Decisions

**Equity curve model** (`analyzer/time_series.py`): Each trade's P&L is amortised evenly across its holding period (including both endpoints, so a same-day trade counts as 1 day). Overlapping trades are summed per day. NAV = `INITIAL_CAPITAL + cumulative_pnl`.

**Max Drawdown redefinition** (`analyzer/metrics.py`): "Max Drawdown" is stored as the worst single-trade return percentage (not a peak-to-trough equity drawdown). This is intentional — see commit `a088336`.

**Monthly return estimation**: Average daily return across all trades × 30. This is an approximation, not calendar-month bucketing.

**Strategy isolation**: Filtering happens in `app.py` before both analyzer calls, so metrics and charts always reflect only the selected strategy's trades.

### Configuration (`config.py`)

| Constant | Default | Purpose |
|---|---|---|
| `INITIAL_CAPITAL` | 1,000,000 | Base NAV for equity curve and drawdown % |
| `RISK_FREE_RATE` | 0.02 | Annual rate used in Sharpe calculation |

### Database Schema

Single table `trades`:

| Column | Type | Notes |
|---|---|---|
| `trade_id` | TEXT PK | User-defined, must be unique |
| `strategy_name` | TEXT | Used for sidebar filter grouping |
| `version` | TEXT | Strategy version tag |
| `buy_date` / `sell_date` | TEXT | Stored as `YYYY-MM-DD` strings |
| `net_return_pct` | REAL | Percentage, e.g. `5.5` means 5.5% |
| `net_profit_loss` | REAL | Absolute amount in NTD |

The `.db` file is gitignored — it lives at the project root alongside `app.py`.
