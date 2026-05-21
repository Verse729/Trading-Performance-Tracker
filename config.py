import os

# 資料庫設定
DB_NAME = "trading_tracker.db"
DB_PATH = os.path.join(os.path.dirname(__file__), DB_NAME)

# 績效計算基礎設定
INITIAL_CAPITAL = 1000000.0  # 預設初始資金（100萬），用於計算百分比資產淨值與回撤
RISK_FREE_RATE = 0.02        # 年化無風險利率（2%），計算夏普值使用
