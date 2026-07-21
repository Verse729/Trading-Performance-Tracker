window.TPT = window.TPT || {};

TPT.db = (function () {
  const DB_NAME = 'trading_tracker';
  const DB_VERSION = 1;
  let dbPromise = null;

  function openDatabase() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('trades')) {
          db.createObjectStore('trades', { keyPath: 'trade_id' });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };
      request.onsuccess = (event) => resolve(event.target.result);
      request.onerror = (event) => reject(event.target.error);
    });
    return dbPromise;
  }

  async function getAllTrades() {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('trades', 'readonly');
      const request = tx.objectStore('trades').getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function addTrade(trade) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('trades', 'readwrite');
      const request = tx.objectStore('trades').add(trade);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async function updateTrade(trade) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('trades', 'readwrite');
      const request = tx.objectStore('trades').put(trade);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async function deleteTrade(tradeId) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('trades', 'readwrite');
      const request = tx.objectStore('trades').delete(tradeId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async function getSetting(key) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('settings', 'readonly');
      const request = tx.objectStore('settings').get(key);
      request.onsuccess = () => resolve(request.result ? request.result.value : undefined);
      request.onerror = () => reject(request.error);
    });
  }

  async function setSetting(key, value) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('settings', 'readwrite');
      const request = tx.objectStore('settings').put({ key, value });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  return { openDatabase, getAllTrades, addTrade, updateTrade, deleteTrade, getSetting, setSetting };
})();
