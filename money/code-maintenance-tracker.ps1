# 🦞 龙虾代码维护赚钱追踪器
# 追踪代码维护/OSS赞助/直接变现机会
# 建议频率：每周一次

$Strategies = @(
    @{
        Category = "OSS赞助"
        Items = @(
            @{
                Name = "GitHub Sponsors"
                Desc = "在GitHub上启用Sponsors按钮，接受赞助"
                Action = "Profile → Sponsors → 启用 → 设置 tiers"
                Earning = "不定，优质项目月入$100-5000+"
                Difficulty = "低"
                TimeToFirst = "1-3个月"
            }
            @{
                Name = "Open Collective"
                Desc = "开源项目财务管理平台，接受集体赞助"
                Action = "注册Open Collective → 关联仓库 → 发布"
                Earning = "不定，取决于项目规模"
                Difficulty = "低"
                TimeToFirst = "1-2个月"
            }
            @{
                Name = "Buy Me a Coffee"
                Desc = "简单接受打赏"
                Action = "注册页面 → 添加到README → 推广"
                Earning = "$0-200/月"
                Difficulty = "极低"
                TimeToFirst = "即时"
            }
        )
    }
)

$Strategies | ConvertTo-Json -Depth 5 | Out-File -FilePath (Join-Path $PSScriptRoot "..\dashboard\maintenance_data.json") -Encoding UTF8

Write-Host "✅ 代码维护机会追踪完成"
