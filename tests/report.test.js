if (typeof require !== 'undefined') require('./harness.js');
loadSources(['config.js', 'utils.js', 'timeSeries.js', 'metrics.js', 'charts.js', 'dashboard.js', 'report.js', 'app.js']);

const trades = [
  { trade_id: 'A1', strategy_name: 'StratA', version: 'v1', buy_date: '2026-01-05', sell_date: '2026-01-20', net_return_pct: 6, net_profit_loss: 60000, capital: 1000000 },
  { trade_id: 'B1', strategy_name: 'StratB', version: 'v1', buy_date: '2026-01-05', sell_date: '2026-01-25', net_return_pct: -1, net_profit_loss: -5000, capital: 500000 },
  { trade_id: 'A2', strategy_name: 'StratA', version: 'v1', buy_date: '2026-02-03', sell_date: '2026-02-20', net_return_pct: -2, net_profit_loss: -20000, capital: 1000000 }
];

const all = TPT.app.buildView(trades, '全部策略');
assertEqual('view all filtered count', all.filtered.length, 3);
assertEqual('view all strategyRows', all.strategyRows.length, 2);
assertEqual('view all metrics n', all.metrics.n, 2);
assertEqual('view all cum chart traces (2 strategies + combined) x2', all.figs.cumReturn.data.length, 6);
assertEqual('view all bar traces', all.figs.periodReturns.data.length, 2);

const one = TPT.app.buildView(trades, 'StratB');
assertEqual('view one filtered count', one.filtered.length, 1);
assertEqual('view one strategyRows empty', one.strategyRows.length, 0);
assertEqual('view one cum chart traces', one.figs.cumReturn.data.length, 2);

const html = TPT.report.buildReportHtml({ strategyName: '全部策略', metrics: all.metrics, trades: all.filtered, strategyRows: all.strategyRows, figs: all.figs });
assertEqual('report is html', html.startsWith('<!doctype html>'), true);
assertEqual('report has title', html.includes('<title>策略績效報告 - 全部策略</title>'), true);
assertEqual('report has summary cards', (html.match(/class="metric-card"/g) || []).length, 4);
assertEqual('report has detail cards', (html.match(/metric-card-small/g) || []).length >= 8, true);
assertEqual('report has strategy table', html.includes('策略比較'), true);
assertEqual('report has three plots', (html.match(/Plotly\.newPlot\('report-chart-/g) || []).length, 3);
assertEqual('report escapes strategy name', TPT.report.buildReportHtml({ strategyName: '<s>', metrics: one.metrics, trades: one.filtered, strategyRows: [], figs: one.figs }).includes('&lt;s&gt;'), true);
const oneHtml = TPT.report.buildReportHtml({ strategyName: 'StratB', metrics: one.metrics, trades: one.filtered, strategyRows: [], figs: one.figs });
assertEqual('single report has no strategy table', oneHtml.includes('策略比較'), false);

const evil = [{ trade_id: 'E1', strategy_name: '</script><img src=x onerror=alert(1)>', version: 'v1', buy_date: '2026-01-05', sell_date: '2026-01-20', net_return_pct: 1, net_profit_loss: 1000, capital: 100000 }];
const evilView = TPT.app.buildView(evil, '全部策略');
const evilHtml = TPT.report.buildReportHtml({ strategyName: '全部策略', metrics: evilView.metrics, trades: evilView.filtered, strategyRows: evilView.strategyRows, figs: evilView.figs });
assertEqual('report script payload has no raw </script>', evilHtml.split('</script>').length, 3);

reportResults();
