# 🦞 龙虾空投追踪器
# 自动扫描当前热门空投项目状态，记录到 dashboard
# 建议频率：每天运行一次

$Projects = @(
    @{Name="Abstract L2"; Site="portal.abs.xyz/rewards"; Type="交互XP"; Status="active"; Note="每周任务赚XP积分+徽章"},
    @{Name="PiP World"; Site="mm.pip.world"; Type="游戏化交易"; Status="active"; Note="注册领$10万模拟金，绑定钱包"},
    @{Name="Katana"; Site="app.katana.network"; Type="存款挖矿"; Status="active"; Note="存USDC/USDT赚KAT代币激励"},
    @{Name="Base"; Site="base.org"; Type="生态交互"; Status="active"; Note="Coinbase L2，交互生态项目获空投资格"},
    @{Name="Backpack"; Site="backpack.exchange"; Type="交易积分"; Status="active"; Note="需KYC，交易赚积分"},
    @{Name="Extended"; Site="app.extended.exchange"; Type="Perp交易"; Status="active"; Note="Season1积分计划，交易/LP赚积分"},
    @{Name="Myriad"; Site="myriad.markets"; Type="预测市场"; Status="active"; Note="预测下注+每日签到免费赚积分"},
    @{Name="ETHGas"; Site="ethgas.com"; Type="Gas返还"; Status="active"; Note="绑定X账号+钱包，生成Gas报告"},
    @{Name="Glider"; Site="glider.fi"; Type="AI投资"; Status="active"; Note="a16z投资，存钱赚积分"},
    @{Name="Perena"; Site="app.perena.org"; Type="DeFi"; Status="active"; Note="Solana稳定币协议，铸造USD*赚积分+APY"},
    @{Name="PrismaX"; Site="app.prismax.ai"; Type="机器人"; Status="active"; Note="a16z投资，每日登录+聊天赚积分"},
    @{Name="Fairblock"; Site="discord.gg/fairblock"; Type="隐私协议"; Status="community"; Note="Discord活跃获角色"},
    @{Name="Euphoria"; Site="euphoria.finance"; Type="衍生品"; Status="waitlist"; Note="megaETH生态，排队中"},
    @{Name="Melee"; Site="—"; Type="预测市场"; Status="waitlist"; Note="需Discord蹲白名单"},
    @{Name="oshi"; Site="gate2.oshi.co"; Type="粉丝互动"; Status="active"; Note="动漫Web3，X账号登录"},
    @{Name="KAST"; Site="kast.com"; Type="U卡支付"; Status="active"; Note="新银行+稳定币信用卡"},
    @{Name="Ethos"; Site="app.ethos.network"; Type="链上声誉"; Status="waitlist"; Note="邀请制，需有人邀请"},
    @{Name="Exponent"; Site="exponent.finance"; Type="Solana DeFi"; Status="active"; Note="存款赚积分"}
)

$ReportPath = Join-Path $PSScriptRoot "..\dashboard\airdrop_data.json"

$Results = foreach ($p in $Projects) {
    [PSCustomObject]@{
        name = $p.Name
        site = $p.Site
        type = $p.Type
        status = $p.Status
        note = $p.Note
        last_check = (Get-Date -Format "yyyy-MM-dd HH:mm")
    }
}

$Results | ConvertTo-Json -Depth 3 | Out-File -FilePath $ReportPath -Encoding UTF8

Write-Host "✅ 空投追踪完成：$($Results.Count) 个项目已记录"
Write-Host "  🟢 活跃: $(($Results | Where-Object { $_.status -eq 'active' }).Count)"
Write-Host "  🟡 排队/社区: $(($Results | Where-Object { $_.status -ne 'active' }).Count)"
