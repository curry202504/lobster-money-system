# HEARTBEAT.md

# Tasks to check periodically (automated, no manual action needed)

## Daily (09:00 via Windows Task Scheduler)
- ✅ `money/run-all.ps1` — 空投追踪 + Bounty扫描 + 代码维护机会
- Data saved to `dashboard/*.json`

## Money Monitoring (heartbeat checks)
When running heartbeat:
- Check if `dashboard/` data exists and is recent
- If no data today → run `money/run-all.ps1` manually
- Flag any new airdrop/bounty opportunities
