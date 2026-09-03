window.TPT = window.TPT || {};

TPT.app = (function () {
  const ALL_STRATEGIES = '全部策略';
  let currentStrategy = ALL_STRATEGIES;

  async function init() {
    document.getElementById('btn-choose-backup').addEventListener('click', onChooseBackup);
    document.getElementById('btn-export-json').addEventListener('click', onExportJson);
    document.getElementById('file-import-json').addEventListener('change', onImportJson);
    document.getElementById('btn-export-report').addEventListener('click', onExportReport);
    document.getElementById('strategy-select').addEventListener('change', onStrategyChange);
    await refresh();
  }

  async function onStrategyChange(e) {
    currentStrategy = e.target.value;
    await refresh();
  }

  async function onChooseBackup() {
    try {
      await TPT.backup.chooseBackupFile();
      const trades = await TPT.db.getAllTrades();
      await TPT.backup.writeIfConfigured(trades);
      alert('已設定自動備份檔案，並完成第一次寫入。');
    } catch (err) {
      alert('設定失敗：' + err.message);
    }
  }

  async function onExportJson() {
    const trades = await TPT.db.getAllTrades();
    TPT.backup.exportJson(trades);
  }

  async function onImportJson(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const data = await TPT.backup.importJsonFile(file);
      for (const trade of data) {
        await TPT.db.updateTrade(trade);
      }
      alert(`已匯入 ${data.length} 筆交易資料。`);
      await refresh();
    } catch (err) {
      alert('匯入失敗：' + err.message);
    } finally {
      e.target.value = '';
    }
  }

  function filterByStrategy(trades, strategy) {
    if (strategy === ALL_STRATEGIES) return trades;
    return trades.filter(t => t.strategy_name === strategy);
  }

  // 純函式：由全部交易與選定策略算出這一頁需要的所有東西
  function buildView(allTrades, strategy) {
    const filtered = filterByStrategy(allTrades, strategy);
    const series = TPT.timeSeries.buildPeriodSeries(filtered);
    const metrics = TPT.metrics.calculateMetrics(series);

    let seriesList, strategyRows;
    if (strategy === ALL_STRATEGIES) {
      const names = [...new Set(filtered.map(t => t.strategy_name))].sort();
      const perStrategy = names.map(name => ({ name, series: TPT.timeSeries.buildPeriodSeries(filterByStrategy(filtered, name)) }));
      seriesList = perStrategy.map(s => ({ name: s.name, points: s.series.points })).concat([{ name: ALL_STRATEGIES, points: series.points, emphasis: true }]);
      strategyRows = perStrategy.map(s => ({ name: s.name, metrics: TPT.metrics.calculateMetrics(s.series) }));
    } else {
      seriesList = [{ name: strategy, points: series.points }];
      strategyRows = [];
    }

    const figs = {
      cumReturn: TPT.charts.buildCumReturnChart(seriesList),
      periodReturns: TPT.charts.buildPeriodReturnsChart(seriesList.filter(s => !s.emphasis)),
      drawdown: TPT.charts.buildDrawdownChart(series.points)
    };
    return { filtered, metrics, strategyRows, figs };
  }

  async function onExportReport() {
    const allTrades = await TPT.db.getAllTrades();
    const view = buildView(allTrades, currentStrategy);
    const html = TPT.report.buildReportHtml({ strategyName: currentStrategy, ...view, trades: view.filtered });
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const timestamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '_');
    a.href = url;
    a.download = `report_${currentStrategy}_${timestamp}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function populateStrategySelect(trades) {
    const select = document.getElementById('strategy-select');
    const uniqueStrategies = [...new Set(trades.map(t => t.strategy_name))].sort();
    const strategies = [ALL_STRATEGIES, ...uniqueStrategies];
    const previous = currentStrategy;
    select.innerHTML = strategies.map(s => `<option value="${TPT.utils.escapeHtml(s)}">${TPT.utils.escapeHtml(s)}</option>`).join('');
    if (strategies.includes(previous)) {
      select.value = previous;
      currentStrategy = previous;
    } else {
      select.value = ALL_STRATEGIES;
      currentStrategy = ALL_STRATEGIES;
    }
  }

  async function refresh() {
    const allTrades = await TPT.db.getAllTrades();
    populateStrategySelect(allTrades);
    const view = buildView(allTrades, currentStrategy);
    const plotOpts = { responsive: true, displaylogo: false };

    TPT.dashboard.renderSummaryCards(view.metrics, document.getElementById('summary-cards'));
    TPT.dashboard.renderDetailCards(view.metrics, document.getElementById('detail-cards'));
    const notice = document.getElementById('capital-notice');
    notice.textContent = view.metrics.unfilled_count > 0 ? `⚠️ 有 ${view.metrics.unfilled_count} 筆交易資金未填且報酬率為 0，已從合併報酬中排除。` : '';
    notice.hidden = view.metrics.unfilled_count === 0;

    Plotly.newPlot('cum-return-chart', view.figs.cumReturn.data, view.figs.cumReturn.layout, plotOpts);
    Plotly.newPlot('period-returns-chart', view.figs.periodReturns.data, view.figs.periodReturns.layout, plotOpts);
    Plotly.newPlot('drawdown-chart', view.figs.drawdown.data, view.figs.drawdown.layout, plotOpts);

    const strategySection = document.getElementById('strategy-section');
    strategySection.hidden = view.strategyRows.length === 0;
    TPT.dashboard.renderStrategyTable(view.strategyRows, document.getElementById('strategy-table'));
    TPT.dashboard.renderTradeTable(view.filtered, document.getElementById('trade-table'));

    TPT.forms.render(document.getElementById('forms-container'), {
      getAllTrades: TPT.db.getAllTrades,
      addTrade: wrapWithBackup(TPT.db.addTrade),
      updateTrade: wrapWithBackup(TPT.db.updateTrade),
      deleteTrade: wrapWithBackup(TPT.db.deleteTrade),
      onChange: refresh
    });
  }

  function wrapWithBackup(dbFn) {
    return async (...args) => {
      await dbFn(...args);
      const trades = await TPT.db.getAllTrades();
      try {
        await TPT.backup.writeIfConfigured(trades);
      } catch (err) {
        console.warn('自動備份寫入失敗：', err);
      }
    };
  }

  return { init, buildView };
})();

if (typeof document !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => { TPT.app.init(); });
}
