import pandas as pd
import numpy as np
from config import RISK_FREE_RATE

def calculate_metrics(df_trades: pd.DataFrame, df_daily: pd.DataFrame) -> dict:
    """
    計算核心績效指標 (採用視角二：完全剔除未持倉月份)
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

    # 2. 平均月報酬 (視角二：完全剔除沒持倉的真空月份)
    monthly_series = df_daily['daily_return'].resample('ME').sum()
    
    # 關鍵過濾：找出「當月每日報酬不全為 0」的活躍月份
    # 這裡利用 resample('ME') 檢查每日報酬絕對值的最大值是否大於 0
    active_month_mask = df_daily['daily_return'].abs().resample('ME').max() > 0
    active_months = monthly_series[active_month_mask]
    
    if not active_months.empty:
        metrics["avg_monthly_return"] = float(active_months.mean())
    else:
        metrics["avg_monthly_return"] = 0.0

    # 3. Max Drawdown (最大回撤 % 數)
    nav_series = df_daily['nav']
    running_max = nav_series.cummax()
    drawdown = (nav_series - running_max) / running_max
    max_dd = float(drawdown.min())
    metrics["max_drawdown"] = max_dd

    # 4. Sharpe Ratio (年化夏普值)
    annual_return = metrics["avg_monthly_return"] * 12
    daily_std = df_daily['daily_return'].std()
    annual_vol = daily_std * np.sqrt(365) if daily_std > 0 else 0.0
    
    # 防呆機制：如果波動度年化低於萬分之一 (通常代表只有 1 筆交易且無波動)
    # 則強設定夏普值為 0，避免分母趨近於 0 導致數值爆表
    if annual_vol > 0.0001:
        metrics["sharpe_ratio"] = float((annual_return - RISK_FREE_RATE) / annual_vol)
    else:
        metrics["sharpe_ratio"] = 0.0

    # 5. Calmar Ratio (卡瑪比率)
    abs_max_dd = abs(max_dd)
    if abs_max_dd > 0:
        metrics["calmar_ratio"] = float(annual_return / abs_max_dd)
    else:
        metrics["calmar_ratio"] = 0.0

    return metrics
