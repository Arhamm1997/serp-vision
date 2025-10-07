# SERP Tracker Backend Test Script
# Run this to verify your backend is working correctly

Write-Host "🔍 SERP Tracker Backend Connection Test" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Check if backend is running
Write-Host "Test 1: Checking if backend is running on port 5000..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:5000/health" -Method GET -TimeoutSec 5
    Write-Host "✅ Backend is running!" -ForegroundColor Green
    Write-Host "   Status: $($health.status)" -ForegroundColor Gray
    Write-Host "   Uptime: $($health.uptime) seconds" -ForegroundColor Gray
    Write-Host "   Memory: $($health.memory.used)MB / $($health.memory.total)MB" -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "❌ Backend is NOT running!" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Please start the backend with: cd serp-tracker-backend; npm run dev" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

# Test 2: Check API documentation
Write-Host "Test 2: Checking API endpoints..." -ForegroundColor Yellow
try {
    $api = Invoke-RestMethod -Uri "http://localhost:5000/api" -Method GET -TimeoutSec 5
    Write-Host "✅ API documentation available!" -ForegroundColor Green
    Write-Host "   Version: $($api.version)" -ForegroundColor Gray
    Write-Host "   Endpoints available: $($api.endpoints.Count)" -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "⚠️  API documentation not accessible" -ForegroundColor Yellow
    Write-Host ""
}

# Test 3: Test SERP analysis endpoint with sample data
Write-Host "Test 3: Testing SERP analysis endpoint..." -ForegroundColor Yellow
$testBody = @{
    keywords = @("test keyword")
    domain = "example.com"
    country = "US"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:5000/api/search/analyze" `
                                   -Method POST `
                                   -Body $testBody `
                                   -ContentType "application/json" `
                                   -TimeoutSec 30
    
    if ($response.success) {
        Write-Host "✅ SERP analysis endpoint working!" -ForegroundColor Green
        Write-Host "   Keywords processed: $($response.data.serpData.Count)" -ForegroundColor Gray
        Write-Host "   Processing time: $($response.data.processingDetails.totalProcessingTime)ms" -ForegroundColor Gray
        
        if ($response.keyStats) {
            Write-Host "   API Keys: $($response.keyStats.active) active, $($response.keyStats.total) total" -ForegroundColor Gray
            Write-Host "   Daily usage: $($response.keyStats.totalUsageToday)/$($response.keyStats.totalCapacity)" -ForegroundColor Gray
        }
        Write-Host ""
    } else {
        Write-Host "⚠️  Analysis endpoint returned error" -ForegroundColor Yellow
        Write-Host "   Message: $($response.message)" -ForegroundColor Gray
        Write-Host ""
    }
} catch {
    Write-Host "❌ SERP analysis endpoint test failed!" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    
    # Try to get more details from the response
    if ($_.Exception.Response) {
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            $errorData = $responseBody | ConvertFrom-Json
            Write-Host "   Server message: $($errorData.message)" -ForegroundColor Red
        } catch {
            Write-Host "   Could not parse error details" -ForegroundColor Gray
        }
    }
    Write-Host ""
}

# Test 4: Check API key stats
Write-Host "Test 4: Checking SerpAPI key status..." -ForegroundColor Yellow
try {
    $keyStats = Invoke-RestMethod -Uri "http://localhost:5000/api/keys/stats" -Method GET -TimeoutSec 5
    
    if ($keyStats.success) {
        Write-Host "✅ API key management working!" -ForegroundColor Green
        Write-Host "   Total keys: $($keyStats.data.summary.total)" -ForegroundColor Gray
        Write-Host "   Active keys: $($keyStats.data.summary.active)" -ForegroundColor Gray
        Write-Host "   Exhausted keys: $($keyStats.data.summary.exhausted)" -ForegroundColor Gray
        Write-Host "   Today's usage: $($keyStats.data.summary.totalUsageToday)/$($keyStats.data.summary.totalCapacity)" -ForegroundColor Gray
        
        if ($keyStats.data.summary.total -eq 0) {
            Write-Host ""
            Write-Host "⚠️  No SerpAPI keys configured!" -ForegroundColor Yellow
            Write-Host "   Add keys to backend/.env file:" -ForegroundColor Yellow
            Write-Host "   SERPAPI_KEY_1=your_key_here" -ForegroundColor Gray
        }
        Write-Host ""
    }
} catch {
    Write-Host "⚠️  Could not check API key stats" -ForegroundColor Yellow
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Gray
    Write-Host ""
}

# Test 5: Check MongoDB connection
Write-Host "Test 5: Checking MongoDB connection..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:5000/api/health" -Method GET -TimeoutSec 5
    
    if ($health.success -and $health.data.database.status -eq "connected") {
        Write-Host "✅ MongoDB connected!" -ForegroundColor Green
        Write-Host "   Status: $($health.data.database.status)" -ForegroundColor Gray
        if ($health.data.database.collections) {
            Write-Host "   Collections: searchResults=$($health.data.database.collections.searchResults), apiKeys=$($health.data.database.collections.apiKeys)" -ForegroundColor Gray
        }
        Write-Host ""
    } else {
        Write-Host "⚠️  MongoDB connection issue" -ForegroundColor Yellow
        Write-Host "   Status: $($health.data.database.status)" -ForegroundColor Gray
        Write-Host ""
    }
} catch {
    Write-Host "⚠️  Could not check MongoDB status" -ForegroundColor Yellow
    Write-Host ""
}

# Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "📊 Test Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ = Pass   ⚠️  = Warning   ❌ = Fail" -ForegroundColor Gray
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. If all tests passed, start your frontend: cd serp-tracker-frontend; npm run dev" -ForegroundColor White
Write-Host "2. Open http://localhost:3000 in your browser" -ForegroundColor White
Write-Host "3. Try analyzing some keywords!" -ForegroundColor White
Write-Host ""
Write-Host "If tests failed:" -ForegroundColor Yellow
Write-Host "- Make sure MongoDB is running" -ForegroundColor White
Write-Host "- Check backend/.env has valid SerpAPI keys" -ForegroundColor White
Write-Host "- Restart backend: cd serp-tracker-backend; npm run dev" -ForegroundColor White
Write-Host ""
