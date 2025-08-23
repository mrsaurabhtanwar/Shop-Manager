@echo off
REM Shop Manager Windows Deployment Script
REM Usage: deploy.bat [development|production]

setlocal enabledelayedexpansion

set "ENVIRONMENT=%~1"
if "%ENVIRONMENT%"=="" set "ENVIRONMENT=production"

echo 🚀 Starting Shop Manager deployment in %ENVIRONMENT% mode...

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed or not in PATH
    echo Please install Python 3.11+ from https://python.org
    pause
    exit /b 1
)

REM Check Python version
for /f "tokens=2" %%i in ('python --version 2^>^&1') do set PYTHON_VERSION=%%i
echo ✓ Found Python %PYTHON_VERSION%

REM Create application directory
set "APP_DIR=C:\ShopManager"
if not exist "%APP_DIR%" (
    echo Creating application directory: %APP_DIR%
    mkdir "%APP_DIR%"
)

REM Copy application files
echo Copying application files...
xcopy /E /I /Y /Q . "%APP_DIR%" >nul
if errorlevel 1 (
    echo ❌ Failed to copy application files
    pause
    exit /b 1
)

REM Change to application directory
cd /d "%APP_DIR%"

REM Create virtual environment
echo Creating virtual environment...
if exist "venv" (
    echo Virtual environment already exists, updating...
) else (
    python -m venv venv
)

REM Activate virtual environment and install requirements
echo Installing Python packages...
call venv\Scripts\activate.bat
python -m pip install --upgrade pip
pip install -r requirements.txt

if errorlevel 1 (
    echo ❌ Failed to install Python packages
    pause
    exit /b 1
)

REM Configure environment
if not exist ".env" (
    echo Configuring environment...
    copy .env.example .env >nul
    
    REM Generate SECRET_KEY
    for /f %%i in ('python -c "import secrets; print(secrets.token_hex(32))"') do set SECRET_KEY=%%i
    powershell -Command "(gc .env) -replace 'your-secret-key-here', '%SECRET_KEY%' | Out-File -encoding ASCII .env"
    
    if "%ENVIRONMENT%"=="production" (
        powershell -Command "(gc .env) -replace 'FLASK_ENV=development', 'FLASK_ENV=production' | Out-File -encoding ASCII .env"
        powershell -Command "(gc .env) -replace 'DEBUG=True', 'DEBUG=False' | Out-File -encoding ASCII .env"
        powershell -Command "(gc .env) -replace 'HOST=127.0.0.1', 'HOST=0.0.0.0' | Out-File -encoding ASCII .env"
    )
    
    echo ✓ Environment configured for %ENVIRONMENT%
) else (
    echo ✓ Using existing .env file
)

REM Create logs directory
if not exist "logs" mkdir logs

REM Create Windows service script
echo Creating Windows service script...
(
echo @echo off
echo cd /d "%APP_DIR%"
echo call venv\Scripts\activate.bat
echo python -m gunicorn --bind 0.0.0.0:5000 --workers 2 --timeout 120 --access-logfile logs\access.log --error-logfile logs\error.log shop:app
) > run_service.bat

REM Create start script
echo Creating start script...
(
echo @echo off
echo echo Starting Shop Manager...
echo cd /d "%APP_DIR%"
echo start /b cmd /c run_service.bat
echo echo Shop Manager started! Visit http://localhost:5000
echo pause
) > start.bat

REM Create stop script
echo Creating stop script...
(
echo @echo off
echo echo Stopping Shop Manager...
echo taskkill /f /im python.exe 2^>nul
echo taskkill /f /im gunicorn.exe 2^>nul
echo echo Shop Manager stopped!
echo pause
) > stop.bat

REM Create Windows Task Scheduler task for auto-start
echo Setting up Windows service...
schtasks /query /tn "ShopManager" >nul 2>&1
if not errorlevel 1 (
    echo Removing existing task...
    schtasks /delete /tn "ShopManager" /f >nul 2>&1
)

schtasks /create /tn "ShopManager" /tr "%APP_DIR%\run_service.bat" /sc onstart /ru System /rl highest /f >nul 2>&1
if not errorlevel 1 (
    echo ✓ Windows service created successfully
) else (
    echo ⚠️ Failed to create Windows service, you can start manually
)

REM Configure Windows Firewall
echo Configuring Windows Firewall...
netsh advfirewall firewall show rule name="Shop Manager HTTP" >nul 2>&1
if errorlevel 1 (
    netsh advfirewall firewall add rule name="Shop Manager HTTP" dir=in action=allow protocol=TCP localport=5000 >nul 2>&1
    if not errorlevel 1 (
        echo ✓ Firewall rule added for port 5000
    ) else (
        echo ⚠️ Failed to add firewall rule, you may need to do this manually
    )
) else (
    echo ✓ Firewall rule already exists
)

REM Test the application
echo Testing application...
start /b cmd /c run_service.bat
timeout /t 5 >nul

REM Wait for application to start
echo Waiting for application to start...
set "RETRY_COUNT=0"
:check_health
if %RETRY_COUNT% geq 10 (
    echo ❌ Application failed to start within expected time
    goto :end_test
)

curl -f http://localhost:5000/health >nul 2>&1
if not errorlevel 1 (
    echo ✓ Application health check passed
    goto :end_test
)

timeout /t 2 >nul
set /a RETRY_COUNT+=1
goto :check_health

:end_test

REM Create desktop shortcut
echo Creating desktop shortcuts...
powershell -Command "$WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%USERPROFILE%\Desktop\Shop Manager.lnk'); $Shortcut.TargetPath = '%APP_DIR%\start.bat'; $Shortcut.WorkingDirectory = '%APP_DIR%'; $Shortcut.IconLocation = '%APP_DIR%\static\icons\icon-192x192.png'; $Shortcut.Save()"

powershell -Command "$WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%USERPROFILE%\Desktop\Stop Shop Manager.lnk'); $Shortcut.TargetPath = '%APP_DIR%\stop.bat'; $Shortcut.WorkingDirectory = '%APP_DIR%'; $Shortcut.Save()"

echo.
echo 🎉 Deployment completed successfully!
echo.
echo ✓ Application installed to: %APP_DIR%
echo ✓ Desktop shortcuts created
echo ✓ Windows service configured
echo ✓ Firewall rule added
echo.
echo 📝 Next steps:
echo 1. Edit %APP_DIR%\.env with your specific configuration
echo 2. Visit http://localhost:5000 to access the application
echo 3. Use the desktop shortcuts to start/stop the application
echo 4. Check logs in %APP_DIR%\logs\ directory
echo.
echo 🔧 Management commands:
echo - Start: Double-click "Shop Manager" desktop shortcut
echo - Stop: Double-click "Stop Shop Manager" desktop shortcut  
echo - Service: schtasks /run /tn "ShopManager"
echo - Logs: type %APP_DIR%\logs\error.log
echo.

REM Open browser
choice /c YN /m "Do you want to open the application in browser now"
if not errorlevel 2 (
    start http://localhost:5000
)

pause
