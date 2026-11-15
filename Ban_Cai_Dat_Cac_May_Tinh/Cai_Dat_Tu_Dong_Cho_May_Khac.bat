@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion

echo ====================================================
echo   CÀI ĐẶT TỰ ĐỘNG ADD-IN TOÁN HỌC VÀO MICROSOFT WORD
echo ====================================================
echo.

:: Kiểm tra quyền Administrator
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [THÔNG BÁO QUAN TRỌNG]
    echo Vui lòng nhấp chuột phải vào file này và chọn:
    echo    "Run as administrator" (Chạy với quyền quản trị viên)
    echo để phần mềm tự động đăng ký vào Word!
    echo.
    pause
    exit /b 1
)

set "FOLDER_PATH=%~dp0"
:: Xóa dấu gạch chéo cuối nếu có
if "%FOLDER_PATH:~-1%"=="\" set "FOLDER_PATH=%FOLDER_PATH:~0,-1%"

echo [1/3] Đang tạo thư mục chia sẻ nội bộ...
net share MathWordAddin /delete >nul 2>&1
net share MathWordAddin="%FOLDER_PATH%" /grant:everyone,READ >nul 2>&1

echo [2/3] Đang đăng ký danh mục đáng tin cậy vào Microsoft Word...
set "REG_KEY=HKCU\Software\Microsoft\Office\16.0\WEF\TrustedCatalogs\{b7c25c38-89fa-47cb-bf9a-320a4b7ec991}"
reg add "%REG_KEY%" /v "Id" /t REG_SZ /d "{b7c25c38-89fa-47cb-bf9a-320a4b7ec991}" /f >nul
reg add "%REG_KEY%" /v "Url" /t REG_SZ /d "\\localhost\MathWordAddin" /f >nul
reg add "%REG_KEY%" /v "Flags" /t REG_DWORD /d 1 /f >nul

echo [3/3] Đang làm mới bộ nhớ đệm Word...
if exist "%LOCALAPPDATA%\Microsoft\Office\16.0\Wef" (
    del /q /s "%LOCALAPPDATA%\Microsoft\Office\16.0\Wef\*" >nul 2>&1
)

echo.
echo ====================================================
echo ✅ CÀI ĐẶT THÀNH CÔNG 100%!
echo.
echo BÂY GIỜ BẠN CHỈ CẦN:
echo 1. Mở phần mềm Microsoft Word.
echo 2. Vào tab 'Insert' (Chèn) -> chọn 'My Add-ins' (Phần bổ trợ của tôi).
echo 3. Bấm vào thẻ 'SHARED FOLDER' (Thư mục dùng chung).
echo 4. Chọn 'Toán Học' và bấm 'Add' (Thêm).
echo ====================================================
echo.
pause
