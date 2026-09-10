window.TPT = window.TPT || {};

TPT.metrics = (function () {
  function sum(xs) { return xs.reduce((a, b) => a + b, 0); }
  function mean(xs) { return sum(xs) / xs.length; }

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
      win_rate: null, payoff_ratio: null, profit_factor: null, avg_return: null,
      sharpe: null, max_consecutive_losses: 0, max_drawdown_amount: null, best_return: null, worst_return: null,
      last_pnl: null, last_return: null,
      peak_capital: null, avg_capital: null
    };
    if (n === 0) return result;

    const rs = points.map(p => p.r);
    const last = points[n - 1];
    result.first_period = points[0].period;
    result.last_period = last.period;
    result.total_pnl = last.cumPnl;
    result.last_pnl = last.pnl;
    result.last_return = last.r;
    result.cum_return = last.cumReturn;
    if (n >= 2) result.annual_return = Math.pow(1 + last.cumReturn, 12 / n) - 1;
    result.max_drawdown = Math.min(...points.map(p => p.drawdown));

    const wins = rs.filter(r => r > 0), losses = rs.filter(r => r < 0);
    const avgWin = wins.length ? mean(wins) : 0;
    const avgLoss = losses.length ? mean(losses) : 0;
    result.win_rate = wins.length / n;
    result.payoff_ratio = losses.length ? avgWin / Math.abs(avgLoss) : null;
    result.profit_factor = losses.length ? sum(wins) / Math.abs(sum(losses)) : null;
    result.avg_return = mean(rs);

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

    // 資金佔用：本金每期回收再投入，累加沒有意義，只看單期同時佔用多少
    const caps = points.map(p => p.capital).filter(c => c > 0);
    if (caps.length) {
      result.peak_capital = Math.max(...caps);
      result.avg_capital = mean(caps);
    }
    return result;
  }

  return { calculateMetrics };
})();
