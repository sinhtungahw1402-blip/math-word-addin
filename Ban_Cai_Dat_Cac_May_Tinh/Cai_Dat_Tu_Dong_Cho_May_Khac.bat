@echo off
chcp 65001 >nul
title Cai Dat Toan Hoc Word Add-in
cls
echo ======================================================================
echo       CAI DAT TU DONG BO CONG CU TOAN HOC CHO MICROSOFT WORD
echo ======================================================================
echo.
echo [!] LUU Y: Ban chi can NHAP DUP CHUOT (Double click) de chay file nay.
echo     KHONG CAN phai chon "Run as administrator".
echo.

pushd "%~dp0"
set "SRC_DIR=%CD%"
popd

:: 1. Copy manifest.xml vao thu muc he thong an toan cua nguoi dung
set "TARGET_DIR=%APPDATA%\MathWordAddin"
echo [1/4] Dang thiet lap thu muc luu tru Add-in tai:
echo       %TARGET_DIR%
if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%" >nul 2>&1
copy /y "%SRC_DIR%\manifest.xml" "%TARGET_DIR%\manifest.xml" >nul 2>&1

if not exist "%TARGET_DIR%\manifest.xml" (
    echo [CANH BAO] Khong the sao chep vao AppData, su dung thu muc hien tai: %SRC_DIR%
    set "MANIFEST_PATH=%SRC_DIR%\manifest.xml"
) else (
    set "MANIFEST_PATH=%TARGET_DIR%\manifest.xml"
)

:: 2. Dang ky Add-in vao Microsoft Word Developer Registry (Hien thi truc tiep tren Ribbon)
echo [2/4] Dang dang ky Add-in vao Microsoft Word...
reg add "HKCU\Software\Microsoft\Office\16.0\WEF\Developer" /v "b7c25c38-89fa-47cb-bf9a-320a4b7ec991" /t REG_SZ /d "%MANIFEST_PATH%" /f >nul 2>&1
reg add "HKCU\Software\Microsoft\Office\15.0\WEF\Developer" /v "b7c25c38-89fa-47cb-bf9a-320a4b7ec991" /t REG_SZ /d "%MANIFEST_PATH%" /f >nul 2>&1

:: Kich hoat che do tai moi va lam moi thanh Ribbon cua Word
reg add "HKCU\Software\Microsoft\Office\16.0\WEF" /v "WordOMEXRefreshPending" /t REG_DWORD /d 1 /f >nul 2>&1
reg add "HKCU\Software\Microsoft\Office\16.0\WEF" /v "Word__HasRegistryAddin" /t REG_DWORD /d 1 /f >nul 2>&1

:: 3. Thiet lap thu muc chia se noi bo Trusted Catalog (Neu co quyen chia se mang)
echo [3/4] Dang cau hinh thu muc tin cay (Trusted Catalog)...
net share MathWordAddin /delete >nul 2>&1
net share MathWordAddin="%TARGET_DIR%" /grant:everyone,READ >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    reg add "HKCU\Software\Microsoft\Office\16.0\WEF\TrustedCatalogs\{b7c25c38-89fa-47cb-bf9a-320a4b7ec991}" /v "Id" /t REG_SZ /d "{b7c25c38-89fa-47cb-bf9a-320a4b7ec991}" /f >nul 2>&1
    reg add "HKCU\Software\Microsoft\Office\16.0\WEF\TrustedCatalogs\{b7c25c38-89fa-47cb-bf9a-320a4b7ec991}" /v "Url" /t REG_SZ /d "\\localhost\MathWordAddin" /f >nul 2>&1
    reg add "HKCU\Software\Microsoft\Office\16.0\WEF\TrustedCatalogs\{b7c25c38-89fa-47cb-bf9a-320a4b7ec991}" /v "Flags" /t REG_DWORD /d 1 /f >nul 2>&1
)

:: 4. Don dep bo nho dem (Cache) cua Office de luon cap nhat ban moi nhat
echo [4/4] Dang lam sach bo nho dem Word de tai ban moi nhat...
if exist "%LOCALAPPDATA%\Microsoft\Office\16.0\Wef" (
    rmdir /s /q "%LOCALAPPDATA%\Microsoft\Office\16.0\Wef" >nul 2>&1
)
if exist "%LOCALAPPDATA%\Microsoft\Office\16.0\WebServiceCache" (
    rmdir /s /q "%LOCALAPPDATA%\Microsoft\Office\16.0\WebServiceCache" >nul 2>&1
)

echo.
echo ======================================================================
echo                 HOAN TAT CAI DAT THANH CONG!
echo ======================================================================
echo.
echo BAY GIO BAN CHI CAN MO MICROSOFT WORD:
echo.
echo  - Neu Word dang mo, hay DONG HET cac cua so Word va mo lai.
echo  - Tren thanh menu cua Word se xuat hien tab "Toan Hoc" voi day du
echo    cac tinh nang: Soan cong thuc, Quet PDF/Anh de thi sang Word,
echo    ve Hinh phang, Hinh khong gian, Bang bien thien va Do thi!
echo.
echo (Truong hop tab chua hien ngay: Vao Insert -> My Add-ins (hoac Get Add-ins)
echo  -> Chon tab "SHARED FOLDER" -> Chon "Toan Hoc" -> Bam Add).
echo ======================================================================
echo.
pause
