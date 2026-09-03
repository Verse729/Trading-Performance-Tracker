window.TPT = window.TPT || {};

TPT.metrics = (function () {
  function calculateMetrics(trades, equityCurve) {
    const result = {
      total_trades: 0,
      total_pnl: 0.0,
      avg_monthly_return: 0.0,
      avg_trade_return: 0.0,
      max_drawdown: 0.0,
      worst_single_trade_return: 0.0,
      sharpe_ratio: 0.0,
      calmar_ratio: 0.0
    };

    if (!trades || trades.length === 0 || !equityCurve || equityCurve.length === 0) {
      return result;
    }

    result.total_trades = trades.length;
    result.total_pnl = trades.reduce((sum, t) => sum + t.net_profit_loss, 0);

    const returns = equityCurve.map(e => e.return_pct);
    result.avg_trade_return = returns.reduce((a, b) => a + b, 0) / returns.length;

    const minTradeReturn = Math.min(...trades.map(t => t.net_return_pct));
    result.worst_single_trade_return = minTradeReturn < 0 ? minTradeReturn / 100.0 : 0.0;

    const buyTimes = trades.map(t => new Date(t.buy_date).getTime());
    const sellTimes = trades.map(t => new Date(t.sell_date).getTime());
    const totalDays = Math.max(Math.round((Math.max(...sellTimes) - Math.min(...buyTimes)) / 86400000), 1);

    const finalNav = equityCurve[equityCurve.length - 1].nav;
    const totalReturn = finalNav / TPT.config.INITIAL_CAPITAL - 1.0;
    const annualReturn = Math.pow(1.0 + totalReturn, 365.25 / totalDays) - 1.0;

    result.avg_monthly_return = Math.pow(1.0 + annualReturn, 1.0 / 12.0) - 1.0;

    let runningMax = -Infinity;
    let maxDrawdown = 0.0;
    for (const point of equityCurve) {
      runningMax = Math.max(runningMax, point.nav);
      const drawdown = (point.nav - runningMax) / runningMax;
      if (drawdown < maxDrawdown) maxDrawdown = drawdown;
    }
    result.max_drawdown = maxDrawdown;

    if (returns.length > 1) {
      const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
      const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (returns.length - 1);
      const stdDev = Math.sqrt(variance);
      const periodsPerYear = returns.length / (totalDays / 365.25);
      const annualVol = stdDev * Math.sqrt(periodsPerYear);
      if (annualVol > 0.0001) {
        result.sharpe_ratio = (annualReturn - TPT.config.RISK_FREE_RATE) / annualVol;
      }
    }

    if (Math.abs(result.max_drawdown) > 0) {
      result.calmar_ratio = annualReturn / Math.abs(result.max_drawdown);
    }

    return result;
  }

  return { calculateMetrics };
})();
