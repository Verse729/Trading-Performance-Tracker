import pandas as pd
import plotly.graph_objects as gr
import plotly.io as pio
from datetime import datetime

from views.charts import (
    SURFACE, INK_PRIMARY, INK_SECONDARY, INK_MUTED, GRID,
    GOOD, CRITICAL, FONT_FAMILY
)

# 卡片沿用圖表既有的狀態色慣例：獲利/正向指標用 GOOD，虧損/負向風險指標用 CRITICAL
_METRIC_CARDS = [
    ("交易總次數", lambda m: f"{m['total_trades']} 次", lambda m: None),
    ("累積損益金額", lambda m: f"{m['total_pnl']:+,.0f} 元", lambda m: m['total_pnl']),
    ("平均月報酬 (複利年化換算)", lambda m: f"{m['avg_monthly_return'] * 100:.2f}%", lambda m: m['avg_monthly_return']),
    ("單次週期平均報酬", lambda m: f"{m['avg_trade_return'] * 100:.2f}%", lambda m: m['avg_trade_return']),
    ("Max Drawdown (權益曲線峰谷回撤)", lambda m: f"{m['max_drawdown'] * 100:.2f}%", lambda m: -1 if m['max_drawdown'] < 0 else 0),
    ("單筆最大虧損", lambda m: f"{m['worst_single_trade_return'] * 100:.2f}%", lambda m: -1 if m['worst_single_trade_return'] < 0 else 0),
    ("Sharpe Ratio (夏普值)", lambda m: f"{m['sharpe_ratio']:.2f}", lambda m: m['sharpe_ratio']),
    ("Calmar Ratio (卡瑪比率)", lambda m: f"{m['calmar_ratio']:.2f}", lambda m: m['calmar_ratio']),
]


def _status_color(value) -> str:
    if value is None or value == 0:
        return INK_PRIMARY
    return GOOD if value > 0 else CRITICAL


def _build_metric_cards_html(metrics: dict) -> str:
    cards = []
    for label, fmt, tone in _METRIC_CARDS:
        color = _status_color(tone(metrics))
        cards.append(f"""
        <div class="metric-card">
            <div class="metric-label">{label}</div>
            <div class="metric-value" style="color:{color};">{fmt(metrics)}</div>
        </div>""")
    return "".join(cards)


def _build_trade_table_html(df_trades: pd.DataFrame) -> str:
    if df_trades.empty:
        return '<p class="empty-note">目前無交易明細數據。</p>'

    df_display = df_trades.copy()
    b_date = pd.to_datetime(df_display['buy_date'])
    s_date = pd.to_datetime(df_display['sell_date'])

    df_display['holding_days'] = (s_date - b_date).dt.days + 1
    df_display['daily_ret_pct'] = df_display['net_return_pct'] / df_display['holding_days']

    df_display = df_display.sort_values('sell_date').reset_index(drop=True)

    df_display = df_display[[
        'trade_id', 'strategy_name', 'version', 'buy_date', 'sell_date',
        'holding_days', 'daily_ret_pct', 'net_return_pct', 'net_profit_loss'
    ]]
    df_display.columns = [
        "交易編號", "策略名稱", "版本", "買進日期", "賣出日期",
        "持股天數", "平均日報酬(%)", "結算報酬率(%)", "絕對損益(元)"
    ]

    rows = []
    for _, row in df_display.iterrows():
        ret_color = GOOD if row["結算報酬率(%)"] >= 0 else CRITICAL
        pnl_color = GOOD if row["絕對損益(元)"] >= 0 else CRITICAL
        rows.append(f"""
        <tr>
            <td>{row['交易編號']}</td>
            <td>{row['策略名稱']}</td>
            <td>{row['版本']}</td>
            <td>{row['買進日期']}</td>
            <td>{row['賣出日期']}</td>
            <td>{row['持股天數']}</td>
            <td>{row['平均日報酬(%)']:.2f}%</td>
            <td style="color:{ret_color};">{row['結算報酬率(%)']:+.2f}%</td>
            <td style="color:{pnl_color};">{row['絕對損益(元)']:+,.0f}</td>
        </tr>""")

    header_cells = "".join(f"<th>{col}</th>" for col in df_display.columns)
    return f"""
    <div class="table-scroll">
        <table class="trade-table">
            <thead><tr>{header_cells}</tr></thead>
            <tbody>{''.join(rows)}</tbody>
        </table>
    </div>"""


