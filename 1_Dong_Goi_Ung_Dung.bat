@echo off
chcp 65001 > nul
echo ====================================================
echo   ĐÓNG GÓI ỨNG DỤNG WORD TOÁN HỌC (PRODUCTION BUILD)
echo ====================================================
echo.
cd /d "%~dp0"
echo [1/2] Đang biên dịch mã nguồn và đóng gói...
call npm run build
if %errorlevel% neq 0 (
    echo.
    echo [LỖI] Đóng gói thất bại. Vui lòng kiểm tra lại mã nguồn!
    pause
    exit /b %errorlevel%
)
echo.
echo [2/2] Đóng gói thành công! Thư mục 'dist' đã sẵn sàng.
echo Đang mở thư mục 'dist' để bạn kéo thả lên Netlify/Vercel...
explorer "%~dp0dist"
echo.
echo ====================================================
echo HƯỚNG DẪN:
echo 1. Kéo thả thư mục 'dist' vừa mở vào trang:
echo    https://app.netlify.com/drop
echo 2. Sau khi có link trang web (ví dụ: https://toan-word.netlify.app),
echo    hãy chạy file '2_Tao_File_Cai_Dat_Word.bat' để tạo file cài cho Word!
echo ====================================================
pause
