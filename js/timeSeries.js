window.TPT = window.TPT || {};

TPT.timeSeries = (function () {
  function generateTradeEquityCurve(trades) {
    if (!trades || trades.length === 0) return [];

    const sorted = [...trades].sort((a, b) => new Date(a.buy_date) - new Date(b.buy_date));

    let nav = TPT.config.INITIAL_CAPITAL;
    return sorted.map(t => {
      const returnPct = t.net_return_pct / 100.0;
      nav = nav * (1.0 + returnPct);
      const cumReturn = nav / TPT.config.INITIAL_CAPITAL - 1.0;
      return {
        trade_id: t.trade_id,
        buy_date: t.buy_date,
        sell_date: t.sell_date,
        return_pct: returnPct,
        nav: nav,
        cum_return: cumReturn
      };
    });
  }

  return { generateTradeEquityCurve };
})();
