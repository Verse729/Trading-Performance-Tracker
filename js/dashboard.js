window.TPT = window.TPT || {};

TPT.dashboard = (function () {
  const T = TPT.chartTokens;
  const esc = TPT.utils.escapeHtml;

  function formatSignedInt(value) {
    if (value === null || value === undefined) return '—';
    const sign = value >= 0 ? '+' : '-';
    return sign + Math.round(Math.abs(value)).toLocaleString('en-US');
  }
  function fmtPct(v) { return !Number.isFinite(v) ? '—' : `${v >= 0 ? '+' : ''}${(v * 100).toFixed(2)}%`; }
  function fmtRatio(v) { return !Number.isFinite(v) ? '—' : v.toFixed(2); }
  function fmtInt(v) { return v === null || v === undefined ? '—' : Math.round(v).toLocaleString('en-US'); }

  function toneColor(v) {
    if (v === null || v === undefined || v === 0) return T.INK_PRIMARY;
    return v > 0 ? T.GOOD : T.CRITICAL;
  }

  // [label, 顯示值, 決定顏色的數值]
  const SUMMARY_DEFS = [
    ['總損益', m => `${formatSignedInt(m.total_pnl)} 元`, m => m.total_pnl],
    ['累積報酬率', m => fmtPct(m.cum_return), m => m.cum_return],
    ['年化報酬率', m => fmtPct(m.annual_return), m => m.annual_return],
    ['最大回撤', m => fmtPct(m.max_drawdown), m => m.max_drawdown]
  ];
  const DETAIL_DEFS = [
    ['勝率', m => m.win_rate === null ? '—' : `${(m.win_rate * 100).toFixed(2)}%`, () => null],
    ['盈虧比', m => fmtRatio(m.payoff_ratio), () => null],
    ['平均期報酬', m => fmtPct(m.avg_return), m => m.avg_return],
    ['獲利因子', m => fmtRatio(m.profit_factor), m => m.profit_factor === null ? null : m.profit_factor - 1],
    ['Sharpe', m => fmtRatio(m.sharpe), m => m.sharpe],
    ['最大連續虧損', m => `${m.max_consecutive_losses} 期`, m => m.max_consecutive_losses > 0 ? -1 : 0],
    ['最大回撤金額', m => m.max_drawdown_amount === null ? '—' : `${fmtInt(m.max_drawdown_amount)} 元`, m => m.max_drawdown_amount > 0 ? -1 : 0],
    ['最佳 / 最差單期', m => `${fmtPct(m.best_return)} / ${fmtPct(m.worst_return)}`, () => null]
  ];

  function card(label, value, color, extraClass, sub) {
    const cls = extraClass ? `metric-card ${extraClass}` : 'metric-card';
    const subHtml = sub ? `<div class="metric-sub">${sub}</div>` : '';
    return `<div class="${cls}"><div class="metric-label">${label}</div><div class="metric-value" style="color:${color};">${value}</div>${subHtml}</div>`;
  }

  function buildSummaryCardsHtml(m) {
    const sub = m.n > 0 ? `${m.n} 期，${esc(m.first_period)} 至 ${esc(m.last_period)}` : '尚無交易';
    return SUMMARY_DEFS.map(([label, fmt, tone]) => card(label, fmt(m), toneColor(tone(m)), '', sub)).join('');
  }

  function buildDetailCardsHtml(m) {
    return DETAIL_DEFS.map(([label, fmt, tone]) => card(label, fmt(m), toneColor(tone(m)), 'metric-card-small')).join('');
  }

  function buildStrategyTableHtml(rows) {
    if (!rows || rows.length === 0) return '';
    const header = ['策略', '期數', '總損益', '累積報酬率', '年化報酬率', '最大回撤', '勝率'].map(h => `<th>${h}</th>`).join('');
    const body = rows.map(({ name, metrics: m }) => `<tr><td>${esc(name)}</td><td>${m.n}</td>` +
      `<td><span style="color:${toneColor(m.total_pnl)};">${formatSignedInt(m.total_pnl)}</span></td>` +
      `<td><span style="color:${toneColor(m.cum_return)};">${fmtPct(m.cum_return)}</span></td>` +
      `<td><span style="color:${toneColor(m.annual_return)};">${fmtPct(m.annual_return)}</span></td>` +
      `<td><span style="color:${toneColor(m.max_drawdown)};">${fmtPct(m.max_drawdown)}</span></td>` +
      `<td>${m.win_rate === null ? '—' : (m.win_rate * 100).toFixed(2) + '%'}</td></tr>`).join('');
    return `<div class="table-scroll"><table class="trade-table"><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table></div>`;
  }

  function computeDisplayRows(trades) {
    return trades.map(t => ({
      trade_id: t.trade_id, strategy_name: t.strategy_name, version: t.version,
      period: TPT.timeSeries.periodOf(t.buy_date), buy_date: t.buy_date, sell_date: t.sell_date,
      capital: TPT.timeSeries.capitalOf(t), net_return_pct: t.net_return_pct, net_profit_loss: t.net_profit_loss
    }));
  }

  const TABLE_COLUMNS = [
    { key: 'trade_id', label: '交易編號' },
    { key: 'strategy_name', label: '策略名稱' },
    { key: 'version', label: '版本' },
    { key: 'period', label: '期' },
    { key: 'buy_date', label: '買進日期' },
    { key: 'sell_date', label: '賣出日期' },
    { key: 'capital', label: '投入資金 (元)' },
    { key: 'net_return_pct', label: '結算報酬率 (%)' },
    { key: 'net_profit_loss', label: '絕對損益金額 (元)' }
  ];

  function formatCell(key, value) {
    if (key === 'capital') return value === null ? '<span class="capital-missing">未填</span>' : fmtInt(value);
    if (key === 'net_return_pct') return `<span style="color:${toneColor(value)};">${value >= 0 ? '+' : ''}${value.toFixed(2)}%</span>`;
    if (key === 'net_profit_loss') return `<span style="color:${toneColor(value)};">${formatSignedInt(value)}</span>`;
    return esc(value);
  }

  function rowsHtml(rows) {
    return rows.map(row => `<tr>${TABLE_COLUMNS.map(c => `<td>${formatCell(c.key, row[c.key])}</td>`).join('')}</tr>`).join('');
  }

  function buildStaticTableHtml(trades) {
    if (!trades || trades.length === 0) return '<p class="empty-note">目前無交易明細數據。</p>';
    const rows = computeDisplayRows([...trades].sort((a, b) => a.buy_date < b.buy_date ? -1 : 1));
    const header = TABLE_COLUMNS.map(c => `<th>${c.label}</th>`).join('');
    return `<div class="table-scroll"><table class="trade-table"><thead><tr>${header}</tr></thead><tbody>${rowsHtml(rows)}</tbody></table></div>`;
  }

  function renderSummaryCards(metrics, container) { container.innerHTML = buildSummaryCardsHtml(metrics); }
  function renderDetailCards(metrics, container) { container.innerHTML = buildDetailCardsHtml(metrics); }
  function renderStrategyTable(rows, container) { container.innerHTML = buildStrategyTableHtml(rows); }

  function renderTradeTable(trades, container) {
    if (!trades || trades.length === 0) {
      container.innerHTML = '<p class="empty-note">目前無交易明細數據。請使用下方維護表單新增交易。</p>';
      return;
    }
    const state = { rows: computeDisplayRows(trades), sortKey: 'period', sortDir: 1, search: '' };
    container.innerHTML = `
      <div class="table-toolbar"><input type="search" placeholder="搜尋交易編號、策略..." id="table-search"></div>
      <div class="table-scroll">
        <table class="trade-table">
          <thead><tr>${TABLE_COLUMNS.map(c => `<th data-key="${c.key}">${c.label}</th>`).join('')}</tr></thead>
          <tbody></tbody>
        </table>
      </div>`;
    const tbody = container.querySelector('tbody');

    function visibleRows() {
      let rows = state.rows;
      if (state.search) {
        const term = state.search.toLowerCase();
        rows = rows.filter(r => TABLE_COLUMNS.some(c => String(r[c.key]).toLowerCase().includes(term)));
      }
      return [...rows].sort((a, b) => {
        const av = a[state.sortKey], bv = b[state.sortKey];
        if (av === null) return 1;
        if (bv === null) return -1;
        return (av < bv ? -1 : av > bv ? 1 : 0) * state.sortDir;
      });
    }
    function renderRows() { tbody.innerHTML = rowsHtml(visibleRows()); }

    container.querySelectorAll('thead th').forEach(th => th.addEventListener('click', () => {
      const key = th.dataset.key;
      if (state.sortKey === key) state.sortDir *= -1; else { state.sortKey = key; state.sortDir = 1; }
      renderRows();
    }));
    container.querySelector('#table-search').addEventListener('input', e => { state.search = e.target.value; renderRows(); });
    renderRows();
  }

  return {
    fmtPct, fmtRatio, formatSignedInt,
    buildSummaryCardsHtml, buildDetailCardsHtml, buildStrategyTableHtml, buildStaticTableHtml, computeDisplayRows,
    renderSummaryCards, renderDetailCards, renderStrategyTable, renderTradeTable
  };
})();
