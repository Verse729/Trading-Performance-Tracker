import plotly.graph_objects as gr
import pandas as pd

# ---- 設計系統 tokens（淺色質感精緻風）----
SURFACE = '#fcfcfb'
INK_PRIMARY = '#0b0b0b'
INK_SECONDARY = '#52514e'
INK_MUTED = '#898781'
GRID = '#e1e0d9'
BASELINE = '#c3c2b7'

GOOD = '#0ca30c'        # 獲利（狀態色，非分類色）
CRITICAL = '#d03b3b'    # 虧損
GOOD_FILL = 'rgba(12, 163, 12, 0.10)'
CRITICAL_FILL = 'rgba(208, 59, 59, 0.10)'

FONT_FAMILY = "system-ui, -apple-system, 'Segoe UI', sans-serif"

LEGEND_STYLE = dict(
    orientation='h', yanchor='bottom', y=1.02, xanchor='right', x=1,
    bgcolor='rgba(0,0,0,0)', bordercolor='rgba(0,0,0,0)'
)
HOVERLABEL_STYLE = dict(bgcolor=SURFACE, bordercolor=GRID, font=dict(family=FONT_FAMILY, size=12, color=INK_PRIMARY))


def _build_stem_segments(x_vals, y_vals, mask):
    """將符合 mask 的點組成從 y=0 出發的獨立線段（用 None 分隔），供單一 trace 畫出多根細針。"""
    xs, ys = [], []
    for xi, yi, keep in zip(x_vals, y_vals, mask):
        if keep:
            xs += [xi, xi, None]
            ys += [0, yi, None]
    return xs, ys


def _split_at_zero(x_vals, y_vals):
    """將序列依零軸正負切段，並在正負交界處內插出零點，讓每段能各自上色/填色。"""
    segments = []
    cur_x, cur_y = [x_vals[0]], [y_vals[0]]
    cur_sign = y_vals[0] >= 0

    for i in range(1, len(x_vals)):
        x0, y0 = x_vals[i - 1], y_vals[i - 1]
        x1, y1 = x_vals[i], y_vals[i]
        sign1 = y1 >= 0

        if sign1 != cur_sign and y1 != y0:
            frac = (0 - y0) / (y1 - y0)
            cross_x = x0 + frac * (x1 - x0)
            cur_x.append(cross_x)
            cur_y.append(0.0)
            segments.append((cur_x, cur_y, cur_sign))
            cur_x, cur_y = [cross_x], [0.0]
            cur_sign = sign1

        cur_x.append(x1)
        cur_y.append(y1)

    segments.append((cur_x, cur_y, cur_sign))
    return segments


def plot_performance_charts(df_trades: pd.DataFrame, df_daily: pd.DataFrame) -> gr.Figure:
    """
    單筆結算報酬率：細針狀 lollipop 圖，以獲利/虧損狀態色區分，
    並僅在最佳與最差交易上做選擇性標籤。
    """
    if df_trades.empty:
        fig = gr.Figure()
        fig.update_layout(title="暫無交易數據可繪製圖表")
        return fig

    df_plot_trades = df_trades.copy()
    df_plot_trades['sell_date'] = pd.to_datetime(df_plot_trades['sell_date'])

    x_vals = df_plot_trades['sell_date'].tolist()
    y_data = df_plot_trades['net_return_pct']
    y_label = "單次結算報酬率 (%)"
    hover_template_trade = (
        "<b>交易編號:</b> %{customdata[0]}<br>"
        "<b>策略:</b> %{customdata[1]}<br>"
        "<b>平倉日期:</b> %{x|%Y-%m-%d}<br>"
        "<b>結算損益:</b> %{y:+.2f}%<extra></extra>"
    )

    gain_mask = (y_data >= 0).tolist()
    loss_mask = [not m for m in gain_mask]

    fig = gr.Figure()

    # 1. 細針（2px 線段，依正負分成兩條 trace 上色，同時作為圖例）
    gain_x, gain_y = _build_stem_segments(x_vals, y_data.tolist(), gain_mask)
    loss_x, loss_y = _build_stem_segments(x_vals, y_data.tolist(), loss_mask)

    fig.add_trace(gr.Scatter(
        x=gain_x, y=gain_y, mode='lines', name='獲利交易',
        line=dict(color=GOOD, width=2), hoverinfo='skip'
    ))
    fig.add_trace(gr.Scatter(
        x=loss_x, y=loss_y, mode='lines', name='虧損交易',
        line=dict(color=CRITICAL, width=2), hoverinfo='skip'
    ))

    # 2. 針尖圓點（≥8px，白色描邊環）
    marker_colors = [GOOD if v >= 0 else CRITICAL for v in y_data]
    fig.add_trace(gr.Scatter(
        x=x_vals, y=y_data,
        mode='markers',
        customdata=df_plot_trades[['trade_id', 'strategy_name']],
        marker=dict(size=10, color=marker_colors, line=dict(width=2, color=SURFACE)),
        hovertemplate=hover_template_trade,
        showlegend=False
    ))

    # 3. 零軸基準線
    x_min, x_max = min(x_vals), max(x_vals)
    pad = max((x_max - x_min) * 0.03, pd.Timedelta(days=2))
    fig.add_shape(
        type="line", x0=x_min - pad, x1=x_max + pad, y0=0, y1=0,
        line=dict(color=BASELINE, width=1)
    )

    # 4. 選擇性標籤：只標最佳與最差交易
    max_idx, min_idx = y_data.idxmax(), y_data.idxmin()
    annotations = [dict(
        x=df_plot_trades.loc[max_idx, 'sell_date'], y=y_data.loc[max_idx],
        text=f"<b>{y_data.loc[max_idx]:+.2f}%</b>", showarrow=False,
        yshift=16, font=dict(color=INK_PRIMARY, size=12, family=FONT_FAMILY)
    )]
    if min_idx != max_idx:
        annotations.append(dict(
            x=df_plot_trades.loc[min_idx, 'sell_date'], y=y_data.loc[min_idx],
            text=f"<b>{y_data.loc[min_idx]:+.2f}%</b>", showarrow=False,
            yshift=-16, font=dict(color=INK_PRIMARY, size=12, family=FONT_FAMILY)
        ))

    fig.update_layout(
        height=400,
        margin=dict(l=60, r=30, t=40, b=40),
        hovermode="closest",
        plot_bgcolor=SURFACE,
        paper_bgcolor='rgba(0,0,0,0)',
        font=dict(family=FONT_FAMILY, color=INK_SECONDARY),
        legend=LEGEND_STYLE,
        hoverlabel=HOVERLABEL_STYLE,
        annotations=annotations,
        xaxis_range=[x_min - pad, x_max + pad]
    )
    fig.update_xaxes(showgrid=True, gridcolor=GRID, linecolor=BASELINE, mirror=True, zeroline=False)
    fig.update_yaxes(title_text=y_label, showgrid=True, gridcolor=GRID, linecolor=BASELINE, mirror=True, zeroline=False)

    return fig


