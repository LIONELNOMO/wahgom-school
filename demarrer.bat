@echo off
setlocal
cd /d "%~dp0"

if not exist "C:\xampp\php\php.exe" (
  echo PHP XAMPP est introuvable dans C:\xampp.
  echo Installez ou demarrez XAMPP, puis relancez ce fichier.
  pause
  exit /b 1
)

echo Verification de MySQL...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$listener = Get-NetTCPConnection -LocalPort 3306 -State Listen -ErrorAction SilentlyContinue; if (-not $listener) { Start-Process -FilePath 'C:\xampp\mysql\bin\mysqld.exe' -ArgumentList '--defaults-file=C:\xampp\mysql\bin\my.ini','--standalone' -WorkingDirectory 'C:\xampp\mysql\bin' -WindowStyle Hidden }"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ok = $false; 1..15 | ForEach-Object { if (Get-NetTCPConnection -LocalPort 3306 -State Listen -ErrorAction SilentlyContinue) { $ok = $true; return }; Start-Sleep -Milliseconds 500 }; if (-not $ok) { exit 1 }"
if errorlevel 1 (
  echo MySQL n'a pas pu demarrer. Ouvrez le panneau XAMPP et demarrez MySQL.
  pause
  exit /b 1
)

echo Verification de la base locale...
"C:\xampp\mysql\bin\mysql.exe" -u root -e "CREATE DATABASE IF NOT EXISTS wamghomschool CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
if errorlevel 1 (
  echo Impossible de creer la base locale. Verifiez l'utilisateur root de MySQL.
  pause
  exit /b 1
)
"C:\xampp\php\php.exe" "backend\scripts\install.php"
if errorlevel 1 (
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Installation des dependances de WamghomSchool...
  call npm.cmd install
  if errorlevel 1 (
    echo.
    echo L'installation a echoue. Verifiez que Node.js est installe.
    pause
    exit /b 1
  )
)

echo Preparation de WamghomSchool en mode PWA...
call npm.cmd run build
if errorlevel 1 (
  echo.
  echo La compilation a echoue.
  pause
  exit /b 1
)

echo Demarrage de l'API PHP...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$listener = Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue; if (-not $listener) { Start-Process -FilePath 'C:\xampp\php\php.exe' -ArgumentList @('-S','127.0.0.1:8080','-t','%~dp0backend\public','%~dp0backend\public\index.php') -WorkingDirectory '%~dp0' -WindowStyle Hidden }"

echo Demarrage de WamghomSchool...
call npm.cmd run preview -- --open --port 4173
endlocal
