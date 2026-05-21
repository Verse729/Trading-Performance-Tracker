@echo off
:: 強制指定為繁體中文編碼 (Big5)，避免中文字元干擾指令解析
chcp 950 > nul

:: --- 環境變數設定 ---
set ENV_NAME=trading_tracker
set PYTHON_VER=3.11

echo [1/4] Removing old environment: %ENV_NAME%...
call conda env remove -n %ENV_NAME% -y

echo [2/4] Creating new environment: %PYTHON_VER%...
call conda create -n %ENV_NAME% python=%PYTHON_VER% -y

echo [3/4] Activating environment...
call conda activate %ENV_NAME%

echo [4/4] Installing Core Packages (Pandas, NumPy, Plotly, Streamlit)...
python -m pip install --upgrade pip --no-input
python -m pip install --no-cache-dir pandas numpy plotly streamlit --no-input

echo ==========================================
echo 環境 %ENV_NAME% 已配置完成！
echo.
echo 提示：請於 Anaconda Prompt 中切換至專案目錄，
echo 並輸入 [streamlit run app.py] 即可啟動程式。
echo ==========================================
pause
