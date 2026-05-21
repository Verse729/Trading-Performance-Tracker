import sqlite3
import pandas as pd
import os

class DBManager:
    def __init__(self, db_path: str):
        self.db_path = db_path
        self.init_db()

    def _get_connection(self) -> sqlite3.Connection:
        """建立並回傳資料庫連線"""
        return sqlite3.connect(self.db_path, check_same_thread=False)

    def init_db(self):
        """初始化資料庫與建立交易紀錄資料表"""
        query = """
        CREATE TABLE IF NOT EXISTS trades (
            trade_id TEXT PRIMARY KEY,
            strategy_name TEXT NOT EXISTS NOT NULL,
            version TEXT NOT NULL,
            buy_date TEXT NOT NULL,
            sell_date TEXT NOT NULL,
            net_return_pct REAL NOT NULL,
            net_profit_loss REAL NOT NULL
        );
        """
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS trades (
                trade_id TEXT PRIMARY KEY,
                strategy_name TEXT NOT NULL,
                version TEXT NOT NULL,
                buy_date TEXT NOT NULL,
                sell_date TEXT NOT NULL,
                net_return_pct REAL NOT NULL,
                net_profit_loss REAL NOT NULL
            );
            """)
            conn.commit()

    def add_trade(self, trade_id: str, strategy_name: str, version: str, 
                  buy_date: str, sell_date: str, net_return_pct: float, 
                  net_profit_loss: float) -> bool:
        """新增一筆交易紀錄"""
        query = """
        INSERT INTO trades (trade_id, strategy_name, version, buy_date, sell_date, net_return_pct, net_profit_loss)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(query, (trade_id, strategy_name, version, buy_date, sell_date, net_return_pct, net_profit_loss))
                conn.commit()
            return True
        except sqlite3.IntegrityError:
            print(f"錯誤：交易編號 {trade_id} 已存在。")
            return False

    def get_all_trades(self) -> pd.DataFrame:
        """讀取所有交易紀錄並直接回傳 pandas.DataFrame"""
        query = "SELECT * FROM trades"
        with self._get_connection() as conn:
            df = pd.read_sql_query(query, conn)
        return df

    def update_trade(self, trade_id: str, strategy_name: str, version: str, 
                     buy_date: str, sell_date: str, net_return_pct: float, 
                     net_profit_loss: float) -> bool:
        """根據交易編號修改既有紀錄"""
        query = """
        UPDATE trades 
        SET strategy_name = ?, version = ?, buy_date = ?, sell_date = ?, net_return_pct = ?, net_profit_loss = ?
        WHERE trade_id = ?
        """
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, (strategy_name, version, buy_date, sell_date, net_return_pct, net_profit_loss, trade_id))
            conn.commit()
            return cursor.rowcount > 0

    def delete_trade(self, trade_id: str) -> bool:
        """根據交易編號刪除紀錄"""
        query = "DELETE FROM trades WHERE trade_id = ?"
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, (trade_id,))
            conn.commit()
            return cursor.rowcount > 0