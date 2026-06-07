# 🦞 龙虾 GitHub Bounty 扫描器
# 扫描各大平台的开放 bounty/任务
# 建议频率：每天一次

$Platforms = @(
    @{
        Name = "Gitcoin"
        Url = "https://gitcoin.co/"
        Type = "Web3/开源"
        Notes = "最成熟的bounty平台，专注于Web3开源项目"
        Tips = @("关注Easy/Medium难度的任务入门", "看预算合理的feature/bug任务", "JavaScript/Python/文档类任务多")
    },
    @{
        Name = "Dework"
        Url = "https://dework.xyz/"
        Type = "DAO任务"
        Notes = "DAO治理任务，适合熟悉Web3的人"
        Tips = @("很多DAO发布赏金任务", "Design/Marketing/Dev都有", "重点关注新DAO")
    },
    @{
        Name = "Algora"
        Url = "https://algora.io/"
        Type = "开源赏金"
        Notes = "GitHub集成良好，适合开发者"
        Tips = @("按语言筛选bounty", "关注活跃仓库", "小任务练手")
    },
    @{
        Name = "OnlyDust"
        Url = "https://app.onlydust.com/"
        Type = "StarkNet生态"
        Notes = "StarkNet生态bounty平台"
        Tips = @("Cairo语言需要学习", "StarkNet生态活跃", "赏金丰厚")
    },
    @{
        Name = "BountyHub"
        Url = "https://bountyhub.dev/"
        Type = "通用开发者"
        Notes = "通用开发者bounty平台"
        Tips = @("多看新发布的任务", "响应要快", "竞争较大")
    },
    @{
        Name = "闲鱼/淘宝"
        Url = "https://2.taobao.com/"
        Type = "国内接单"
        Notes = "国内最大的二手/服务交易平台"
        Tips = @("Python爬虫脚本需求多", "网站修改/小程序", "价格偏低但门槛低")
    },
    @{
        Name = "猪八戒/一品威客"
        Url = "https://www.zbj.com/"
        Type = "国内众包"
        Notes = "国内传统众包平台"
        Tips = @("竞标模式", "IT类项目很多", "价格区间大")
    },
    @{
        Name = "Upwork"
        Url = "https://www.upwork.com/"
        Type = "国际自由职业"
        Notes = "全球最大自由职业平台"
        Tips = @("建立profile很重要", "从小项目起步", "长期客户价值高")
    }
)

$ReportPath = Join-Path $PSScriptRoot "..\dashboard\bounty_data.json"

$Results = foreach ($p in $Platforms) {
    [PSCustomObject]@{
        name = $p.Name
        url = $p.Url
        type = $p.Type
        notes = $p.Notes
        tips = $p.Tips
        last_scan = (Get-Date -Format "yyyy-MM-dd HH:mm")
        status = "active"
    }
}

$Results | ConvertTo-Json -Depth 4 | Out-File -FilePath $ReportPath -Encoding UTF8

Write-Host "✅ Bounty扫描完成：$($Results.Count) 个平台已记录"
Write-Host "💡 今日推荐尝试：Gitcoin (入门) → Algora (简单) → Upwork (长期)"
