@echo off
chcp 65001 > nul
echo ====================================================
echo      MỞ GITHUB DESKTOP ĐỂ TẢI LÊN GITHUB
echo ====================================================
echo.
echo Mã nguồn dự án đã được khởi tạo Git sẵn sàng!
echo Đang mở GitHub Desktop...
start "" "C:\Users\TUNG\AppData\Local\GitHubDesktop\GitHubDesktop.exe"
echo.
echo ====================================================
echo CÁC BƯỚC ĐỂ TẢI LÊN GITHUB:
echo 1. Trong GitHub Desktop, bấm menu: File -> Add local repository (hoặc bấm Ctrl+O)
echo 2. Chọn thư mục dự án:
echo    %~dp0
echo 3. Bấm nút [Add repository].
echo 4. Bấm nút màu xanh [Publish repository] để đưa lên GitHub của bạn!
echo ====================================================
pause
