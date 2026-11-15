@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion

echo ====================================================
echo   TẠO FILE CÀI ĐẶT WORD DÙNG CHO MỌI MÁY TÍNH
echo ====================================================
echo.
cd /d "%~dp0"

set /p APP_URL="Nhập địa chỉ Web HTTPS của bạn (ví dụ https://toan-word.netlify.app): "

if "%APP_URL%"=="" (
    echo [LỖI] Bạn chưa nhập địa chỉ web!
    pause
    exit /b 1
)

echo.
echo Đang tạo file manifest từ URL: %APP_URL% ...
node scripts/generate-manifest.cjs "%APP_URL%"

if not exist "%~dp0Ban_Cai_Dat_Cac_May_Tinh" mkdir "%~dp0Ban_Cai_Dat_Cac_May_Tinh"
copy /y "%~dp0manifest.prod.xml" "%~dp0Ban_Cai_Dat_Cac_May_Tinh\manifest.xml" > nul

echo.
echo ====================================================
echo ✅ HOÀN TẤT!
echo File cài đặt đã được tạo tại thư mục:
echo   %~dp0Ban_Cai_Dat_Cac_May_Tinh\manifest.xml
echo.
echo Bạn chỉ cần sao chép file 'manifest.xml' này sang
echo BẤT KỲ MÁY TÍNH NÀO để cài đặt vào Word!
echo ====================================================
echo.
explorer "%~dp0Ban_Cai_Dat_Cac_May_Tinh"
pause
