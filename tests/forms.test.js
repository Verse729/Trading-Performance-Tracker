if (typeof require !== 'undefined') require('./harness.js');
loadSources(['config.js', 'utils.js', 'timeSeries.js', 'forms.js']);

const existing = [
  { trade_id: 'T001', strategy_name: 'StratA', version: 'v1', buy_date: '2026-01-12', sell_date: '2026-01-20', net_return_pct: 6, net_profit_loss: 60000, capital: 1000000 }
];
const base = { trade_id: 'T009', strategy_name: 'StratA', version: 'v1', buy_date: '2026-02-01', sell_date: '2026-02-20', net_return_pct: 1, net_profit_loss: 1000, capital: 100000 };
const V = TPT.forms.validateTrade;

assertEqual('valid trade', V(base, existing).valid, true);
assertEqual('empty id rejected', V({ ...base, trade_id: ' ' }, existing).valid, false);
assertEqual('empty strategy rejected', V({ ...base, strategy_name: '' }, existing).valid, false);
assertEqual('date order rejected', V({ ...base, buy_date: '2026-02-21' }, existing).valid, false);
assertEqual('capital zero rejected', V({ ...base, capital: 0 }, existing).valid, false);
assertEqual('capital NaN rejected', V({ ...base, capital: NaN }, existing).valid, false);
const dup = V({ ...base, buy_date: '2026-01-03', sell_date: '2026-01-30' }, existing);
assertEqual('same strategy same period rejected', dup.valid, false);
assertEqual('dup error mentions period', dup.error.includes('2026-01'), true);
assertEqual('other strategy same period ok', V({ ...base, strategy_name: 'StratB', buy_date: '2026-01-03', sell_date: '2026-01-30' }, existing).valid, true);
assertEqual('editing itself not a dup', V({ ...existing[0] }, existing, 'T001').valid, true);

reportResults();
