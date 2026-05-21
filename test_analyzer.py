# test_analyzer.py
import sys
import os
import pandas as pd

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from analyzer.time_series import generate_daily_equity_curve
from analyzer.metrics import calculate_metrics

# 建立模擬交易資料
# T001: 橫跨 3/25 ~ 4.05 (12天)，賺 60,000 元 (6%)
# T002: 橫跨 4/01 ~ 4/10 (10天)，賠 20,000 元 (-2%)
# 觀察 4/01 ~ 4/05 之間是否有正確疊加損益
mock_trades = pd.DataFrame([
    {
        "trade_id": "T001", "strategy_name": "StratA", "version": "v1.0",
        "buy_date": "2026-03-25", "sell_date": "2026-04-05",
        "net_return_pct": 6.0, "net_profit_loss": 60000.0
    },
    {
        "trade_id": "T002", "strategy_name": "StratB", "version": "v1.0",
        "buy_date": "2026-04-01", "sell_date": "2026-04-10",
        "net_return_pct": -2.0, "net_profit_loss": -20000.0
    }
])

print("=== 1. 測試時間序列生成 ===")
df_daily = generate_daily_equity_curve(mock_trades)
# 印出 3/31 ~ 4/03 的變化，觀察跨月與重疊
print(df_daily.loc['2026-03-31':'2026-04-03'])

print("\n=== 2. 測試績效指標計算 ===")
metrics = calculate_metrics(mock_trades, df_daily)
for k, v in metrics.items():
    if k in ["avg_monthly_return", "max_drawdown"]:
        print(f"{k}: {v*100:.2f}%")
    else:
        print(f"{k}: {v:.2f}")
