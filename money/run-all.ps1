# Lobster 3-in-1 Money Monitor
# Runs: airdrop tracking + bounty scanning + code maintenance
# Usage: powershell -File money\run-all.ps1

Write-Host "=== Lobster 3-in-1 Money Monitor Starting ==="
$StartTime = Get-Date

# 1. Airdrop tracking
Write-Host "[1/3] Airdrop scanning..."
& "$PSScriptRoot\airdrop-tracker.ps1"

# 2. Bounty scanning
Write-Host "[2/3] Bounty scanning..."
& "$PSScriptRoot\bounty-scanner.ps1"

# 3. Code maintenance tracking
Write-Host "[3/3] Code maintenance scanning..."
& "$PSScriptRoot\code-maintenance-tracker.ps1"

$Duration = (Get-Date) - $StartTime
Write-Host "All done! Took $($Duration.TotalSeconds.ToString('F1'))s"
Write-Host "Data updated in dashboard/"
