import streamlit as st
import os
import sys

# 確保路徑正確，防止 Conda 環境下的 Import 異常
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from config import DB_PATH
from database.db_manager import DBManager
from analyzer.time_series import generate_daily_equity_curve
from analyzer.metrics import calculate_metrics
from views.dashboard import render_dashboard
from views.charts import plot_performance_charts, plot_cumulative_pnl_chart
from views.forms import render_trade_forms

# 1. 網頁基本配置 (寬螢幕模式、網頁標題)
st.set_page_config(
    page_title="交易績效追蹤系統",
    page_icon="📈",
    layout="wide"
)

st.title("📈 交易績效追蹤與多策略分析系統")
st.markdown("輸入你的歷史交易明細，自動產出精準時間加權的累計權益曲線與核心風險指標。")

# 2. 初始化資料庫管理員
db_manager = DBManager(DB_PATH)

# 3. 讀取最新數據
df_all_trades = db_manager.get_all_trades()

# 4. 控制側邊欄 (Sidebar) ── 策略篩選與圖表控制
st.sidebar.header("⚙️ 控制面板与篩選")

# 動態從資料庫抓取目前有哪些策略名稱
if not df_all_trades.empty:
    strategy_list = ["全部策略"] + sorted(df_all_trades['strategy_name'].unique().tolist())
else:
    strategy_list = ["全部策略"]

# 側邊欄控制項：多策略切換
selected_strat = st.sidebar.selectbox("選擇分析策略", strategy_list)

# 5. 資料分流過濾 (核心痛點：支援分開計算不同策略結果)
if selected_strat == "全部策略":
    df_filtered = df_all_trades
else:
    df_filtered = df_all_trades[df_all_trades['strategy_name'] == selected_strat]

# 6. 核心計算與績效生成
df_daily = generate_daily_equity_curve(df_filtered)
metrics = calculate_metrics(df_filtered, df_daily)

# 7. 主畫面渲染：上半部儀表板與圖表
render_dashboard(metrics, df_filtered)

st.subheader("📉 單筆結算報酬率")
fig = plot_performance_charts(df_filtered, df_daily)
st.plotly_chart(fig, width='stretch')

st.subheader("📈 累積絕對損益金額")
fig2 = plot_cumulative_pnl_chart(df_filtered)
st.plotly_chart(fig2, width='stretch')

st.markdown("---")

# 8. 主畫面渲染：下半部資料庫表單維護
# 傳入 st.rerun 作為 callback 函數。當表單更新資料庫後，強迫 Streamlit 從頭執行 app.py 刷新畫面
render_trade_forms(db_manager, on_data_changed_callback=st.rerun)
