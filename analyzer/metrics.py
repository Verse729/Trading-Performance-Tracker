import pandas as pd
import numpy as np
from config import RISK_FREE_RATE, INITIAL_CAPITAL

def calculate_metrics(df_trades: pd.DataFrame, df_equity: pd.DataFrame) -> dict:
    metrics = {
        "total_trades": 0,
        "total_pnl": 0.0,
        "avg_monthly_return": 0.0,
        "avg_trade_return": 0.0,
        "max_drawdown": 0.0,
        "worst_single_trade_return": 0.0,
        "sharpe_ratio": 0.0,
        "calmar_ratio": 0.0
    }

    if df_trades.empty or df_equity.empty:
        return metrics

    # 1. 交易總次數 / 累積損益金額
    metrics["total_trades"] = len(df_trades)
    metrics["total_pnl"] = float(df_trades['net_profit_loss'].sum())

    returns = df_equity['return_pct']

    # 2. 單次週期期望報酬 (各筆交易報酬率的算術平均)
    metrics["avg_trade_return"] = float(returns.mean())

    # 3. 單筆最大虧損 % (原本 Max Drawdown 的定義，保留作為輔助指標)
    min_trade_return = df_trades['net_return_pct'].min()
    metrics["worst_single_trade_return"] = float(min_trade_return / 100.0) if min_trade_return < 0 else 0.0

    # 4. 年化報酬 (CAGR)：用實際經過的日曆天數換算，避免因跳過交易週期而失真
    buy_dates = pd.to_datetime(df_trades['buy_date'])
    sell_dates = pd.to_datetime(df_trades['sell_date'])
    total_days = max((sell_dates.max() - buy_dates.min()).days, 1)

    final_nav = df_equity['nav'].iloc[-1]
    total_return = final_nav / INITIAL_CAPITAL - 1.0
    annual_return = (1.0 + total_return) ** (365.25 / total_days) - 1.0

    # 5. 平均月報酬：由年化報酬複利換算回月報酬 (取代原本「日報酬平均 * 30」的近似值)
    metrics["avg_monthly_return"] = float((1.0 + annual_return) ** (1.0 / 12.0) - 1.0)

    # 6. 真實 Max Drawdown：權益曲線的峰谷回撤 (peak-to-trough)
    running_max = df_equity['nav'].cummax()
    drawdown = (df_equity['nav'] - running_max) / running_max
    metrics["max_drawdown"] = float(drawdown.min())

    # 7. Sharpe Ratio：以每筆交易報酬序列的樣本標準差，依實際交易頻率年化
    if len(returns) > 1:
        periods_per_year = len(returns) / (total_days / 365.25)
        annual_vol = float(returns.std(ddof=1) * np.sqrt(periods_per_year))
        if annual_vol > 0.0001:
            metrics["sharpe_ratio"] = float((annual_return - RISK_FREE_RATE) / annual_vol)

    # 8. Calmar Ratio：年化報酬 / 真實最大回撤
    if abs(metrics["max_drawdown"]) > 0:
        metrics["calmar_ratio"] = float(annual_return / abs(metrics["max_drawdown"]))

    return metrics
