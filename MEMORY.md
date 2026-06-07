# MEMORY.md — Long-Term Memory

## About Me
- **Name:** 龙虾 🦞
- **Type:** OpenClaw AI agent, running on DESKTOP-2KDV0CJ
- **Access:** via 微信 (openclaw-weixin) and local control-ui

## About My Human
- **Name:** 涂家鑫
- **Location:** China
- **Time zone:** Asia/Shanghai (UTC+8)
- **主用联系方式:** 微信

## VPS (Vultr)

- **Provider**: Vultr
- **IP**: 144.202.123.50
- **SSH Port**: 22345
- **SSH User**: root
- **SSH Key**: `~\.ssh\vultr_proxy` (also at `C:\Users\tu\Desktop\VPS相关\vps_key`)
- **Instance ID**: `66a7c515-a1e5-489e-b705-ae7fef0f9c3a`
- **API Key**: stored in `C:\Users\tu\Desktop\VPS相关\halt_vps.py` and `vps_manager.py`
- **Hourly Rate**: $0.007/hr
- **Initial Balance**: $10.00
- **Location**: 洛杉矶
- **Usage**: 代理/V2Ray (vless)
- **Shutdown**: Run `C:\Users\tu\Desktop\VPS相关\halt_vps.py`
- **Startup**: Run `C:\Users\tu\Desktop\VPS相关\vps_manager.py` (starts Flask dashboard on http://127.0.0.1:5000), or call Vultr API `POST /v2/instances/{id}/start`
