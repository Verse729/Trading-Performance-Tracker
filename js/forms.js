window.TPT = window.TPT || {};

TPT.forms = (function () {
  function validateTrade(input, existingTrades, editingTradeId) {
    if (!String(input.trade_id || '').trim() || !String(input.strategy_name || '').trim()) {
      return { valid: false, error: '交易編號與策略名稱不能為空！' };
    }
    if (new Date(input.buy_date) > new Date(input.sell_date)) {
      return { valid: false, error: '賣出日期不能早於買進日期！' };
    }
    if (!(input.capital > 0)) {
      return { valid: false, error: '投入資金必須大於 0！' };
    }
    const period = TPT.timeSeries.periodOf(input.buy_date);
    const name = String(input.strategy_name).trim();
    const dup = (existingTrades || []).find(t => t.trade_id !== editingTradeId && t.strategy_name === name && TPT.timeSeries.periodOf(t.buy_date) === period);
    if (dup) {
      return { valid: false, error: `策略「${TPT.utils.escapeHtml(name)}」在 ${TPT.utils.escapeHtml(period)} 已有交易 ${TPT.utils.escapeHtml(dup.trade_id)}，每期只能一筆！` };
    }
    return { valid: true };
  }

  // 填好投入資金與損益後自動帶出報酬率；欄位仍可手改。
  function autoReturnPct(form) {
    const calc = () => {
      const cap = parseFloat(form.capital.value), pnl = parseFloat(form.net_profit_loss.value);
      if (cap > 0 && !isNaN(pnl)) form.net_return_pct.value = (pnl / cap * 100).toFixed(2);
    };
    form.capital.addEventListener('input', calc);
    form.net_profit_loss.addEventListener('input', calc);
  }

  function showAlert(container, type, message) {
    container.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
    setTimeout(() => { container.innerHTML = ''; }, 4000);
  }

  function render(container, callbacks) {
    container.innerHTML = `
      <div class="tabs">
        <button class="tab-button active" data-tab="add">➕ 新增交易</button>
        <button class="tab-button" data-tab="update">📝 修改紀錄</button>
        <button class="tab-button" data-tab="delete">❌ 刪除紀錄</button>
      </div>
      <div class="tab-panel active" data-panel="add">
        <div id="add-alert"></div>
        <form id="add-form">
          <div class="form-grid">
            <div class="form-field"><label>交易編號 (不重複)</label><input type="text" name="trade_id" placeholder="例如: T001"></div>
            <div class="form-field"><label>策略名稱</label><input type="text" name="strategy_name" placeholder="例如: 均線交叉"></div>
            <div class="form-field"><label>版本編號</label><input type="text" name="version" placeholder="例如: v1.0"></div>
            <div class="form-field"><label>買進日期</label><input type="date" name="buy_date" required></div>
            <div class="form-field"><label>賣出日期</label><input type="date" name="sell_date" required></div>
            <div class="form-field"><label>投入資金 (元)</label><input type="number" step="any" min="1" name="capital" placeholder="例如: 1000000" required></div>
            <div class="form-field"><label>結算報酬率 (%)</label><input type="number" step="0.01" name="net_return_pct" value="0"></div>
            <div class="form-field"><label>絕對損益金額 (元)</label><input type="number" step="any" name="net_profit_loss" value="0"></div>
          </div>
          <button type="submit" class="btn btn-primary">確認新增</button>
        </form>
      </div>
      <div class="tab-panel" data-panel="update">
        <div id="update-alert"></div>
        <div id="update-body"></div>
      </div>
      <div class="tab-panel" data-panel="delete">
        <div id="delete-alert"></div>
        <div id="delete-body"></div>
      </div>
    `;

    container.querySelectorAll('.tab-button').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
        container.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        container.querySelector(`.tab-panel[data-panel="${btn.dataset.tab}"]`).classList.add('active');
      });
    });

    const addForm = container.querySelector('#add-form');
    const addAlert = container.querySelector('#add-alert');
    autoReturnPct(addForm);
    addForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(addForm);
      const input = {
        trade_id: fd.get('trade_id').trim(), strategy_name: fd.get('strategy_name').trim(),
        version: fd.get('version').trim() || 'v1.0',
        buy_date: fd.get('buy_date'), sell_date: fd.get('sell_date'),
        capital: parseFloat(fd.get('capital')),
        net_return_pct: parseFloat(fd.get('net_return_pct')) || 0,
        net_profit_loss: parseFloat(fd.get('net_profit_loss')) || 0
      };
      const validation = validateTrade(input, await callbacks.getAllTrades());
      if (!validation.valid) {
        showAlert(addAlert, 'error', `❌ ${validation.error}`);
        return;
      }
      try {
        await callbacks.addTrade(input);
        showAlert(addAlert, 'success', `🎉 交易 ${TPT.utils.escapeHtml(input.trade_id)} 新增成功！`);
        addForm.reset();
        await callbacks.onChange();
      } catch (err) {
        showAlert(addAlert, 'error', `❌ 新增失敗，可能交易編號 ${TPT.utils.escapeHtml(input.trade_id)} 已存在。`);
      }
    });

    renderUpdatePanel(container, callbacks);
    renderDeletePanel(container, callbacks);
  }

  async function renderUpdatePanel(container, callbacks) {
    const body = container.querySelector('#update-body');
    const alertEl = container.querySelector('#update-alert');
    const trades = await callbacks.getAllTrades();
    if (trades.length === 0) {
      body.innerHTML = '<p class="empty-note">目前資料庫沒有任何交易數據可供修改。</p>';
      return;
    }
    body.innerHTML = `
      <div class="form-field" style="max-width:300px;"><label>選擇要修改的交易編號</label>
        <select id="update-select">${trades.map(t => `<option value="${TPT.utils.escapeHtml(t.trade_id)}">${TPT.utils.escapeHtml(t.trade_id)}</option>`).join('')}</select>
      </div>
      <form id="update-form">
        <div class="form-grid">
          <div class="form-field"><label>策略名稱</label><input type="text" name="strategy_name"></div>
          <div class="form-field"><label>版本編號</label><input type="text" name="version"></div>
          <div class="form-field"><label>買進日期</label><input type="date" name="buy_date" required></div>
          <div class="form-field"><label>賣出日期</label><input type="date" name="sell_date" required></div>
          <div class="form-field"><label>投入資金 (元)</label><input type="number" step="any" min="1" name="capital" required></div>
          <div class="form-field"><label>結算報酬率 (%)</label><input type="number" step="0.01" name="net_return_pct"></div>
          <div class="form-field"><label>絕對損益金額 (元)</label><input type="number" step="any" name="net_profit_loss"></div>
        </div>
        <button type="submit" class="btn btn-primary">確認修改</button>
      </form>`;

    const select = body.querySelector('#update-select');
    const form = body.querySelector('#update-form');
    autoReturnPct(form);

    function fillForm(tradeId) {
      const t = trades.find(x => x.trade_id === tradeId);
      form.strategy_name.value = t.strategy_name;
      form.version.value = t.version;
      form.buy_date.value = t.buy_date;
      form.sell_date.value = t.sell_date;
      form.capital.value = TPT.timeSeries.capitalOf(t) || '';
      form.net_return_pct.value = t.net_return_pct;
      form.net_profit_loss.value = t.net_profit_loss;
    }
    fillForm(select.value);
    select.addEventListener('change', () => fillForm(select.value));

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const tradeId = select.value;
      const input = {
        trade_id: tradeId,
        strategy_name: fd.get('strategy_name').trim(),
        version: fd.get('version').trim(),
        buy_date: fd.get('buy_date'), sell_date: fd.get('sell_date'),
        capital: parseFloat(fd.get('capital')),
        net_return_pct: parseFloat(fd.get('net_return_pct')) || 0,
        net_profit_loss: parseFloat(fd.get('net_profit_loss')) || 0
      };
      const validation = validateTrade(input, trades, tradeId);
      if (!validation.valid) {
        showAlert(alertEl, 'error', `❌ ${validation.error}`);
        return;
      }
      try {
        await callbacks.updateTrade(input);
        showAlert(alertEl, 'success', `📝 交易 ${TPT.utils.escapeHtml(tradeId)} 修改成功！`);
        await callbacks.onChange();
      } catch (err) {
        showAlert(alertEl, 'error', '❌ 修改失敗。');
      }
    });
  }

  async function renderDeletePanel(container, callbacks) {
    const body = container.querySelector('#delete-body');
    const alertEl = container.querySelector('#delete-alert');
    const trades = await callbacks.getAllTrades();
    if (trades.length === 0) {
      body.innerHTML = '<p class="empty-note">目前資料庫沒有任何交易數據可供刪除。</p>';
      return;
    }
    body.innerHTML = `
      <div class="form-field" style="max-width:300px;"><label>選擇要刪除的交易編號</label>
        <select id="delete-select">${trades.map(t => `<option value="${TPT.utils.escapeHtml(t.trade_id)}">${TPT.utils.escapeHtml(t.trade_id)}</option>`).join('')}</select>
      </div>
      <div class="alert alert-warning" id="delete-warning"></div>
      <button class="btn btn-danger btn-block" id="delete-confirm">🔴 確認永久刪除</button>`;

    const select = body.querySelector('#delete-select');
    const warning = body.querySelector('#delete-warning');
    function updateWarning() {
      warning.textContent = `⚠️ 警告：確定要永久刪除交易紀錄 ${select.value} 嗎？刪除後將無法還原。`;
    }
    updateWarning();
    select.addEventListener('change', updateWarning);

    body.querySelector('#delete-confirm').addEventListener('click', async () => {
      const tradeId = select.value;
      try {
        await callbacks.deleteTrade(tradeId);
        showAlert(alertEl, 'success', `🗑️ 交易 ${TPT.utils.escapeHtml(tradeId)} 已成功移除！`);
        await callbacks.onChange();
      } catch (err) {
        showAlert(alertEl, 'error', '❌ 刪除失敗。');
      }
    });
  }

  return { render, validateTrade };
})();
