param([string]$BaseUrl = 'http://127.0.0.1:8000')
$ErrorActionPreference = 'Stop'
Write-Host "Checking API at $BaseUrl" -ForegroundColor Cyan
try {
  $health = Invoke-RestMethod "$BaseUrl/api/health" -TimeoutSec 15
  if ($health.status -ne 'ok') { throw 'Health endpoint did not return status=ok' }
  Write-Host 'PASS: backend health' -ForegroundColor Green
} catch { Write-Host "FAIL: backend health - $($_.Exception.Message)" -ForegroundColor Red; exit 1 }
try {
  $openapi = Invoke-RestMethod "$BaseUrl/openapi.json" -TimeoutSec 20
  $routeCount = $openapi.paths.PSObject.Properties.Count
  if ($routeCount -lt 1) { throw 'No API routes registered' }
  Write-Host "PASS: OpenAPI loaded ($routeCount paths)" -ForegroundColor Green
} catch { Write-Host "FAIL: OpenAPI - $($_.Exception.Message)" -ForegroundColor Red; exit 1 }
try {
  $db = Invoke-RestMethod "$BaseUrl/api/health/database" -TimeoutSec 20
  Write-Host "PASS: database connection ($($db.database.engine))" -ForegroundColor Green
} catch {
  Write-Host 'FAIL: database health. Check MONGO_URI, Atlas Network Access, DB user permissions, and backend logs.' -ForegroundColor Red
  exit 2
}
Write-Host 'All configured API smoke checks passed.' -ForegroundColor Green
