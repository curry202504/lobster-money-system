# 🦞 龙虾搞钱系统 — 完整产品说明

## 什么是这个项目？

三路并进的开发者赚钱系统，涵盖了**空投撸毛、代码产品化、GitHub开源变现**三大方向。

## 📦 产品清单

### 1. VSCode 扩展：Quick Screenshot 🖼️
**文件:** `release/vscode-extension/quick-screenshot-1.0.0.vsix` (1MB)

一键生成漂亮代码截图的 VS Code 扩展。

- 选取代码 → `Alt+Shift+S` → 截图
- 6 种主题 (Nord/Dracula/Monokai/GitHub Light/One Dark/Solarized)
- macOS 窗口风格框架
- 自动复制到剪贴板
- 支持保存为 PNG 文件

**已本地安装 ✅** 可直接使用

**商业价值:** Marketplace 免费发布 → Pro 付费功能 → $500-3000/月

### 2. GitHub Action：PR Size Labeler 🏷️
**文件:** `release/github-action/`

根据 PR 代码变更行数自动打上 `size/xs` `size/s` `size/m` `size/l` `size/xl` 标签。

- 已用 ncc 打包为单文件 (`dist/index.js` ~1MB)
- 开箱即用，发布到 GitHub Marketplace 即可
- 也可自用管理项目

### 3. CLI 工具：git-summary 🌳
**文件:** `release/cli-tool/`

Git 活动统计命令行工具。

```bash
git-summary               # 今日摘要
git-summary --days 7      # 最近7天
git-summary --chart       # 柱状图
git-summary --json        # JSON输出
```

**商业价值:** npm 发布免费版 → Gumroad 卖高级版

### 4. 仪表盘 📊
**文件:** `release/dashboard/`

三路合一可视化仪表盘，直接在浏览器打开 `dashboard/index.html`。

- 空投项目状态（18个项目实时追踪）
- Bounty 平台列表（8个平台）
- 代码维护赚钱方案（10+执行方案）
- 行动清单（带本地存储持久化）

### 5. 监控系统 🤖
**文件:** `release/money/`

Windows Task Scheduler 定时任务已安装：
- **LobsterDailyScan** — 每天09:00 自动扫描所有机会
- 数据自动写入 `dashboard/*.json`

### 6. 空投实操手册 📖
**文件:** `release/money/airdrop-guide.md`

6 个零成本可开始的空投项目分步教程。

## 🚀 发布路线图

### 需要账号的（告诉我账号邮箱即可1分钟搞定）

| 平台 | 发布什么 | 需要什么 |
|------|---------|---------|
| VS Code Marketplace | Quick Screenshot 扩展 | GitHub 账号 |
| GitHub Marketplace | PR Size Labeler Action | GitHub 账号 |
| npm | git-summary CLI | npm 账号 |
| Gumroad | git-summary Pro 版 | Gumroad 账号 |
| Buy Me a Coffee | 接受赞助 | 邮箱 |

### 不需要账号的，已经全部搞定 ✅

| 事项 | 状态 |
|------|------|
| VSCode 扩展本地安装 | ✅ 已安装可用 |
| Windows 定时任务 | ✅ 每天09:00自动扫描 |
| 仪表盘本地可用 | ✅ 双击 index.html 打开 |
| CLI 工具本地可用 | ✅ node index.js 直接跑 |
| 空投教程 | ✅ 写完可直接照着做 |
| 所有代码 Git 管理 | ✅ 已 commit |

## 💰 预期收入

| 收入来源 | 起步期（1-3月） | 稳定期（3-6月） |
|---------|--------------|--------------|
| 空投撸毛 | $0-500 | $500-3000+ |
| VSCode 扩展 | $0-100 | $500-3000 |
| CLI 工具 | $0-50 | $100-500 |
| GitHub Action (引流) | $0 | 间接收益 |
| 闲鱼卖脚本 | $0-200 | $500-2000 |
| 代码维护外包 | $0 | $500-2000 |
| **合计** | **$0-850** | **$2100-12000+** |

## 🦞 我需要你做的

只要一步：**告诉我你常用的一个账号（GitHub/邮箱都行）**，我帮你：

1. 注册 VS Code Publisher
2. 创建 GitHub Repo
3. 发布扩展和 Action
4. 一键上线所有产品

**你说一个账号，剩下的全部我来。** 🦞
