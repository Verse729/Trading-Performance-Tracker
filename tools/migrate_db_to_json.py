"""一次性資料遷移工具：將 trading_tracker.db 匯出成純網頁版可匯入的 JSON。

執行方式：python tools/migrate_db_to_json.py
只需要執行一次；完成匯入後可刪除本腳本與 trading_tracker.db。
"""
import sqlite3
import json
import os

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(PROJECT_ROOT, 'trading_tracker.db')
OUTPUT_PATH = os.path.join(PROJECT_ROOT, 'trades_export.json')


def main():
    if not os.path.exists(DB_PATH):
        print(f'找不到資料庫檔案: {DB_PATH}')
        return

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute(
        'SELECT trade_id, strategy_name, version, buy_date, sell_date, '
        'net_return_pct, net_profit_loss FROM trades'
    )
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()

    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(rows, f, ensure_ascii=False, indent=2)

    print(f'已匯出 {len(rows)} 筆交易紀錄到 {OUTPUT_PATH}')
    print('請到網頁版點擊「匯入 JSON 備份」，選擇這個檔案即可完成資料搬遷。')


if __name__ == '__main__':
    main()
