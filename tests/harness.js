// 瀏覽器與 node 共用。瀏覽器：把結果印在 #results。node：印到 console 並設定 exit code。
(function (root) {
  const results = [];
  root.assertClose = function (name, actual, expected, tolerance) {
    tolerance = tolerance === undefined ? 1e-6 : tolerance;
    const pass = typeof actual === 'number' && Math.abs(actual - expected) < tolerance;
    results.push({ name, pass, actual, expected });
  };
  root.assertEqual = function (name, actual, expected) {
    results.push({ name, pass: actual === expected, actual, expected });
  };
  root.reportResults = function () {
    const allPass = results.every(r => r.pass);
    if (typeof document !== 'undefined') {
      const el = document.getElementById('results');
      results.forEach(r => {
        const line = document.createElement('div');
        line.style.color = r.pass ? 'green' : 'red';
        line.textContent = `[${r.pass ? 'PASS' : 'FAIL'}] ${r.name} (actual=${r.actual}, expected=${r.expected})`;
        el.appendChild(line);
      });
      const summary = document.createElement('h2');
      summary.textContent = allPass ? '全部通過 ✅' : '有測試失敗 ❌';
      summary.style.color = allPass ? 'green' : 'red';
      el.prepend(summary);
    } else {
      results.forEach(r => console.log(`[${r.pass ? 'PASS' : 'FAIL'}] ${r.name} (actual=${r.actual}, expected=${r.expected})`));
      console.log(allPass ? '全部通過' : '有測試失敗');
      process.exitCode = allPass ? 0 : 1;
    }
  };
  // node 專用：把 js/ 下的檔案掛到 globalThis.window
  root.loadSources = function (files) {
    if (typeof require === 'undefined') return;
    globalThis.window = globalThis;
    const path = require('path');
    files.forEach(f => require(path.join(__dirname, '..', 'js', f)));
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
