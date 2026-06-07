#!/usr/bin/env node

/**
 * git-summary — Beautiful Git activity summaries
 * 
 * Usage:
 *   git-summary                  # Summary for today
 *   git-summary --days 7         # Last 7 days
 *   git-summary --since "2026-01-01" --until "2026-06-01"
 *   git-summary --author "name"  # Filter by author
 *   git-summary --json           # JSON output
 *   git-summary --chart          # Show bar chart
 */

const simpleGit = require('simple-git');
const chalk = require('chalk');
const Table = require('cli-table3');
const path = require('path');
const fs = require('fs');

// Parse args
const args = process.argv.slice(2);
const opts = {
    days: parseArg('--days', '-d', null),
    since: parseArg('--since', '-s', null),
    until: parseArg('--until', '-u', null),
    author: parseArg('--author', '-a', null),
    json: args.includes('--json') || args.includes('-j'),
    chart: args.includes('--chart') || args.includes('-c'),
    help: args.includes('--help') || args.includes('-h'),
    repo: parseArg('--repo', '-r', '.'),
};

function parseArg(long, short, def) {
    for (let i = 0; i < args.length; i++) {
        if (args[i] === long || args[i] === short) return args[i + 1] || def;
    }
    return def;
}

if (opts.help) {
    console.log(`
${chalk.bold.cyan('git-summary')} — Beautiful Git activity summaries

${chalk.dim('Usage:')}
  git-summary                        ${chalk.dim('Summary for today')}
  git-summary --days 7               ${chalk.dim('Last 7 days')}
  git-summary --since "2026-01-01"   ${chalk.dim('Custom date range')}
  git-summary --author "Alice"       ${chalk.dim('Filter by author')}
  git-summary --json                 ${chalk.dim('JSON output')}
  git-summary --chart                ${chalk.dim('Show bar chart')}

${chalk.dim('Options:')}
  -d, --days <n>     Show last n days
  -s, --since <date> Start date (YYYY-MM-DD)
  -u, --until <date> End date (YYYY-MM-DD)
  -a, --author <name> Filter by author
  -j, --json         Output as JSON
  -c, --chart        Show bar chart
  -r, --repo <path>  Git repo path (default: current dir)
  -h, --help         Show this help
`);
    process.exit(0);
}