def generate_html_report(
    strategy_name: str,
    metrics: dict,
    df_trades: pd.DataFrame,
    fig_returns: gr.Figure,
    fig_cum_pnl: gr.Figure,
) -> str:
    """
    產生一份可獨立離線開啟、適合手機瀏覽的策略績效報告 (單一 HTML 檔案)。
    Plotly 圖表以 inline 方式內嵌 JS，不需網路連線即可互動 (縮放/hover)。
    """
    generated_at = datetime.now().strftime("%Y-%m-%d %H:%M")

    # 只在第一張圖內嵌完整 plotly.js，第二張圖重用同一份 JS 以縮小檔案體積
    chart1_html = pio.to_html(
        fig_returns, include_plotlyjs=True, full_html=False,
        config={'responsive': True, 'displaylogo': False}
    )
    chart2_html = pio.to_html(
        fig_cum_pnl, include_plotlyjs=False, full_html=False,
        config={'responsive': True, 'displaylogo': False}
    )

    metric_cards_html = _build_metric_cards_html(metrics)
    trade_table_html = _build_trade_table_html(df_trades)

    return f"""<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<title>策略績效報告 - {strategy_name}</title>
<style>
    * {{ box-sizing: border-box; }}
    body {{
        margin: 0;
        padding: 16px;
        background: {SURFACE};
        color: {INK_SECONDARY};
        font-family: {FONT_FAMILY};
    }}
    .report-header {{
        margin-bottom: 20px;
    }}
    .report-header h1 {{
        margin: 0 0 4px 0;
        font-size: 1.4rem;
        color: {INK_PRIMARY};
    }}
    .report-header .subtitle {{
        font-size: 0.85rem;
        color: {INK_MUTED};
    }}
    .section-title {{
        font-size: 1.05rem;
        font-weight: 600;
        color: {INK_PRIMARY};
        margin: 28px 0 12px 0;
        border-left: 4px solid {GOOD};
        padding-left: 8px;
    }}
    .metric-grid {{
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 10px;
    }}
    @media (min-width: 640px) {{
        .metric-grid {{ grid-template-columns: repeat(4, 1fr); }}
    }}
    .metric-card {{
        background: #ffffff;
        border: 1px solid {GRID};
        border-radius: 10px;
        padding: 12px 14px;
    }}
    .metric-label {{
        font-size: 0.72rem;
        color: {INK_MUTED};
        margin-bottom: 6px;
    }}
    .metric-value {{
        font-size: 1.15rem;
        font-weight: 700;
    }}
    .chart-block {{
        background: #ffffff;
        border: 1px solid {GRID};
        border-radius: 10px;
        padding: 8px;
        margin-bottom: 16px;
        overflow-x: auto;
    }}
    .table-scroll {{
        overflow-x: auto;
        border: 1px solid {GRID};
        border-radius: 10px;
        max-height: 480px;
        overflow-y: auto;
    }}
    table.trade-table {{
        width: 100%;
        border-collapse: collapse;
        font-size: 0.8rem;
        white-space: nowrap;
    }}
    table.trade-table thead th {{
        position: sticky;
        top: 0;
        background: {SURFACE};
        color: {INK_MUTED};
        text-align: left;
        padding: 8px 10px;
        border-bottom: 1px solid {GRID};
    }}
    table.trade-table tbody td {{
        padding: 7px 10px;
        border-bottom: 1px solid {GRID};
        color: {INK_SECONDARY};
    }}
    .empty-note {{
        color: {INK_MUTED};
        font-size: 0.9rem;
    }}
    .report-footer {{
        margin-top: 28px;
        font-size: 0.75rem;
        color: {INK_MUTED};
        text-align: center;
    }}
</style>
</head>
<body>
    <div class="report-header">
        <h1>📈 {strategy_name} · 策略績效報告</h1>
        <div class="subtitle">產生時間：{generated_at}</div>
    </div>

    <div class="section-title">績效儀表板</div>
    <div class="metric-grid">{metric_cards_html}</div>

    <div class="section-title">單筆結算報酬率</div>
    <div class="chart-block">{chart1_html}</div>

    <div class="section-title">累積絕對損益金額</div>
    <div class="chart-block">{chart2_html}</div>

    <div class="section-title">交易明細紀錄</div>
    {trade_table_html}

    <div class="report-footer">交易績效追蹤與多策略分析系統 · 本報告可離線開啟</div>
</body>
</html>"""
