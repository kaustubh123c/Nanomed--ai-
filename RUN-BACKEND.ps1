$ErrorActionPreference = 'Stop'
Set-Location "$PSScriptRoot\backend"
if (!(Test-Path '.env')) { Copy-Item '.env.example' '.env'; Write-Host 'Created backend\.env from the example.' -ForegroundColor Yellow }
$envText = Get-Content '.env' -Raw
if ($envText.Contains('REPLACE_WITH_ROTATED_PASSWORD') -or $envText.Contains('REPLACE_WITH_A_LONG_RANDOM_SECRET')) { Write-Host 'Edit backend\.env first: set the rotated Atlas password in MONGO_URI and a unique JWT_SECRET_KEY, then run this script again.' -ForegroundColor Yellow; exit 1 }
if (!(Test-Path '.venv')) { py -3.12 -m venv .venv }
& .\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
