import pandas as pd
import numpy as np
from config import RISK_FREE_RATE

def calculate_metrics(df_trades: pd.DataFrame, df_daily: pd.DataFrame) -> dict:
    metrics = {
        "total_trades": 0,
        "avg_monthly_return": 0.0,
        "max_drawdown": 0.0,
        "sharpe_ratio": 0.0,
        "calmar_ratio": 0.0
    }
    
    if df_trades.empty:
        return metrics

    # 1. 交易總次數
    metrics["total_trades"] = len(df_trades)

    # 2. 平均月報酬 ── 完美採用你的「平均日報酬推算邏輯」！
    df = df_trades.copy()
    df['buy_date'] = pd.to_datetime(df['buy_date'])
    df['sell_date'] = pd.to_datetime(df['sell_date'])
    
    # 計算每筆交易的持股天數 (避免當沖除以 0，至少為 1)
    holding_days = (df['sell_date'] - df['buy_date']).dt.days + 1
    
    # 計算每筆交易的平均日報酬率
    df['trade_daily_return'] = df['net_return_pct'] / holding_days
    
    # 將所有交易的日報酬率取平均，並放大 30 倍轉換為「月化報酬」
    # 這裡除以 100 是為了保持與原本 metrics 輸出格式（小數點）一致
    metrics["avg_monthly_return"] = float(df['trade_daily_return'].mean() / 100.0 * 30)

    # 3. Max Drawdown (維持原樣，利用連續時間序列確保精確度)
    if not df_daily.empty:
        nav_series = df_daily['nav']
        running_max = nav_series.cummax()
        drawdown = (nav_series - running_max) / running_max
        metrics["max_drawdown"] = float(drawdown.min())
    
    # 4 & 5. Sharpe 與 Calmar 依此類推...
    annual_return = metrics["avg_monthly_return"] * 12
    if not df_daily.empty:
        daily_std = df_daily['daily_return'].std()
        annual_vol = daily_std * np.sqrt(365) if daily_std > 0 else 0.0
        if annual_vol > 0.0001:
            metrics["sharpe_ratio"] = float((annual_return - RISK_FREE_RATE) / annual_vol)
        if abs(metrics["max_drawdown"]) > 0:
            metrics["calmar_ratio"] = float(annual_return / abs(metrics["max_drawdown"]))

    return metrics
