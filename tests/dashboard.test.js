if (typeof require !== 'undefined') require('./harness.js');
loadSources(['config.js', 'utils.js', 'timeSeries.js', 'metrics.js', 'charts.js', 'dashboard.js']);

const trades = [
  { trade_id: 'T001', strategy_name: 'StratA', version: 'v1.0', buy_date: '2026-01-12', sell_date: '2026-01-20', net_return_pct: 6.0, net_profit_loss: 60000, capital: 1000000 },
  { trade_id: 'T002', strategy_name: 'StratA', version: 'v1.0', buy_date: '2026-02-11', sell_date: '2026-03-10', net_return_pct: -2.0, net_profit_loss: -20000, capital: 1000000 },
  { trade_id: 'T003', strategy_name: 'StratA', version: 'v1.0', buy_date: '2026-03-11', sell_date: '2026-03-25', net_return_pct: 0, net_profit_loss: 0 }
];
const metrics = TPT.metrics.calculateMetrics(TPT.timeSeries.buildPeriodSeries(trades));
const D = TPT.dashboard;

assertEqual('fmtPct positive', D.fmtPct(0.069964), '+7.00%');
assertEqual('fmtPct negative', D.fmtPct(-0.02), '-2.00%');
assertEqual('fmtPct null', D.fmtPct(null), '—');
assertEqual('fmtRatio', D.fmtRatio(2.25), '2.25');
assertEqual('fmtRatio null', D.fmtRatio(null), '—');
assertEqual('formatSignedInt', D.formatSignedInt(-20000), '-20,000');

const summary = D.buildSummaryCardsHtml(metrics);
assertEqual('summary card count', (summary.match(/class="metric-card"/g) || []).length, 4);
assertEqual('summary has sub line', summary.includes('3 期，2026-01 至 2026-03'), true);
assertEqual('summary shows total pnl', summary.includes('+40,000'), true);

const detail = D.buildDetailCardsHtml(metrics);
assertEqual('detail card count', (detail.match(/metric-card-small/g) || []).length, 8);
assertEqual('detail shows win rate', detail.includes('33.33%'), true);
assertEqual('detail shows streak', detail.includes('1 期'), true);

const empty = D.buildSummaryCardsHtml(TPT.metrics.calculateMetrics({ points: [], unfilledCount: 0 }));
assertEqual('empty summary shows dash', (empty.match(/—/g) || []).length >= 3, true);

const stratRows = [{ name: 'StratA', metrics }, { name: 'StratB', metrics: TPT.metrics.calculateMetrics({ points: [], unfilledCount: 0 }) }];
const stratTable = D.buildStrategyTableHtml(stratRows);
assertEqual('strategy table rows', (stratTable.match(/<tr>/g) || []).length, 3);
assertEqual('strategy table has name', stratTable.includes('StratA'), true);

const staticTable = D.buildStaticTableHtml(trades);
assertEqual('static table has period column', staticTable.includes('<th>期</th>'), true);
assertEqual('static table no holding days', staticTable.includes('持股天數'), false);
assertEqual('static table has capital', staticTable.includes('1,000,000'), true);
assertEqual('static table marks missing capital', staticTable.includes('capital-missing'), true);
assertEqual('static table escapes', D.buildStaticTableHtml([{ ...trades[0], strategy_name: '<b>x' }]).includes('&lt;b&gt;x'), true);

const xssMetrics = { ...metrics, first_period: '<b>x', last_period: '2026-03' };
assertEqual('summary escapes period', D.buildSummaryCardsHtml(xssMetrics).includes('&lt;b&gt;x'), true);

reportResults();
