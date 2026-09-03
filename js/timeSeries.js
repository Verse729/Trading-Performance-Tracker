window.TPT = window.TPT || {};

TPT.timeSeries = (function () {
  function periodOf(buyDate) {
    return String(buyDate).slice(0, 7);
  }

  function capitalOf(trade) {
    if (typeof trade.capital === 'number' && trade.capital > 0) return trade.capital;
    if (trade.net_return_pct) return Math.abs(trade.net_profit_loss / (trade.net_return_pct / 100));
    return null;
  }

  function periodReturn(group) {
    if (group.length === 1) return group[0].net_return_pct / 100;
    let pnl = 0, capital = 0;
    group.forEach(t => {
      const c = capitalOf(t);
      if (c !== null) { pnl += t.net_profit_loss; capital += c; }
    });
    if (capital > 0) return pnl / capital;
    return group.reduce((s, t) => s + t.net_return_pct / 100, 0) / group.length;
  }

  function buildPeriodSeries(trades) {
    const groups = new Map();
    let unfilledCount = 0;
    (trades || []).forEach(t => {
      if (capitalOf(t) === null) unfilledCount++;
      const key = periodOf(t.buy_date);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(t);
    });

    let growth = 1, peak = 1, cumPnl = 0;
    const points = [...groups.keys()].sort().map(period => {
      const group = groups.get(period);
      const r = periodReturn(group);
      const pnl = group.reduce((s, t) => s + t.net_profit_loss, 0);
      const capital = group.reduce((s, t) => s + (capitalOf(t) || 0), 0);
      growth *= 1 + r;
      peak = Math.max(peak, growth);
      cumPnl += pnl;
      return { period, r, pnl, capital, cumReturn: growth - 1, cumPnl, drawdown: growth / peak - 1 };
    });
    return { points, unfilledCount };
  }

  return { periodOf, capitalOf, buildPeriodSeries };
})();
