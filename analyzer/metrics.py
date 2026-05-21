import pandas as pd
import numpy as np
from config import RISK_FREE_RATE

def calculate_metrics(df_trades: pd.DataFrame, df_daily: pd.DataFrame) -> dict:
    """
    計算核心績效指標
    """
    metrics = {
        "total_trades": 0,
        "avg_monthly_return": 0.0,
        "max_drawdown": 0.0,
        "sharpe_ratio": 0.0,
        "calmar_ratio": 0.0
    }
    
    if df_trades.empty or df_daily.empty:
        return metrics

    # 1. 交易總次數
    metrics["total_trades"] = len(df_trades)

    # 2. 平均月報酬 (將每日報酬按月加總，再取所有月份的平均值)
    # 這樣即使跨月持倉，也能正確反映各月份的平均表現
    monthly_series = df_daily['daily_return'].resample('ME').sum()
    metrics["avg_monthly_return"] = float(monthly_series.mean())

    # 3. Max Drawdown (最大回撤 % 數)
    # 公式：(NAV - 歷史最高NAV) / 歷史最高NAV
    nav_series = df_daily['nav']
    running_max = nav_series.cummax()
    drawdown = (nav_series - running_max) / running_max
    max_dd = float(drawdown.min())  # 這是負值
    metrics["max_drawdown"] = max_dd

    # 4. Sharpe Ratio (年化夏普值)
    # 日常計算習慣：將日超額報酬轉年化，或直接用月報酬計算。
    # 這裡採用標準做法：(年化報酬率 - 年化無風險利率) / 年化波動度
    # 先將月報酬轉換為年化報酬率 (單利估算)
    annual_return = metrics["avg_monthly_return"] * 12
    
    # 計算日報酬標準差並年化 (一年以 365 天計，若為台股可改 252，此處採通用 365)
    daily_std = df_daily['daily_return'].std()
    annual_vol = daily_std * np.sqrt(365) if daily_std > 0 else 0.0
    
    if annual_vol > 0:
        metrics["sharpe_ratio"] = float((annual_return - RISK_FREE_RATE) / annual_vol)
    else:
        metrics["sharpe_ratio"] = 0.0

    # 5. Calmar Ratio (卡瑪比率)
    # 公式：年化報酬率 / |最大回撤|
    abs_max_dd = abs(max_dd)
    if abs_max_dd > 0:
        metrics["calmar_ratio"] = float(annual_return / abs_max_dd)
    else:
        metrics["calmar_ratio"] = 0.0

    return metrics
