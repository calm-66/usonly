@echo off
chcp 65001 >nul
echo ========================================
echo   UsOnly - Deploy to GitHub
echo ========================================
echo.

cd /d "%~dp0"

set /p GITHUB_USER=Enter your GitHub username: 

echo.
set /p REPO_NAME=Enter repository name (default: usonly): 
if "%REPO_NAME%"=="" set REPO_NAME=usonly

echo.
echo Initializing Git repository...
git init

echo.
echo Adding all files...
git add .

echo.
echo Committing...
git commit -m "Deploy to Vercel"

echo.
echo Creating main branch...
git branch -M main

echo.
echo Adding remote repository...
git remote remove origin 2>nul
git remote add origin https://github.com/%GITHUB_USER%/%REPO_NAME%.git

echo.
echo Pushing to GitHub...
git push -u origin main

echo.
echo ========================================
echo   Done!
echo ========================================
echo.
echo Next steps:
echo 1. Visit https://vercel.com
echo 2. Login with GitHub
echo 3. Click "Add New Project"
echo 4. Import your repository: %GITHUB_USER%/%REPO_NAME%
echo 5. Add Vercel Postgres database
echo 6. Click "Deploy"
echo.
pause