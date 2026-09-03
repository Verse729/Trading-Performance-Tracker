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
  FONT_FAMILY: "system-ui, -apple-system, 'Segoe UI', sans-serif"
};

TPT.charts = (function () {
  const T = TPT.chartTokens;
  const LEGEND_STYLE = { orientation: 'h', yanchor: 'bottom', y: 1.02, xanchor: 'right', x: 1, bgcolor: 'rgba(0,0,0,0)', bordercolor: 'rgba(0,0,0,0)' };
  const HOVERLABEL_STYLE = { bgcolor: T.SURFACE, bordercolor: T.GRID, font: { family: T.FONT_FAMILY, size: 12, color: T.INK_PRIMARY } };

  function buildStemSegments(xVals, yVals, mask) {
    const xs = [], ys = [];
    for (let i = 0; i < xVals.length; i++) {
      if (mask[i]) {
        xs.push(xVals[i], xVals[i], null);
        ys.push(0, yVals[i], null);
      }
    }
    return { xs, ys };
  }

  function splitAtZero(xVals, yVals) {
    const segments = [];
    let curX = [xVals[0]], curY = [yVals[0]];
    let curSign = yVals[0] >= 0;
    for (let i = 1; i < xVals.length; i++) {
      const x0 = xVals[i - 1], y0 = yVals[i - 1];
      const x1 = xVals[i], y1 = yVals[i];
      const sign1 = y1 >= 0;
      if (sign1 !== curSign && y1 !== y0) {
        const frac = (0 - y0) / (y1 - y0);
        const crossX = new Date(x0.getTime() + frac * (x1.getTime() - x0.getTime()));
        curX.push(crossX); curY.push(0.0);
        segments.push({ x: curX, y: curY, sign: curSign });
        curX = [crossX]; curY = [0.0];
        curSign = sign1;
      }
      curX.push(x1); curY.push(y1);
    }
    segments.push({ x: curX, y: curY, sign: curSign });
    return segments;
  }

  function buildReturnsChart(trades) {
    if (!trades || trades.length === 0) {
      return { data: [], layout: { title: '暫無交易數據可繪製圖表' } };
    }
    const xVals = trades.map(t => new Date(t.sell_date));
    const yData = trades.map(t => t.net_return_pct);
    const gainMask = yData.map(v => v >= 0);
    const lossMask = gainMask.map(v => !v);

    const gainSeg = buildStemSegments(xVals, yData, gainMask);
    const lossSeg = buildStemSegments(xVals, yData, lossMask);
    const markerColors = yData.map(v => v >= 0 ? T.GOOD : T.CRITICAL);

    let maxIdx = 0, minIdx = 0;
    yData.forEach((v, i) => {
      if (v > yData[maxIdx]) maxIdx = i;
      if (v < yData[minIdx]) minIdx = i;
    });

    const fmtPct = v => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;
    const annotations = [{
      x: xVals[maxIdx], y: yData[maxIdx], text: `<b>${fmtPct(yData[maxIdx])}</b>`,
      showarrow: false, yshift: 16, font: { color: T.INK_PRIMARY, size: 12, family: T.FONT_FAMILY }
    }];
    if (minIdx !== maxIdx) {
      annotations.push({
        x: xVals[minIdx], y: yData[minIdx], text: `<b>${fmtPct(yData[minIdx])}</b>`,
        showarrow: false, yshift: -16, font: { color: T.INK_PRIMARY, size: 12, family: T.FONT_FAMILY }
      });
    }

    const xTimes = xVals.map(d => d.getTime());
    const xMin = new Date(Math.min(...xTimes));
    const xMax = new Date(Math.max(...xTimes));
    const padMs = Math.max((xMax - xMin) * 0.03, 2 * 86400000);
    const xRangeMin = new Date(xMin.getTime() - padMs);
    const xRangeMax = new Date(xMax.getTime() + padMs);

    const data = [
      { x: gainSeg.xs, y: gainSeg.ys, mode: 'lines', name: '獲利交易', line: { color: T.GOOD, width: 2 }, hoverinfo: 'skip' },
      { x: lossSeg.xs, y: lossSeg.ys, mode: 'lines', name: '虧損交易', line: { color: T.CRITICAL, width: 2 }, hoverinfo: 'skip' },
      {
        x: xVals, y: yData, mode: 'markers',
        customdata: trades.map(t => [t.trade_id, t.strategy_name]),
        marker: { size: 10, color: markerColors, line: { width: 2, color: T.SURFACE } },
        hovertemplate: '<b>交易編號:</b> %{customdata[0]}<br><b>策略:</b> %{customdata[1]}<br><b>平倉日期:</b> %{x|%Y-%m-%d}<br><b>結算損益:</b> %{y:+.2f}%<extra></extra>',
        showlegend: false
      }
    ];

    const layout = {
      height: 400,
      margin: { l: 60, r: 30, t: 40, b: 40 },
      hovermode: 'closest',
      plot_bgcolor: T.SURFACE,
      paper_bgcolor: 'rgba(0,0,0,0)',
      font: { family: T.FONT_FAMILY, color: T.INK_SECONDARY },
      legend: LEGEND_STYLE,
      hoverlabel: HOVERLABEL_STYLE,
      annotations,
      shapes: [{ type: 'line', x0: xRangeMin, x1: xRangeMax, y0: 0, y1: 0, line: { color: T.BASELINE, width: 1 } }],
      xaxis: { range: [xRangeMin, xRangeMax], showgrid: true, gridcolor: T.GRID, linecolor: T.BASELINE, mirror: true, zeroline: false },
      yaxis: { title: '單次結算報酬率 (%)', showgrid: true, gridcolor: T.GRID, linecolor: T.BASELINE, mirror: true, zeroline: false }
    };

    return { data, layout };
  }

  function buildCumPnlChart(trades) {
    if (!trades || trades.length === 0) {
      return { data: [], layout: { title: '暫無數據可繪製累積損益曲線' } };
    }
    const sorted = [...trades].sort((a, b) => new Date(a.sell_date) - new Date(b.sell_date));
    let cum = 0;
    const xVals = [], yVals = [];
    sorted.forEach(t => {
      cum += t.net_profit_loss;
      xVals.push(new Date(t.sell_date));
      yVals.push(cum);
    });

    const segments = splitAtZero(xVals, yVals);
    const data = [];
    segments.forEach(seg => {
      const color = seg.sign ? T.GOOD : T.CRITICAL;
      const fillColor = seg.sign ? T.GOOD_FILL : T.CRITICAL_FILL;
      data.push({ x: seg.x, y: seg.y, mode: 'lines', line: { color, width: 2 }, fill: 'tozeroy', fillcolor: fillColor, hoverinfo: 'skip', showlegend: false });
    });

    data.push({ x: [null], y: [null], mode: 'lines', name: '獲利區間', line: { color: T.GOOD, width: 2 } });
    data.push({ x: [null], y: [null], mode: 'lines', name: '虧損區間', line: { color: T.CRITICAL, width: 2 } });

    const markerColors = yVals.map(v => v >= 0 ? T.GOOD : T.CRITICAL);
    data.push({
      x: xVals, y: yVals, mode: 'markers',
      marker: { size: 9, color: markerColors, line: { width: 2, color: T.SURFACE } },
      customdata: sorted.map(t => [t.trade_id, t.net_profit_loss]),
      hovertemplate: '<b>平倉日期:</b> %{x|%Y-%m-%d}<br><b>累積損益:</b> $%{y:+,.0f} 元<br><b>交易編號:</b> %{customdata[0]}<br><b>本筆損益:</b> $%{customdata[1]:+,.0f} 元<extra></extra>',
      showlegend: false
    });

    const xTimes = xVals.map(d => d.getTime());
    const xMin = new Date(Math.min(...xTimes));
    const xMax = new Date(Math.max(...xTimes));
    const padMs = Math.max((xMax - xMin) * 0.05, 2 * 86400000);
    const xRangeMin = new Date(xMin.getTime() - padMs);
    const xRangeMax = new Date(xMax.getTime() + padMs);

    const lastX = xVals[xVals.length - 1];
    const lastY = yVals[yVals.length - 1];
    const sign = lastY >= 0 ? '+' : '-';
    const lastLabel = `<b>$${sign}${Math.round(Math.abs(lastY)).toLocaleString('en-US')}</b>`;

    const layout = {
      height: 350,
      margin: { l: 60, r: 30, t: 40, b: 40 },
      hovermode: 'closest',
      plot_bgcolor: T.SURFACE,
      paper_bgcolor: 'rgba(0,0,0,0)',
      font: { family: T.FONT_FAMILY, color: T.INK_SECONDARY },
      legend: LEGEND_STYLE,
      hoverlabel: HOVERLABEL_STYLE,
      shapes: [{ type: 'line', x0: xRangeMin, x1: xRangeMax, y0: 0, y1: 0, line: { color: T.BASELINE, width: 1 } }],
      annotations: [{ x: lastX, y: lastY, text: lastLabel, showarrow: false, xanchor: 'left', xshift: 14, font: { color: T.INK_PRIMARY, size: 13, family: T.FONT_FAMILY } }],
      xaxis: { range: [xRangeMin, xRangeMax], showgrid: true, gridcolor: T.GRID, linecolor: T.BASELINE, mirror: true, zeroline: false },
      yaxis: { title: '累積損益金額 (元)', showgrid: true, gridcolor: T.GRID, linecolor: T.BASELINE, mirror: true, zeroline: false }
    };

    return { data, layout };
  }

  return { buildReturnsChart, buildCumPnlChart };
})();
