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
    .chart-block { background:#ffffff; border:1px solid ${T.GRID}; border-radius:10px; padding:8px; margin-bottom:16px; overflow-x:auto; }
    .table-scroll { overflow-x:auto; border:1px solid ${T.GRID}; border-radius:10px; max-height:480px; overflow-y:auto; }
    table.trade-table { width:100%; border-collapse:collapse; font-size:0.8rem; white-space:nowrap; }
    table.trade-table thead th { position:sticky; top:0; background:${T.SURFACE}; color:${T.INK_MUTED}; text-align:left; padding:8px 10px; border-bottom:1px solid ${T.GRID}; }
    table.trade-table tbody td { padding:7px 10px; border-bottom:1px solid ${T.GRID}; color:${T.INK_SECONDARY}; }
    .empty-note { color:${T.INK_MUTED}; font-size:0.9rem; }
    .report-footer { margin-top:28px; font-size:0.75rem; color:${T.INK_MUTED}; text-align:center; }
    `;
  }

  function buildReportHtml(strategyName, metrics, trades, returnsFig, cumPnlFig) {
    const generatedAt = new Date().toLocaleString('zh-TW', { hour12: false });
    const metricCardsHtml = TPT.dashboard.buildMetricCardsHtml(metrics);
    const tableHtml = TPT.dashboard.buildStaticTableHtml(trades);
    const plotlySource = window.TPT_PLOTLY_SOURCE || '';

    return `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<title>策略績效報告 - ${strategyName}</title>
<style>${buildReportStyles()}</style>
</head>
<body>
  <div class="report-header">
    <h1>📈 ${strategyName} · 策略績效報告</h1>
    <div class="subtitle">產生時間：${generatedAt}</div>
  </div>
  <div class="section-title">績效儀表板</div>
  <div class="metric-grid">${metricCardsHtml}</div>
  <div class="section-title">單筆結算報酬率</div>
  <div class="chart-block"><div id="report-chart-1" style="width:100%;"></div></div>
  <div class="section-title">累積絕對損益金額</div>
  <div class="chart-block"><div id="report-chart-2" style="width:100%;"></div></div>
  <div class="section-title">交易明細紀錄</div>
  ${tableHtml}
  <div class="report-footer">交易績效追蹤與多策略分析系統 · 本報告可離線開啟</div>
  <script>${plotlySource}</script>
  <script>
    Plotly.newPlot('report-chart-1', ${JSON.stringify(returnsFig.data)}, ${JSON.stringify(returnsFig.layout)}, {responsive: true, displaylogo: false});
    Plotly.newPlot('report-chart-2', ${JSON.stringify(cumPnlFig.data)}, ${JSON.stringify(cumPnlFig.layout)}, {responsive: true, displaylogo: false});
  </script>
</body>
</html>`;
  }

  return { buildReportHtml };
})();
