@echo off
title Cai dat Toan Hoc Word Add-in
cls
echo ====================================================
echo   CAI DAT TOAN HOC WORD ADD-IN CHO MAY TINH
echo ====================================================
echo.

pushd "%~dp0"
set "APP_DIR=%CD%"
popd

echo [1/3] Dang thiet lap thu muc mang noi bo: %APP_DIR%
net share MathWordAddin /delete >nul 2>&1
net share MathWordAddin="%APP_DIR%" /grant:everyone,READ >nul 2>&1

echo [2/3] Dang dang ky danh muc vao Microsoft Word...
reg add "HKCU\Software\Microsoft\Office\16.0\WEF\TrustedCatalogs\{b7c25c38-89fa-47cb-bf9a-320a4b7ec991}" /v "Id" /t REG_SZ /d "{b7c25c38-89fa-47cb-bf9a-320a4b7ec991}" /f >nul 2>&1
reg add "HKCU\Software\Microsoft\Office\16.0\WEF\TrustedCatalogs\{b7c25c38-89fa-47cb-bf9a-320a4b7ec991}" /v "Url" /t REG_SZ /d "\\localhost\MathWordAddin" /f >nul 2>&1
reg add "HKCU\Software\Microsoft\Office\16.0\WEF\TrustedCatalogs\{b7c25c38-89fa-47cb-bf9a-320a4b7ec991}" /v "Flags" /t REG_DWORD /d 1 /f >nul 2>&1

echo [3/3] Lam sach bo nho dem Word...
if exist "%LOCALAPPDATA%\Microsoft\Office\16.0\Wef" (
    rmdir /s /q "%LOCALAPPDATA%\Microsoft\Office\16.0\Wef" >nul 2>&1
)

echo.
echo ====================================================
echo   HOAN TAT! BAY GIO BAN HAY LAM THEO 3 BUOC:
echo ====================================================
echo 1. Mo phan mem Microsoft Word.
echo 2. Vao menu Insert (Chen) -> chon My Add-ins (Phan bo tro).
echo 3. Chon the SHARED FOLDER (Thu muc dung chung) -> chon Toan Hoc va bam Add!
echo ====================================================
echo.
pause
