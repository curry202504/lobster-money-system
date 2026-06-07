# 🦞 龙虾Cron任务安装器
# 安装 Windows Task Scheduler 定时任务
# 运行方式: powershell -File money\setup-cron.ps1

$ScriptDir = Split-Path -Parent $PSScriptRoot
$RunAllScript = Join-Path $ScriptDir "money\run-all.ps1"
$WorkspaceDir = Split-Path -Parent $ScriptDir

# 任务名称
$TaskNameDaily = "🦞龙虾搞钱-每日扫描"
$TaskNameWeekly = "🦞龙虾搞钱-每周报告"

# 创建每日任务（每天早上9点）
$ActionDaily = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$RunAllScript`""
$TriggerDaily = New-ScheduledTaskTrigger -Daily -At "09:00AM"
$Principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

try {
    Register-ScheduledTask -TaskName $TaskNameDaily -Action $ActionDaily -Trigger $TriggerDaily -Principal $Principal -Force
    Write-Host "✅ 每日任务 [$TaskNameDaily] 已安装 (每天 09:00)"
} catch {
    Write-Host "⚠️ 安装每日任务失败: $_"
    Write-Host "   可能需要管理员权限运行"
}

# 创建周报任务（每周一上午10点）
$ActionWeekly = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$RunAllScript`""
$TriggerWeekly = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At "10:00AM"

try {
    Register-ScheduledTask -TaskName $TaskNameWeekly -Action $ActionWeekly -Trigger $TriggerWeekly -Principal $Principal -Force
    Write-Host "✅ 每周任务 [$TaskNameWeekly] 已安装 (每周一 10:00)"
} catch {
    Write-Host "⚠️ 安装每周任务失败: $_"
}

Write-Host ""
Write-Host "📋 已安装的任务:"
Get-ScheduledTask -TaskName "🦞*" | Select-Object TaskName, State, @{N="NextRun";E={$_.NextRunTime}} | Format-Table -AutoSize

Write-Host ""
Write-Host "🦞 Cron安装完毕！也可以手动运行: powershell -File money\run-all.ps1"
