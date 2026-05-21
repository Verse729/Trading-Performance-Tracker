# test_db.py
import sys
import os

base_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, base_dir)

from config import DB_PATH
from database.db_manager import DBManager

db = DBManager(DB_PATH)

print("--- 測試新增 ---")
success = db.add_trade(
    trade_id="T001",
    strategy_name="DualThrust",
    version="v1.0",
    buy_date="2026-03-01",
    sell_date="2026-03-15",
    net_return_pct=5.5,
    net_profit_loss=55000.0
)
print(f"新增成功: {success}")

print("\n--- 測試讀取 ---")
df = db.get_all_trades()
print(df)

print("\n--- 測試修改 ---")
db.update_trade("T001", "DualThrust", "v1.1", "2026-03-01", "2026-03-15", 6.0, 60000.0)
print(db.get_all_trades())

print("\n--- 測試刪除 ---")
db.delete_trade("T001")
print(db.get_all_trades())
