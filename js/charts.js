window.TPT = window.TPT || {};

TPT.chartTokens = {
  SURFACE: '#fcfcfb',
  INK_PRIMARY: '#0b0b0b',
  INK_SECONDARY: '#52514e',
  INK_MUTED: '#898781',
  GRID: '#e1e0d9',
  BASELINE: '#c3c2b7',
  GOOD: '#d03b3b',
  CRITICAL: '#0ca30c',
  GOOD_FILL: 'rgba(208, 59, 59, 0.10)',
  CRITICAL_FILL: 'rgba(12, 163, 12, 0.10)',
  SERIES: ['#2f6fdd', '#e08a1e', '#7b4fc2', '#1a9e8f', '#c2437b', '#6b7280'],
  FONT_FAMILY: "system-ui, -apple-system, 'Segoe UI', sans-serif"
};

TPT.charts = (function () {
  const T = TPT.chartTokens;
  const EMPTY = { data: [], layout: { title: '暫無數據' } };
  const LEGEND_STYLE = { orientation: 'h', yanchor: 'bottom', y: 1.02, xanchor: 'right', x: 1, bgcolor: 'rgba(0,0,0,0)', bordercolor: 'rgba(0,0,0,0)' };
  const HOVERLABEL_STYLE = { bgcolor: T.SURFACE, bordercolor: T.GRID, font: { family: T.FONT_FAMILY, size: 12, color: T.INK_PRIMARY } };
  const AXIS = { showgrid: true, gridcolor: T.GRID, linecolor: T.BASELINE, mirror: true, zeroline: false };

  function baseLayout(height, yTitle, periods) {
    return {
      height,
      margin: { l: 60, r: 30, t: 40, b: 40 },
      hovermode: 'x unified',
      plot_bgcolor: T.SURFACE,
      paper_bgcolor: 'rgba(0,0,0,0)',
      font: { family: T.FONT_FAMILY, color: T.INK_SECONDARY },
      legend: LEGEND_STYLE,
      hoverlabel: HOVERLABEL_STYLE,
      // ponytail: 明確給月份順序；Plotly 2.35 的 'category ascending' 遇到 visible:false 的 trace 會崩潰
      xaxis: { ...AXIS, type: 'category', categoryorder: 'array', categoryarray: periods },
      yaxis: { ...AXIS, title: yTitle }
    };
  }

  function seriesColor(s, i, count) {
    if (s.emphasis) return T.INK_PRIMARY;
    if (count === 1) return T.GOOD;
    return T.SERIES[i % T.SERIES.length];
  }

  function sortedPeriods(seriesList) {
    return [...new Set(seriesList.flatMap(s => s.points.map(p => p.period)))].sort();
  }

  function hasData(seriesList) {
    return Array.isArray(seriesList) && seriesList.some(s => s.points && s.points.length > 0);
  }

  function buildCumReturnChart(seriesList) {
    if (!hasData(seriesList)) return EMPTY;
    const data = [];
    seriesList.forEach((s, i) => {
      const x = s.points.map(p => p.period);
      const line = { color: seriesColor(s, i, seriesList.length), width: s.emphasis ? 3 : 2 };
      data.push({ x, y: s.points.map(p => p.cumReturn * 100), mode: 'lines+markers', name: s.name, line, visible: true, hovertemplate: '%{y:+.2f}%<extra>' + s.name + '</extra>' });
      data.push({ x, y: s.points.map(p => p.cumPnl), mode: 'lines+markers', name: s.name, line, visible: false, hovertemplate: '%{y:+,.0f} 元<extra>' + s.name + '</extra>' });
    });
    const retVisible = data.map((_, i) => i % 2 === 0);
    const pnlVisible = retVisible.map(v => !v);
    const layout = baseLayout(400, '累積報酬率 (%)', sortedPeriods(seriesList));
    layout.updatemenus = [{
      type: 'buttons', direction: 'right', x: 0, xanchor: 'left', y: 1.15, yanchor: 'top', showactive: true,
      buttons: [
        { label: '累積報酬率', method: 'update', args: [{ visible: retVisible }, { 'yaxis.title': '累積報酬率 (%)' }] },
        { label: '累積損益金額', method: 'update', args: [{ visible: pnlVisible }, { 'yaxis.title': '累積損益金額 (元)' }] }
      ]
    }];
    layout.shapes = [{ type: 'line', xref: 'paper', x0: 0, x1: 1, y0: 0, y1: 0, line: { color: T.BASELINE, width: 1 } }];
    return { data, layout };
  }

  function buildPeriodReturnsChart(seriesList) {
    if (!hasData(seriesList)) return EMPTY;
    const data = seriesList.map((s, i) => {
      const y = s.points.map(p => p.r * 100);
      const color = seriesList.length === 1 ? y.map(v => v >= 0 ? T.GOOD : T.CRITICAL) : seriesColor(s, i, seriesList.length);
      return { type: 'bar', x: s.points.map(p => p.period), y, name: s.name, marker: { color }, hovertemplate: '%{y:+.2f}%<extra>' + s.name + '</extra>' };
    });
    const layout = baseLayout(350, '每期報酬率 (%)', sortedPeriods(seriesList));
    layout.barmode = 'group';
    layout.showlegend = seriesList.length > 1;
    return { data, layout };
  }

  function buildDrawdownChart(points) {
    if (!points || points.length === 0) return EMPTY;
    const data = [{
      x: points.map(p => p.period), y: points.map(p => p.drawdown * 100), mode: 'lines',
      name: '回撤', line: { color: T.CRITICAL, width: 2 }, fill: 'tozeroy', fillcolor: T.CRITICAL_FILL,
      hovertemplate: '%{y:.2f}%<extra>回撤</extra>'
    }];
    const layout = baseLayout(260, '回撤 (%)', points.map(p => p.period));
    layout.showlegend = false;
    return { data, layout };
  }

  return { buildCumReturnChart, buildPeriodReturnsChart, buildDrawdownChart };
})();
