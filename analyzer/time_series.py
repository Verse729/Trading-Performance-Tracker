import pandas as pd
import numpy as np
from config import INITIAL_CAPITAL

def generate_daily_equity_curve(df_trades: pd.DataFrame) -> pd.DataFrame:
    """
    將交易明細轉化為每日連續的時間序列，並計算累計權益曲線。
    
    輸入 df_trades 欄位: buy_date, sell_date, net_return_pct, net_profit_loss
    回傳 df_daily 欄位: date, daily_return, daily_pnl, cumulative_return, nav
    """
    if df_trades.empty:
        return pd.DataFrame(columns=['daily_return', 'daily_pnl', 'cum_return', 'nav'])

    # 1. 確保日期欄位為 datetime 格式
    df = df_trades.copy()
    df['buy_date'] = pd.to_datetime(df['buy_date'])
    df['sell_date'] = pd.to_datetime(df['sell_date'])

    # 2. 找出整個交易歷史的起點與終點
    start_date = df['buy_date'].min()
    end_date = df['sell_date'].max()
    
    # 建立連續的每日時間索引
    date_range = pd.date_range(start=start_date, end=end_date, freq='D')
    
    # 初始化每日報酬與損益的 Series (預設為 0)
    daily_returns = pd.Series(0.0, index=date_range)
    daily_pnl = pd.Series(0.0, index=date_range)

    # 3. 將每筆交易平攤到持股期間的每一天
    for _, row in df.iterrows():
        b_date = row['buy_date']
        s_date = row['sell_date']
        
        # 計算持股天數 (至少為 1 天，避免當沖導致除以 0)
        holding_days = (s_date - b_date).days + 1
        
        # 計算每日平攤報酬
        p_return = row['net_return_pct'] / 100.0 / holding_days
        p_pnl = row['net_profit_loss'] / holding_days
        
        # 將這段日期的每一天都加上平攤後的數值 (處理多筆交易重疊)
        daily_returns.loc[b_date:s_date] += p_return
        daily_pnl.loc[b_date:s_date] += p_pnl

    # 4. 組裝成每日時間序列 DataFrame
    df_daily = pd.DataFrame({
        'daily_return': daily_returns,
        'daily_pnl': daily_pnl
    })

    # 5. 計算權益曲線 (Equity Curve)
    # 報酬率累計 (用單利相加或複利相乘皆可，這裡先採用標準淨值疊加：初始資金 + 累計金額損益)
    df_daily['cum_pnl'] = df_daily['daily_pnl'].cumsum()
    df_daily['nav'] = INITIAL_CAPITAL + df_daily['cum_pnl']
    df_daily['cum_return'] = (df_daily['nav'] - INITIAL_CAPITAL) / INITIAL_CAPITAL

    return df_daily
