import pandas as pd
import numpy as np
from config import INITIAL_CAPITAL

def generate_trade_equity_curve(df_trades: pd.DataFrame) -> pd.DataFrame:
    """
    將交易明細轉換為依進場順序連鎖複利的權益曲線。

    本策略每個週期(每月10號後的下一交易日進場，最晚下個月10號出場，
    一旦提前出場就不會在同一週期內再進場)只會有一筆不重疊的交易，
    因此不需要按持有天數攤提損益到每一天、也不需要處理重疊區間，
    直接依 buy_date 排序後逐筆複利即可反映真實的資金成長路徑。

    輸入 df_trades 欄位: buy_date, sell_date, net_return_pct, net_profit_loss
    回傳 df_equity 欄位: trade_id, buy_date, sell_date, return_pct, nav, cum_return
    """
    columns = ['trade_id', 'buy_date', 'sell_date', 'return_pct', 'nav', 'cum_return']
    if df_trades.empty:
        return pd.DataFrame(columns=columns)

    df = df_trades.copy()
    df['buy_date'] = pd.to_datetime(df['buy_date'])
    df['sell_date'] = pd.to_datetime(df['sell_date'])

    # 依進場順序排序，確保複利鏈的先後關係正確
    df = df.sort_values('buy_date').reset_index(drop=True)

    df['return_pct'] = df['net_return_pct'] / 100.0
    df['nav'] = INITIAL_CAPITAL * (1.0 + df['return_pct']).cumprod()
    df['cum_return'] = df['nav'] / INITIAL_CAPITAL - 1.0

    return df[columns]
