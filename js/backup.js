window.TPT = window.TPT || {};

TPT.backup = (function () {
  const HANDLE_KEY = 'backupFileHandle';

  function isFileSystemAccessSupported() {
    return typeof window.showSaveFilePicker === 'function';
  }

  async function chooseBackupFile() {
    if (!isFileSystemAccessSupported()) {
      throw new Error('此瀏覽器不支援自動備份功能，請改用手動匯出。');
    }
    const handle = await window.showSaveFilePicker({
      suggestedName: 'trades_backup.json',
      types: [{ description: 'JSON 檔案', accept: { 'application/json': ['.json'] } }]
    });
    await TPT.db.setSetting(HANDLE_KEY, handle);
    return handle;
  }

  async function getConfiguredHandle() {
    if (!isFileSystemAccessSupported()) return null;
    const handle = await TPT.db.getSetting(HANDLE_KEY);
    return handle || null;
  }

  async function ensurePermission(handle) {
    const opts = { mode: 'readwrite' };
    if ((await handle.queryPermission(opts)) === 'granted') return true;
    if ((await handle.requestPermission(opts)) === 'granted') return true;
    return false;
  }

  async function writeIfConfigured(trades) {
    const handle = await getConfiguredHandle();
    if (!handle) return { written: false, reason: 'not_configured' };
    let granted;
    try {
      granted = await ensurePermission(handle);
    } catch (err) {
      return { written: false, reason: 'permission_error' };
    }
    if (!granted) return { written: false, reason: 'permission_denied' };
    const writable = await handle.createWritable();
    await writable.write(JSON.stringify(trades, null, 2));
    await writable.close();
    return { written: true };
  }

  function exportJson(trades) {
    const blob = new Blob([JSON.stringify(trades, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const timestamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
    a.href = url;
    a.download = `trades_export_${timestamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function importJsonFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          if (!Array.isArray(data)) throw new Error('檔案格式錯誤：預期為交易陣列');
          resolve(data);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }

  return { isFileSystemAccessSupported, chooseBackupFile, getConfiguredHandle, writeIfConfigured, exportJson, importJsonFile };
})();
