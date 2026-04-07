Write-Host "Testing Webhook Notification..."
Write-Host "Checking server status..."
$serverRunning = netstat -ano | Select-String ":3001"
if (-not $serverRunning) {
    Write-Host "Error: Webhook server not running"
    Write-Host "Please run: scripts\start-webhook.bat"
    pause
    exit 1
}
Write-Host "Server is running, sending test notification..."
$body = @{
    eventType = "deployment.succeeded"
    deployment = @{
        id = "test123"
        url = "https://test.vercel.app"
    }
    project = @{
        name = "UsOnly"
    }
} | ConvertTo-Json
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/api/webhook/vercel" -Method POST -ContentType "application/json" -Body $body
    Write-Host "Response: $($response.StatusCode)"
    Write-Host "Notification sent! Check your system notifications."
} catch {
    Write-Host "Error: $_"
}
pause