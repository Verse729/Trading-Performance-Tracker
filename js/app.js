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

  async function onExportReport() {
    const allTrades = await TPT.db.getAllTrades();
    const filtered = filterByStrategy(allTrades, currentStrategy);
    const equity = TPT.timeSeries.generateTradeEquityCurve(filtered);
    const metrics = TPT.metrics.calculateMetrics(filtered, equity);
    const returnsFig = TPT.charts.buildReturnsChart(filtered);
    const cumFig = TPT.charts.buildCumPnlChart(filtered);
    const html = TPT.report.buildReportHtml(currentStrategy, metrics, filtered, returnsFig, cumFig);
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

  function filterByStrategy(trades, strategy) {
    if (strategy === ALL_STRATEGIES) return trades;
    return trades.filter(t => t.strategy_name === strategy);
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
    const filtered = filterByStrategy(allTrades, currentStrategy);

    const equity = TPT.timeSeries.generateTradeEquityCurve(filtered);
    const metrics = TPT.metrics.calculateMetrics(filtered, equity);

    TPT.dashboard.renderMetricCards(metrics, document.getElementById('metric-cards'));
    TPT.dashboard.renderTradeTable(filtered, document.getElementById('trade-table'));

    const returnsFig = TPT.charts.buildReturnsChart(filtered);
    Plotly.newPlot('returns-chart', returnsFig.data, returnsFig.layout, { responsive: true, displaylogo: false });

    const cumFig = TPT.charts.buildCumPnlChart(filtered);
    Plotly.newPlot('cum-pnl-chart', cumFig.data, cumFig.layout, { responsive: true, displaylogo: false });

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

  return { init };
})();

window.addEventListener('DOMContentLoaded', () => {
  TPT.app.init();
});
