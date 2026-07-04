# test_analyzer.py
import sys
import os
import pandas as pd

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from analyzer.time_series import generate_trade_equity_curve
from analyzer.metrics import calculate_metrics

# 建立模擬交易資料 (符合「每月10號後隔一交易日進場，最晚下月10號出場，
# 提前出場後同週期不再進場」的規則 → 各筆交易依時間序列、不重疊)
# T001: 1/12 ~ 1/20 (提前出場)，賺 6%
# T002: 2/11 ~ 3/10 (放到最後一天)，賠 2%
# T003: 3/11 ~ 3/25 (提前出場)，賺 3%
mock_trades = pd.DataFrame([
    {
        "trade_id": "T001", "strategy_name": "StratA", "version": "v1.0",
        "buy_date": "2026-01-12", "sell_date": "2026-01-20",
        "net_return_pct": 6.0, "net_profit_loss": 60000.0
    },
    {
        "trade_id": "T002", "strategy_name": "StratA", "version": "v1.0",
        "buy_date": "2026-02-11", "sell_date": "2026-03-10",
        "net_return_pct": -2.0, "net_profit_loss": -20000.0
    },
    {
        "trade_id": "T003", "strategy_name": "StratA", "version": "v1.0",
        "buy_date": "2026-03-11", "sell_date": "2026-03-25",
        "net_return_pct": 3.0, "net_profit_loss": 30000.0
    }
])

print("=== 1. 測試逐筆連鎖複利權益曲線 ===")
df_equity = generate_trade_equity_curve(mock_trades)
print(df_equity)

print("\n=== 2. 測試績效指標計算 ===")
metrics = calculate_metrics(mock_trades, df_equity)
for k, v in metrics.items():
    if k in ["avg_monthly_return", "avg_trade_return", "max_drawdown", "worst_single_trade_return"]:
        print(f"{k}: {v*100:.2f}%")
    else:
        print(f"{k}: {v:.2f}")
