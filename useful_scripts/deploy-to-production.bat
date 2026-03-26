@echo off
setlocal enabledelayedexpansion

echo === Deploy to Production ===

echo [1/4] Switching to main branch...
git checkout main || (echo Failed to checkout main branch & exit /b 1)

echo [2/4] Pulling latest code...
git pull origin main || (echo Failed to pull main & exit /b 1)

echo [3/4] Merging preview branch...
git merge preview || (echo Merge conflict detected. Please resolve manually. & exit /b 1)

echo [4/4] Pushing to production...
git push origin main || (echo Failed to push & exit /b 1)

echo === Deployment completed successfully! ===