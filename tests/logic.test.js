if (typeof require !== 'undefined') require('./harness.js');
loadSources(['config.js', 'timeSeries.js', 'metrics.js']);

// ---- 案例 A：單一策略，3 期 ----
const tradesA = [
  { trade_id: 'T001', strategy_name: 'StratA', version: 'v1.0', buy_date: '2026-01-12', sell_date: '2026-01-20', net_return_pct: 6.0, net_profit_loss: 60000, capital: 1000000 },
  { trade_id: 'T003', strategy_name: 'StratA', version: 'v1.0', buy_date: '2026-03-11', sell_date: '2026-03-25', net_return_pct: 3.0, net_profit_loss: 30000, capital: 1000000 },
  { trade_id: 'T002', strategy_name: 'StratA', version: 'v1.0', buy_date: '2026-02-11', sell_date: '2026-03-10', net_return_pct: -2.0, net_profit_loss: -20000 }
];

assertEqual('periodOf', TPT.timeSeries.periodOf('2026-02-11'), '2026-02');
assertClose('capitalOf explicit', TPT.timeSeries.capitalOf(tradesA[0]), 1000000);
assertClose('capitalOf derived', TPT.timeSeries.capitalOf(tradesA[2]), 1000000);
assertEqual('capitalOf null when pct is 0', TPT.timeSeries.capitalOf({ net_return_pct: 0, net_profit_loss: 0 }), null);

const sA = TPT.timeSeries.buildPeriodSeries(tradesA);
assertEqual('A points length', sA.points.length, 3);
assertEqual('A unfilledCount', sA.unfilledCount, 0);
assertEqual('A sorted by period', sA.points.map(p => p.period).join(','), '2026-01,2026-02,2026-03');
assertClose('A r[1]', sA.points[1].r, -0.02);
assertClose('A cumReturn[1]', sA.points[1].cumReturn, 0.0388);
assertClose('A cumReturn[2]', sA.points[2].cumReturn, 0.069964);
assertClose('A cumPnl[2]', sA.points[2].cumPnl, 70000);
assertClose('A drawdown[1]', sA.points[1].drawdown, -0.02);
assertClose('A drawdown[2]', sA.points[2].drawdown, 0);

// ---- 案例 B：兩策略同期合併，含一筆資金未填 ----
const tradesB = [
  { trade_id: 'A1', strategy_name: 'StratA', version: 'v1', buy_date: '2026-01-05', sell_date: '2026-01-20', net_return_pct: 6.0, net_profit_loss: 60000, capital: 1000000 },
  { trade_id: 'B1', strategy_name: 'StratB', version: 'v1', buy_date: '2026-01-05', sell_date: '2026-01-25', net_return_pct: -1.0, net_profit_loss: -5000, capital: 500000 },
  { trade_id: 'A2', strategy_name: 'StratA', version: 'v1', buy_date: '2026-02-03', sell_date: '2026-02-20', net_return_pct: -2.0, net_profit_loss: -20000, capital: 1000000 },
  { trade_id: 'B2', strategy_name: 'StratB', version: 'v1', buy_date: '2026-02-03', sell_date: '2026-02-20', net_return_pct: 0, net_profit_loss: 0 }
];
const sB = TPT.timeSeries.buildPeriodSeries(tradesB);
assertEqual('B points length', sB.points.length, 2);
assertEqual('B unfilledCount', sB.unfilledCount, 1);
assertClose('B r[0] capital-weighted', sB.points[0].r, 55000 / 1500000);
assertClose('B pnl[0]', sB.points[0].pnl, 55000);
assertClose('B capital[0]', sB.points[0].capital, 1500000);
assertClose('B r[1] excludes unfilled', sB.points[1].r, -0.02);
assertClose('B cumReturn[1]', sB.points[1].cumReturn, 0.015933333333, 1e-9);

// ---- 案例 D：第一期就虧損，回撤要從 1.0 起算 ----
const tradesD = [
  { trade_id: 'D1', strategy_name: 'S', version: 'v1', buy_date: '2026-01-01', sell_date: '2026-01-20', net_return_pct: -10, net_profit_loss: -10000, capital: 100000 },
  { trade_id: 'D2', strategy_name: 'S', version: 'v1', buy_date: '2026-02-01', sell_date: '2026-02-20', net_return_pct: 5, net_profit_loss: 4500, capital: 90000 }
];
const sD = TPT.timeSeries.buildPeriodSeries(tradesD);
assertClose('D drawdown[0]', sD.points[0].drawdown, -0.10);
assertClose('D drawdown[1]', sD.points[1].drawdown, -0.055);

// ---- 空資料 ----
const sEmpty = TPT.timeSeries.buildPeriodSeries([]);
assertEqual('empty points length', sEmpty.points.length, 0);

reportResults();
