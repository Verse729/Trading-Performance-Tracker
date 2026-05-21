import plotly.graph_objects as gr
from plotly.subplots import make_subplots
import pandas as pd

def plot_performance_charts(df_daily: pd.DataFrame, view_mode: str = "報酬率 (%)") -> gr.Figure:
    """
    繪製資產權益曲線與回撤圖的雙子圖 (Subplots)
    view_mode: "報酬率 (%)" 或 "絕對金額"
    """
    if df_daily.empty:
        # 回傳一個空白的圖表，避免網頁噴錯誤
        fig = gr.Figure()
        fig.update_layout(title="暫無交易數據可繪製圖表")
        return fig

    # 根據使用者選擇的模式，決定 Y 軸的欄位與標籤
    if view_mode == "報酬率 (%)":
        y_equity = df_daily['cum_return'] * 100  # 轉為百分比
        y_label = "累計報酬率 (%)"
        hover_template_equity = "日期: %{x}<br>累計報酬: %{y:.2f}%<extra></extra>"
        
        # 計算百分比回撤
        running_max = df_daily['nav'].cummax()
        y_drawdown = ((df_daily['nav'] - running_max) / running_max) * 100
        dd_label = "回撤 (%)"
        hover_template_dd = "日期: %{x}<br>回撤幅: %{y:.2f}%<extra></extra>"
    else:
        y_equity = df_daily['nav']
        y_label = "資產淨值 (NAV)"
        hover_template_equity = "日期: %{x}<br>資產淨值: $%{y:,.0f}<extra></extra>"
        
        # 計算金額回撤
        running_max = df_daily['nav'].cummax()
        y_drawdown = df_daily['nav'] - running_max
        dd_label = "回撤金額"
        hover_template_dd = "日期: %{x}<br>回撤金額: $%{y:,.0f}<extra></extra>"

    # 建立上下兩個子圖 (上方占 70%, 下方占 30%)
    fig = make_subplots(
        rows=2, cols=1, 
        shared_xaxes=True, 
        vertical_spacing=0.08,
        row_width=[0.3, 0.7]
    )

    # 上圖：資產權益曲線
    fig.add_trace(
        gr.Scatter(
            x=df_daily.index, 
            y=y_equity,
            mode='lines',
            name=y_label,
            line=dict(color='#2ca02c', width=2),
            hovertemplate=hover_template_equity
        ),
        row=1, col=1
    )

    # 下圖：回撤區域圖
    fig.add_trace(
        gr.Scatter(
            x=df_daily.index, 
            y=y_drawdown,
            mode='lines',
            name=dd_label,
            fill='tozeroy',  # 填滿到 Y=0
            line=dict(color='#d62728', width=1.5),
            fillcolor='rgba(214, 39, 40, 0.2)', # 半透明紅色
            hovertemplate=hover_template_dd
        ),
        row=2, col=1
    )

    # 調整整體視覺風格 (排版與間距)
    fig.update_layout(
        height=550,
        margin=dict(l=50, r=20, t=40, b=40),
        showlegend=False,
        hovermode="x unified",
        plot_bgcolor='white'
    )

    # 美化格線
    fig.update_xaxes(showgrid=True, gridcolor='#f0f0f0', row=1, col=1)
    fig.update_xaxes(showgrid=True, gridcolor='#f0f0f0', row=2, col=1)
    fig.update_yaxes(title_text=y_label, showgrid=True, gridcolor='#f0f0f0', row=1, col=1)
    fig.update_yaxes(title_text=dd_label, showgrid=True, gridcolor='#f0f0f0', row=2, col=1)

    return fig
