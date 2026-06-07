# 电脑保活脚本 - 防止电脑进入睡眠/待机
# 按 Ctrl+C 停止运行
# 不需要管理员权限
# 原理：模拟按下 Scroll Lock 键（无操作键），唤醒系统计时器

$running = $true
$count = 0

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  🟢 电脑保活脚本已启动" -ForegroundColor Green
Write-Host "  每59秒模拟一次按键，防止系统休眠" -ForegroundColor Green
Write-Host "  按 Ctrl+C 停止" -ForegroundColor Yellow
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# 加载 Win32 API
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class KeyPress {
    [DllImport("user32.dll")]
    public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
}
"@

$F15 = 0x7E  # F15 键 - 无害键，不会干扰任何程序

try {
    while ($running) {
        # 按下+释放 F15
        [KeyPress]::keybd_event($F15, 0, 0, [UIntPtr]::Zero)
        Start-Sleep -Milliseconds 50
        [KeyPress]::keybd_event($F15, 0, 2, [UIntPtr]::Zero)

        $count++
        $time = Get-Date -Format "HH:mm:ss"
        Write-Host "[$time] 保活脉冲 #$count ✓" -ForegroundColor DarkGray

        Start-Sleep -Seconds 59
    }
}
catch {
    Write-Host "脚本已停止" -ForegroundColor Red
}
