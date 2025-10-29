@echo off
REM Deploy EventOrganizerV2 with Factory Pattern (Windows)
REM This script handles compilation and deployment in one go

echo ===============================================================
echo          Factory Pattern Deployment (Windows)
echo ===============================================================
echo.

REM Check if .env exists
if not exist .env (
    echo ERROR: .env file not found!
    echo.
    echo Please create .env file with:
    echo PRIVATE_KEY=your_private_key_here
    echo.
    pause
    exit /b 1
)

REM Check balance first
echo Step 1: Checking wallet balance...
echo.
call npx hardhat run scripts/check-balance.js --network pushTestnet
echo.

set /p CONTINUE="Continue with deployment? (y/n): "
if /i not "%CONTINUE%"=="y" (
    echo Deployment cancelled.
    pause
    exit /b 0
)

REM Clean previous build
echo.
echo Step 2: Cleaning previous build...
if exist artifacts rmdir /s /q artifacts
if exist cache rmdir /s /q cache
echo Clean complete
echo.

REM Compile contracts
echo Step 3: Compiling contracts...
call npx hardhat compile

if %errorlevel% neq 0 (
    echo.
    echo Compilation failed!
    pause
    exit /b 1
)

echo Compilation successful
echo.

REM Deploy
echo Step 4: Deploying to Push Chain Testnet...
echo.
call npx hardhat run scripts/deploy-event-organizer-v2-factory.js --network pushTestnet

if %errorlevel% neq 0 (
    echo.
    echo Deployment failed!
    pause
    exit /b 1
)

echo.
echo ===============================================================
echo              Deployment Successful!
echo ===============================================================
echo.
echo Next steps:
echo 1. Copy the deployed contract address from above
echo 2. Update src\config\contracts.ts
echo 3. Copy ABI:
echo    copy artifacts\contracts\EventOrganizerV2.sol\EventOrganizerV2.json ..\src\contracts\EventOrganizer.json
echo 4. Restart frontend: npm run dev
echo.
pause
