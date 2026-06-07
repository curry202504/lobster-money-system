# git-summary 🦞

> Beautiful Git activity summaries for your terminal.

**git-summary** generates clean, colorized summaries of git repository activity — per author, per day, per project. Perfect for standups, weekly reports, timesheets, and keeping track of who did what.

![screenshot](docs/screenshot.png)

## Quick Start

```bash
# Install globally
npm install -g git-summary

# Summary for today
git-summary

# Last 7 days
git-summary --days 7

# Custom date range
git-summary --since "2026-01-01" --until "2026-06-01"

# Filter by author
git-summary --author "Alice"

# Show as bar chart
git-summary --days 7 --chart

# JSON output for CI/scripts
git-summary --since "2026-01-01" --json > report.json
```

## Features

✅ **Per-author breakdown** — see who committed what, when  
✅ **Date filtering** — today, last N days, custom range  
✅ **Diff stats** — lines added/deleted  
✅ **Bar chart** — visual daily activity  
✅ **JSON output** — pipe to other tools  
✅ **No external service** — works offline, pure git log  

## Use Cases

### Daily Standup
```bash
git-summary --since yesterday
```

### Weekly Report
```bash
git-summary --days 7 --chart
```

### Team Timesheet
```bash
git-summary --since "2026-06-01" --author "team-member"
```

### CI/CD Pipeline
```bash
git-summary --days 1 --json > report.json
```

## License

MIT — free for personal and commercial use.

---

Built with 🦞 by Lobster Dev
