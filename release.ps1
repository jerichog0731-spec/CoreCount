# CoreCount — Release Script
# Automatically loads GH_TOKEN from Windows user environment,
# builds everything, and publishes to GitHub Releases.
# Usage: just run `npm run release` from the project root.

Write-Host ""
Write-Host "  CoreCount Release Script" -ForegroundColor Cyan
Write-Host "  ========================" -ForegroundColor Cyan
Write-Host ""

# ── Load GH_TOKEN ─────────────────────────────────────────────────────────
$token = [System.Environment]::GetEnvironmentVariable("GH_TOKEN", "User")
if (-not $token) {
    Write-Host "  ❌ GH_TOKEN is not set in your Windows user environment." -ForegroundColor Red
    Write-Host "     Run: [System.Environment]::SetEnvironmentVariable('GH_TOKEN','your_token','User')" -ForegroundColor Yellow
    exit 1
}
$env:GH_TOKEN = $token
Write-Host "  ✅ GH_TOKEN loaded ($($token.Length) chars)" -ForegroundColor Green

# ── Compile backend (TypeScript → dist/) ───────────────────────────────────
Write-Host ""
Write-Host "  [1/3] Compiling backend..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "  ❌ Backend build failed." -ForegroundColor Red; exit 1 }
Write-Host "  ✅ Backend compiled." -ForegroundColor Green

# ── Build Ionic frontend (frontend/dist/) ──────────────────────────────────
Write-Host ""
Write-Host "  [2/3] Building Ionic frontend..." -ForegroundColor Yellow
Set-Location frontend
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "  ❌ Frontend build failed." -ForegroundColor Red; Set-Location ..; exit 1 }
Set-Location ..
Write-Host "  ✅ Frontend built." -ForegroundColor Green

# ── Build + publish Electron app to GitHub Releases ────────────────────────
Write-Host ""
Write-Host "  [3/3] Building & publishing to GitHub Releases..." -ForegroundColor Yellow
Set-Location electron
$env:GH_TOKEN = $token   # re-set after Set-Location (some shells reset env)
npm run release
$code = $LASTEXITCODE
Set-Location ..

if ($code -ne 0) {
    Write-Host ""
    Write-Host "  ❌ Release failed. Check the output above." -ForegroundColor Red
    exit $code
}

Write-Host ""
Write-Host "  🎉 Release published to GitHub!" -ForegroundColor Green
Write-Host "  https://github.com/jerichog0731-spec/CoreCount/releases" -ForegroundColor Cyan
Write-Host ""
