$shell = New-Object -ComObject Shell.Application
$windows = $shell.Windows()
foreach ($w in $windows) {
    $url = $w.LocationURL
    $name = $w.FullName
    if ($name -match "chrome|msedge") {
        Write-Host ("Tab: " + $url)
    }
}
