import streamlit as st
import pandas as pd

def render_dashboard(metrics: dict, df_trades: pd.DataFrame):
    """
    渲染績效卡片儀表板與交易明細表格 (內建自動計算持股天數與日報酬欄位)
    """
    st.subheader("📊 策略績效儀表板")

    # 1. 橫向排列的 5 大指標卡片
    col1, col2, col3, col4, col5 = st.columns(5)
    
    with col1:
        st.metric(label="交易總次數", value=f"{metrics['total_trades']} 次")
        
    with col2:
        avg_m_ret = metrics['avg_monthly_return'] * 100
        st.metric(label="平均月報酬", value=f"{avg_m_ret:.2f}%")
        
    with col3:
        max_dd = metrics['max_drawdown'] * 100
        st.metric(label="Max Drawdown", value=f"{max_dd:.2f}%")
        
    with col4:
        st.metric(label="Sharpe Ratio (夏普值)", value=f"{metrics['sharpe_ratio']:.2f}")
        
    with col5:
        st.metric(label="Calmar Ratio (卡瑪比率)", value=f"{metrics['calmar_ratio']:.2f}")

    st.markdown("---")

    # 2. 詳細交易歷史明細表
    st.subheader("📋 交易明細紀錄")
    if df_trades.empty:
        st.info("目前無交易明細數據。請使用下方維護表單新增交易。")
    else:
        st.caption("💡 點擊欄位名稱可進行排序，右上角可進行關鍵字搜尋")
        
        # 動態計算要呈現在表格上的衍生欄位
        df_display = df_trades.copy()
        b_date = pd.to_datetime(df_display['buy_date'])
        s_date = pd.to_datetime(df_display['sell_date'])
        
        # 1. 自動計算持股天數
        df_display['holding_days'] = (s_date - b_date).dt.days + 1
        
        # 2. 自動計算平均日報酬 (%)
        df_display['daily_ret_pct'] = df_display['net_return_pct'] / df_display['holding_days']
        
        # 調整欄位順序，讓計算欄位放在起迄日期後面
        df_display = df_display[[
            'trade_id', 'strategy_name', 'version', 'buy_date', 'sell_date', 
            'holding_days', 'daily_ret_pct', 'net_return_pct', 'net_profit_loss'
        ]]

        # 美化欄位名稱
        df_display.columns = [
            "交易編號", "策略名稱", "版本", "買進日期", "賣出日期", 
            "持股天數", "平均日報酬 (%)", "結算報酬率 (%)", "絕對損益金額 (元)"
        ]
        
        # 渲染互動式表格 (使用 2026 最新 width='stretch' 規範)
        st.dataframe(
            df_display, 
            width='stretch',
            hide_index=True
        )
