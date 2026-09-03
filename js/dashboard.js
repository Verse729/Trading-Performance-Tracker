window.TPT = window.TPT || {};

TPT.dashboard = (function () {
  const T = TPT.chartTokens;

  function formatSignedInt(value) {
    const sign = value >= 0 ? '+' : '-';
    return sign + Math.round(Math.abs(value)).toLocaleString('en-US');
  }

  const METRIC_CARD_DEFS = [
    ['交易總次數', m => `${m.total_trades} 次`, () => null],
    ['累積損益金額', m => `${formatSignedInt(m.total_pnl)} 元`, m => m.total_pnl],
    ['平均月報酬 (複利年化換算)', m => `${(m.avg_monthly_return * 100).toFixed(2)}%`, m => m.avg_monthly_return],
    ['單次週期平均報酬', m => `${(m.avg_trade_return * 100).toFixed(2)}%`, m => m.avg_trade_return],
    ['Max Drawdown (權益曲線峰谷回撤)', m => `${(m.max_drawdown * 100).toFixed(2)}%`, m => m.max_drawdown < 0 ? -1 : 0],
    ['單筆最大虧損', m => `${(m.worst_single_trade_return * 100).toFixed(2)}%`, m => m.worst_single_trade_return < 0 ? -1 : 0],
    ['Sharpe Ratio (夏普值)', m => m.sharpe_ratio.toFixed(2), m => m.sharpe_ratio],
    ['Calmar Ratio (卡瑪比率)', m => m.calmar_ratio.toFixed(2), m => m.calmar_ratio]
  ];

  function statusColor(value) {
    if (value === null || value === undefined || value === 0) return T.INK_PRIMARY;
    return value > 0 ? T.GOOD : T.CRITICAL;
  }

  function buildMetricCardsHtml(metrics) {
    return METRIC_CARD_DEFS.map(([label, fmt, tone]) => {
      const color = statusColor(tone(metrics));
      return `<div class="metric-card"><div class="metric-label">${label}</div><div class="metric-value" style="color:${color};">${fmt(metrics)}</div></div>`;
    }).join('');
  }

  function computeDisplayRows(trades) {
    return trades.map(t => {
      const holdingDays = Math.round((new Date(t.sell_date) - new Date(t.buy_date)) / 86400000) + 1;
      const dailyRetPct = t.net_return_pct / holdingDays;
      return {
        trade_id: t.trade_id,
        strategy_name: t.strategy_name,
        version: t.version,
        buy_date: t.buy_date,
        sell_date: t.sell_date,
        holding_days: holdingDays,
        daily_ret_pct: dailyRetPct,
        net_return_pct: t.net_return_pct,
        net_profit_loss: t.net_profit_loss
      };
    });
  }

  const TABLE_COLUMNS = [
    { key: 'trade_id', label: '交易編號' },
    { key: 'strategy_name', label: '策略名稱' },
    { key: 'version', label: '版本' },
    { key: 'buy_date', label: '買進日期' },
    { key: 'sell_date', label: '賣出日期' },
    { key: 'holding_days', label: '持股天數' },
    { key: 'daily_ret_pct', label: '平均日報酬 (%)' },
    { key: 'net_return_pct', label: '結算報酬率 (%)' },
    { key: 'net_profit_loss', label: '絕對損益金額 (元)' }
  ];

  function formatCell(key, value) {
    if (key === 'daily_ret_pct') return `${value.toFixed(2)}%`;
    if (key === 'net_return_pct') {
      const color = value >= 0 ? T.GOOD : T.CRITICAL;
      return `<span style="color:${color};">${value >= 0 ? '+' : ''}${value.toFixed(2)}%</span>`;
    }
    if (key === 'net_profit_loss') {
      const color = value >= 0 ? T.GOOD : T.CRITICAL;
      return `<span style="color:${color};">${formatSignedInt(value)}</span>`;
    }
    return TPT.utils.escapeHtml(value);
  }

  function buildStaticTableHtml(trades) {
    if (!trades || trades.length === 0) {
      return '<p class="empty-note">目前無交易明細數據。</p>';
    }
    const rows = computeDisplayRows([...trades].sort((a, b) => new Date(a.sell_date) - new Date(b.sell_date)));
    const header = TABLE_COLUMNS.map(c => `<th>${c.label}</th>`).join('');
    const body = rows.map(row => {
      const cells = TABLE_COLUMNS.map(c => `<td>${formatCell(c.key, row[c.key])}</td>`).join('');
      return `<tr>${cells}</tr>`;
    }).join('');
    return `<div class="table-scroll"><table class="trade-table"><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table></div>`;
  }

  function renderMetricCards(metrics, container) {
    container.innerHTML = buildMetricCardsHtml(metrics);
  }

  function renderTradeTable(trades, container) {
    if (!trades || trades.length === 0) {
      container.innerHTML = '<p class="empty-note">目前無交易明細數據。請使用下方維護表單新增交易。</p>';
      return;
    }
    const state = { rows: computeDisplayRows(trades), sortKey: null, sortDir: 1, search: '' };

    container.innerHTML = `
      <div class="table-toolbar"><input type="search" placeholder="搜尋交易編號、策略..." id="table-search"></div>
      <div class="table-scroll">
        <table class="trade-table">
          <thead><tr>${TABLE_COLUMNS.map(c => `<th data-key="${c.key}">${c.label}</th>`).join('')}</tr></thead>
          <tbody></tbody>
        </table>
      </div>`;

    const tbody = container.querySelector('tbody');
    const searchInput = container.querySelector('#table-search');

    function getFilteredSortedRows() {
      let rows = state.rows;
      if (state.search) {
        const term = state.search.toLowerCase();
        rows = rows.filter(r => TABLE_COLUMNS.some(c => String(r[c.key]).toLowerCase().includes(term)));
      }
      if (state.sortKey) {
        rows = [...rows].sort((a, b) => {
          const av = a[state.sortKey], bv = b[state.sortKey];
          if (av < bv) return -1 * state.sortDir;
          if (av > bv) return 1 * state.sortDir;
          return 0;
        });
      }
      return rows;
    }

    function renderRows() {
      const rows = getFilteredSortedRows();
      tbody.innerHTML = rows.map(row => {
        const cells = TABLE_COLUMNS.map(c => `<td>${formatCell(c.key, row[c.key])}</td>`).join('');
        return `<tr>${cells}</tr>`;
      }).join('');
    }

    container.querySelectorAll('thead th').forEach(th => {
      th.addEventListener('click', () => {
        const key = th.dataset.key;
        if (state.sortKey === key) {
          state.sortDir *= -1;
        } else {
          state.sortKey = key;
          state.sortDir = 1;
        }
        renderRows();
      });
    });

    searchInput.addEventListener('input', (e) => {
      state.search = e.target.value;
      renderRows();
    });

    renderRows();
  }

  return { buildMetricCardsHtml, buildStaticTableHtml, computeDisplayRows, renderMetricCards, renderTradeTable, formatSignedInt };
})();