async function main() {
    const repoPath = path.resolve(opts.repo);
    
    if (!fs.existsSync(path.join(repoPath, '.git'))) {
        console.error(chalk.red('✖') + ' Not a git repository: ' + repoPath);
        process.exit(1);
    }

    const git = simpleGit(repoPath);

    // Determine date range
    const now = new Date();
    let since, until;

    if (opts.since) {
        since = opts.since;
    } else if (opts.days) {
        const d = new Date(now);
        d.setDate(d.getDate() - parseInt(opts.days));
        since = d.toISOString().split('T')[0];
    } else {
        // Default: today
        since = now.toISOString().split('T')[0];
    }

    if (opts.until) {
        until = opts.until;
    } else {
        until = now.toISOString().split('T')[0];
    }

    try {
        // Get log
        const logOptions = {
            '--since': since,
            '--until': until,
            '--format': '%H||%an||%ae||%ai||%s',
        };

        const log = await git.raw([
            'log',
            `--since=${since}`,
            `--until=${until}`,
            '--format=%H||%an||%ae||%ai||%s',
            '--no-merges',
            '--all',
        ]);

        if (!log.trim()) {
            console.log(chalk.yellow('⚠ No commits found in this period.'));
            process.exit(0);
        }

        // Parse commits
        const commits = log.trim().split('\n').map(line => {
            const parts = line.split('||');
            return {
                hash: parts[0],
                author: parts[1],
                email: parts[2],
                date: new Date(parts[3]),
                message: parts.slice(4).join('||'),
            };
        });

        // Apply author filter
        let filteredCommits = commits;
        if (opts.author) {
            filteredCommits = commits.filter(c => 
                c.author.toLowerCase().includes(opts.author.toLowerCase()) ||
                c.email.toLowerCase().includes(opts.author.toLowerCase())
            );
        }

        if (filteredCommits.length === 0) {
            console.log(chalk.yellow('⚠ No commits found for author filter.'));
            process.exit(0);
        }

        // Calculate stats per author
        const authorStats = {};
        for (const c of filteredCommits) {
            if (!authorStats[c.author]) {
                authorStats[c.author] = {
                    author: c.author,
                    email: c.email,
                    commits: 0,
                    firstCommit: c.date,
                    lastCommit: c.date,
                    messages: [],
                };
            }
            authorStats[c.author].commits++;
            authorStats[c.author].messages.push(c.message);
            if (c.date < authorStats[c.author].firstCommit) authorStats[c.author].firstCommit = c.date;
            if (c.date > authorStats[c.author].lastCommit) authorStats[c.author].lastCommit = c.date;
        }

        // Calculate daily activity
        const dailyActivity = {};
        for (const c of filteredCommits) {
            const day = c.date.toISOString().split('T')[0];
            dailyActivity[day] = (dailyActivity[day] || 0) + 1;
        }

        // Get diff stats if possible
        let totalAdditions = 0, totalDeletions = 0;
        try {
            const shortlog = await git.raw([
                'log',
                `--since=${since}`,
                `--until=${until}`,
                '--numstat',
                '--all',
                '--no-merges',
            ]);
            const lines = shortlog.split('\n');
            for (const line of lines) {
                const parts = line.split('\t');
                if (parts.length === 3 && !isNaN(parseInt(parts[0]))) {
                    totalAdditions += parseInt(parts[0]) || 0;
                    totalDeletions += parseInt(parts[1]) || 0;
                }
            }
        } catch (e) {
            // numstat not available
        }

        // === OUTPUT ===
        const authors = Object.values(authorStats);

        if (opts.json) {
            console.log(JSON.stringify({
                period: { since, until },
                totalCommits: filteredCommits.length,
                totalAuthors: authors.length,
                totalAdditions,
                totalDeletions,
                authors: authors,
                dailyActivity,
            }, null, 2));
            return;
        }

        // Header
        const headerWidth = 50;
        console.log('');
        console.log(chalk.bold.cyan(' git-summary') + chalk.dim(`  ${since} → ${until}`));
        console.log(chalk.dim('─'.repeat(headerWidth)));

        // Overview
        console.log('');
        console.log(chalk.bold('📊 Overview'));
        console.log(`  ${chalk.green(filteredCommits.length)} commits  ·  ${chalk.blue(Object.keys(authorStats).length)} authors  ·  +${chalk.green(totalAdditions)} -${chalk.red(totalDeletions)} lines`);

        // Per author table
        if (authors.length > 0) {
            console.log('');
            console.log(chalk.bold('👤 Per Author'));
            const table = new Table({
                head: ['Author', 'Commits', 'First', 'Last'],
                style: { head: ['dim'] },
                colWidths: [24, 10, 14, 14],
            });
            
            for (const a of authors.sort((a, b) => b.commits - a.commits)) {
                table.push([
                    chalk.white(a.author),
                    chalk.green(String(a.commits)),
                    chalk.dim(a.firstCommit.toISOString().split('T')[0]),
                    chalk.dim(a.lastCommit.toISOString().split('T')[0]),
                ]);
            }
            console.log(table.toString());
        }

        // Daily activity
        if (opts.chart) {
            console.log('');
            console.log(chalk.bold('📈 Daily Activity'));
            const days = Object.keys(dailyActivity).sort();
            const maxCommits = Math.max(...Object.values(dailyActivity));
            const barWidth = 30;
            
            for (const day of days) {
                const count = dailyActivity[day];
                const barLen = Math.max(1, Math.round((count / maxCommits) * barWidth));
                const bar = chalk.green('█'.repeat(barLen));
                const label = count > 9 ? chalk.yellow(count) : chalk.green(count);
                console.log(`  ${chalk.dim(day)} ${bar} ${label}`);
            }
        }

        // Recent commits
        console.log('');
        console.log(chalk.bold('🕐 Recent Commits'));
        const recent = filteredCommits.slice(0, 10);
        for (const c of recent) {
            const date = c.date.toISOString().split('T')[0];
            const shortHash = c.hash.slice(0, 7);
            const msg = c.message.length > 50 ? c.message.slice(0, 50) + '…' : c.message;
            console.log(`  ${chalk.dim(date)} ${chalk.cyan(shortHash)} ${chalk.white(msg)}`);
            console.log(`  ${chalk.dim('    ')}${chalk.dim(c.author)}`);
        }

        if (filteredCommits.length > 10) {
            console.log(chalk.dim(`  … and ${filteredCommits.length - 10} more commits`));
        }

        console.log('');
        console.log(chalk.dim('─'.repeat(headerWidth)));
        console.log(chalk.dim('  Run with --help for options'));

    } catch (error) {
        console.error(chalk.red('✖ Error:'), error.message);
        process.exit(1);
    }
}

main();
