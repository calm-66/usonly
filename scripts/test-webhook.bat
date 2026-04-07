@echo off
chcp 65001 >nul
echo ========================================
echo   测试 Webhook 通知
echo ========================================
echo.

REM 检查服务器是否在运行
echo 检查服务器状态...
netstat -ano | findstr :3001 >nul 2>&1
if errorlevel 1 (
    echo [错误] Webhook 服务器未运行
    echo 请先运行：scripts\start-webhook.bat
    pause
    exit /b 1
)

echo 服务器正在运行，发送测试通知...
echo.

REM 使用 PowerShell 发送测试请求
powershell -NoProfile -Command ^
    "$body = @'
{
  \"eventType\": \"deployment.succeeded\",
  \"deployment\": {
    \"id\": \"test123\",
    \"url\": \"https://test.vercel.app\"
  },
  \"project\": {
    \"name\": \"UsOnly\"
  }
}
'@;
    try {
        $response = Invoke-WebRequest -Uri 'http://localhost:3001/api/webhook/vercel' -Method POST -ContentType 'application/json' -Body $body
        Write-Host \"响应：$($response.StatusCode)\" -ForegroundColor Green
        Write-Host \"通知已发送，请检查系统通知弹窗\" -ForegroundColor Green
    } catch {
        Write-Host \"错误：$_\" -ForegroundColor Red
    }"

echo.
echo ========================================
pause