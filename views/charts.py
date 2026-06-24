import plotly.graph_objects as gr
import pandas as pd

def plot_performance_charts(df_trades: pd.DataFrame, df_daily: pd.DataFrame) -> gr.Figure:
    """
    專業級金融脈衝圖 (Stem/Impulse Plot)
    每個交易點皆有一根從 Y=0 出發的垂直針狀 Bar 支撐
    """
    if df_trades.empty:
        fig = gr.Figure()
        fig.update_layout(title="暫無交易數據可繪製圖表")
        return fig

    df_plot_trades = df_trades.copy()
    df_plot_trades['sell_date'] = pd.to_datetime(df_plot_trades['sell_date'])

    y_data = df_plot_trades['net_return_pct']
    y_label = "單次結算報酬率 (%)"
    hover_template_trade = "<b>交易編號:</b> %{customdata[0]}<br><b>策略:</b> %{customdata[1]}<br><b>平倉日期:</b> %{x|%Y-%m-%d}<br><b>結算損益:</b> %{y:+.2f}%<extra></extra>"

    fig = gr.Figure()

    # 1. 💡 繪製垂直針狀 Bar (利用 error_y 機制完美實現從 Y=0 延伸)
    # 賺錢的柱子給淡綠色，賠錢的給淡紅色，避免搶了中心圓點的焦點
    bar_colors = y_data.apply(lambda x: 'rgba(0, 204, 150, 0.4)' if x >= 0 else 'rgba(239, 85, 59, 0.4)')
    
    # 我們用長條圖 (Bar) 來模擬細緻的針狀線
    fig.add_trace(
        gr.Bar(
            x=df_plot_trades['sell_date'],
            y=y_data,
            width=100000000, # 控制針狀柱子的粗細 (單位為毫秒，這大約是 1~2 天寬度，看起來像細線)
            marker=dict(color=bar_colors),
            hoverinfo='skip', # 柱子本身不觸發 hover，留給圓點觸發
            showlegend=False
        )
    )

    # 2. 💡 繪製頂部的核心發光圓點
    fig.add_trace(
        gr.Scatter(
            x=df_plot_trades['sell_date'], 
            y=y_data,
            mode='markers',
            name="獨立交易",
            customdata=df_plot_trades[['trade_id', 'strategy_name']],
            marker=dict(
                size=12,
                color=y_data.apply(lambda x: '#00cc96' if x >= 0 else '#ef553b'), # 高飽和核心
                symbol='circle',
                line=dict(width=2, color='#ffffff') # 立體白邊
            ),
            hovertemplate=hover_template_trade
        )
    )

    # 3. 加上中央基準零軸
    fig.add_shape(
        type="line",
        x0=df_plot_trades['sell_date'].min() - pd.Timedelta(days=5) if len(df_plot_trades) > 0 else 0,
        x1=df_plot_trades['sell_date'].max() + pd.Timedelta(days=5) if len(df_plot_trades) > 0 else 1,
        y0=0, y1=0,
        line=dict(color="#94a3b8", width=1.5, dash="dash") # 洗鍊的深灰虛線零軸
    )

    # 調整佈局與極簡背景
    fig.update_layout(
        height=400,
        margin=dict(l=60, r=30, t=20, b=40),
        showlegend=False,
        hovermode="closest",
        plot_bgcolor='#f8fafc',
        paper_bgcolor='rgba(0,0,0,0)',
        barmode='overlay' # 確保柱子與點點完美重疊
    )

    fig.update_xaxes(showgrid=True, gridcolor='#e2e8f0', linecolor='#cbd5e1', mirror=True)
    fig.update_yaxes(title_text=y_label, showgrid=True, gridcolor='#e2e8f0', linecolor='#cbd5e1', mirror=True)

    return fig


def plot_cumulative_pnl_chart(df_trades: pd.DataFrame) -> gr.Figure:
    """
    折線圖：以每筆交易平倉日為資料點，顯示累積絕對損益金額的階梯式曲線
    """
    fig = gr.Figure()

    if df_trades.empty:
        fig.update_layout(title="暫無數據可繪製累積損益曲線")
        return fig

    df_plot = df_trades.copy()
    df_plot['sell_date'] = pd.to_datetime(df_plot['sell_date'])
    df_plot = df_plot.sort_values('sell_date').reset_index(drop=True)
    df_plot['cum_pnl'] = df_plot['net_profit_loss'].cumsum()

    is_profit = df_plot['cum_pnl'].iloc[-1] >= 0
    line_color = '#00cc96' if is_profit else '#ef553b'
    fill_color = 'rgba(0, 204, 150, 0.1)' if is_profit else 'rgba(239, 85, 59, 0.1)'
    marker_colors = df_plot['cum_pnl'].apply(lambda x: '#00cc96' if x >= 0 else '#ef553b')

    fig.add_trace(
        gr.Scatter(
            x=df_plot['sell_date'],
            y=df_plot['cum_pnl'],
            mode='lines+markers',
            name="累積損益",
            line=dict(color=line_color, width=2),
            fill='tozeroy',
            fillcolor=fill_color,
            marker=dict(
                size=10,
                color=marker_colors,
                symbol='circle',
                line=dict(width=2, color='#ffffff')
            ),
            customdata=df_plot[['trade_id', 'net_profit_loss']],
            hovertemplate=(
                "<b>平倉日期:</b> %{x|%Y-%m-%d}<br>"
                "<b>累積損益:</b> $%{y:+,.0f} 元<br>"
                "<b>交易編號:</b> %{customdata[0]}<br>"
                "<b>本筆損益:</b> $%{customdata[1]:+,.0f} 元<extra></extra>"
            )
        )
    )

    fig.add_shape(
        type="line",
        x0=df_plot['sell_date'].min(),
        x1=df_plot['sell_date'].max(),
        y0=0, y1=0,
        line=dict(color="#94a3b8", width=1.5, dash="dash")
    )

    fig.update_layout(
        height=350,
        margin=dict(l=60, r=30, t=20, b=40),
        showlegend=False,
        hovermode="x unified",
        plot_bgcolor='#f8fafc',
        paper_bgcolor='rgba(0,0,0,0)'
    )
    fig.update_xaxes(showgrid=True, gridcolor='#e2e8f0', linecolor='#cbd5e1', mirror=True)
    fig.update_yaxes(title_text="累積損益金額 (元)", showgrid=True, gridcolor='#e2e8f0', linecolor='#cbd5e1', mirror=True)

    return fig