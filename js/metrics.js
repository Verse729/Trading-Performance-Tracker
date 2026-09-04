window.TPT = window.TPT || {};

TPT.metrics = (function () {
  function mean(xs) { return xs.reduce((a, b) => a + b, 0) / xs.length; }

  function sampleStd(xs) {
    const m = mean(xs);
    return Math.sqrt(xs.reduce((s, x) => s + (x - m) * (x - m), 0) / (xs.length - 1));
  }

  function calculateMetrics(series) {
    const points = (series && series.points) || [];
    const n = points.length;
    const result = {
      n, first_period: null, last_period: null, unfilled_count: (series && series.unfilledCount) || 0,
      total_pnl: 0, cum_return: null, annual_return: null, max_drawdown: null,
      win_rate: null, profit_factor: null, avg_return: null, expectancy: null,
      sharpe: null, max_consecutive_losses: 0, max_drawdown_amount: null, best_return: null, worst_return: null
    };
    if (n === 0) return result;

    const rs = points.map(p => p.r);
    const last = points[n - 1];
    result.first_period = points[0].period;
    result.last_period = last.period;
    result.total_pnl = last.cumPnl;
    result.cum_return = last.cumReturn;
    if (n >= 2) result.annual_return = Math.pow(1 + last.cumReturn, 12 / n) - 1;
    result.max_drawdown = Math.min(...points.map(p => p.drawdown));

    const wins = rs.filter(r => r > 0), losses = rs.filter(r => r < 0);
    const avgWin = wins.length ? mean(wins) : 0;
    const avgLoss = losses.length ? mean(losses) : 0;
    result.win_rate = wins.length / n;
    result.profit_factor = losses.length ? avgWin / Math.abs(avgLoss) : null;
    result.avg_return = mean(rs);
    result.expectancy = result.win_rate * avgWin + (1 - result.win_rate) * avgLoss;

    if (n >= 2) {
      const std = sampleStd(rs);
      if (std > 0) {
        const rfPeriod = TPT.config.RISK_FREE_RATE / 12;
        result.sharpe = mean(rs.map(r => r - rfPeriod)) / std * Math.sqrt(12);
      }
    }

    let streak = 0;
    rs.forEach(r => {
      streak = r < 0 ? streak + 1 : 0;
      if (streak > result.max_consecutive_losses) result.max_consecutive_losses = streak;
    });

    let peakPnl = 0, mddAmount = 0;
    points.forEach(p => {
      peakPnl = Math.max(peakPnl, p.cumPnl);
      mddAmount = Math.max(mddAmount, peakPnl - p.cumPnl);
    });
    result.max_drawdown_amount = mddAmount;
    result.best_return = Math.max(...rs);
    result.worst_return = Math.min(...rs);
    return result;
  }

  return { calculateMetrics };
})();
