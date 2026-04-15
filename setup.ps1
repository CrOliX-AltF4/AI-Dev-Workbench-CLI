# AI Dev Workbench CLI — Windows setup script
# Run once from the project folder: .\setup.ps1

$ErrorActionPreference = "Stop"
$projectDir = $PSScriptRoot
$entryPoint = "$projectDir\dist\cli\index.js"

Write-Host ""
Write-Host "AI Dev Workbench CLI — setup"
Write-Host "-----------------------------"

Write-Host "Installing dependencies..."
npm install

Write-Host "Building..."
npm run build

# Add aiwb function to PowerShell profile so it works from any directory
$funcLine = "function aiwb { node `"$entryPoint`" @args }"

if (!(Test-Path $PROFILE)) {
    New-Item -Path $PROFILE -ItemType File -Force | Out-Null
}

$profileContent = Get-Content $PROFILE -Raw -ErrorAction SilentlyContinue
if ($profileContent -notmatch "function aiwb") {
    Add-Content $PROFILE "`n$funcLine"
    Write-Host ""
    Write-Host "v  aiwb added to your PowerShell profile ($PROFILE)"
    Write-Host "   Restart your terminal (or run: . `$PROFILE)"
} else {
    Write-Host ""
    Write-Host "v  aiwb already configured in PowerShell profile"
}

Write-Host ""
Write-Host "Setup complete. Next steps:"
Write-Host "  1. Restart your terminal"
Write-Host "  2. Configure at least one provider:"
Write-Host "       aiwb config set groq.apiKey   <your-key>"
Write-Host "       aiwb config set gemini.apiKey <your-key>"
Write-Host "       aiwb config set claude.apiKey <your-key>"
Write-Host "       aiwb config set openai.apiKey <your-key>"
Write-Host "  3. Run: aiwb"
Write-Host ""
