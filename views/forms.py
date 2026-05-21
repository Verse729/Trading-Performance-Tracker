import streamlit as st
from datetime import date
import pandas as pd

def render_trade_forms(db_manager, on_data_changed_callback):
    """
    渲染資料管理的表單元件
    on_data_changed_callback: 當資料有變動時，通知主程式重新整理畫面的函數
    """
    st.subheader("🛠️ 資料庫數據維護")
    
    # 使用 Tabs 將「新增」、「修改」、「刪除」區隔開來
    tab_add, tab_update, tab_delete = st.tabs(["➕ 新增交易", "📝 修改紀錄", "❌ 刪除紀錄"])

    # 1. 新增交易區塊
    with tab_add:
        with st.form("add_trade_form", clear_on_submit=True):
            st.caption("請輸入完成結算的交易明細：")
            
            # 使用 st.columns 進行表單排版
            col1, col2, col3 = st.columns(3)
            with col1:
                t_id = st.text_input("交易編號 (不重複)", placeholder="例如: T001")
                s_name = st.text_input("策略名稱", placeholder="例如: 均線交叉")
            with col2:
                v_name = st.text_input("版本編號", placeholder="例如: v1.0")
                b_date = st.date_input("買進日期", date.today())
            with col3:
                s_date = st.date_input("賣出日期", date.today())
                ret_pct = st.number_input("結算報酬率 (%)", val=0.0, step=0.1, format="%.2f")
                pnl_amt = st.number_input("絕對損益金額 (元)", val=0.0, step=100.0, format="%.0f")

            submit_btn = st.form_submit_button("確認新增")
            
            if submit_btn:
                # 前端基本驗證防呆
                if not t_id.strip() or not s_name.strip():
                    st.error("❌ 交易編號與策略名稱不能為空！")
                elif b_date > s_date:
                    st.error("❌ 錯誤：賣出日期不能早於買進日期！")
                else:
                    success = db_manager.add_trade(
                        t_id.strip(), s_name.strip(), v_name.strip() or "v1.0",
                        str(b_date), str(s_date), ret_pct, pnl_amt
                    )
                    if success:
                        st.success(f"🎉 交易 {t_id} 新增成功！")
                        on_data_changed_callback() # 觸發外層刷新
                    else:
                        st.error(f"❌ 新增失敗，可能交易編號 {t_id} 已存在。")

    # 讀取當前最新的所有交易，供修改與刪除下拉選單使用
    df_all = db_manager.get_all_trades()

    # 2. 修改紀錄區塊
    with tab_update:
        if df_all.empty:
            st.info("目前資料庫沒有任何交易數據可供修改。")
        else:
            selected_id = st.selectbox("選擇要修改的交易編號", df_all['trade_id'].tolist(), key="update_select")
            # 自動帶出該筆資料的既有數據
            trade_row = df_all[df_all['trade_id'] == selected_id].iloc[0]
            
            with st.form("update_trade_form"):
                col1, col2, col3 = st.columns(3)
                with col1:
                    u_s_name = st.text_input("策略名稱", val=trade_row['strategy_name'])
                    u_v_name = st.text_input("版本編號", val=trade_row['version'])
                with col2:
                    # 將文字字串轉回 date 物件供介面預設顯示
                    u_b_date = st.date_input("買進日期", pd.to_datetime(trade_row['buy_date']).date())
                with col3:
                    u_s_date = st.date_input("賣出日期", pd.to_datetime(trade_row['sell_date']).date())
                    u_ret_pct = st.number_input("結算報酬率 (%)", val=float(trade_row['net_return_pct']), step=0.1, format="%.2f")
                    u_pnl_amt = st.number_input("絕對損益金額 (元)", val=float(trade_row['net_profit_loss']), step=100.0, format="%.0f")

                update_btn = st.form_submit_button("確認修改")
                if update_btn:
                    if u_b_date > u_s_date:
                        st.error("❌ 錯誤：賣出日期不能早於買進日期！")
                    else:
                        success = db_manager.update_trade(
                            selected_id, u_s_name.strip(), u_v_name.strip(),
                            str(u_b_date), str(u_s_date), u_ret_pct, u_pnl_amt
                        )
                        if success:
                            st.success(f"📝 交易 {selected_id} 修改成功！")
                            on_data_changed_callback()
                        else:
                            st.error("❌ 修改失敗。")

    # 3. 刪除紀錄區塊
    with tab_delete:
        if df_all.empty:
            st.info("目前資料庫沒有任何交易數據可供刪除。")
        else:
            del_id = st.selectbox("選擇要刪除的交易編號", df_all['trade_id'].tolist(), key="delete_select")
            st.warning(f"⚠️ 警告：確定要永久刪除交易紀錄 {del_id} 嗎？刪除後將無法還原。")
            
            del_btn = st.button("🔴 確認永久刪除", use_container_width=True)
            if del_btn:
                success = db_manager.delete_trade(del_id)
                if success:
                    st.success(f"🗑️ 交易 {del_id} 已成功移除！")
                    on_data_changed_callback()
                else:
                    st.error("❌ 刪除失敗。")
