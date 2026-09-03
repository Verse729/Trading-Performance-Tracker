window.TPT = window.TPT || {};

TPT.report = (function () {
  const T = TPT.chartTokens;

  function buildReportStyles() {
    return `
    * { box-sizing: border-box; }
    body { margin:0; padding:16px; background:${T.SURFACE}; color:${T.INK_SECONDARY}; font-family:${T.FONT_FAMILY}; }
    .report-header { margin-bottom:20px; }
    .report-header h1 { margin:0 0 4px 0; font-size:1.4rem; color:${T.INK_PRIMARY}; }
    .report-header .subtitle { font-size:0.85rem; color:${T.INK_MUTED}; }
    .section-title { font-size:1.05rem; font-weight:600; color:${T.INK_PRIMARY}; margin:28px 0 12px 0; border-left:4px solid ${T.GOOD}; padding-left:8px; }
    .metric-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:10px; }
    @media (min-width:640px) { .metric-grid { grid-template-columns:repeat(4,1fr); } }
    .metric-card { background:#ffffff; border:1px solid ${T.GRID}; border-radius:10px; padding:12px 14px; }
    .metric-label { font-size:0.72rem; color:${T.INK_MUTED}; margin-bottom:6px; }
    .metric-value { font-size:1.15rem; font-weight:700; }
    .metric-sub { font-size:0.7rem; color:${T.INK_MUTED}; margin-top:4px; }
    .metric-grid-detail { grid-template-columns:repeat(2,1fr); margin-top:10px; }
    @media (min-width:900px) { .metric-grid-detail { grid-template-columns:repeat(4,1fr); } }
    .metric-card-small .metric-value { font-size:0.95rem; }
    .capital-missing { color:#9a6b00; background:#fdf3e0; padding:1px 6px; border-radius:4px; font-size:0.75rem; }
    .chart-block { background:#ffffff; border:1px solid ${T.GRID}; border-radius:10px; padding:8px; margin-bottom:16px; overflow-x:auto; }
    .table-scroll { overflow-x:auto; border:1px solid ${T.GRID}; border-radius:10px; max-height:480px; overflow-y:auto; }
    table.trade-table { width:100%; border-collapse:collapse; font-size:0.8rem; white-space:nowrap; }
    table.trade-table thead th { position:sticky; top:0; background:${T.SURFACE}; color:${T.INK_MUTED}; text-align:left; padding:8px 10px; border-bottom:1px solid ${T.GRID}; }
    table.trade-table tbody td { padding:7px 10px; border-bottom:1px solid ${T.GRID}; color:${T.INK_SECONDARY}; }
    .empty-note { color:${T.INK_MUTED}; font-size:0.9rem; }
    .report-footer { margin-top:28px; font-size:0.75rem; color:${T.INK_MUTED}; text-align:center; }
    `;
  }

  function buildReportHtml({ strategyName, metrics, trades, strategyRows, figs }) {
    const generatedAt = new Date().toLocaleString('zh-TW', { hour12: false });
    const D = TPT.dashboard;
    const plotlySource = window.TPT_PLOTLY_SOURCE || '';
    const strategySection = strategyRows && strategyRows.length
      ? `<div class="section-title">策略比較</div>${D.buildStrategyTableHtml(strategyRows)}`
      : '';
    const plot = (id, fig) => `Plotly.newPlot('${id}', ${JSON.stringify(fig.data)}, ${JSON.stringify(fig.layout)}, {responsive: true, displaylogo: false});`;

    return `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<title>策略績效報告 - ${TPT.utils.escapeHtml(strategyName)}</title>
<style>${buildReportStyles()}</style>
</head>
<body>
  <div class="report-header">
    <h1>📈 ${TPT.utils.escapeHtml(strategyName)} · 策略績效報告</h1>
    <div class="subtitle">產生時間：${generatedAt}</div>
  </div>
  <div class="section-title">總結</div>
  <div class="metric-grid">${D.buildSummaryCardsHtml(metrics)}</div>
  <div class="metric-grid metric-grid-detail">${D.buildDetailCardsHtml(metrics)}</div>
  <div class="section-title">累積報酬率</div>
  <div class="chart-block"><div id="report-chart-1" style="width:100%;"></div></div>
  <div class="section-title">每期報酬率</div>
  <div class="chart-block"><div id="report-chart-2" style="width:100%;"></div></div>
  <div class="section-title">回撤</div>
  <div class="chart-block"><div id="report-chart-3" style="width:100%;"></div></div>
  ${strategySection}
  <div class="section-title">交易明細紀錄</div>
  ${D.buildStaticTableHtml(trades)}
  <div class="report-footer">交易績效追蹤與多策略分析系統 · 本報告可離線開啟</div>
  <script>${plotlySource}</script>
  <script>
    ${plot('report-chart-1', figs.cumReturn)}
    ${plot('report-chart-2', figs.periodReturns)}
    ${plot('report-chart-3', figs.drawdown)}
  </script>
</body>
</html>`;
  }

  return { buildReportHtml };
})();
