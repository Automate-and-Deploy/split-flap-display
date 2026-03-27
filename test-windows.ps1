# Enhanced Display - Windows Test Suite
# Run with: .\test-windows.ps1

$BASE_URL = "http://localhost:3000"
$TEST_COUNT = 0
$PASS_COUNT = 0

function Write-TestResult($TestName, $Passed) {
    $TEST_COUNT++
    if ($Passed) {
        $PASS_COUNT++
        Write-Host "✅ PASS: $TestName" -ForegroundColor Green
    } else {
        Write-Host "❌ FAIL: $TestName" -ForegroundColor Red
    }
}

Write-Host "`n🧪 Enhanced Display - Windows Test Suite" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan

# Test 1: Server Health Check
try {
    $response = Invoke-WebRequest -Uri "$BASE_URL/health" -UseBasicParsing -TimeoutSec 5
    $data = $response.Content | ConvertFrom-Json
    Write-TestResult "Server Health Check" ($data.status -eq "healthy")
} catch {
    Write-TestResult "Server Health Check" $false
}

# Test 2: API Messages Endpoint
try {
    $response = Invoke-WebRequest -Uri "$BASE_URL/api/messages" -UseBasicParsing -TimeoutSec 5
    $data = $response.Content | ConvertFrom-Json
    Write-TestResult "API Messages Endpoint" ($data.messages -is [array])
} catch {
    Write-TestResult "API Messages Endpoint" $false
}

# Test 3: API Displays Endpoint
try {
    $response = Invoke-WebRequest -Uri "$BASE_URL/api/displays" -UseBasicParsing -TimeoutSec 5
    $data = $response.Content | ConvertFrom-Json
    Write-TestResult "API Displays Endpoint" ($data.displays -is [array])
} catch {
    Write-TestResult "API Displays Endpoint" $false
}

# Test 4: Create Message via API
try {
    $body = @{
        title = "Test Message"
        content = @("", "TEST", "MESSAGE", "API", "")
        display_id = "default"
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri "$BASE_URL/api/messages" -Method POST -Body $body -ContentType "application/json" -UseBasicParsing -TimeoutSec 5
    $data = $response.Content | ConvertFrom-Json
    Write-TestResult "Create Message via API" ($data.id -gt 0)
} catch {
    Write-TestResult "Create Message via API" $false
}

# Test 5: Display Interface HTML
try {
    $response = Invoke-WebRequest -Uri "$BASE_URL" -UseBasicParsing -TimeoutSec 5
    Write-TestResult "Display Interface HTML" ($response.StatusCode -eq 200)
} catch {
    Write-TestResult "Display Interface HTML" $false
}

# Test 6: Admin Interface HTML
try {
    $response = Invoke-WebRequest -Uri "$BASE_URL/admin" -UseBasicParsing -TimeoutSec 5
    Write-TestResult "Admin Interface HTML" ($response.StatusCode -eq 200)
} catch {
    Write-TestResult "Admin Interface HTML" $false
}

# Test 7: Static CSS Assets
try {
    $response = Invoke-WebRequest -Uri "$BASE_URL/css/board.css" -UseBasicParsing -TimeoutSec 5
    Write-TestResult "Static CSS Assets" ($response.StatusCode -eq 200)
} catch {
    Write-TestResult "Static CSS Assets" $false
}

# Test 8: Socket.IO JavaScript Library
try {
    $response = Invoke-WebRequest -Uri "$BASE_URL/socket.io/socket.io.js" -UseBasicParsing -TimeoutSec 5
    Write-TestResult "Socket.IO JavaScript Library" ($response.StatusCode -eq 200)
} catch {
    Write-TestResult "Socket.IO JavaScript Library" $false
}

# Test 9: CORS Headers Present
try {
    $response = Invoke-WebRequest -Uri "$BASE_URL/api/messages" -UseBasicParsing -TimeoutSec 5
    $hasCors = $response.Headers['Access-Control-Allow-Origin'] -ne $null
    Write-TestResult "CORS Headers Present" $hasCors
} catch {
    Write-TestResult "CORS Headers Present" $false
}

# Summary
Write-Host "`n==============================================" -ForegroundColor Cyan
Write-Host "Test Results Summary" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "Total Tests: $TEST_COUNT"
Write-Host "Passed: $PASS_COUNT" -ForegroundColor Green
Write-Host "Failed: $($TEST_COUNT - $PASS_COUNT)" -ForegroundColor $(if ($TEST_COUNT - $PASS_COUNT -gt 0) { "Red" } else { "Green" })

if ($PASS_COUNT -eq $TEST_COUNT) {
    Write-Host "`n🎉 ALL TESTS PASSED!" -ForegroundColor Green
    Write-Host "✅ Display system is fully functional" -ForegroundColor Green
    exit 0
} else {
    $percent = [math]::Round(($PASS_COUNT / $TEST_COUNT) * 100)
    Write-Host "`n⚠️  Some tests failed" -ForegroundColor Yellow
    Write-Host "Success rate: $percent%" -ForegroundColor Yellow
    exit 1
}
