if (typeof require !== 'undefined') require('./harness.js');
loadSources(['config.js', 'timeSeries.js', 'charts.js']);

const mk = (id, s, buy, pct, pnl, cap) => ({ trade_id: id, strategy_name: s, version: 'v1', buy_date: buy, sell_date: buy, net_return_pct: pct, net_profit_loss: pnl, capital: cap });
const tradesA = [mk('A1', 'A', '2026-01-05', 6, 60000, 1e6), mk('A2', 'A', '2026-02-03', -2, -20000, 1e6)];
const tradesB = [mk('B1', 'B', '2026-01-05', -1, -5000, 5e5), mk('B2', 'B', '2026-02-03', 4, 20000, 5e5)];
const pA = TPT.timeSeries.buildPeriodSeries(tradesA).points;
const pB = TPT.timeSeries.buildPeriodSeries(tradesB).points;
const pAll = TPT.timeSeries.buildPeriodSeries(tradesA.concat(tradesB)).points;

// 累積報酬曲線：單一策略
const c1 = TPT.charts.buildCumReturnChart([{ name: 'A', points: pA }]);
assertEqual('cum single trace count', c1.data.length, 2);
assertEqual('cum return trace visible', c1.data[0].visible, true);
assertEqual('cum pnl trace hidden', c1.data[1].visible, false);
assertEqual('cum x is period', c1.data[0].x.join(','), '2026-01,2026-02');
assertClose('cum y[1] is pct', c1.data[0].y[1], 3.88);
assertClose('cum pnl y[1]', c1.data[1].y[1], 40000);
assertEqual('cum xaxis category', c1.layout.xaxis.type, 'category');
assertEqual('cum has toggle', c1.layout.updatemenus[0].buttons.length, 2);
assertEqual('cum single color', c1.data[0].line.color, TPT.chartTokens.GOOD);

// 累積報酬曲線：全部（兩策略 + 合併）
const c2 = TPT.charts.buildCumReturnChart([{ name: 'A', points: pA }, { name: 'B', points: pB }, { name: '全部', points: pAll, emphasis: true }]);
assertEqual('cum multi trace count', c2.data.length, 6);
assertEqual('cum emphasis width', c2.data[4].line.width, 3);
assertEqual('cum emphasis color', c2.data[4].line.color, TPT.chartTokens.INK_PRIMARY);
assertEqual('cum series color', c2.data[0].line.color, TPT.chartTokens.SERIES[0]);

// 每期報酬柱狀
const b1 = TPT.charts.buildPeriodReturnsChart([{ name: 'A', points: pA }]);
assertEqual('bar single trace count', b1.data.length, 1);
assertEqual('bar type', b1.data[0].type, 'bar');
assertEqual('bar single colors by sign', b1.data[0].marker.color.join(','), [TPT.chartTokens.GOOD, TPT.chartTokens.CRITICAL].join(','));
assertClose('bar y[0] pct', b1.data[0].y[0], 6);
const b2 = TPT.charts.buildPeriodReturnsChart([{ name: 'A', points: pA }, { name: 'B', points: pB }]);
assertEqual('bar multi trace count', b2.data.length, 2);
assertEqual('bar grouped', b2.layout.barmode, 'group');
assertEqual('bar multi color', b2.data[1].marker.color, TPT.chartTokens.SERIES[1]);

// 回撤曲線
const d1 = TPT.charts.buildDrawdownChart(pA);
assertEqual('dd trace count', d1.data.length, 1);
assertEqual('dd fill', d1.data[0].fill, 'tozeroy');
assertClose('dd y[1] pct', d1.data[0].y[1], -2);
assertEqual('dd color', d1.data[0].line.color, TPT.chartTokens.CRITICAL);

// 空資料
assertEqual('cum empty', TPT.charts.buildCumReturnChart([]).data.length, 0);
assertEqual('bar empty', TPT.charts.buildPeriodReturnsChart([{ name: 'A', points: [] }]).data.length, 0);
assertEqual('dd empty', TPT.charts.buildDrawdownChart([]).data.length, 0);

const pJan = TPT.timeSeries.buildPeriodSeries([mk('J1', 'J', '2026-01-05', 1, 100, 10000), mk('J3', 'J', '2026-03-05', 1, 100, 10000)]).points;
const pFeb = TPT.timeSeries.buildPeriodSeries([mk('F2', 'F', '2026-02-05', 1, 100, 10000)]).points;
const cDisjoint = TPT.charts.buildCumReturnChart([{ name: 'J', points: pJan }, { name: 'F', points: pFeb }]);
// Plotly 2.35 在 categoryorder 'category ascending' 遇到 visible:false 的 trace 會崩潰，改用明確的 categoryarray
assertEqual('cum axis uses explicit array order', cDisjoint.layout.xaxis.categoryorder, 'array');
assertEqual('cum axis categoryarray is sorted union', cDisjoint.layout.xaxis.categoryarray.join(','), '2026-01,2026-02,2026-03');
const bDisjoint = TPT.charts.buildPeriodReturnsChart([{ name: 'J', points: pJan }, { name: 'F', points: pFeb }]);
assertEqual('bar axis uses explicit array order', bDisjoint.layout.xaxis.categoryorder, 'array');
assertEqual('bar axis categoryarray is sorted union', bDisjoint.layout.xaxis.categoryarray.join(','), '2026-01,2026-02,2026-03');
assertEqual('dd axis categoryarray', TPT.charts.buildDrawdownChart(pJan).layout.xaxis.categoryarray.join(','), '2026-01,2026-03');

reportResults();
