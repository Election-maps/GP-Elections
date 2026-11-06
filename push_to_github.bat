@echo off
setlocal
echo ========================================================
echo     District Police Election Cell - GitHub Push Helper
echo ========================================================
echo.
set /p REPO_URL="Enter your GitHub Repository URL (e.g. https://github.com/USER/election-cell.git): "
if "%REPO_URL%"=="" (
    echo [ERROR] No URL entered. Aborting.
    pause
    exit /b 1
)

echo.
echo [1/3] Setting remote origin...
"C:\Program Files\Git\cmd\git.exe" remote remove origin 2>nul
"C:\Program Files\Git\cmd\git.exe" remote add origin %REPO_URL%

echo [2/3] Adding changes and committing...
"C:\Program Files\Git\cmd\git.exe" add .
"C:\Program Files\Git\cmd\git.exe" commit -m "Update Election Cell Route Management Application" 2>nul

echo [3/3] Pushing to GitHub (main branch)...
"C:\Program Files\Git\cmd\git.exe" branch -M main
"C:\Program Files\Git\cmd\git.exe" push -u origin main

if %ERRORLEVEL% equ 0 (
    echo.
    echo ========================================================
    echo [SUCCESS] Successfully pushed to GitHub!
    echo To enable GitHub Pages:
    echo 1. Go to your repo -^> Settings -^> Pages
    echo 2. Under Branch, select 'main' and '/ (root)' -^> Save
    echo 3. Your app will be live on the web in 1 minute!
    echo ========================================================
) else (
    echo.
    echo [NOTE] If authentication is required, sign in via the browser window.
)
echo.
pause