def plot_cumulative_pnl_chart(df_trades: pd.DataFrame) -> gr.Figure:
    """
    累積損益曲線：沿零軸依正負自動切色與淡色填色（獲利綠/虧損紅），
    僅標示期末金額，其餘細節交由 hover 呈現。
    """
    fig = gr.Figure()

    if df_trades.empty:
        fig.update_layout(title="暫無數據可繪製累積損益曲線")
        return fig

    df_plot = df_trades.copy()
    df_plot['sell_date'] = pd.to_datetime(df_plot['sell_date'])
    df_plot = df_plot.sort_values('sell_date').reset_index(drop=True)
    df_plot['cum_pnl'] = df_plot['net_profit_loss'].cumsum()

    x_vals = df_plot['sell_date'].tolist()
    y_vals = df_plot['cum_pnl'].tolist()

    # 1. 依零軸切段，各段各自上色與淡色填色
    for seg_x, seg_y, sign in _split_at_zero(x_vals, y_vals):
        color = GOOD if sign else CRITICAL
        fill_color = GOOD_FILL if sign else CRITICAL_FILL
        fig.add_trace(gr.Scatter(
            x=seg_x, y=seg_y, mode='lines',
            line=dict(color=color, width=2),
            fill='tozeroy', fillcolor=fill_color,
            hoverinfo='skip', showlegend=False
        ))

    # 2. 圖例代理 trace（切段 trace 本身不掛圖例，避免每段重複出現）
    fig.add_trace(gr.Scatter(x=[None], y=[None], mode='lines', name='獲利區間', line=dict(color=GOOD, width=2)))
    fig.add_trace(gr.Scatter(x=[None], y=[None], mode='lines', name='虧損區間', line=dict(color=CRITICAL, width=2)))

    # 3. 逐筆交易點（圓點 + hover）
    marker_colors = [GOOD if v >= 0 else CRITICAL for v in y_vals]
    fig.add_trace(gr.Scatter(
        x=x_vals, y=y_vals, mode='markers',
        marker=dict(size=9, color=marker_colors, line=dict(width=2, color=SURFACE)),
        customdata=df_plot[['trade_id', 'net_profit_loss']],
        hovertemplate=(
            "<b>平倉日期:</b> %{x|%Y-%m-%d}<br>"
            "<b>累積損益:</b> $%{y:+,.0f} 元<br>"
            "<b>交易編號:</b> %{customdata[0]}<br>"
            "<b>本筆損益:</b> $%{customdata[1]:+,.0f} 元<extra></extra>"
        ),
        showlegend=False
    ))

    # 4. 零軸基準線
    x_min, x_max = min(x_vals), max(x_vals)
    pad = max((x_max - x_min) * 0.05, pd.Timedelta(days=2))
    fig.add_shape(
        type="line", x0=x_min - pad, x1=x_max + pad, y0=0, y1=0,
        line=dict(color=BASELINE, width=1)
    )

    # 5. 選擇性標籤：期末累積金額
    last_x, last_y = x_vals[-1], y_vals[-1]
    fig.add_annotation(
        x=last_x, y=last_y, text=f"<b>${last_y:+,.0f}</b>",
        showarrow=False, xanchor='left', xshift=14,
        font=dict(color=INK_PRIMARY, size=13, family=FONT_FAMILY)
    )

    fig.update_layout(
        height=350,
        margin=dict(l=60, r=30, t=40, b=40),
        hovermode="closest",
        plot_bgcolor=SURFACE,
        paper_bgcolor='rgba(0,0,0,0)',
        font=dict(family=FONT_FAMILY, color=INK_SECONDARY),
        legend=LEGEND_STYLE,
        hoverlabel=HOVERLABEL_STYLE,
        xaxis_range=[x_min - pad, x_max + pad]
    )
    fig.update_xaxes(showgrid=True, gridcolor=GRID, linecolor=BASELINE, mirror=True, zeroline=False)
    fig.update_yaxes(title_text="累積損益金額 (元)", showgrid=True, gridcolor=GRID, linecolor=BASELINE, mirror=True, zeroline=False)

    return fig
