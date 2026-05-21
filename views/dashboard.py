import streamlit as st
import pandas as pd

def render_dashboard(metrics: dict, df_trades: pd.DataFrame):
    """
    渲染績效卡片儀表板與交易明細表格
    """
    st.subheader("📊 策略績效儀表板")

    # 1. 橫向排列的 5 大指標卡片
    col1, col2, col3, col4, col5 = st.columns(5)
    
    with col1:
        st.metric(label="交易總次數", value=f"{metrics['total_trades']} 次")
        
    with col2:
        # 平均月報酬大於 0 顯示綠色，小於 0 顯示紅色（Streamlit 內建視覺）
        avg_m_ret = metrics['avg_monthly_return'] * 100
        st.metric(label="平均月報酬", value=f"{avg_m_ret:.2f}%")
        
    with col3:
        # 最大回撤通常為負值
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
        
        # 美化欄位名稱以便呈現
        df_display = df_trades.copy()
        df_display.columns = [
            "交易編號", "策略名稱", "版本", "買進日期", "賣出日期", "結算報酬率 (%)", "絕對損益金額 (元)"
        ]
        
        # 渲染互動式表格 (停用新增/刪除列功能，純呈現與排序)
        st.dataframe(
            df_display, 
            width='stretch',
            hide_index=True
        )
