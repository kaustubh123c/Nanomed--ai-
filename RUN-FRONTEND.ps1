$ErrorActionPreference = 'Stop'
Set-Location "$PSScriptRoot\frontend"
if (!(Test-Path 'node_modules')) { npm ci }
npm run dev
